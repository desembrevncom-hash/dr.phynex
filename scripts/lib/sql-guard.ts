/**
 * Fail-closed validator for migration SQL that the guarded executor sends inside its own
 * BEGIN … COMMIT. It never rewrites or strips the SQL; it only decides whether to accept it.
 *
 * Lexing follows PostgreSQL's lexical rules (docs §4.1): whitespace, `--` line comments,
 * nested `/* … *\/` block comments, '…' strings with '' escapes, "…" identifiers with ""
 * escapes, $tag$ … $tag$ dollar quotes, and `;` as the only statement separator. Anything whose
 * meaning depends on session settings or is not needed by the approved migrations (escape-string
 * prefixes, backslashes in strings, positional parameters, non-ASCII outside quotes, unknown
 * characters, unterminated quotes/comments) is rejected instead of guessed.
 *
 * Accepted statements follow a strict grammar: exactly the shapes the approved migrations use
 * (CREATE TABLE with column definitions, CREATE TYPE … AS ENUM, CREATE [UNIQUE] INDEX … USING btree
 * on plain columns, ALTER TABLE ADD COLUMN / ADD CONSTRAINT … FOREIGN KEY), consumed to the last
 * token. The only function call is `now()` directly in DEFAULT: unqualified, no arguments. The
 * runner sets search_path to public and PostgreSQL searches pg_catalog first, so it resolves to
 * the built-in unless pg_catalog itself is altered; that resolution is an assumption to confirm on
 * real PostgreSQL. A new migration shape is rejected until this grammar is reviewed.
 *
 * This is not a parser for PostgreSQL's full grammar and not a database sandbox: accepted DDL can
 * still reach existing objects (quoted column types, default operators, event triggers). Control
 * of the database, schemas, roles and migration content remains necessary.
 * Error messages never contain SQL text.
 */

export class SqlRejected extends Error {}

type Token =
  | { kind: 'word'; value: string } // unquoted identifier or keyword, lower-cased
  | { kind: 'ident'; value: string } // "quoted identifier", exact
  | { kind: 'string' }
  | { kind: 'number'; value: string }
  | { kind: 'punct'; value: string }

const WORD_START = /[A-Za-z_]/
const WORD_PART = /[A-Za-z0-9_$]/
const OPERATOR = /[+\-*/<>=~!@#%^&|`?]/
const PUNCT = /[()[\],;:.]/
const WHITESPACE = /[ \t\n\r\f\v]/

export function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const reject = (reason: string): never => {
    throw new SqlRejected(`Unsupported SQL: ${reason} (offset ${i})`)
  }
  // The wire protocol ends a query at NUL, so the server could read less than was validated.
  if (sql.includes('\0')) reject('NUL character')
  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]
    if (WHITESPACE.test(ch)) {
      i++
    } else if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n' && sql[i] !== '\r') i++
    } else if (ch === '/' && next === '*') {
      // PostgreSQL block comments nest.
      let depth = 0
      do {
        if (sql.startsWith('/*', i)) {
          depth++
          i += 2
        } else if (sql.startsWith('*/', i)) {
          depth--
          i += 2
        } else if (i >= sql.length) {
          reject('unterminated block comment')
        } else i++
      } while (depth > 0)
    } else if (ch === "'") {
      const prev = sql[i - 1]
      // E'', U&'', B'', X'', N'' change escaping or meaning; a backslash's meaning depends on
      // standard_conforming_strings. Neither is needed, so neither is accepted.
      if (prev !== undefined && (WORD_PART.test(prev) || prev === '&'))
        reject('prefixed string constant')
      i++
      for (;;) {
        if (i >= sql.length) reject('unterminated string')
        if (sql[i] === '\\') reject('backslash in string')
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") i += 2
          else break
        } else i++
      }
      i++
      tokens.push({ kind: 'string' })
    } else if (ch === '"') {
      const prev = sql[i - 1]
      if (prev !== undefined && (WORD_PART.test(prev) || prev === '&'))
        reject('prefixed identifier')
      let value = ''
      i++
      for (;;) {
        if (i >= sql.length) reject('unterminated quoted identifier')
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            value += '"'
            i += 2
          } else break
        } else value += sql[i++]
      }
      i++
      if (!value) reject('empty quoted identifier')
      tokens.push({ kind: 'ident', value })
    } else if (ch === '$') {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (!tag) reject(/^\$\d/.test(sql.slice(i)) ? 'positional parameter' : 'stray dollar sign')
      const close = sql.indexOf(tag![0], i + tag![0].length)
      if (close < 0) reject('unterminated dollar quote')
      i = close + tag![0].length
      tokens.push({ kind: 'string' })
    } else if (WORD_START.test(ch)) {
      const start = i
      while (i < sql.length && WORD_PART.test(sql[i])) i++
      tokens.push({ kind: 'word', value: sql.slice(start, i).toLowerCase() })
    } else if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(next ?? ''))) {
      // Deliberately smaller than PostgreSQL numeric syntax: whole unsigned decimal tokens,
      // optionally a fractional part. No exponent, base prefix, separator or attached name.
      const match = /^[0-9]+(?:\.[0-9]+)?/.exec(sql.slice(i))
      if (!match) reject('unsupported number')
      i += match![0].length
      if (i < sql.length && (WORD_PART.test(sql[i]) || sql[i] === '.')) reject('numeric suffix')
      tokens.push({ kind: 'number', value: match![0] })
    } else if (PUNCT.test(ch)) {
      tokens.push({ kind: 'punct', value: ch })
      i++
    } else if (OPERATOR.test(ch)) {
      // One character at a time, so `--` and `/*` inside an operator run still start comments.
      tokens.push({ kind: 'punct', value: ch })
      i++
    } else {
      reject('unexpected character')
    }
  }
  return tokens
}

