// Pre-release check (READ ONLY): the database a release will use must not contain review/demo data.
//
//   node scripts/check-release-data.mjs [path/to/.env]     (default: ./.env; reads DATABASE_URL)
//
// Runs inside a READ ONLY transaction and prints no secrets. Exit 0 = clean, 1 = demo data found,
// 2 = could not check. Looks for, in published rows AND in saved versions/drafts:
//  - the three sample stores of the contact demo ("Điểm bán minh họa" / "예시 매장" / "Sample store"),
//  - the "[MẪU]" guest sample product (slug mau-san-pham-thu, names "[MẪU]" / "[SAMPLE]" / "[샘플]"),
//  - the review staff accounts (…@test.local).
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
const pg = require('pg')

const envFile = resolve(process.argv[2] ?? '.env')
const env = dotenv.config({ path: envFile, processEnv: {} }).parsed ?? {}
const url = env.DATABASE_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error(`CANNOT CHECK: no DATABASE_URL in ${envFile}`)
  process.exit(2)
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
  console.log(`Release data check on database "${db}" (read only)`)
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
