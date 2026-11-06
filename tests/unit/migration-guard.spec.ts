import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { describe, it, expect } from 'vitest'
import { buildPlan, hash, literalMigration } from '../../scripts/lib/migration-plan'
import {
  checkDirectUrl,
  parseTarget,
  runGuardedMigration,
  EXIT,
  type Deps,
  type DbClient,
  type RunState,
  type Target,
  verifyBackup,
  readStatus,
} from '../../scripts/lib/migration-guard'
import { archiveToolEnvironment } from '../../scripts/lib/archive-tool'
import { assertDeploymentEnv } from '@/config/deploy-env'
import { blockedSql, fixturePlan, FAILURE_DDL } from '../guard/fixture-support'
import { stateIdentity } from '../../scripts/lib/migration-state'

describe('Codex state I/O and history regressions', () => {
  it('approved integration DDL passes preflight and reaches the injected failure (memory only)', async () => {
    const plan = fixturePlan([...blockedSql.slice(0, 2), FAILURE_DDL])
    expect(plan.steps).toHaveLength(3)
    let reached = false
    const s = setup({
      sqls: [...blockedSql.slice(0, 2), FAILURE_DDL],
      fail: 'b5_missing_table',
      onSql: () => {
        reached = true
      },
    })
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(reached).toBe(true)
    expect(s.calls).toContain(FAILURE_DDL)
    expect(s.calls).toContain(blockedSql[1])
    expect(s.applied.map((a) => a.name)).toEqual(['m1', 'm2'])
  })
  it.each(['commit-preparing', 'commit-sent'])(
    'fsync failure at %s still precedes COMMIT',
    async (phase) => {
      const s = setup(),
        write = s.d.writeState
      s.d.writeState = async (t, v) => {
        if (v.outcome === 'RUNNING' && v.phase === phase) throw Error('synthetic fsync')
        return write(t, v)
      }
      expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
      expect(s.applied).toHaveLength(0)
      expect(s.calls).not.toContain('COMMIT')
      expect(s.calls).toContain('ROLLBACK')
      expect(s.closed).toBe(true)
      expect(s.logs.join(' ')).toContain('COMMIT not sent')
    },
  )
  it('failure to write COMPLETE retains the known committed DB result', async () => {
    const s = setup(),
      write = s.d.writeState
    s.d.writeState = async (t, v) => {
      if (v.outcome === 'COMPLETE') throw Error('synthetic fsync')
      return write(t, v)
    }
    expect(await s.run()).toBe(EXIT.STATE_FAILED)
    expect(s.applied).toHaveLength(2)
    expect(s.state).toMatchObject({
      version: 2,
      outcome: 'STATE_FAILED',
      step: 'm2',
      phase: 'committed',
    })
  })
  it('even repeated state I/O failure after COMMIT does not turn a known commit into a DB failure', async () => {
    const s = setup(),
      write = s.d.writeState
    s.d.writeState = async (t, v) => {
      if (v.phase === 'committed') throw Error('synthetic fsync')
      return write(t, v)
    }
    expect(await s.run()).toBe(EXIT.STATE_FAILED)
    expect(s.state).toMatchObject({ outcome: 'RUNNING', phase: 'commit-sent' })
    expect(s.applied).toHaveLength(1)
    expect(await s.run()).toBe(EXIT.REFUSED)
  })
  it('accepts real numeric batch strings and non-contiguous positive serial ids', async () => {
    const rows = [
      { id: 1, name: 'm1', batch: '1' },
      { id: 9, name: 'm2', batch: '2' },
    ]
    const c: DbClient = {
      query: async (sql: string) => ({
        rows: sql.includes('to_regclass') ? [{ present: true }] : rows,
      }),
      end: async () => {},
      abort: () => {},
      onError: () => {},
    }
    expect(await readStatus(c, ['m1', 'm2', 'm3'])).toEqual({
      applied: ['m1', 'm2'],
      pending: ['m3'],
      batch: 3,
    })
  })
  it('reports acknowledged COMMIT separately from failure to record it', async () => {
    const s = setup(),
      write = s.d.writeState
    s.d.writeState = async (t, state) => {
      if (state.outcome === 'RUNNING' && state.phase === 'committed')
        throw new Error('synthetic fsync')
      return write(t, state)
    }
    expect(await s.run()).toBe(10)
    expect(s.applied.map((a) => a.name)).toEqual(['m1'])
    expect(s.state).toMatchObject({ outcome: 'STATE_FAILED', phase: 'committed' })
    expect(s.logs.join(' ')).toContain('DB committed; recording state failed')
    expect(s.logs.join(' ')).toMatch(/step=m1.*xid=1001/)
    expect(s.logs.join(' ')).not.toMatch(/FAKE_ONLY|CREATE TABLE|postgresql:/)
    expect(s.calls).not.toContain('ROLLBACK')
    expect(await s.run()).toBe(EXIT.REFUSED)
  })
  it('rolls back and does not claim COMMIT rejection when its intent cannot be saved', async () => {
    const s = setup(),
      write = s.d.writeState
    s.d.writeState = async (t, state) => {
      if (state.outcome === 'RUNNING' && state.phase !== undefined)
        throw new Error('synthetic fsync')
      return write(t, state)
    }
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(s.calls).toContain('ROLLBACK')
    expect(s.calls).not.toContain('COMMIT')
    expect(s.closed).toBe(true)
    expect(s.logs.join(' ')).not.toContain('verified aborted')
    expect(s.logs.join(' ')).toContain('COMMIT not sent')
  })
  it.each([null, 'NaN', 'Infinity', '1.5', 0, -1, true])(
    'rejects invalid raw batch %s',
    async (batch) => {
      const s = setup(),
        connect = s.d.connect
      s.d.connect = async (cfg) => {
        const c = await connect(cfg),
          q = c.query
        c.query = async (sql, p) =>
          sql.includes('SELECT name,batch') ? { rows: [{ id: 1, name: 'm1', batch }] } : q(sql, p)
        return c
      }
      expect(await s.run()).toBe(EXIT.STATUS_MISMATCH)
      expect(s.calls).not.toContain('BEGIN')
    },
  )
  it.each([null, -1, 0, 1.5, '1', true])('rejects invalid raw id %s', async (id) => {
    const s = setup(),
      connect = s.d.connect
    s.d.connect = async (cfg) => {
      const c = await connect(cfg),
        q = c.query
      c.query = async (sql, p) =>
        sql.includes('SELECT name,batch') ? { rows: [{ id, name: 'm1', batch: '1' }] } : q(sql, p)
      return c
    }
    expect(await s.run()).toBe(EXIT.STATUS_MISMATCH)
    expect(s.calls).not.toContain('BEGIN')
  })
  it('every integration fixture statement passes the production SQL grammar unchanged', () => {
    expect(fixturePlan(blockedSql).steps).toHaveLength(3)
    expect(fixturePlan([FAILURE_DDL]).steps).toHaveLength(1)
    expect([...blockedSql, FAILURE_DDL].join(' ')).not.toMatch(/select|pg_sleep/i)
  })
  it('intent write fails and ROLLBACK fails too: COMMIT unsent, cleanup UNCERTAIN, latch kept', async () => {
    const s = setup(),
      write = s.d.writeState,
      connect = s.d.connect
    s.d.writeState = async (t, v) => {
      if (v.outcome === 'RUNNING' && v.phase !== undefined) throw Error('synthetic fsync')
      return write(t, v)
    }
    s.d.connect = async (cfg) => {
      const c = await connect(cfg),
        q = c.query
      c.query = async (sql, p) => {
        if (sql === 'ROLLBACK') throw Error('synthetic rollback failure')
        return q(sql, p)
      }
      return c
    }
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.calls).not.toContain('COMMIT')
    expect(s.closed).toBe(true)
    expect(s.logs.join(' ')).toContain('COMMIT not sent')
    expect(s.logs.join(' ')).not.toContain('DB committed')
    expect(s.state?.outcome).toBe('UNCERTAIN')
    expect(await s.run()).toBe(EXIT.REFUSED)
  })
  it.each(['0', '', 'abc', '-1', null])('refuses transaction id %s before COMMIT', async (xid) => {
    const s = setup(),
      connect = s.d.connect
    s.d.connect = async (cfg) => {
      const c = await connect(cfg),
        q = c.query
      c.query = async (sql, p) =>
        sql.includes('pg_current_xact_id') ? { rows: [{ xid }] } : q(sql, p)
      return c
    }
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(s.calls).not.toContain('COMMIT')
    expect(s.calls).toContain('ROLLBACK')
  })
  it.each([null, undefined, 'true', 1])(
    'rejects non-boolean table presence %s',
    async (present) => {
      const q = async () => ({ rows: [{ present }] })
      await expect(
        readStatus({ query: q, end: async () => {}, abort: () => {}, onError: () => {} }, ['m1']),
      ).rejects.toThrow('Invalid status row')
    },
  )
  it.each([null, 1, undefined])('rejects invalid raw history name %s', async (name) => {
    const c: DbClient = {
      query: async (sql: string) => ({
        rows: sql.includes('to_regclass') ? [{ present: true }] : [{ id: 1, name, batch: '1' }],
      }),
      end: async () => {},
      abort: () => {},
      onError: () => {},
    }
    await expect(readStatus(c, ['m1'])).rejects.toThrow('Invalid migration id/name')
  })
  it('rejects a malformed COMPLETE marker before connecting', async () => {
    const s = setup()
    s.setState({ outcome: 'COMPLETE' } as RunState)
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(0)
  })
})

