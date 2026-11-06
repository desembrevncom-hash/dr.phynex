/** NOT EXECUTED without explicit existing non-superuser disposable credentials. Never provisions roles/DBs. */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync, fork } from 'node:child_process'
import pg from 'pg'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'
import { buildPlan, type MigrationPlan } from '../../scripts/lib/migration-plan'
import { testAllowlist } from '../helpers/migration-allowlist'
import {
  runGuardedMigration,
  checkDirectUrl,
  type Target,
  type Deps,
  type RunState,
  EXIT,
  LOCK_KEY,
  type DbClient,
} from '../../scripts/lib/migration-guard'
import { connectPg } from '../../scripts/lib/pg-client'
import { fixtureEnvironment } from './test-environment.mjs'
import { openCommitWireProxy } from './commit-wire-proxy'
import { assertI9Evidence, type I9Phase } from './i9-assertions'
import { readResourcePolicy } from './resource-policy'
import { StepRecorder, typedRows } from './case-evidence'
import {
  assertDisposable,
  TEST_DB,
  TEST_MARKER,
  BOOTSTRAP,
  FAILURE_DDL,
  blockedSql,
  fixturePlan,
  waitForBlockedExecutor,
  registerOwnedFixture,
  stopOwnedFixture,
  testSystemEnvironment,
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
  const queries: string[] = []
  const track = (c: DbClient) => {
    const q = c.query
    c.query = async (sql, p) => {
      queries.push(sql)
      return q(sql, p)
    }
    return c
  }
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
        env: testSystemEnvironment(),
        timeout: 15000,
      }).status === 0,
    connect: async (cfg) => track(await connectPg(cfg)),
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
    queries,
    track,
    plan,
    get state() {
      return state
    },
  }
}

