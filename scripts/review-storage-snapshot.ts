import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { getPayload } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { assertDisposableDatabase, TEST_DATABASE } from '../tests/helpers/database'
async function main() {
 const url=new URL(process.env.DATABASE_URL!)
 if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Local review only')
 url.pathname='/'+TEST_DATABASE;process.env.DATABASE_URL=url.toString()
 for(const key of ['S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_ENDPOINT','SMTP_HOST','VERCEL']) delete process.env[key]
 const {default:config}=await import('../src/payload.config')
 const payload=await getPayload({config})
 try {
  await assertDisposableDatabase(payload)
  const db=payload.db as unknown as PostgresAdapter
  const snapshot=await db.requireDrizzleKit().generateDrizzleJson(db.schema)
  writeFileSync('src/migrations/20261029_100000_storage_fields.json',JSON.stringify(snapshot,null,2)+'\n')
  console.log('Generated storage migration snapshot from actual adapter schema; no database changes')
 } finally { await payload.destroy() }
}
main().then(()=>process.exit(0)).catch(()=>{console.error('Storage snapshot generation failed');process.exit(1)})
