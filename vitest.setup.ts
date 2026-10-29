// Load .env, then point Payload at a separate test database so tests never touch dev data.
import 'dotenv/config'

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2')
if (!url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error('Tests require a database whose name ends in "_test" (set TEST_DATABASE_URL).')
}
process.env.DATABASE_URL = url
