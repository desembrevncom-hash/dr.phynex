import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Migration, type Payload, type Config } from 'payload'
import { beforeAll, afterAll, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import config from '@/payload.config'
import { objectStorage } from '@/config/storage'
import { migrations } from '@/migrations'
import { assertDisposableDatabase } from '../helpers/database'
let payload: Payload
beforeAll(async () => { payload = await getPayload({ config }); await assertDisposableDatabase(payload) })
afterAll(async () => { await payload?.destroy() })
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
async function reset() { await assertDisposableDatabase(payload); await payload.db.dropDatabase({ adapter: payload.db as never }) }
it('migrates a fresh database with stable upload columns', async () => {
 await reset()
 await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
 const r = await db().execute(sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('media','source_documents') AND column_name IN ('prefix','_objectkey')`)
 expect(r.rows).toHaveLength(4)
})
it('upgrades existing upload rows without losing metadata', async () => {
 await reset()
 await payload.db.migrate({ migrations: migrations.slice(0,-1) as unknown as Migration[] })
 await db().execute(sql`INSERT INTO media (filename, public_release, created_at, updated_at) VALUES ('existing.png', true, now(), now()); INSERT INTO source_documents (title, filename, created_at, updated_at) VALUES ('Existing source', 'source.pdf', now(), now());`)
 await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
 const m = await db().execute(sql`SELECT filename, prefix, public_release FROM media`)
 expect(m.rows[0]).toMatchObject({ filename:'existing.png', prefix:'media', public_release:true })
 const s = await db().execute(sql`SELECT title, prefix FROM source_documents`)
 expect(s.rows[0]).toMatchObject({ title:'Existing source', prefix:'source-documents' })
 const read = await payload.find({collection:'media',locale:'en'})
 expect(read.docs[0].filename).toBe('existing.png')
})
it('inserts the same fields with the S3 adapter disabled and enabled, without contacting a bucket', async () => {
 const base = { collections: [{ slug:'media', fields:[], upload:{ staticDir:'media' } }, { slug:'source-documents', fields:[], upload:{ staticDir:'private' } }] } as unknown as Config
 const disabled = await objectStorage()[0](base)
 Object.assign(process.env, { S3_BUCKET:'test-invalid', S3_ACCESS_KEY_ID:'test', S3_SECRET_ACCESS_KEY:'test', S3_ENDPOINT:'http://127.0.0.1:1' })
 try {
  const enabled = await objectStorage()[0](base)
  const names = (c: Config) => c.collections?.map(x => x.fields.map(f => 'name' in f ? f.name : '').sort())
  expect(names(enabled)).toEqual(names(disabled))
  expect(names(disabled)?.[0]).toContain('_objectKey')
  expect(names(disabled)?.[0]).toContain('prefix')
 } finally { for (const key of ['S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_ENDPOINT']) delete process.env[key] }
})

it('has no schema drift from the latest committed migration snapshot (home banners)', async () => {
 const {readFileSync}=await import('node:fs')
 const adapter=payload.db as unknown as PostgresAdapter
 const kit=adapter.requireDrizzleKit()
 const generated=await kit.generateDrizzleJson(adapter.schema)
 const saved=JSON.parse(readFileSync('src/migrations/20261105_085002_home_banners.json','utf8'))
 expect(await kit.generateMigration(saved,generated)).toEqual([])
})