const target: Target = {
  name: 'staging',
  environment: 'staging',
  host: 'approved.invalid',
  port: 5432,
  database: 'neondb',
  role: 'migrator',
  marker: 'stage',
  settings: {},
  backupMaxAgeHours: 24,
  stateFile: '/persistent/state.json',
}
const URL_OK = 'postgresql://migrator:FAKE_ONLY@approved.invalid/neondb?sslmode=verify-full'
const NOW = new Date('2026-10-30T10:00:00Z')
const source = (sql: string) =>
  'import { sql } from "@payloadcms/db-postgres"; export async function up({db}) { await db.execute(sql`' +
  sql +
  '`); }'
function planFor(sqls = ['CREATE TABLE audit_one (id int)', 'CREATE TABLE audit_two (id int)']) {
  const sources = Object.fromEntries(sqls.map((sql, i) => ['m' + (i + 1) + '.ts', source(sql)]))
  const files = Object.keys(sources).sort(),
    approval = JSON.stringify({
      version: 1,
      files: files.map((filename) => ({ filename, sha256: hash(sources[filename]) })),
    })
  return { sources, files, approval, plan: buildPlan(files, sources, approval) }
}
type CommitMode =
  | 'ok'
  | 'server-error'
  | 'error-after-effect'
  | 'fatal-before'
  | 'rollback-tag'
  | 'no-tag'
  | 'lost-ack'
  | 'socket-error'
