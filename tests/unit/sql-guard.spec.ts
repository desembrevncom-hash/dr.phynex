// Pure in-memory tests of the SQL lexer/allowlist. No database is involved; these show what the
// validator accepts or rejects, not how PostgreSQL would execute the SQL.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { buildPlan, literalMigration } from '../../scripts/lib/migration-plan'
import { testAllowlist } from '../helpers/migration-allowlist'
import { SqlRejected, tokenizeSql, validateMigrationSql } from '../../scripts/lib/sql-guard'

const OK = 'CREATE TABLE "a" ("id" serial PRIMARY KEY NOT NULL)'
const rejects = (sql: string) => expect(() => validateMigrationSql(sql), sql).toThrow(SqlRejected)
const accepts = (sql: string) => expect(validateMigrationSql(sql), sql).toBeGreaterThan(0)

describe('L5 complete numeric lexemes', () => {
  it.each([
    '1unique',
    '1check',
    '1abc',
    '0x10',
    '0o10',
    '0b10',
    '1_000',
    '1e3',
    '1E+3',
    '.5',
    '1.',
    '1..2',
  ])('rejects unsupported number %s in every numeric position', (value) => {
    rejects(`CREATE TABLE x(a numeric DEFAULT ${value})`)
    rejects(`CREATE TABLE x(a varchar(${value}))`)
    rejects(`CREATE TABLE x(a timestamp(${value}))`)
  })
  it.each(['1.5', '0', '10485761'])('rejects invalid varchar modifier %s', (value) =>
    rejects(`CREATE TABLE x(a varchar(${value}))`),
  )
  it.each(['1.5', '7'])('rejects invalid timestamp modifier %s', (value) =>
    rejects(`CREATE TABLE x(a timestamp(${value}))`),
  )
  it('retains supported integer/decimal constants and integer modifiers', () => {
    accepts('CREATE TABLE x(a numeric DEFAULT 1.25, b varchar(128), c timestamp(3))')
  })
})

describe('Codex qualified-call and statement-shape regressions', () => {
  it.each([
    'CREATE TABLE x(a int DEFAULT attacker.now())',
    'CREATE TABLE x(a int DEFAULT attacker.btree())',
    'CREATE TABLE x(a int DEFAULT attacker /* comment */ . now())',
    'CREATE TABLE x(a int DEFAULT "attacker".now())',
    'CREATE TABLE x(a int DEFAULT btree())',
    'CREATE TABLE x(a int DEFAULT varchar(1))',
    'CREATE TABLE x AS TABLE y',
    'CREATE TABLE x (LIKE y INCLUDING DEFAULTS)',
  ])('rejects %s', rejects)
  it('keeps actual type/index syntax distinct from a DEFAULT function', () => {
    accepts('CREATE TABLE x(a varchar(128), b timestamp(3) DEFAULT now())')
    accepts('CREATE INDEX i ON public.x USING btree (a)')
    // The migrations only use unqualified now(); a qualified form is outside the grammar.
    rejects('CREATE TABLE x(a timestamp DEFAULT pg_catalog.now())')
    rejects('CREATE TABLE x(a timestamp DEFAULT now(1))')
    rejects('CREATE TABLE x(a timestamp DEFAULT "now"())')
  })
})

