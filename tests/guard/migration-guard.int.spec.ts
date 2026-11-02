/** NOT EXECUTED without explicit existing non-superuser disposable credentials. Never provisions roles/DBs. */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync, fork } from 'node:child_process'
import pg from 'pg'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'
import { buildPlan, type MigrationPlan } from '../../scripts/lib/migration-plan'
import {
  runGuardedMigration,
  checkDirectUrl,
  type Target,
  type Deps,
  type RunState,
  EXIT,
  LOCK_KEY,
} from '../../scripts/lib/migration-guard'
import { connectPg } from '../../scripts/lib/pg-client'
import { archiveToolEnvironment } from '../../scripts/lib/archive-tool'
import {
  assertDisposable,
  TEST_DB,
  TEST_MARKER,
  BOOTSTRAP,
  FAILURE_DDL,
  blockedSql,
  fixturePlan,
  waitForBlockedExecutor,
  waitForFixtureExit,
  testOnlyPlan,
  DEFERRED_SQL,
} from './fixture-support'
import { parseRunState, stateIdentity } from '../../scripts/lib/migration-state'
const url = process.env.MIGRATION_GUARD_TEST_URL
const container = process.env.MIGRATION_GUARD_TEST_CONTAINER
const DB = TEST_DB,
  MARKER = TEST_MARKER
let admin: pg.Client, target: Target, dump: Buffer, dir: string
async function identity() {
  await assertDisposable(admin, target, container!)
}
const bootstrap = BOOTSTRAP
const fixture = fixturePlan
function deps(sqls: string[], signal?: AbortSignal, executorPlan?: MigrationPlan) {
  let state: RunState | null = null
  const plan = executorPlan ?? fixture(sqls),
    sha = createHash('sha256').update(dump).digest('hex'),
    now = new Date().toISOString()
  const manifest = JSON.stringify({
    version: 1,
    target: 'guard-test',
    host: target.host,
    database: DB,
    createdAt: now,
    method: 'pg_dump',
    reference: 'disposable test fixture only',
    artifact: { path: 'memory.dump', sha256: sha, bytes: dump.length },
    rehearsal: {
      artifactSha256: sha,
      verifiedAt: now,
      evidence: 'synthetic test attestation; not a real rehearsal',
    },
  })
  const d: Deps = {
    env: {
      MIGRATION_TARGET: 'guard-test',
      MIGRATION_DATABASE_URL: url,
      MIGRATION_BACKUP_MANIFEST: 'backup',
    },
    signal,
    log: () => {},
    now: () => new Date(),
    readText: async (p) =>
      p === 'backup' ? manifest : JSON.stringify({ version: 1, targets: { 'guard-test': target } }),
    inspectFile: async () => ({ head: dump.subarray(0, 5), bytes: dump.length, sha256: sha }),
    validateArchive: async () =>
      spawnSync('docker', ['exec', '-i', container!, 'pg_restore', '--list'], {
        input: dump,
        stdio: ['pipe', 'ignore', 'ignore'],
        env: archiveToolEnvironment(process.env),
        timeout: 15000,
      }).status === 0,
    connect: connectPg,
    readConfirmation: async (p) => p,
    loadPlan: async () => plan,
    readState: async () => state,
    writeState: async (_t, s) => {
      state = s
      writeFileSync(path.join(dir, 'last-state.json'), JSON.stringify(s))
    },
  }
  return {
    d,
    get state() {
      return state
    },
  }
}