const serverError = (code: string) =>
  Object.assign(new Error('server said FAKE_ONLY'), { severity: 'ERROR', code })
function setup(
  options: {
    sqls?: string[]
    fail?: string
    loss?: boolean
    signal?: AbortSignal
    onSql?: () => void
    archive?: boolean
    env?: Record<string, string | undefined>
    onConfirm?: () => void
    /** How the simulated server answers COMMIT (mock only; not evidence of PostgreSQL behaviour). */
    commit?: CommitMode
    /** pg_xact_status answer; default follows whether the simulated COMMIT took effect. */
    xactStatus?: string | Error
    history?: { name: string; batch: number }[]
  } = {},
) {
  const f = planFor(options.sqls),
    calls: string[] = [],
    applied: { name: string; batch: number }[] = [...(options.history ?? [])],
    logs: string[] = [],
    states: RunState[] = []
  let held = false,
    closed = false,
    connects = 0,
    state: RunState | null = null,
    staged: typeof applied = [],
    lastCommitTookEffect = false
  let lost: ((e: Error) => void) | undefined
  const client: DbClient = {
    async query(sql, params) {
      if (closed) throw new Error('closed session')
      calls.push(sql)
      if (sql.includes('current_database()'))
        return {
          rows: [
            {
              db: target.database,
              usr: target.role,
              marker: target.marker,
              pid: 42,
              super: false,
              createdb: false,
              createrole: false,
              replication: false,
              bypassrls: false,
              risky_roles: '',
            },
          ],
        }
      if (sql.includes('pg_try_advisory_lock')) {
        held = true
        return { rows: [{ ok: true }] }
      }
      if (sql.includes('pg_locks')) return { rows: [{ pid: 42, held }] }
      if (sql.includes('pg_advisory_unlock')) {
        held = false
        return { rows: [] }
      }
      if (sql.includes('to_regclass')) return { rows: [{ present: true }] }
      if (sql.includes('SELECT name,batch'))
        return { rows: applied.map((r, i) => ({ ...r, id: i + 1 })) }
      if (sql.includes('pg_current_xact_id')) return { rows: [{ xid: '1001' }] }
      if (sql.includes('pg_xact_status')) {
        if (options.xactStatus instanceof Error) throw options.xactStatus
        return {
          rows: [
            { status: options.xactStatus ?? (lastCommitTookEffect ? 'committed' : 'aborted') },
          ],
        }
      }
      if (sql.includes('SELECT EXISTS (SELECT 1 FROM public.payload_migrations'))
        return { rows: [{ present: applied.some((a) => a.name === params?.[0]) }] }
      if (!held) throw new Error('write without lock')
      if (sql === 'BEGIN') {
        staged = []
        return { rows: [] }
      }
      if (sql === 'COMMIT') {
        const mode = options.commit ?? 'ok'
        lastCommitTookEffect = !['server-error', 'rollback-tag', 'fatal-before'].includes(mode)
        if (lastCommitTookEffect) applied.push(...staged)
        staged = []
        if (mode === 'server-error') throw serverError('23503')
        if (mode === 'error-after-effect') throw serverError('57014')
        if (mode === 'fatal-before')
          throw Object.assign(new Error('FAKE_ONLY'), { severity: 'FATAL', code: '57P01' })
        if (mode === 'rollback-tag') return { rows: [], command: 'ROLLBACK' }
        if (mode === 'no-tag') return { rows: [] }
        if (mode === 'lost-ack') {
          lost?.(new Error('lost'))
          throw new Error('Connection terminated unexpectedly')
        }
        if (mode === 'socket-error')
          throw Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })
        return { rows: [], command: 'COMMIT' }
      }
      if (sql === 'ROLLBACK') {
        staged = []
        return { rows: [] }
      }
      if (sql.startsWith('INSERT INTO public.payload_migrations')) {
        staged.push({ name: String(params?.[0]), batch: Number(params?.[1]) })
        return { rows: [] }
      }
      options.onSql?.()
      if (options.loss) {
        held = false
        lost?.(new Error('lost'))
      }
      if (options.fail && sql.includes(options.fail)) throw new Error('SQL failure with FAKE_ONLY')
      return { rows: [] }
    },
    onError: (f) => {
      lost = f
    },
    abort: () => {
      closed = true
      held = false
      staged = []
    },
    end: async () => {
      closed = true
      held = false
    },
  }
  const archive = Buffer.concat([Buffer.from('PGDMP'), Buffer.alloc(100)])
  const sha = createHash('sha256').update(archive).digest('hex')
  const manifest = JSON.stringify({
    version: 1,
    target: 'staging',
    host: target.host,
    database: 'neondb',
    createdAt: '2026-10-30T09:00:00Z',
    method: 'pg_dump',
    reference: 'synthetic',
    artifact: { path: 'fake.dump', sha256: sha, bytes: archive.length },
    rehearsal: {
      artifactSha256: sha,
      verifiedAt: '2026-10-30T09:10:00Z',
      evidence: 'independent-synthetic',
    },
  })
  const d: Deps = {
    env: {
      MIGRATION_TARGET: 'staging',
      MIGRATION_DATABASE_URL: URL_OK,
      MIGRATION_BACKUP_MANIFEST: 'backup',
      ...options.env,
    },
    signal: options.signal,
    log: (m) => logs.push(m),
    now: () => NOW,
    readText: async (p) =>
      p === 'backup' ? manifest : JSON.stringify({ version: 1, targets: { staging: target } }),
    inspectFile: async () => ({ head: archive, bytes: archive.length, sha256: sha }),
    validateArchive: async () => options.archive !== false,
    connect: async () => {
      connects++
      return client
    },
    readConfirmation: async (p) => {
      options.onConfirm?.()
      return p
    },
    loadPlan: async () => f.plan,
    readState: async () => state,
    writeState: async (_t, s) => {
      state = s
      states.push(s)
    },
  }
  return {
    d,
    calls,
    applied,
    logs,
    states,
    run: () => runGuardedMigration(d),
    get state() {
      return state
    },
    get connects() {
      return connects
    },
    get held() {
      return held
    },
    get closed() {
      return closed
    },
    setState: (s: RunState) => {
      state = s
    },
  }
}

