/** SQL-only guarded executor. Never imports Payload, loads .env or spawns payload migrate. */
import { createReadStream } from 'node:fs'
import { open, readFile, readdir, lstat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { runGuardedMigration, sha256OfStream, type Target } from './lib/migration-guard'
import { buildPlan } from './lib/migration-plan'
import { connectPg } from './lib/pg-client'
import { listArchive } from './lib/archive-tool'
import { parseRunState, stateIdentity } from './lib/migration-state'
import { StateStoreError, isAnchorId, readStateText, writeStateText } from './lib/state-store'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = { ...process.env }
const args = process.argv.slice(2)
if (args.length && (args.length !== 1 || args[0] !== '--local')) {
  console.error('Unsupported migration arguments')
  process.exit(2)
}
if (args[0] === '--local') env.MIGRATION_LOCAL_ONLY = 'true'
const controller = new AbortController()
const stop = () => controller.abort()
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
const timeout = Number(env.MIGRATION_TIMEOUT_MS ?? 900000)
if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 3600000) {
  console.error('Invalid migration timeout')
  process.exit(2)
}
const timer = setTimeout(stop, timeout)
const manifestPath = path.resolve(env.MIGRATION_BACKUP_MANIFEST || 'missing-manifest')
const artifactPath = (p: string) => path.resolve(path.dirname(manifestPath), p)
const statePath = (t: Target) => {
  const p = t.stateFile
  const relative = path.relative(root, p)
  if (!path.isAbsolute(p) || !(relative.startsWith('..' + path.sep) || path.isAbsolute(relative)))
    throw new Error('Persistent state must be outside source checkout')
  return p
}
/** The expected anchor ID is trusted configuration (the target catalog), never read from the state volume. */
const expectedAnchorId = (t: Target) => {
  const id = (t as Target & { anchorId?: unknown }).anchorId
  if (!isAnchorId(id)) throw new StateStoreError('ANCHOR_ID_UNCONFIGURED')
  return id
}
/** Only fixed cause codes are printed; the core reports a refusal generically. */
const report = (e: unknown) => {
  if (e instanceof StateStoreError) console.error('[migration] state-store refusal: ' + e.code)
}
const PLAN_CAUSES = [
  'Missing approved migration set',
  'Migration discovery differs from approval',
  'Migration fingerprint mismatch',
  'Duplicate migration basename',
]
try {
  const code = await runGuardedMigration({
    env,
    log: (m) => console.log('[migration] ' + m),
    now: () => new Date(),
    signal: controller.signal,
    readText: (p) => readFile(path.resolve(root, p), 'utf8'),
    async inspectFile(p) {
      try {
        const full = artifactPath(p)
        const info = await lstat(full)
        if (!info.isFile() || info.isSymbolicLink()) return null
        const h = await open(full, 'r')
        const head = Buffer.alloc(5)
        try {
          await h.read(head, 0, 5, 0)
        } finally {
          await h.close()
        }
        return { bytes: info.size, head, sha256: await sha256OfStream(createReadStream(full)) }
      } catch {
        return null
      }
    },
    validateArchive: (p) => listArchive(env.MIGRATION_PG_RESTORE, artifactPath(p), env),
    connect: connectPg,
    async readConfirmation(phrase) {
      if (!process.stdin.isTTY) return env.MIGRATION_CONFIRM
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      try {
        return (await rl.question('Type ' + phrase + ': ', { signal: controller.signal })).trim()
      } finally {
        rl.close()
      }
    },
    async loadPlan() {
      const dir = path.join(root, 'src/migrations'),
        files = await readdir(dir),
        sources: Record<string, string> = {}
      for (const name of files.filter(
        (n) => /\.(ts|js)$/.test(n) && !['index.ts', 'index.js'].includes(n),
      )) {
        const p = path.join(dir, name),
          st = await lstat(p)
        if (!st.isFile() || st.isSymbolicLink()) throw new Error('Migration must be regular file')
        sources[name] = await readFile(p, 'utf8')
      }
      try {
        return buildPlan(
          files,
          sources,
          await readFile(path.join(root, 'deploy/migrations.approved.json'), 'utf8'),
        )
      } catch (e) {
        if (e instanceof Error && PLAN_CAUSES.includes(e.message))
          console.error('[migration] plan refusal: ' + e.message)
        throw e
      }
    },
    async readState(t) {
      try {
        const text = await readStateText(statePath(t), stateIdentity(t), expectedAnchorId(t))
        return text === null ? null : parseRunState(text, t)
      } catch (e) {
        report(e)
        throw e
      }
    },
    async writeState(t, s) {
      try {
        await writeStateText(
          statePath(t),
          stateIdentity(t),
          expectedAnchorId(t),
          JSON.stringify(s) + '\n',
        )
      } catch (e) {
        report(e)
        throw e
      }
    },
  })
  process.exitCode = code
} catch {
  console.error('Migration setup refused; no raw error output is forwarded.')
  process.exitCode = 2
} finally {
  clearTimeout(timer)
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