describe.skipIf(!url || !container)(
  'B5 single-session integration; isolated non-superuser DB only',
  () => {
    beforeAll(async () => {
      const u = new URL(url!)
      if (u.pathname !== '/' + DB || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname))
        throw Error('Explicit isolated Local test URL required')
      target = {
        name: 'guard-test',
        environment: 'local',
        host: u.hostname.replace(/^\[|\]$/g, ''),
        port: Number(u.port || 5432),
        database: DB,
        role: decodeURIComponent(u.username),
        marker: MARKER,
        settings: {},
        backupMaxAgeHours: 1,
        stateFile: '/unused-test-state',
      }
      admin = new pg.Client({
        ...checkDirectUrl(url!, target),
        connectionTimeoutMillis: 5000,
        statement_timeout: 5000,
        query_timeout: 6000,
      })
      await admin.connect()
      await identity()
      dir = mkdtempSync(path.join(tmpdir(), 'drphynex-b5-correction-'))
    })
    async function resetFixture() {
      await identity()
      await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
      await admin.query('CREATE TABLE public.b5_gate(id integer)')
      const r = spawnSync('docker', ['exec', container!, 'pg_dump', '-U', target.role, '-Fc', DB], {
        encoding: 'buffer',
        maxBuffer: 64 * 1024 * 1024,
        env: archiveToolEnvironment(process.env),
        timeout: 15000,
      })
      if (r.status !== 0) throw Error('Test-only dump failed')
      dump = r.stdout
    }
    beforeEach(resetFixture)
    afterAll(async () => {
      await admin?.end()
    })
    it('I1 applies reviewed real project SQL and Payload-compatible history on the same connection', async () => {
      const s = deps([bootstrap])
      const files = readdirSync('src/migrations'),
        sources = Object.fromEntries(
          files
            .filter((f) => /\.(ts|js)$/.test(f) && !f.startsWith('index.'))
            .map((f) => [f, readFileSync(path.join('src/migrations', f), 'utf8')]),
        )
      const plan = buildPlan(
        files,
        sources,
        readFileSync('deploy/migrations.approved.json', 'utf8'),
      )
      s.d.loadPlan = async () => plan
      expect(await runGuardedMigration(s.d)).toBe(EXIT.OK)
      expect(
        (await admin.query('SELECT count(*)::int n FROM public.payload_migrations')).rows[0].n,
      ).toBe(plan.steps.length)
    })
    it('I2 keeps earlier commit when later migration fails and blocks retry', async () => {
      const s = deps([bootstrap, FAILURE_DDL])
      expect(await runGuardedMigration(s.d)).toBe(EXIT.MIGRATION_FAILED)
      expect(
        (await admin.query('SELECT name FROM public.payload_migrations')).rows.map((r) => r.name),
      ).toEqual(['m1'])
      expect(s.state?.outcome).toBe('FAILED')
      expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
    })

    async function block(signal?: AbortSignal) {
      await identity()
      const s = deps([...blockedSql], signal)
      await admin.query('BEGIN')
      await admin.query('LOCK TABLE public.b5_gate IN ACCESS EXCLUSIVE MODE')
      const running = runGuardedMigration(s.d)
      try {
        const pid = await waitForBlockedExecutor(admin, target)
        return { s, running, pid }
      } catch (e) {
        await admin.query('ROLLBACK')
        await running
        throw e
      }
    }
    it('I3 competitor cannot get the lock while approved DDL is blocked', async () => {
      const { running } = await block()
      try {
        expect(
          (await admin.query('SELECT pg_try_advisory_lock($1,$2) ok', [...LOCK_KEY])).rows[0].ok,
        ).toBe(false)
        await admin.query('COMMIT')
        expect(await running).toBe(EXIT.OK)
      } finally {
        await admin.query('ROLLBACK')
        await running
      }
    })
    it('I4 session termination stops the blocked DDL and the next migration', async () => {
      const { s, running, pid } = await block()
      try {
        await identity()
        // The exact backend is proven blocked by this controller, on the exact approved DDL.
        expect(await waitForBlockedExecutor(admin, target)).toBe(pid)
        await admin.query('SELECT pg_terminate_backend($1)', [pid])
        expect(await running).toBe(EXIT.UNCERTAIN)
        expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
      } finally {
        await admin.query('ROLLBACK')
        await running
      }
      expect(
        (await admin.query("SELECT to_regclass('public.b5_should_not_exist') missing")).rows[0]
          .missing,
      ).toBeNull()
    })
    it('I5 signal cancellation closes a session executing approved blocked DDL', async () => {
      const a = new AbortController(),
        { running } = await block(a.signal)
      try {
        a.abort()
        expect(await running).toBe(EXIT.UNCERTAIN)
      } finally {
        await admin.query('ROLLBACK')
        await running
      }
      expect(
        (await admin.query("SELECT to_regclass('public.b5_should_not_exist') missing")).rows[0]
          .missing,
      ).toBeNull()
    })
    it('I6 abrupt executor death leaves a latch and cannot start the next migration', async () => {
      const stateFile = path.join(dir, 'process-death-state.json')
      await identity()
      await admin.query('BEGIN')
      await admin.query('LOCK TABLE public.b5_gate IN ACCESS EXCLUSIVE MODE')
      const child = fork(path.resolve('tests/guard/process-death.fixture.ts'), [], {
        execArgv: ['--import', 'tsx'],
        env: {
          ...archiveToolEnvironment(process.env),
          B5_TEST_URL: url,
          B5_TEST_STATE: stateFile,
          B5_TEST_CONTAINER: container,
        },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      })
      child.on('error', () => {}) // wait/cleanup below still fail finitely; never an unhandled event.
      try {
        await waitForBlockedExecutor(admin, target)
        await identity()
        if (!child.kill('SIGKILL')) throw Error('Fixture kill not acknowledged')
        await waitForFixtureExit(child)
        await admin.query('ROLLBACK')
        let acquired = false
        const until = Date.now() + 15000
        while (Date.now() < until) {
          acquired = (await admin.query('SELECT pg_try_advisory_lock($1,$2) ok', [...LOCK_KEY]))
            .rows[0].ok
          if (acquired) break
          await new Promise((r) => setTimeout(r, 25))
        }
        expect(acquired).toBe(true)
        if (acquired) await admin.query('SELECT pg_advisory_unlock($1,$2)', [...LOCK_KEY])
        expect(
          (await admin.query("SELECT to_regclass('public.b5_should_not_exist') missing")).rows[0]
            .missing,
        ).toBeNull()
        const state = parseRunState(readFileSync(stateFile, 'utf8'), target)
        expect(state.outcome).toBe('RUNNING')
        const s = deps([bootstrap])
        s.d.readState = async () => state
        expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
      } finally {
        await admin.query('ROLLBACK')
        if (child.exitCode === null) {
          child.kill('SIGKILL')
          await waitForFixtureExit(child)
        }
      }
    })
    it('I7 verifies actual deferred-constraint COMMIT rejection and aborted xid', async () => {
      const s = deps([bootstrap], undefined, testOnlyPlan([DEFERRED_SQL]))
      expect(await runGuardedMigration(s.d)).toBe(EXIT.MIGRATION_FAILED)
      expect(s.state).toMatchObject({ outcome: 'FAILED', phase: 'commit-sent', step: 'm1' })
      expect(
        (await admin.query('SELECT pg_xact_status($1::xid8) status', [s.state?.xid])).rows[0]
          .status,
      ).toBe('aborted')
      expect(
        (await admin.query("SELECT to_regclass('public.payload_migrations') present")).rows[0]
          .present,
      ).toBeNull()
    })
    it('I8 masks a real COMMIT acknowledgement at the test adapter boundary and never retries', async () => {
      const s = deps([bootstrap], undefined, testOnlyPlan([BOOTSTRAP])),
        connect = s.d.connect
      s.d.connect = async (cfg) => {
        const c = await connect(cfg),
          q = c.query
        c.query = async (sql, p) => {
          const r = await q(sql, p)
          if (sql === 'COMMIT')
            throw Object.assign(Error('synthetic lost acknowledgement'), { code: 'ECONNRESET' })
          return r
        }
        return c
      }
      expect(await runGuardedMigration(s.d)).toBe(EXIT.UNCERTAIN)
      expect(s.state).toMatchObject({ outcome: 'UNCERTAIN', phase: 'commit-sent' })
      expect(
        (await admin.query('SELECT pg_xact_status($1::xid8) status', [s.state?.xid])).rows[0]
          .status,
      ).toBe('committed')
      expect(
        (await admin.query('SELECT name FROM public.payload_migrations')).rows.map((r) => r.name),
      ).toEqual(['m1'])
      expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
    })
    it('I9 injects state-write failures before and after actual COMMIT, with verified DB outcomes', async () => {
      for (const phase of ['commit-preparing', 'commit-sent', 'committed', 'COMPLETE']) {
        await resetFixture() // Each subscenario is fresh, never a retry of a failed expectation.
        const s = deps([bootstrap]),
          write = s.d.writeState
        s.d.writeState = async (t, v) => {
          if (
            (phase === 'COMPLETE' && v.outcome === 'COMPLETE') ||
            (v.outcome === 'RUNNING' && v.phase === phase)
          )
            throw Error('synthetic state I/O')
          return write(t, v)
        }
        const applied = phase === 'committed' || phase === 'COMPLETE'
        expect(await runGuardedMigration(s.d)).toBe(
          applied ? EXIT.STATE_FAILED : EXIT.MIGRATION_FAILED,
        )
        expect(
          (await admin.query('SELECT pg_xact_status($1::xid8) status', [s.state?.xid])).rows[0]
            .status,
        ).toBe(applied ? 'committed' : 'aborted')
        expect(
          (
            await admin.query(
              "SELECT to_regclass('public.payload_migrations') IS NOT NULL AS present",
            )
          ).rows[0].present,
        ).toBe(applied)
        expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
      }
    })
    it('I10 refuses malformed actual history before BEGIN', async () => {
      for (const row of [
        { id: 1, name: 'm2', batch: '1' },
        { id: -1, name: 'm1', batch: '1' },
        { id: 1, name: 'm1', batch: null },
        { id: 1, name: 'm1', batch: 'NaN' },
        { id: 1, name: 'm1', batch: '1.5' },
      ]) {
        await resetFixture()
        await admin.query(BOOTSTRAP)
        await admin.query('INSERT INTO public.payload_migrations(id,name,batch) VALUES($1,$2,$3)', [
          row.id,
          row.name,
          row.batch,
        ])
        const s = deps([bootstrap, FAILURE_DDL]),
          connect = s.d.connect
        let began = false
        s.d.connect = async (cfg) => {
          const c = await connect(cfg),
            q = c.query
          c.query = async (sql, p) => {
            if (sql === 'BEGIN') began = true
            return q(sql, p)
          }
          return c
        }
        expect(await runGuardedMigration(s.d)).toBe(EXIT.STATUS_MISMATCH)
        expect(began).toBe(false)
        expect(s.state).toBeNull()
      }
    })
    it('I11 bad backup integrity or unreadable archive prevents executor connection', async () => {
      for (const failure of ['checksum', 'archive']) {
        const s = deps([bootstrap])
        let connects = 0
        if (failure === 'checksum') {
          const inspect = s.d.inspectFile
          s.d.inspectFile = async (p) => {
            const f = await inspect(p)
            return f ? { ...f, sha256: '0'.repeat(64) } : null
          }
        } else s.d.validateArchive = async () => false
        s.d.connect = async () => {
          connects++
          throw Error('Must not connect')
        }
        expect(await runGuardedMigration(s.d)).toBe(EXIT.BACKUP)
        expect(connects).toBe(0)
        expect(s.state).toBeNull()
      }
    })
    it('I12 restart refuses all failure latches and unversioned/wrong-identity records before connection', async () => {
      for (const outcome of [
        'RUNNING',
        'FAILED',
        'UNCERTAIN',
        'STATE_FAILED',
        'unversioned',
        'wrong-identity',
      ]) {
        const s = deps([bootstrap]),
          plan = fixture([bootstrap])
        const marker = {
          version: 2,
          identity: stateIdentity(target),
          outcome: outcome === 'STATE_FAILED' ? 'STATE_FAILED' : 'RUNNING',
          runId: 'restart-fixture',
          plan: plan.digest,
          ...(outcome === 'STATE_FAILED' ? { step: 'm1', xid: '1001', phase: 'committed' } : {}),
        } as RunState
        if (outcome === 'FAILED' || outcome === 'UNCERTAIN') marker.outcome = outcome
        const raw: unknown =
          outcome === 'unversioned'
            ? { outcome: 'COMPLETE', runId: 'old', plan: plan.digest }
            : outcome === 'wrong-identity'
              ? { ...marker, identity: '0'.repeat(64) }
              : marker
        s.d.readState = async () => raw as RunState
        let connects = 0
        s.d.connect = async () => {
          connects++
          throw Error('Must not connect')
        }
        expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
        expect(connects).toBe(0)
      }
    })
  },
)