describe('F01 same-session execution and recovery', () => {
  it('uses one client for lock, every DDL, history and commits', async () => {
    const s = setup()
    expect(await s.run()).toBe(EXIT.OK)
    expect(s.connects).toBe(1)
    expect(s.applied.map((x) => x.name)).toEqual(['m1', 'm2'])
    expect(s.state?.outcome).toBe('COMPLETE')
    expect(s.held).toBe(false)
  })
  it('lock loss during SQL prevents history, COMMIT and the next migration', async () => {
    const s = setup({ loss: true })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.applied).toEqual([])
    expect(s.calls).not.toContain('COMMIT')
    expect(s.calls.some((x) => x.includes('audit_two'))).toBe(false)
    expect(s.closed).toBe(true)
    expect(s.state?.outcome).toBe('UNCERTAIN')
  })
  it('cancellation while executing prevents further statements', async () => {
    const a = new AbortController()
    const s = setup({ signal: a.signal, onSql: () => a.abort() })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.calls).not.toContain('COMMIT')
    expect(s.applied).toEqual([])
  })
  it('cancellation before connection cannot write', async () => {
    const a = new AbortController()
    a.abort()
    const s = setup({ signal: a.signal })
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(0)
  })
  it('a RUNNING state left by SIGKILL blocks a later automatic executor', async () => {
    const s = setup()
    s.setState({
      version: 2,
      identity: stateIdentity(target),
      outcome: 'RUNNING',
      runId: 'prior',
      plan: 'a'.repeat(64),
    })
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(0)
  })
  it('partial commit is retained; later failure rolls back only current migration', async () => {
    const s = setup({ fail: 'audit_two' })
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(s.applied.map((x) => x.name)).toEqual(['m1'])
    expect(s.calls).toContain('ROLLBACK')
    expect(s.state?.outcome).toBe('FAILED')
    const count = s.connects
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(count)
  })
  it('a competitor cannot acquire the lock during simulated DDL', async () => {
    let held = false
    const s = setup({
      onSql: () => {
        held = s.held
      },
    })
    expect(await s.run()).toBe(EXIT.OK)
    expect(held).toBe(true)
  })
})