type Scenario = ReturnType<typeof deps>
async function history() {
  const present = (
    await admin.query("SELECT to_regclass('public.payload_migrations') IS NOT NULL AS present")
  ).rows[0].present
  return present
    ? (
        await admin.query(
          'SELECT name,batch::text AS batch FROM public.payload_migrations ORDER BY id',
        )
      ).rows
    : []
}
const expectedHistory = (names: string[]) => names.map((name) => ({ name, batch: '1' }))
async function stateIs(
  s: Scenario,
  outcome: RunState['outcome'],
  step: string,
  phase: RunState['phase'],
) {
  expect(await s.d.readState(target)).toMatchObject({
    version: 2,
    identity: stateIdentity(target),
    outcome,
    step,
    phase,
    plan: (await s.d.loadPlan()).digest,
  })
}
async function noNext(s?: Scenario) {
  expect(
    (await admin.query("SELECT to_regclass('public.b5_should_not_exist') missing")).rows[0].missing,
  ).toBeNull()
  expect(
    (
      await admin.query(
        "SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.b5_gate'::regclass AND attname='marker' AND NOT attisdropped) present",
      )
    ).rows[0].present,
  ).toBe(false)
  if (s) {
    expect(s.queries).not.toContain(blockedSql[2])
    for (const sql of (await s.d.loadPlan()).steps.flatMap((step) => [...step.statements]))
      expect(s.queries.filter((q) => q === sql).length).toBeLessThanOrEqual(1)
  }
}
async function observeRestart(s: Scenario) {
  const before = await s.d.readState(target),
    queries = s.queries.length,
    h = await history()
  const exit = await runGuardedMigration(s.d)
  return {
    exit,
    newQueries: s.queries.length - queries,
    stateUnchanged: JSON.stringify(await s.d.readState(target)) === JSON.stringify(before),
    historyUnchanged: JSON.stringify(await history()) === JSON.stringify(h),
  }
}
async function refusesRestart(s: Scenario) {
  expect(await observeRestart(s)).toEqual({
    exit: EXIT.REFUSED,
    newQueries: 0,
    stateUnchanged: true,
    historyUnchanged: true,
  })
}
/** Writes beside the case state; values are counters, names, xids and booleans, never SQL text. */
function saveEvidence(name: string, value: unknown) {
  writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
}
async function successfulNoop(s: Scenario) {
  const before = await s.d.readState(target),
    writes = s.queries.filter((q) => q === 'BEGIN' || q === 'COMMIT').length,
    h = await history()
  expect(await runGuardedMigration(s.d)).toBe(EXIT.OK)
  expect(s.queries.filter((q) => q === 'BEGIN' || q === 'COMMIT')).toHaveLength(writes)
  expect(await s.d.readState(target)).toEqual(before)
  expect(await history()).toEqual(h)
}
describe.skipIf(!url || !container)(
  'B5 single-session integration; isolated non-superuser DB only',
  () => {
    beforeAll(async () => {
      const approval = readResourcePolicy(process.env.B5_TEST_RESOURCES_FILE)
      if (approval.containerId !== container) throw Error('Use the exact approved container ID')
      if (
        !process.env.B5_TEST_RUN_DIR ||
        !path.isAbsolute(process.env.B5_TEST_RUN_DIR) ||
        process.env.B5_TEST_DOCKER_CONFIG !== path.join(process.env.B5_TEST_RUN_DIR, 'docker')
      )
        throw Error('Use the isolated integration launcher')
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
      dir = mkdtempSync(path.join(process.env.B5_TEST_RUN_DIR!, 'case-'))
    })
    async function resetFixture() {
      await identity()
      await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
      await admin.query('CREATE TABLE public.b5_gate(id integer)')
      const r = spawnSync('docker', ['exec', container!, 'pg_dump', '-U', target.role, '-Fc', DB], {
        encoding: 'buffer',
        maxBuffer: 64 * 1024 * 1024,
        env: testSystemEnvironment(),
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
        testAllowlist(),
      )
      s.d.loadPlan = async () => plan
      saveEvidence('i1-plan.json', {
        digest: plan.digest,
        sourceFiles: Object.keys(sources).sort(),
        steps: plan.steps.map((step) => ({ name: step.name, filename: step.filename, sha256: step.sha256 })),
      })
      expect(await runGuardedMigration(s.d)).toBe(EXIT.OK)
      expect(
        (await admin.query('SELECT count(*)::int n FROM public.payload_migrations')).rows[0].n,
      ).toBe(plan.steps.length)
      expect(await history()).toEqual(expectedHistory(plan.steps.map((s) => s.name)))
      await stateIs(s, 'COMPLETE', plan.steps.at(-1)!.name, 'committed')
      expect(
        (
          await admin.query(
            "SELECT to_regclass('public.products') products,to_regclass('public.media') media,to_regclass('public.form_rate_limits') limits",
          )
        ).rows[0],
      ).toMatchObject({ products: 'products', media: 'media', limits: 'form_rate_limits' })
      expect(
        (
          await admin.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='media' AND column_name IN ('prefix','_objectkey') ORDER BY column_name",
          )
        ).rows.map((r) => r.column_name),
      ).toEqual(['_objectkey', 'prefix'])
      await successfulNoop(s)
    })
    it('I2 keeps earlier commit when later migration fails and blocks retry', async () => {
      const s = deps([bootstrap, FAILURE_DDL, blockedSql[2]])
      expect(await runGuardedMigration(s.d)).toBe(EXIT.MIGRATION_FAILED)
      expect(
        (await admin.query('SELECT name FROM public.payload_migrations')).rows.map((r) => r.name),
      ).toEqual(['m1'])
      await stateIs(s, 'FAILED', 'm1', 'committed')
      expect(s.queries).toContain(FAILURE_DDL)
      await noNext(s)
      await refusesRestart(s)
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
      const { s, running } = await block()
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
      expect(await history()).toEqual(expectedHistory(['m1', 'm2', 'm3']))
      await stateIs(s, 'COMPLETE', 'm3', 'committed')
      expect(
        (await admin.query("SELECT to_regclass('public.b5_should_not_exist') present")).rows[0]
          .present,
      ).not.toBeNull()
      expect(
        (
          await admin.query(
            "SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.b5_gate'::regclass AND attname='marker' AND NOT attisdropped) present",
          )
        ).rows[0].present,
      ).toBe(true)
      await successfulNoop(s)
    })
    it('I4 session termination stops the blocked DDL and the next migration', async () => {
      const { s, running, pid } = await block()
      try {
        await identity()
        // The exact backend is proven blocked by this controller, on the exact approved DDL.
        expect(await waitForBlockedExecutor(admin, target)).toBe(pid)
        await admin.query('SELECT pg_terminate_backend($1)', [pid])
        expect(await running).toBe(EXIT.UNCERTAIN)
        await refusesRestart(s)
      } finally {
        await admin.query('ROLLBACK')
        await running
      }
      expect(
        (await admin.query("SELECT to_regclass('public.b5_should_not_exist') missing")).rows[0]
          .missing,
      ).toBeNull()
      expect(await history()).toEqual(expectedHistory(['m1']))
      await stateIs(s, 'UNCERTAIN', 'm1', 'committed')
      await noNext(s)
      await refusesRestart(s)
    })
    it('I5 signal cancellation closes a session executing approved blocked DDL', async () => {
      const a = new AbortController(),
        { s, running } = await block(a.signal)
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
      expect(await history()).toEqual(expectedHistory(['m1']))
      await stateIs(s, 'UNCERTAIN', 'm1', 'committed')
      await noNext(s)
      await refusesRestart(s)
    })
    it('I6 abrupt executor death leaves a latch and cannot start the next migration', async () => {
      const stateFile = path.join(dir, 'process-death-state.json')
      await identity()
      await admin.query('BEGIN')
      await admin.query('LOCK TABLE public.b5_gate IN ACCESS EXCLUSIVE MODE')
      const child = registerOwnedFixture(
        fork(path.resolve('tests/guard/process-death.fixture.ts'), [], {
          execArgv: ['--import', 'tsx'],
          env: fixtureEnvironment(process.env, stateFile),
          stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        }),
      )
      try {
        await waitForBlockedExecutor(admin, target)
        await identity()
        await stopOwnedFixture(child)
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
        const rawState = readFileSync(stateFile, 'utf8')
        const state = parseRunState(rawState, target)
        expect(state).toMatchObject({
          outcome: 'RUNNING',
          step: 'm1',
          phase: 'committed',
          plan: fixture([...blockedSql]).digest,
          identity: stateIdentity(target),
        })
        expect(await history()).toEqual(expectedHistory(['m1']))
        await noNext()
        const s = deps([bootstrap])
        s.d.readState = async () => parseRunState(readFileSync(stateFile, 'utf8'), target)
        await refusesRestart(s)
        expect(readFileSync(stateFile, 'utf8')).toBe(rawState)
      } finally {
        await admin.query('ROLLBACK')
        await stopOwnedFixture(child)
      }
    })
    it('I7 verifies actual deferred-constraint COMMIT rejection and aborted xid', async () => {
      const s = deps([bootstrap], undefined, testOnlyPlan([DEFERRED_SQL, blockedSql[2]]))
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
      expect(await history()).toEqual([])
      await stateIs(s, 'FAILED', 'm1', 'commit-sent')
      await noNext(s)
      await refusesRestart(s)
    })
    it('I8 masks a real COMMIT acknowledgement at the test adapter boundary and never retries', async () => {
      const s = deps([bootstrap], undefined, testOnlyPlan([BOOTSTRAP, blockedSql[2]])),
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
      expect(await history()).toEqual(expectedHistory(['m1']))
      await stateIs(s, 'UNCERTAIN', 'm1', 'commit-sent')
      await noNext(s)
      await refusesRestart(s)
    })
    it('I9 injects state-write failures before and after actual COMMIT, with verified DB outcomes', async () => {
      for (const phase of ['commit-preparing', 'commit-sent', 'committed', 'COMPLETE'] as I9Phase[]) {
        await resetFixture() // Fresh subscenario; never retry a failed expectation.
        const s = deps([bootstrap, blockedSql[2]]), write = s.d.writeState
        let failedAttempt: RunState | undefined
        const transactions: { step: string; xid: string }[] = []
        const connect = s.d.connect
        s.d.connect = async cfg => {
          const c = await connect(cfg), q = c.query
          c.query = async (sql, params) => {
            const result = await q(sql, params)
            if (sql === 'SELECT pg_current_xact_id()::text AS xid')
              transactions.push({ step: 'm' + (transactions.length + 1), xid: String(result.rows[0]?.xid) })
            return result
          }
          return c
        }
        s.d.writeState = async (t, v) => {
          if ((phase === 'COMPLETE' && v.outcome === 'COMPLETE') ||
              (v.outcome === 'RUNNING' && v.phase === phase)) {
            failedAttempt = structuredClone(v)
            throw Error('synthetic state I/O')
          }
          return write(t, v)
        }
        const applied = phase === 'committed' || phase === 'COMPLETE'
        expect(await runGuardedMigration(s.d)).toBe(applied ? EXIT.STATE_FAILED : EXIT.MIGRATION_FAILED)
        if (!failedAttempt) throw Error('I9 injection point never reached')
        await assertI9Evidence({
          phase, identity: stateIdentity(target), plan: s.plan.digest,
          statements: [bootstrap, blockedSql[2]], failedAttempt, refusedCode: EXIT.REFUSED,
          restart: () => runGuardedMigration(s.d),
          read: async () => {
            // Read persisted bytes, not the state value whose write was rejected.
            const state = parseRunState(readFileSync(path.join(dir, 'last-state.json'), 'utf8'), target)
            expect(state).toEqual(s.state)
            const effects = (await admin.query(
              "SELECT to_regclass('public.b5_before') IS NOT NULL AS first, to_regclass('public.b5_should_not_exist') IS NOT NULL AS next",
            )).rows[0]
            const tx = []
            for (const { step, xid } of transactions) {
              const status = (await admin.query('SELECT pg_xact_status($1::xid8) status', [xid])).rows[0].status
              tx.push({ step, xid, status })
            }
            return { state, history: await history(), effects, transactions: tx, queries: [...s.queries] }
          },
        })
      }
    })
    it('I10 refuses malformed actual history before BEGIN', async () => {
      // Fixed subcase and assertion IDs; i10-evidence.json names the exact step that failed.
      const rec = new StepRecorder('I10', (v) => saveEvidence('i10-evidence.json', v))
      const exitName = (code: number) =>
        Object.entries(EXIT).find(([, v]) => v === code)?.[0] ?? 'unknown'
      const readHistory = async () =>
        (
          await admin.query(
            'SELECT id,name,batch::text AS batch FROM public.payload_migrations ORDER BY id',
          )
        ).rows
      let failure: unknown
      try {
        for (const [index, row] of [
          { id: 1, name: 'm2', batch: '1' },
          { id: -1, name: 'm1', batch: '1' },
          { id: 1, name: 'm1', batch: null },
          { id: 1, name: 'm1', batch: 'NaN' },
          { id: 1, name: 'm1', batch: '1.5' },
        ].entries()) {
          const sub = 'I10.r' + (index + 1)
          rec.observe(sub + '.inserted', typedRows([row])[0])
          await rec.step(sub + '.reset', resetFixture)
          await rec.step(sub + '.bootstrap', () => admin.query(BOOTSTRAP))
          await rec.step(sub + '.insert', () =>
            admin.query('INSERT INTO public.payload_migrations(id,name,batch) VALUES($1,$2,$3)', [
              row.id,
              row.name,
              row.batch,
            ]),
          )
          const original = await rec.step(sub + '.history-before', readHistory)
          rec.observe(sub + '.historyBefore', typedRows(original))
          const s = deps([bootstrap, FAILURE_DDL, blockedSql[2]]),
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
          const observe = (key: string, exit: number) =>
            rec.observe(sub + '.' + key, {
              exit,
              exitName: exitName(exit),
              began,
              state: s.state !== null,
              actorQueries: s.queries.length,
            })
          const first = await rec.step(sub + '.run1', () => runGuardedMigration(s.d))
          observe('run1', first)
          await rec.step(sub + '.A1-run1-status-mismatch', () =>
            expect(first).toBe(EXIT.STATUS_MISMATCH),
          )
          await rec.step(sub + '.A2-run1-no-begin', () => expect(began).toBe(false))
          await rec.step(sub + '.A3-no-state', () => expect(s.state).toBeNull())
          const second = await rec.step(sub + '.run2', () => runGuardedMigration(s.d))
          observe('run2', second)
          await rec.step(sub + '.A4-run2-status-mismatch', () =>
            expect(second).toBe(EXIT.STATUS_MISMATCH),
          )
          await rec.step(sub + '.A5-run2-no-begin', () => expect(began).toBe(false))
          const after = await rec.step(sub + '.history-after', readHistory)
          rec.observe(sub + '.historyAfter', typedRows(after))
          await rec.step(sub + '.A6-history-unchanged', () => expect(after).toEqual(original))
          await rec.step(sub + '.A7-no-next', () => noNext(s))
        }
        rec.record.complete = true
      } catch (e) {
        failure = e
      }
      rec.flush()
      const unsaved = Error('I10 evidence could not be saved')
      if (failure && rec.saveFailed)
        throw new AggregateError([failure, unsaved], 'I10 failed; evidence not saved')
      if (failure) throw failure
      if (rec.saveFailed) throw unsaved
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
        expect(await runGuardedMigration(s.d)).toBe(EXIT.BACKUP)
        expect(connects).toBe(0)
      }
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
        expect(await s.d.readState(target)).toEqual(raw)
        expect(await runGuardedMigration(s.d)).toBe(EXIT.REFUSED)
        expect(connects).toBe(0)
      }
      expect(await history()).toEqual([])
      await noNext()
    })
    it('I12 cuts the server COMMIT response at a test-only transport and verifies committed xid independently', async () => {
      await identity()
      const s = deps([bootstrap, blockedSql[2]])
      let proxy: Awaited<ReturnType<typeof openCommitWireProxy>> | undefined
      s.d.connect = async (cfg) => {
        proxy = await openCommitWireProxy(cfg)
        return s.track(await connectPg({ ...cfg, host: '127.0.0.1', port: proxy.port }))
      }
      // Each field is recorded as soon as it is known, so a failed assertion still leaves the rest.
      const evidence: Record<string, unknown> = { assertions: 'incomplete' }
      let failure: unknown
      try {
        evidence.exit = await runGuardedMigration(s.d)
        if (!proxy) throw Error('Wire proxy never started')
        const proof = await proxy.proof.catch(() => null)
        evidence.proof = proof ?? 'unavailable'
        // Persisted bytes, not the in-memory value.
        const state = parseRunState(readFileSync(path.join(dir, 'last-state.json'), 'utf8'), target)
        evidence.state = state
        evidence.independent = {
          checkedAt: new Date().toISOString(),
          backendPid: (admin as unknown as { processID: number }).processID,
          xid: state?.xid ?? null,
          xidStatus: (await admin.query('SELECT pg_xact_status($1::xid8) status', [state?.xid]))
            .rows[0].status,
          history: await history(),
          effects: (
            await admin.query(
              "SELECT to_regclass('public.b5_before') IS NOT NULL AS first, to_regclass('public.b5_should_not_exist') IS NOT NULL AS next",
            )
          ).rows[0],
          commitsSent: s.queries.filter((q) => q === 'COMMIT').length,
          nextStatementSent: s.queries.includes(blockedSql[2]),
        }
        evidence.restart = await observeRestart(s)

        expect(evidence.exit).toBe(EXIT.UNCERTAIN)
        expect(proof).toMatchObject({
          commitRequests: 1,
          serverCommitTags: 1,
          commitTagsDelivered: 0,
          cut: true,
          clientDestroyed: true,
          upstreamDestroyed: true,
        })
        expect(proof!.withheld.map((f) => f.type)).toContain('C')
        expect(proof!.backendPid).not.toBeNull()
        expect(proof!.backendPid).not.toBe((evidence.independent as { backendPid: number }).backendPid)
        await stateIs(s, 'UNCERTAIN', 'm1', 'commit-sent')
        expect(evidence.independent).toMatchObject({
          xidStatus: 'committed',
          history: expectedHistory(['m1']),
          effects: { first: true, next: false },
          commitsSent: 1,
          nextStatementSent: false,
        })
        await noNext(s)
        expect(evidence.restart).toEqual({
          exit: EXIT.REFUSED,
          newQueries: 0,
          stateUnchanged: true,
          historyUnchanged: true,
        })
        evidence.assertions = 'passed'
      } catch (e) {
        evidence.assertions = 'failed'
        failure = e
      }
      // Saved before the proxy is torn down; a save failure is reported, never hidden.
      let saved = true
      try {
        saveEvidence('i12-evidence.json', evidence)
      } catch {
        saved = false
      }
      if (proxy) await proxy.close()
      const unsaved = Error('I12 evidence could not be saved')
      if (failure && !saved) throw new AggregateError([failure, unsaved], 'I12 failed; evidence not saved')
      if (failure) throw failure
      if (!saved) throw unsaved
    })
  },
)