describe('forms the approved migrations do not use are outside the grammar', () => {
  it.each([
    ['DROP TABLE', 'DROP TABLE users CASCADE'],
    ['DROP TYPE', 'DROP TYPE t CASCADE'],
    ['DROP INDEX', 'DROP INDEX i'],
    ['ALTER TYPE', "ALTER TYPE t ADD VALUE 'x'"],
    ['owner change', 'ALTER TABLE a OWNER TO attacker'],
    ['row security off', 'ALTER TABLE a DISABLE ROW LEVEL SECURITY'],
    ['move to schema', 'ALTER TABLE a SET SCHEMA attacker'],
    ['rename', 'ALTER TABLE a RENAME TO b'],
    ['drop column', 'ALTER TABLE a DROP COLUMN b'],
    ['second sub-command', 'ALTER TABLE a ADD COLUMN b int, OWNER TO attacker'],
    ['second sub-command drop', 'ALTER TABLE a ADD COLUMN b int, DROP COLUMN c'],
    ['USING cast', 'ALTER TABLE a ALTER COLUMN b TYPE int USING b::attacker.t'],
    ['qualified column type', "ALTER TABLE a ADD COLUMN b attacker.t DEFAULT 'x'"],
    ['cast in DEFAULT', "ALTER TABLE a ADD COLUMN b text DEFAULT 'x'::attacker.t"],
    ['OPERATOR()', 'ALTER TABLE a ADD COLUMN b text DEFAULT 1 OPERATOR(attacker.+) 2'],
    ['check constraint', 'ALTER TABLE a ADD CONSTRAINT c CHECK (b > 0)'],
    ['unique constraint', 'ALTER TABLE a ADD CONSTRAINT c UNIQUE (b)'],
    ['tablespace on table', 'CREATE TABLE x (id int) TABLESPACE y'],
    ['bulk tablespace move', 'ALTER TABLE ALL IN TABLESPACE x SET TABLESPACE y'],
    ['storage options', 'CREATE TABLE x (id int) WITH (fillfactor = 50)'],
    ['text after the column list', 'CREATE TABLE x (id int) WITHOUT OIDS'],
    ['temporary table', 'CREATE TEMP TABLE x (id int)'],
    ['table constraint', 'CREATE TABLE x (id int, PRIMARY KEY (id))'],
    ['generated column', 'CREATE TABLE x (a int, b int GENERATED ALWAYS AS (a) STORED)'],
    ['composite type', 'CREATE TYPE t AS (a int)'],
    ['enum with a non-string', 'CREATE TYPE t AS ENUM (1)'],
    ['text after enum', "CREATE TYPE t AS ENUM ('a') OWNER"],
    ['non-btree index', 'CREATE INDEX i ON a USING gin (b)'],
    ['index without USING', 'CREATE INDEX i ON a (b)'],
    ['expression index', 'CREATE INDEX i ON a USING btree (lower(b))'],
    ['partial index', 'CREATE INDEX i ON a USING btree (b) WHERE b > 0'],
    ['covering index', 'CREATE INDEX i ON a USING btree (b) INCLUDE (c)'],
    ['schema other than public', 'CREATE TABLE attacker.x (id int)'],
    ['quoted schema other than public', 'CREATE TABLE "attacker"."x" (id int)'],
    [
      'foreign key to another schema',
      'ALTER TABLE a ADD CONSTRAINT c FOREIGN KEY (b) REFERENCES attacker.t (id) ON DELETE CASCADE ON UPDATE NO ACTION',
    ],
    [
      'foreign key without actions',
      'ALTER TABLE a ADD CONSTRAINT c FOREIGN KEY (b) REFERENCES t (id)',
    ],
    ['unknown unquoted type', 'CREATE TABLE x (a money)'],
    ['type modifier on an expression position', 'CREATE TABLE x (a varchar(1, 2))'],
  ])('%s', (_label, sql) => rejects(sql))

  it('a NUL character is rejected: the wire protocol would cut the query there', () => {
    rejects(`ALTER TABLE "a" ADD COLUMN "b" text DEFAULT 'x${String.fromCharCode(0)}y'`)
    rejects(`${OK}; -- ${String.fromCharCode(0)}`)
  })

  it('every exact shape the migrations use is accepted, in any letter case and layout', () => {
    accepts(`create   index "i" on "t" using btree ("a", "b")`)
    accepts(`CREATE UNIQUE INDEX IF NOT EXISTS "i" ON public."t" USING BTREE ("a")`)
    accepts(`CREATE TYPE "public"."e" AS ENUM('a', 'b')`)
    accepts(
      `CREATE TABLE IF NOT EXISTS "t" (\n\t"id" serial PRIMARY KEY NOT NULL,\n\t"e" "enum_x" DEFAULT 'a' NOT NULL,\n\t"n" numeric DEFAULT 0,\n\t"b" boolean DEFAULT false NOT NULL,\n\t"d" timestamp(3) with time zone DEFAULT now() NOT NULL\n)`,
    )
    accepts(`ALTER TABLE "t" ADD COLUMN "c" varchar DEFAULT 'x'`)
    accepts(
      `ALTER TABLE "t" ADD CONSTRAINT "f" FOREIGN KEY ("a") REFERENCES "public"."u"("id") ON DELETE set null ON UPDATE no action`,
    )
  })
})