describe('F02 effective pg parameters', () => {
  it('matches the installed driver and forces certificate verification', () => {
    const cfg = checkDirectUrl(URL_OK, target)
    const driver = (new pg.Client(cfg) as unknown as { connectionParameters: typeof cfg })
      .connectionParameters
    expect([driver.host, driver.port, driver.database, driver.user]).toEqual([
      cfg.host,
      cfg.port,
      cfg.database,
      cfg.user,
    ])
    expect(cfg.ssl).toEqual({ rejectUnauthorized: true })
  })
  it.each([
    'host=other.invalid',
    'port=6543',
    'user=owner',
    'database=prod',
    'options=-c%20search_path=other',
    'sslmode=disable',
    'sslmode=no-verify',
    'sslmode=verify-full&sslmode=verify-full',
    'sslcert=a',
    'sslrootcert=a',
    'pgbouncer=true',
  ])('refuses override or insecure TLS %s', (query) => {
    expect(() => checkDirectUrl(URL_OK.split('?')[0] + '?' + query, target)).toThrow()
  })
  it('refuses poolers, wrong endpoints and missing remote TLS', () => {
    for (const u of [
      URL_OK.replace('approved.invalid', 'approved-pooler.invalid'),
      URL_OK.replace('approved.invalid', 'other.invalid'),
      URL_OK.split('?')[0],
    ])
      expect(() => checkDirectUrl(u, target)).toThrow()
  })
  it('supports IPv6 only for explicit Local identity and exact port', () => {
    const t = { ...target, environment: 'local' as const, host: '::1' }
    const cfg = checkDirectUrl('postgresql://migrator:FAKE_ONLY@[::1]/neondb', t)
    expect(cfg.host).toBe('::1')
    expect(cfg.ssl).toBe(false)
  })
  it('supports encoded credentials without changing driver semantics', () => {
    expect(checkDirectUrl(URL_OK.replace('FAKE_ONLY', 'FAKE%40ONLY'), target).password).toBe(
      'FAKE@ONLY',
    )
  })
})

