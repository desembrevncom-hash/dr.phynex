/** Integration-only process-death fixture. Refuses every DB except the existing marked disposable DB. */
import { readFileSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fixturePlan, blockedSql, assertDisposable } from './fixture-support'
import { parseRunState } from '../../scripts/lib/migration-state'
import { runGuardedMigration, type Target } from '../../scripts/lib/migration-guard'
import { connectPg } from '../../scripts/lib/pg-client'
const url = process.env.B5_TEST_URL!,
  stateFile = process.env.B5_TEST_STATE!
const u = new URL(url)
if (
  u.pathname !== '/drphynex_migration_guard_test' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
  !stateFile
)
  throw Error('Disposable fixture only')
const target: Target = {
  name: 'guard-test',
  environment: 'local',
  host: u.hostname.replace(/^\[|\]$/g, ''),
  port: Number(u.port || 5432),
  database: 'drphynex_migration_guard_test',
  role: decodeURIComponent(u.username),
  marker: 'drphynex:migration-guard-test:disposable-v1',
  settings: {},
  backupMaxAgeHours: 1,
  stateFile,
}
const plan = fixturePlan(blockedSql)
const dump = Buffer.concat([Buffer.from('PGDMP'), Buffer.alloc(100)]),
  sha = createHash('sha256').update(dump).digest('hex'),
  now = new Date().toISOString()
const manifest = JSON.stringify({
  version: 1,
  target: target.name,
  host: target.host,
  database: target.database,
  method: 'pg_dump',
  reference: 'synthetic process-death fixture',
  createdAt: now,
  artifact: { path: 'memory', bytes: dump.length, sha256: sha },
  rehearsal: { artifactSha256: sha, verifiedAt: now, evidence: 'synthetic fixture only' },
})
process.exitCode = await runGuardedMigration({
  env: {
    MIGRATION_TARGET: target.name,
    MIGRATION_DATABASE_URL: url,
    MIGRATION_BACKUP_MANIFEST: 'backup',
  },
  now: () => new Date(),
  log: () => {},
  readText: async (p) =>
    p === 'backup' ? manifest : JSON.stringify({ version: 1, targets: { 'guard-test': target } }),
  inspectFile: async () => ({ head: dump, bytes: dump.length, sha256: sha }),
  validateArchive: async () => true,
  loadPlan: async () => plan,
  readConfirmation: async (p) => p,
  connect: async (cfg) => {
    const c = await connectPg(cfg)
    try {
      await assertDisposable(c, target, process.env.B5_TEST_CONTAINER!)
    } catch (e) {
      await c.end()
      throw e
    }
    return c
  },
  readState: async () => {
    try {
      return parseRunState(readFileSync(stateFile, 'utf8'), target)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  },
  writeState: async (_t, s) => {
    const h = openSync(stateFile, 'w', 0o600)
    try {
      writeFileSync(h, JSON.stringify(s))
      fsyncSync(h)
    } finally {
      closeSync(h)
    }
  },
})