describe('transaction control hidden by comments, whitespace or extra statements', () => {
  it.each([
    ['line comment before COMMIT', `${OK};\n-- note\nCOMMIT`],
    ['line comment directly after ;', `${OK};-- x\nCOMMIT;`],
    ['block comment before COMMIT', `${OK}; /* note */ COMMIT;`],
    ['block comment right after ;', `${OK};/**/COMMIT`],
    ['comment containing ;', `${OK}; /* ; still a comment ; */ COMMIT`],
    ['line comment containing ;', `${OK}; -- a; b;\nCOMMIT`],
    ['multi-line block comment', `${OK};\n/*\n line 1;\n line 2\n*/\n  COMMIT`],
    ['nested block comment', `${OK}; /* outer /* inner */ still comment */ COMMIT`],
    ['statements on later lines', `${OK};\n\n\tCREATE TABLE "b" ("id" int);\n   COMMIT\n;`],
    ['CR line ending ends a -- comment', `${OK};-- x\rCOMMIT`],
    ['tabs and form feed', `${OK};\t\f\vCOMMIT`],
  ])('%s', (_label, sql) => rejects(sql))

  it.each([
    'COMMIT',
    'COMMIT AND CHAIN',
    'END',
    'BEGIN',
    'BEGIN ISOLATION LEVEL SERIALIZABLE',
    'START TRANSACTION',
    'ROLLBACK',
    'ABORT',
    'SAVEPOINT s1',
    'RELEASE SAVEPOINT s1',
    'RELEASE s1',
    'ROLLBACK TO SAVEPOINT s1',
    'ROLLBACK TO s1',
    "PREPARE TRANSACTION 'x'",
    "COMMIT PREPARED 'x'",
    'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
    'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY',
    'SET ROLE postgres',
    'SET SESSION AUTHORIZATION postgres',
    'RESET ALL',
    'DISCARD ALL',
    'SET search_path = evil',
    'CALL do_commit()',
    'DO $$ BEGIN COMMIT; END $$',
    'LOCK TABLE "a"',
    'VACUUM "a"',
    'SELECT pg_advisory_unlock_all()',
    'CREATE INDEX CONCURRENTLY "i" ON "a" ("id")',
    'DROP INDEX CONCURRENTLY "i"',
    'CREATE DATABASE x',
    'ALTER SYSTEM SET fsync = off',
    'ALTER DATABASE x SET default_transaction_isolation = serializable',
    'ALTER ROLE x SET search_path = evil',
    'CREATE FUNCTION f() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$',
    'CREATE PROCEDURE p() LANGUAGE plpgsql AS $$ BEGIN COMMIT; END $$',
    'CREATE RULE r AS ON INSERT TO a DO ALSO NOTIFY x',
  ])('rejects %s, alone or after DDL', (sql) => {
    rejects(sql)
    rejects(`${OK}; ${sql}`)
    rejects(`${OK};\n${sql.toLowerCase()};`)
  })

  it('rejects transaction words embedded inside an allowed statement', () => {
    rejects('ALTER TABLE "a" ADD COLUMN "b" int; ROLLBACK')
    rejects('ALTER TABLE "a" ADD COLUMN "b" int /* */ ; /* */ begin /* */')
  })

  it('rejects functions that act on the session, the lock or another connection, quoted or not', () => {
    for (const fn of [
      'pg_advisory_unlock_all()',
      '"pg_advisory_unlock_all"()',
      'pg_catalog.pg_advisory_unlock(1, 2)',
      'pg_terminate_backend(1)',
      "set_config('role', 'postgres', false)",
      "dblink_exec('x', 'COMMIT')",
      "nextval('s')",
      'my_function()',
    ]) {
      rejects(`ALTER TABLE "a" ADD COLUMN "b" text DEFAULT ${fn}`)
      rejects(`CREATE INDEX "i" ON "a" ((${fn}))`)
    }
  })
})