describe('F03/F04 environment and output isolation', () => {
  it.each(['true', '1', 'yes'])('rejects destructive flag %s before connection', async (value) => {
    const s = setup({ env: { PAYLOAD_DROP_DATABASE: value } })
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(0)
  })
  it.each([{ PAYLOAD_CONFIG_PATH: 'other.ts' }, { NODE_TLS_REJECT_UNAUTHORIZED: '0' }])(
    'refuses config/TLS overrides',
    async (env) => {
      const s = setup({ env })
      expect(await s.run()).toBe(EXIT.REFUSED)
      expect(s.connects).toBe(0)
    },
  )
  it('archive child gets no DB, Payload, SMTP, PG or NODE_OPTIONS secrets', () => {
    const out = archiveToolEnvironment({
      PATH: 'safe',
      PAYLOAD_DROP_DATABASE: 'true',
      PGPASSWORD: 'fake',
      DATABASE_URL: URL_OK,
      SMTP_PASS: 'fake',
      NODE_OPTIONS: '--import evil',
    })
    expect(out).toEqual({ PATH: 'safe', NODE_ENV: 'production' })
  })
  it('executor has no migration child, env-file loader or raw exception forwarding', () => {
    const cli = readFileSync('scripts/migrate-guarded.ts', 'utf8')
    expect(cli).not.toMatch(/spawn\(|loadEnvConfig|dotenv|payload\/bin/)
    const core = readFileSync('scripts/lib/migration-guard.ts', 'utf8')
    expect(core).not.toContain('err.message')
    expect(core).not.toContain('runMigrate')
  })
  it('failure output never contains synthetic input secrets', async () => {
    const s = setup({ fail: 'audit_one' })
    await s.run()
    expect(s.logs.join('')).not.toMatch(/FAKE_ONLY|postgresql:\/\//)
  })
  it('deploy config refuses destructive startup flags', () => {
    expect(() => assertDeploymentEnv({ PAYLOAD_DROP_DATABASE: 'true' })).toThrow()
  })
})

describe('F05 one explicit target, no independent dotenv loaders', () => {
  it('plain migrate uses the SAME executor in explicit Local mode', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.migrate).toContain('scripts/migrate-guarded.ts --local')
    expect(pkg.scripts.migrate).not.toContain('&&')
    expect(pkg.scripts['build:vercel']).toBeUndefined()
    expect(pkg.scripts.build).not.toMatch(/migrate/)
  })
  it.each(['production', 'development', 'test', ''])(
    'NODE_ENV=%s cannot change an explicit target',
    async (NODE_ENV) => {
      const s = setup({ env: { NODE_ENV } })
      expect(await s.run()).toBe(EXIT.OK)
    },
  )
  it('Local command cannot target a remote environment', async () => {
    const s = setup({ env: { MIGRATION_LOCAL_ONLY: 'true' } })
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.connects).toBe(0)
  })
  it('production requires its own approval', () => {
    expect(() =>
      parseTarget(
        JSON.stringify({ version: 1, targets: { staging: { ...target, environment: 'invalid' } } }),
        'staging',
      ),
    ).toThrow()
  })
})

describe('F06 backup integrity versus restore evidence', () => {
  it('rejects a fake PGDMP-only artifact', async () => {
    const t = target,
      b = Buffer.from('PGDMP'),
      sha = hash(b)
    const m = JSON.stringify({
      version: 1,
      target: t.name,
      host: t.host,
      database: t.database,
      method: 'pg_dump',
      reference: 'fake',
      createdAt: NOW.toISOString(),
      artifact: { path: 'x', sha256: sha, bytes: 5 },
    })
    await expect(
      verifyBackup(m, t, NOW, async () => ({ bytes: 5, head: b, sha256: sha })),
    ).rejects.toThrow()
  })
  it('archive validator must succeed before connection', async () => {
    const s = setup({ archive: false })
    expect(await s.run()).toBe(EXIT.BACKUP)
    expect(s.connects).toBe(0)
  })
  it('rechecks freshness after confirmation', async () => {
    const s = setup()
    let now = NOW
    s.d.now = () => now
    s.d.readConfirmation = async (p) => {
      now = new Date(NOW.getTime() + 25 * 3600000)
      return p
    }
    expect(await s.run()).toBe(EXIT.BACKUP)
    expect(s.applied).toEqual([])
  })
})

