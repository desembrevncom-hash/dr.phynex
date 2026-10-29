import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
const target = realpathSync(process.argv[2] || '')
if (!target.replaceAll('\\','/').endsWith('/.codex/worktrees/independent-review/website-demo')) throw new Error('Use the isolated review build checkout')
const url = new URL(process.env.DATABASE_URL)
if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Local database only')
url.pathname = '/drphynex_independent_review_test'
const client = new pg.Client({ connectionString: url.toString() })
try {
 await client.connect()
 const r=await client.query("SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")
 if(r.rows[0]?.name !== 'drphynex_independent_review_test' || r.rows[0]?.marker !== 'drphynex-independent-review-disposable-v1') throw new Error('Test database identity mismatch')
} finally { await client.end() }
const env={...process.env,DATABASE_URL:url.toString(),PAYLOAD_SECRET:randomBytes(32).toString('hex'),NEXT_PUBLIC_SERVER_URL:'http://localhost:3015'}
for(const key of ['S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_ENDPOINT','SMTP_HOST','SMTP_USER','SMTP_PASS','FORM_NOTIFY_TO','VERCEL']) delete env[key]
writeFileSync(resolve(target,'.env.local'), ['DATABASE_URL='+env.DATABASE_URL,'PAYLOAD_SECRET='+env.PAYLOAD_SECRET,'NEXT_PUBLIC_SERVER_URL='+env.NEXT_PUBLIC_SERVER_URL].join('\n')+'\n', {flag:'wx'})
const result=spawnSync(process.execPath,[resolve(target,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:target,env,stdio:'inherit'})
process.exit(result.status ?? 1)
