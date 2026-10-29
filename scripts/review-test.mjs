import 'dotenv/config'
import { spawnSync } from 'node:child_process'
const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local tests only')
url.pathname = '/drphynex_independent_review_test'
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', './vitest.config.mts', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: url.toString() } })
process.exit(result.status ?? 1)
