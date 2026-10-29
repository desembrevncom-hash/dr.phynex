import 'dotenv/config'
import { randomBytes } from 'crypto'
import { TEST_DATABASE } from './tests/helpers/database'

const url = process.env.TEST_DATABASE_URL
if (!url || new URL(url).pathname !== '/' + TEST_DATABASE) {
  throw new Error('Explicit dedicated TEST_DATABASE_URL required; refusing the live database')
}
process.env.DATABASE_URL = url
process.env.PAYLOAD_SECRET = randomBytes(32).toString('hex')
for (const name of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'FORM_NOTIFY_TO', 'VERCEL']) delete process.env[name]

// Isolate uploaded files as well as rows; never write fixtures into live media folders.
const { mkdtempSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const { default: config } = await import('./src/payload.config')
const resolved = await config
const uploads = mkdtempSync(join(tmpdir(), 'drphynex-review-'))
for (const collection of resolved.collections) {
 if (collection.slug === 'media' || collection.slug === 'source-documents') {
  if (typeof collection.upload === 'object') collection.upload.staticDir = join(uploads, collection.slug)
 }
}
