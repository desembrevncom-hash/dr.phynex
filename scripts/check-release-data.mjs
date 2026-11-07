// Pre-release check (READ ONLY): the database a release will use must not contain review/demo data.
//
//   node scripts/check-release-data.mjs path/to/.env   → DATABASE_URL from THAT file only
//   node scripts/check-release-data.mjs                → DATABASE_URL from the shell environment
//
// With a file: a missing/unreadable file or an empty/missing DATABASE_URL in it is "cannot check"
// (exit 2) BEFORE any connection; the shell's DATABASE_URL is never used as a fallback, so a mistyped
// path can never silently check another database. The URL must be an explicit PostgreSQL URL
// (postgres:// or postgresql://, host, valid port if any, database name); anything else is exit 2
// before a client is created. Prints which source was used and the database name, never the
// connection string or raw driver errors (only a fixed reason + error code). Runs inside a READ
// ONLY transaction.
// Exit 0 = clean, 1 = demo data found, 2 = could not check. Looks for, in published rows AND in saved
// versions/drafts:
//  - the three sample stores of the contact demo ("Điểm bán minh họa" / "예시 매장" / "Sample store"),
//  - the "[MẪU]" guest sample product (slug mau-san-pham-thu, names "[MẪU]" / "[SAMPLE]" / "[샘플]"),
//  - the review staff accounts (…@test.local).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
const pg = require('pg')

const cannotCheck = (reason) => {
  console.error(`CANNOT CHECK: ${reason}`)
  process.exit(2)
}

let url
let source
if (process.argv[2] !== undefined) {
  // A file was given: it is the only source.
  const envFile = resolve(process.argv[2])
  let text
  try {
    text = readFileSync(envFile, 'utf8')
  } catch (error) {
    cannotCheck(`cannot read env file ${envFile} (${error?.code ?? 'error'}); the shell's DATABASE_URL is not used`)
  }
  url = (dotenv.parse(text).DATABASE_URL ?? '').trim()
  if (!url) cannotCheck(`no DATABASE_URL in ${envFile}; the shell's DATABASE_URL is not used`)
  source = `env file ${envFile}`
} else {
  url = (process.env.DATABASE_URL ?? '').trim()
  if (!url) cannotCheck('no env file given and no DATABASE_URL in the shell')
  source = 'shell DATABASE_URL'
}

/**
 * Accepts only an explicit PostgreSQL URL: postgres:// or postgresql://, a host, a valid port when
 * one is written (1–65535) and a database name. Returns a fixed reason, never the URL or any part
 * of it, so nothing about the connection can end up in the output.
 */
function invalidDatabaseUrl(value) {
  let parsed
  try {
    // The WHATWG parser already rejects non-numeric ports and ports above 65535.
    parsed = new URL(value)
  } catch {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? 'malformed URL or invalid port' : 'not a URL'
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return 'scheme must be postgres:// or postgresql://'
  if (!parsed.hostname) return 'missing host'
  if (parsed.port !== '' && Number(parsed.port) < 1) return 'invalid port'
  let database
  try {
    database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  } catch {
    return 'invalid database name'
  }
  if (!database || database.includes('/')) return 'missing database name'
  return null
}
const invalid = invalidDatabaseUrl(url)
if (invalid) cannotCheck(`DATABASE_URL from ${source} is not a valid PostgreSQL URL (${invalid})`)

/** Fixed descriptions for connection/query failures: the raw driver message (host, port, user,
 * database names) is never printed, only a category and the error code. */
function failureReason(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{2,20}$/.test(error.code) ? error.code : null
  const known = {
    ECONNREFUSED: 'connection refused',
    ENOTFOUND: 'host not found',
    EAI_AGAIN: 'host lookup failed',
    ETIMEDOUT: 'connection timed out',
    ECONNRESET: 'connection reset',
    '28P01': 'authentication failed',
    '28000': 'authentication failed',
    '3D000': 'database does not exist',
    '42P01': 'expected table missing (not this site\'s database?)',
    '25006': 'write attempted in a read-only transaction',
  }
  const what = (code && known[code]) ?? 'connection or query failed'
  return code ? `${what} (code ${code})` : what
}

const checks = [
  {
    name: 'sample stores (published rows)',
    sql: `select l._locale, l.name from stores_locales l where l.name like 'Điểm bán minh họa%' or l.name like '예시 매장%' or l.name like 'Sample store%'`,
  },
  {
    name: 'sample stores (versions / drafts)',
    sql: `select l._locale, l.version_name as name from _stores_v_locales l where l.version_name like 'Điểm bán minh họa%' or l.version_name like '예시 매장%' or l.version_name like 'Sample store%'`,
  },
  {
    name: '"[MẪU]" sample product (rows + versions)',
    sql: `select 'row' as kind, p.slug from products p where p.slug = 'mau-san-pham-thu'
          union all select 'version', v.version_slug from _products_v v where v.version_slug = 'mau-san-pham-thu'
          union all select 'name', l.name from products_locales l where l.name like '[MẪU]%' or l.name like '[SAMPLE]%' or l.name like '[샘플]%'`,
  },
  { name: 'review staff accounts (@test.local)', sql: `select email from users where email like '%@test.local'` },
]

let c
let found = 0
try {
  // Inside the try: a configuration error from the driver is "cannot check" too.
  c = new pg.Client({ connectionString: url })
  await c.connect()
  await c.query('BEGIN TRANSACTION READ ONLY')
  const db = (await c.query('select current_database() as d')).rows[0].d
  console.log(`Release data check on database "${db}" (read only; source: ${source})`)
  for (const check of checks) {
    const rows = (await c.query(check.sql)).rows
    found += rows.length
    const distinct = [...new Set(rows.map((r) => Object.values(r).join(':')))]
    const sample = distinct.slice(0, 12).join(', ') + (distinct.length > 12 ? ', …' : '')
    console.log(`${rows.length === 0 ? 'OK  ' : 'FAIL'} ${check.name}: ${rows.length} row(s)${rows.length ? ` → ${distinct.length} distinct: ${sample}` : ''}`)
  }
  await c.query('ROLLBACK')
} catch (error) {
  await c?.end().catch(() => {})
  cannotCheck(failureReason(error))
} finally {
  await c?.end().catch(() => {})
}
console.log(found === 0 ? 'CLEAN: no review/demo data' : `NOT CLEAN: ${found} demo record(s) — do not release with this database`)
process.exit(found === 0 ? 0 : 1)