describe('keywords inside literals and identifiers are data, not statements', () => {
  it.each([
    ['string literal', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT 'COMMIT; BEGIN; ROLLBACK'`],
    ['string with doubled quotes', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT 'it''s; COMMIT'`],
    ['string with comment markers', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT '-- /* COMMIT'`],
    ['quoted identifier', `CREATE TABLE "COMMIT; ROLLBACK" ("SAVEPOINT" int, "begin" int)`],
    ['quoted identifier with doubled quote', `CREATE TABLE "a""; COMMIT" ("id" int)`],
    ['dollar-quoted string', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT $$COMMIT; '--$$`],
    ['tagged dollar quote', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT $x$ $$ COMMIT $$ $x$`],
    ['comment text', `-- COMMIT;\n/* ROLLBACK; /* BEGIN */ */ ${OK}`],
    ['enum values', `CREATE TYPE "t" AS ENUM('commit', 'rollback', 'begin')`],
  ])('%s', (_label, sql) => accepts(sql))

  it('the SQL itself is never rewritten: the plan keeps the original text', () => {
    const sql = `-- header comment\n${OK}; /* trailing */`
    const src =
      'import { sql } from "@payloadcms/db-postgres"; export async function up({db}) { await db.execute(sql`' +
      sql +
      '`); }'
    expect(literalMigration(src)).toEqual([sql])
  })
})

describe('fail closed on anything the lexer cannot read with certainty', () => {
  it.each([
    ['unterminated string', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT 'x`],
    ['unterminated identifier', 'CREATE TABLE "a ("id" int)'],
    ['unterminated block comment', `${OK}; /* never closed`],
    ['unbalanced nested comment', `${OK}; /* a /* b */ COMMIT`],
    ['unterminated dollar quote', `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT $$x`],
    [
      'backslash in string (depends on standard_conforming_strings)',
      `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT 'x\\'; COMMIT; --'`,
    ],
    ["escape string E''", `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT E'x'`],
    ["unicode string U&''", `ALTER TABLE "a" ADD COLUMN "b" text DEFAULT U&'x'`],
    ['unicode identifier U&""', 'CREATE TABLE U&"a" ("id" int)'],
    ['positional parameter', 'ALTER TABLE "a" ADD COLUMN "b" int DEFAULT $1'],
    ['psql meta-command', `${OK};\n\\set x 1`],
    ['psql variable-like :', `${OK}; :'x'`],
    ['non-ASCII outside quotes', 'CREATE TABLE ä ("id" int)'],
    ['empty quoted identifier', 'CREATE TABLE "" ("id" int)'],
    ['empty migration', '  -- nothing\n ; ;'],
    ['statement of unknown type', 'GRANT ALL ON "a" TO PUBLIC'],
    ['unknown object type', 'CREATE VIEW "v" AS SELECT 1'],
  ])('%s', (_label, sql) => rejects(sql))

  it('error messages do not contain SQL text', () => {
    try {
      validateMigrationSql(`${OK}; SELECT 'SECRET_TOKEN_VALUE'`)
      expect.unreachable()
    } catch (e) {
      expect(String((e as Error).message)).not.toMatch(/SECRET_TOKEN_VALUE|CREATE TABLE/)
    }
  })

  it('tokenizer keeps quoted names exact and folds unquoted words', () => {
    expect(tokenizeSql('CREATE TABLE "MiXed" (x int)').slice(0, 3)).toEqual([
      { kind: 'word', value: 'create' },
      { kind: 'word', value: 'table' },
      { kind: 'ident', value: 'MiXed' },
    ])
  })
})

describe('home banners migration is approved', () => {
  const dir = 'src/migrations'
  const files = readdirSync(dir)
  const sources = Object.fromEntries(
    files
      .filter((f) => /\.(ts|js)$/.test(f) && f !== 'index.ts')
      .map((f) => [f, readFileSync(`${dir}/${f}`, 'utf8')]),
  )
  const name = '20261105_085002_home_banners.ts'
  it('the executor allowlist has the six approved migrations, banner last', () => {
    const approved = readFileSync('deploy/migrations.approved.json', 'utf8')
    const names = JSON.parse(approved).files.map((f: { filename: string }) => f.filename)
    expect(names).toHaveLength(6)
    expect(names.at(-1)).toBe(name)
    // Planning only the approved files: the banner migration is the sixth and last step.
    const approvedOnly = files.filter((f) => !f.startsWith(landing.replace(/\.ts$/, '')) && !f.startsWith(approvals.replace(/\.ts$/, '')))
    const plan = buildPlan(approvedOnly, sources, approved)
    expect(plan.steps).toHaveLength(6)
    expect(plan.steps.at(-1)?.filename).toBe(name)
  })
  it('the approved fingerprint is the exact byte hash of the migration', () => {
    const entry = JSON.parse(readFileSync('deploy/migrations.approved.json', 'utf8')).files.find(
      (f: { filename: string }) => f.filename === name,
    )
    expect(
      createHash('sha256')
        .update(readFileSync(`${dir}/${name}`))
        .digest('hex'),
    ).toBe(entry.sha256)
  })
})

const landing = '20261107_050810_landing_blocks.ts'
const approvals = '20261109_024237_landing_approvals.ts'
describe('landing migrations are proposed, not approved', () => {
  const dir = 'src/migrations'
  const files = readdirSync(dir)
  const sources = Object.fromEntries(
    files
      .filter((f) => /\.(ts|js)$/.test(f) && f !== 'index.ts')
      .map((f) => [f, readFileSync(`${dir}/${f}`, 'utf8')]),
  )
  it('is absent from the executor allowlist, so the real executor refuses the migration set', () => {
    const approved = readFileSync('deploy/migrations.approved.json', 'utf8')
    expect(approved).not.toContain('landing_blocks')
    expect(approved).not.toContain('landing_approvals')
    expect(() => buildPlan(files, sources, approved)).toThrow('Migration discovery differs')
  })
  it('the proposal records the exact bytes and cannot be read as an allowlist by itself', () => {
    const proposed = JSON.parse(readFileSync('deploy/migrations.proposed.json', 'utf8'))
    expect(proposed.files.map((f: { filename: string }) => f.filename)).toEqual([landing, approvals])
    for (const entry of proposed.files as Array<{ filename: string; sha256: string }>) {
      expect(createHash('sha256').update(readFileSync(`${dir}/${entry.filename}`)).digest('hex')).toBe(entry.sha256)
    }
    expect(() => buildPlan(files, sources, readFileSync('deploy/migrations.proposed.json', 'utf8'))).toThrow()
  })
  it('is additive only: CREATE TYPE/TABLE/INDEX and foreign keys on its own new tables', () => {
    const plan = buildPlan(files, sources, testAllowlist())
    const step = plan.steps.find((s) => s.filename === landing)!
    const statements = step.statements.flatMap((sql) => sql.split(/;\s*/)).map((s) => s.trim()).filter(Boolean)
    expect(statements).toHaveLength(234)
    for (const sql of statements) {
      expect(sql).toMatch(/^(CREATE (TYPE|TABLE|INDEX|UNIQUE INDEX) "(public"\."enum_+lp_|_?lp_)|ALTER TABLE "_?lp_[a-z0-9_]+" ADD CONSTRAINT)/)
    }
  })
  it('the approvals migration only adds one nullable jsonb column to products and its versions', () => {
    const plan = buildPlan(files, sources, testAllowlist())
    const step = plan.steps.find((s) => s.filename === approvals)!
    const statements = step.statements.flatMap((sql) => sql.split(/;\s*/)).map((s) => s.trim()).filter(Boolean)
    expect(statements).toEqual([
      'ALTER TABLE "products" ADD COLUMN "landing_approvals" jsonb',
      'ALTER TABLE "_products_v" ADD COLUMN "version_landing_approvals" jsonb',
    ])
  })
})

describe('the approved migrations (via the test allowlist helper)', () => {
  it('pass unchanged with their pinned fingerprints', () => {
    const dir = 'src/migrations'
    const files = readdirSync(dir)
    const sources = Object.fromEntries(
      files
        .filter((f) => /\.(ts|js)$/.test(f) && f !== 'index.ts')
        .map((f) => [f, readFileSync(`${dir}/${f}`, 'utf8')]),
    )
    const plan = buildPlan(files, sources, testAllowlist())
    expect(plan.steps.map((s) => s.name)).toEqual([
      '20261028_101829_initial',
      '20261029_021524_media_release_and_line_appearance',
      '20261029_035541_product_editorial_note',
      '20261029_080000_form_rate_limits',
      '20261029_100000_storage_fields',
      '20261105_085002_home_banners',
      '20261107_050810_landing_blocks',
      '20261109_024237_landing_approvals',
    ])
    expect(plan.steps.flatMap((s) => s.statements.map(validateMigrationSql))).toEqual([
      665, 11, 2, 2, 4, 282, 234, 2,
    ])
  })
})
