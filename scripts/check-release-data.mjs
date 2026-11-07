// Pre-release check (READ ONLY): the database a release will use must not contain review/demo data.
//
//   node scripts/check-release-data.mjs path/to/.env   → DATABASE_URL from THAT file only
//   node scripts/check-release-data.mjs                → DATABASE_URL from the shell environment
//
// With a file: a missing/unreadable file or an empty/missing DATABASE_URL in it is "cannot check"
// (exit 2) BEFORE any connection; the shell's DATABASE_URL is never used as a fallback, so a mistyped
// path can never silently check another database. Prints which source was used and the database
// name, never the connection string. Runs inside a READ ONLY transaction.
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

const c = new pg.Client({ connectionString: url })
let found = 0
try {
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
  console.error('CANNOT CHECK:', error instanceof Error ? error.message : error)
  process.exit(2)
} finally {
  await c.end().catch(() => {})
}
console.log(found === 0 ? 'CLEAN: no review/demo data' : `NOT CLEAN: ${found} demo record(s) — do not release with this database`)
process.exit(found === 0 ? 0 : 1)