describe('F07 approved bytes, discovery and SQL-only scope', () => {
  it('rejects extra/missing/changed files and duplicate basenames', () => {
    const p = planFor()
    expect(() => buildPlan([...p.files, 'extra.ts'], p.sources, p.approval)).toThrow()
    expect(() => buildPlan(p.files.slice(1), p.sources, p.approval)).toThrow()
    expect(() =>
      buildPlan(p.files, { ...p.sources, 'm1.ts': source('SELECT 2') }, p.approval),
    ).toThrow()
    const q = planFor()
    const a = JSON.stringify({
      version: 1,
      files: [
        { filename: 'm1.js', sha256: hash(q.sources['m1.ts']) },
        { filename: 'm1.ts', sha256: hash(q.sources['m1.ts']) },
      ],
    })
    expect(() =>
      buildPlan(
        ['m1.js', 'm1.ts'],
        { 'm1.js': q.sources['m1.ts'], 'm1.ts': q.sources['m1.ts'] },
        a,
      ),
    ).toThrow()
  })
  it.each(['COMMIT; DROP TABLE x', 'SELECT pg_advisory_unlock_all()'])(
    'rejects transaction/lock manipulation',
    (sql) => {
      expect(() => literalMigration(source(sql))).toThrow()
    },
  )
  it('rejects module side effects, Payload calls and interpolated SQL', () => {
    for (const s of [
      source('SELECT 1') + ';process.exit(0)',
      source('SELECT 1').replace('db.execute', 'payload.create'),
      source('SELECT ${1}'),
    ])
      expect(() => literalMigration(s)).toThrow()
  })
  it('refuses a plan changed after confirmation before any migration SQL', async () => {
    const s = setup()
    s.d.readConfirmation = async (p) => {
      s.d.loadPlan = async () => planFor(['CREATE TABLE audit_nine (id int)']).plan
      return p
    }
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.applied).toEqual([])
  })
  it('refuses changed bytes before COMMIT and rolls back', async () => {
    const s = setup({
      onSql: () => {
        s.d.loadPlan = async () => planFor(['CREATE TABLE audit_nine (id int)']).plan
      },
    })
    expect(await s.run()).toBe(EXIT.REFUSED)
    expect(s.calls).toContain('ROLLBACK')
    expect(s.applied).toEqual([])
  })
})