/** Defence in depth: never valid in the grammar below, reported by name when they appear. */
const FORBIDDEN_WORDS = new Set([
  'begin',
  'commit',
  'rollback',
  'savepoint',
  'release',
  'abort',
  'transaction',
  'prepared',
  'concurrently',
  'select',
  'execute',
  'perform',
  'call',
  'copy',
  'function',
  'procedure',
  'trigger',
  'rule',
  'session',
  'role',
  'authorization',
])

/** Names that must not appear, even quoted or as a relation name. */
const FORBIDDEN_NAME =
  /^(pg_advisory|pg_try_advisory|pg_terminate|pg_cancel|pg_reload|pg_sleep|dblink|set_config$|lo_)/i

/** Built-in column types, unquoted. A quoted single name is a project enum type. */
const COLUMN_TYPES = new Set([
  'boolean',
  'int',
  'integer',
  'jsonb',
  'numeric',
  'serial',
  'text',
  'timestamp',
  'timestamptz',
  'varchar',
])

const word = (t: Token | undefined, value: string) => t?.kind === 'word' && t.value === value
const punct = (t: Token | undefined, value: string) => t?.kind === 'punct' && t.value === value
const isName = (t: Token | undefined) => t?.kind === 'word' || t?.kind === 'ident'

function checkStatement(tokens: Token[]) {
  for (const t of tokens) {
    if (t.kind === 'word' && FORBIDDEN_WORDS.has(t.value)) {
      throw new SqlRejected(
        `Unsupported SQL: "${t.value.toUpperCase()}" is not allowed in migrations`,
      )
    }
    if ((t.kind === 'word' || t.kind === 'ident') && FORBIDDEN_NAME.test(t.value)) {
      throw new SqlRejected('Unsupported SQL: reference to a session/lock control function')
    }
  }
  let p = 0
  const fail = (): never => {
    throw new SqlRejected('Unsupported SQL: statement shape is not on the allowlist')
  }
  const accept = (...words: string[]) => {
    if (!words.every((w, n) => word(tokens[p + n], w))) return false
    p += words.length
    return true
  }
  const need = (...words: string[]) => {
    if (!accept(...words)) fail()
  }
  const symbol = (value: string) => {
    if (!punct(tokens[p], value)) return false
    p++
    return true
  }
  const needSymbol = (value: string) => {
    if (!symbol(value)) fail()
  }
  const name = () => {
    if (!isName(tokens[p])) fail()
    p++
  }
  /** Relation or type name; the only schema qualifier is public. */
  const relation = () => {
    if (punct(tokens[p + 1], '.')) {
      const schema = tokens[p]
      if (!isName(schema) || (schema as { value: string }).value !== 'public') fail()
      p += 2
    }
    name()
  }
  const number = (type: 'timestamp' | 'varchar') => {
    const n = tokens[p]
    if (n?.kind !== 'number' || !/^\d+$/.test(n.value)) return fail()
    const value = BigInt(n.value)
    if (type === 'timestamp' ? value > 6n : value < 1n || value > 10485760n) fail()
    p++
  }
  const columnType = () => {
    const t = tokens[p]
    if (t?.kind === 'ident') {
      p++
      return
    }
    if (t?.kind !== 'word' || !COLUMN_TYPES.has(t.value)) return fail()
    p++
    if ((t.value === 'timestamp' || t.value === 'varchar') && symbol('(')) {
      number(t.value)
      needSymbol(')')
    }
    if (t.value === 'timestamp') accept('with', 'time', 'zone')
  }
  const defaultValue = () => {
    const t = tokens[p]
    if (t?.kind === 'string' || t?.kind === 'number') p++
    else if (accept('now')) {
      needSymbol('(')
      needSymbol(')')
    } else if (!accept('true') && !accept('false')) fail()
  }
  const column = () => {
    name()
    columnType()
    for (;;) {
      if (accept('default')) defaultValue()
      else if (!accept('not', 'null') && !accept('primary', 'key')) return
    }
  }
  const list = (item: () => void) => {
    needSymbol('(')
    do item()
    while (symbol(','))
    needSymbol(')')
  }
  const stringValue = () => {
    if (tokens[p]?.kind !== 'string') fail()
    p++
  }

  if (accept('create', 'table')) {
    accept('if', 'not', 'exists')
    relation()
    list(column)
  } else if (accept('create', 'type')) {
    relation()
    need('as', 'enum')
    list(stringValue)
  } else if (accept('create')) {
    accept('unique')
    need('index')
    accept('if', 'not', 'exists')
    name()
    need('on')
    relation()
    need('using', 'btree')
    list(name)
  } else {
    need('alter', 'table')
    relation()
    if (accept('add', 'column')) column()
    else {
      need('add', 'constraint')
      name()
      need('foreign', 'key')
      list(name)
      need('references')
      relation()
      list(name)
      need('on', 'delete')
      if (!accept('cascade')) need('set', 'null')
      need('on', 'update', 'no', 'action')
    }
  }
  if (p !== tokens.length) fail()
}

/** Returns the number of statements; throws SqlRejected for anything outside the allowlist. */
export function validateMigrationSql(sql: string): number {
  const tokens = tokenizeSql(sql)
  let current: Token[] = []
  let count = 0
  for (const t of [...tokens, { kind: 'punct', value: ';' } as Token]) {
    if (t.kind === 'punct' && t.value === ';') {
      if (current.length) {
        checkStatement(current)
        count++
      }
      current = []
    } else current.push(t)
  }
  if (!count) throw new SqlRejected('Unsupported SQL: no statements')
  return count
}
