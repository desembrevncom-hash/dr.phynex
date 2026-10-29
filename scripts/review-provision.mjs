import 'dotenv/config'
import pg from 'pg'
const name = 'drphynex_independent_review_test'
const marker = 'drphynex-independent-review-disposable-v1'
const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Only the existing local PostgreSQL is allowed')
url.pathname = '/postgres'
const client = new pg.Client({ connectionString: url.toString() })
try {
 await client.connect()
 const identity = await client.query('SELECT current_database() AS name')
 if (identity.rows[0].name !== 'postgres') throw new Error('Provisioning connection mismatch')
 const existing = await client.query("SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = $1", [name])
 if (!existing.rowCount) {
  await client.query('CREATE DATABASE "' + name + '"')
  await client.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`)
 } else if (existing.rows[0].marker !== marker) throw new Error('Refusing an existing unmarked database')
 console.log('Dedicated disposable review database verified; live database untouched')
} finally { await client.end() }