// Mock session only: these show how the executor CLASSIFIES each COMMIT answer. They do not prove
// how PostgreSQL or the network behaves; that needs the opt-in integration suite.
describe('COMMIT outcome classification (mock)', () => {
  const sentNoRollback = (s: ReturnType<typeof setup>) => {
    const i = s.calls.indexOf('COMMIT')
    expect(i).toBeGreaterThan(-1)
    expect(s.calls.slice(i)).not.toContain('ROLLBACK')
  }

  it('acknowledged COMMIT records the phase and transaction id', async () => {
    const s = setup()
    expect(await s.run()).toBe(EXIT.OK)
    expect(s.states.map((x) => `${x.outcome}/${x.step ?? '-'}/${x.phase ?? '-'}`)).toEqual([
      'RUNNING/-/-',
      'RUNNING/m1/commit-preparing',
      'RUNNING/m1/commit-sent',
      'RUNNING/m1/committed',
      'RUNNING/m2/commit-preparing',
      'RUNNING/m2/commit-sent',
      'RUNNING/m2/committed',
      'COMPLETE/m2/committed',
    ])
    expect(s.state).toMatchObject({ step: 'm2', xid: '1001' })
  })

  it('server rejects COMMIT and the transaction is verified aborted -> FAILED', async () => {
    const s = setup({ commit: 'server-error' })
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(s.state).toMatchObject({
      outcome: 'FAILED',
      step: 'm1',
      phase: 'commit-sent',
      xid: '1001',
    })
    expect(s.calls.some((c) => c.includes('pg_xact_status'))).toBe(true)
    sentNoRollback(s)
  })

  it('server ROLLBACK tag for COMMIT (aborted block), verified -> FAILED', async () => {
    const s = setup({ commit: 'rollback-tag' })
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    sentNoRollback(s)
  })

  it.each([
    ['acknowledgement lost after the commit took effect', 'lost-ack' as const],
    ['socket error (no server answer)', 'socket-error' as const],
    ['FATAL from the server (session ends)', 'fatal-before' as const],
    ['no command tag at all', 'no-tag' as const],
  ])('%s -> UNCERTAIN, no ROLLBACK', async (_label, commit) => {
    const s = setup({ commit })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.state).toMatchObject({ outcome: 'UNCERTAIN', step: 'm1', phase: 'commit-sent' })
    sentNoRollback(s)
  })

  it('server error but status says committed or history row exists -> UNCERTAIN', async () => {
    const s = setup({ commit: 'error-after-effect' })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.applied.map((a) => a.name)).toEqual(['m1'])
  })

  it.each([
    ['status check fails', new Error('FAKE_ONLY')],
    ['status in progress', 'in progress'],
    ['status unknown/null', 'null'],
  ])('server error but %s -> UNCERTAIN', async (_label, xactStatus) => {
    const s = setup({ commit: 'server-error', xactStatus })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
  })

  it('a ROLLBACK that "succeeds" after a lost COMMIT is never used as evidence', async () => {
    // The old code sent ROLLBACK after any COMMIT error and reported FAILED when it worked.
    const s = setup({ commit: 'lost-ack' })
    expect(await s.run()).toBe(EXIT.UNCERTAIN)
    expect(s.calls.filter((c) => c === 'ROLLBACK')).toEqual([])
  })

  it('statement failure before COMMIT is still FAILED with ROLLBACK (unchanged)', async () => {
    const s = setup({ fail: 'audit_one' })
    expect(await s.run()).toBe(EXIT.MIGRATION_FAILED)
    expect(s.calls).toContain('ROLLBACK')
    expect(s.calls).not.toContain('COMMIT')
  })

  it.each(['server-error', 'lost-ack', 'socket-error'] as const)(
    'after %s the next run is blocked before connecting; nothing is retried',
    async (commit) => {
      const s = setup({ commit })
      await s.run()
      const outcome = s.state?.outcome
      expect(['FAILED', 'UNCERTAIN']).toContain(outcome)
      const connects = s.connects
      const commits = s.calls.filter((c) => c === 'COMMIT').length
      expect(commits).toBe(1)
      expect(await s.run()).toBe(EXIT.REFUSED)
      expect(s.connects).toBe(connects)
      expect(s.state?.outcome).toBe(outcome) // marker is never cleared by the executor
    },
  )

  it('logs name the step but contain no SQL, secret or raw server message', async () => {
    for (const commit of ['server-error', 'lost-ack', 'fatal-before'] as const) {
      const s = setup({ commit })
      await s.run()
      const out = s.logs.join('\n')
      expect(out).toContain('COMMIT of m1')
      expect(out).not.toMatch(/FAKE_ONLY|server said|CREATE TABLE|audit_one|postgresql:\/\//)
    }
  })
})

describe('applied history must be an ordered prefix of the approved set (mock)', () => {
  it.each([
    ['second applied without the first', [{ name: 'm2', batch: 1 }]],
    [
      'wrong order',
      [
        { name: 'm2', batch: 1 },
        { name: 'm1', batch: 1 },
      ],
    ],
    [
      'batch goes backwards',
      [
        { name: 'm1', batch: 2 },
        { name: 'm2', batch: 1 },
      ],
    ],
  ])('%s -> refused before any SQL', async (_label, history) => {
    const s = setup({
      sqls: ['CREATE TABLE a (id int)', 'CREATE TABLE b (id int)', 'CREATE TABLE c (id int)'],
      history,
    })
    expect(await s.run()).toBe(EXIT.STATUS_MISMATCH)
    expect(s.calls).not.toContain('BEGIN')
    expect(s.state).toBeNull()
    expect(s.applied).toEqual(history) // history table is never edited
  })

  it('a valid prefix runs only the remaining migrations', async () => {
    const s = setup({ history: [{ name: 'm1', batch: 1 }] })
    expect(await s.run()).toBe(EXIT.OK)
    expect(s.applied).toEqual([
      { name: 'm1', batch: 1 },
      { name: 'm2', batch: 2 },
    ])
  })
})
