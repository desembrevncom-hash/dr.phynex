import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'
import type { MigrationPlan } from './migration-plan'
import { stateIdentity, validateRunState, type RunState } from './migration-state'
export type { RunState, CommitPhase } from './migration-state'

export const EXIT = {
  OK: 0,
  REFUSED: 2,
  IDENTITY: 3,
  BACKUP: 4,
  LOCKED: 5,
  MIGRATION_FAILED: 6,
  STATUS_MISMATCH: 7,
  UNCERTAIN: 8,
  CONNECTION: 9,
  STATE_FAILED: 10,
} as const
export class GuardError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
  ) {
    super(message)
  }
}
export type Target = {
  name: string
  environment: 'local' | 'staging' | 'production'
  host: string
  port: number
  database: string
  role: string
  marker: string
  settings: Record<string, string>
  backupMaxAgeHours: number
  stateFile: string
}
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const hostName = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, '')
export const isLocalHost = (host: string) =>
  ['127.0.0.1', 'localhost', '::1'].includes(hostName(host))
export const isPooledHost = (host: string, port: number) => /pooler/i.test(host) || port === 6543
export function parseTarget(json: string, name: string): Target {
  const catalog = JSON.parse(json)
  const e =
    catalog.version === 1 && Object.hasOwn(catalog.targets ?? {}, name)
      ? catalog.targets[name]
      : null
  if (!e || !['local', 'staging', 'production'].includes(e.environment))
    throw new GuardError(EXIT.REFUSED, 'Unknown approved target')
  for (const field of ['host', 'database', 'role', 'marker', 'stateFile'])
    if (!nonEmpty(e[field]))
      throw new GuardError(EXIT.REFUSED, 'Incomplete target identity/state path')
  const port = Number(e.port ?? 5432),
    age = Number(e.backupMaxAgeHours ?? 24)
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !(age > 0 && age <= 168) ||
    isPooledHost(e.host, port)
  )
    throw new GuardError(EXIT.REFUSED, 'Invalid direct endpoint or backup age')
  if ((e.environment === 'local') !== isLocalHost(e.host))
    throw new GuardError(EXIT.REFUSED, 'Local environment and endpoint disagree')
  const settings = e.settings ?? {}
  if (
    typeof settings !== 'object' ||
    Array.isArray(settings) ||
    Object.values(settings).some((v) => !nonEmpty(v))
  )
    throw new GuardError(EXIT.REFUSED, 'Invalid provider settings')
  return Object.freeze({
    ...e,
    name,
    host: hostName(e.host),
    port,
    backupMaxAgeHours: age,
    settings,
  })
}
export type DirectUrl = {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: false | { rejectUnauthorized: true }
}
/** Reject all ambiguous driver options. Construct the final driver config once, never reload env. */
export function checkDirectUrl(raw: string, target: Target, runtime?: string): DirectUrl {
  if (runtime && raw === runtime)
    throw new GuardError(EXIT.REFUSED, 'Use a separate migrator connection')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new GuardError(EXIT.REFUSED, 'Invalid PostgreSQL URL')
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hash ||
    !url.username ||
    !url.password ||
    !url.hostname ||
    url.pathname === '/'
  )
    throw new GuardError(EXIT.REFUSED, 'Incomplete PostgreSQL URL')
  const keys = [...url.searchParams.keys()]
  if (
    new Set(keys.map((k) => k.toLowerCase())).size !== keys.length ||
    keys.some((k) => k !== 'sslmode')
  )
    throw new GuardError(EXIT.REFUSED, 'Connection query overrides are forbidden')
  const sslmode = url.searchParams.get('sslmode')
  if (target.environment !== 'local' && sslmode !== 'verify-full')
    throw new GuardError(EXIT.REFUSED, 'Remote migrations require sslmode=verify-full')
  if (target.environment === 'local' && sslmode && !['verify-full', 'disable'].includes(sslmode))
    throw new GuardError(EXIT.REFUSED, 'Unsupported TLS mode')
  const explicit = {
    host: hostName(url.hostname),
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: sslmode === 'verify-full' ? { rejectUnauthorized: true as const } : (false as const),
  }
  // Check the installed pg parser too; percent encoding must not select another endpoint/name.
  const driver = (
    new pg.Client({ connectionString: raw }) as unknown as { connectionParameters: DirectUrl }
  ).connectionParameters
  if (
    ['host', 'database', 'user', 'password'].some(
      (k) => explicit[k as keyof DirectUrl] !== driver[k as keyof DirectUrl],
    ) ||
    explicit.port !== Number(driver.port)
  )
    throw new GuardError(EXIT.IDENTITY, 'Driver interpretation differs from approved parameters')
  if (
    isPooledHost(explicit.host, explicit.port) ||
    explicit.host !== target.host ||
    explicit.port !== target.port ||
    explicit.database !== target.database ||
    explicit.user !== target.role
  )
    throw new GuardError(EXIT.IDENTITY, 'Connection does not match approved identity')
  return Object.freeze(explicit)
}
export type BackupManifest = {
  version: 1
  target: string
  host: string
  database: string
  createdAt: string
  method: 'pg_dump'
  reference: string
  artifact: { path: string; sha256: string; bytes: number }
  rehearsal: { artifactSha256: string; verifiedAt: string; evidence: string }
}
export type FileFacts = { sha256: string; bytes: number; head: Buffer }
export async function verifyBackup(
  json: string,
  target: Target,
  now: Date,
  inspect: (p: string) => Promise<FileFacts | null>,
): Promise<BackupManifest> {
  const m = JSON.parse(json) as BackupManifest
  const age = now.getTime() - Date.parse(m.createdAt)
  if (
    m.version !== 1 ||
    m.method !== 'pg_dump' ||
    !nonEmpty(m.reference) ||
    m.target !== target.name ||
    hostName(m.host ?? '') !== target.host ||
    m.database !== target.database ||
    !Number.isFinite(age) ||
    age < -300000 ||
    age > target.backupMaxAgeHours * 3600000
  )
    throw new GuardError(EXIT.BACKUP, 'Backup provenance/age does not match target')
  if (
    !m.artifact ||
    !nonEmpty(m.artifact.path) ||
    !/^[a-f0-9]{64}$/.test(m.artifact.sha256) ||
    !Number.isSafeInteger(m.artifact.bytes) ||
    m.artifact.bytes < 32
  )
    throw new GuardError(EXIT.BACKUP, 'Invalid archive manifest')
  const f = await inspect(m.artifact.path)
  if (
    !f ||
    f.sha256 !== m.artifact.sha256 ||
    f.bytes !== m.artifact.bytes ||
    f.head.subarray(0, 5).toString('latin1') !== 'PGDMP'
  )
    throw new GuardError(EXIT.BACKUP, 'Backup artifact integrity failed')
  const verified = Date.parse(m.rehearsal?.verifiedAt)
  if (
    m.rehearsal?.artifactSha256 !== m.artifact.sha256 ||
    !nonEmpty(m.rehearsal?.evidence) ||
    !Number.isFinite(verified) ||
    verified < Date.parse(m.createdAt) ||
    verified > now.getTime() + 300000
  )
    throw new GuardError(EXIT.BACKUP, 'Independent restore rehearsal evidence required')
  return m
}
export async function sha256OfStream(chunks: AsyncIterable<Buffer>) {
  const h = createHash('sha256')
  for await (const c of chunks) h.update(c)
  return h.digest('hex')
}
export type Row = Record<string, unknown>
export type DbClient = {
  /** `command` is the server's command tag (e.g. "COMMIT", or "ROLLBACK" for an aborted block). */
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[]; command?: string }>
  end: () => Promise<void>
  abort: () => void
  onError: (cb: (e: Error) => void) => void
}
export const LOCK_KEY = [0x44725068, 0x6d696772] as const
export async function checkIdentity(c: DbClient, t: Target): Promise<number> {
  const { rows } = await c.query(
    `SELECT current_database() AS db, current_user AS usr, r.rolsuper AS super, r.rolcreatedb AS createdb, r.rolcreaterole AS createrole, r.rolreplication AS replication, r.rolbypassrls AS bypassrls, shobj_description(d.oid, 'pg_database') AS marker, pg_backend_pid() AS pid FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`,
  )
  const r = rows[0]
  if (
    !r ||
    r.db !== t.database ||
    r.usr !== t.role ||
    r.marker !== t.marker ||
    ['super', 'createdb', 'createrole', 'replication', 'bypassrls'].some((k) => r[k] !== false)
  )
    throw new GuardError(
      EXIT.IDENTITY,
      'Live database/role/marker is not approved or role is privileged',
    )
  for (const [key, expected] of Object.entries(t.settings)) {
    const s = await c.query('SELECT current_setting($1,true) AS value', [key])
    if (s.rows[0]?.value !== expected)
      throw new GuardError(EXIT.IDENTITY, 'Provider identity mismatch')
  }
  return Number(r.pid)
}
export async function assertLockHeld(c: DbClient, pid: number) {
  const { rows } = await c.query(
    `SELECT pg_backend_pid() AS pid, EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND classid=$1::int::oid AND objid=$2::int::oid AND objsubid=2 AND granted) AS held`,
    [...LOCK_KEY],
  )
  if (Number(rows[0]?.pid) !== pid || rows[0]?.held !== true)
    throw new GuardError(EXIT.UNCERTAIN, 'Execution session no longer owns lock')
}
export async function acquireLock(c: DbClient, pid: number) {
  const r = await c.query('SELECT pg_try_advisory_lock($1,$2) AS ok', [...LOCK_KEY])
  if (r.rows[0]?.ok !== true) throw new GuardError(EXIT.LOCKED, 'Another executor owns lock')
  await assertLockHeld(c, pid)
}
export async function releaseLock(c: DbClient) {
  await c.query('SELECT pg_advisory_unlock($1,$2)', [...LOCK_KEY])
}
export async function readStatus(c: DbClient, expected: string[]) {
  const t = await c.query("SELECT to_regclass('public.payload_migrations') IS NOT NULL AS present")
  const present = t.rows[0]?.present
  if (typeof present !== 'boolean') throw new GuardError(EXIT.STATUS_MISMATCH, 'Invalid status row')
  const rows = present
    ? (await c.query('SELECT name,batch,id FROM public.payload_migrations ORDER BY id')).rows
    : []
  // pg int4 is a number; unconstrained numeric is a string with pg's default parsers.
  // Reject coercible null/boolean/non-finite/fractional values instead of trusting Number().
  const batches = rows.map((r) => {
    if (
      typeof r.batch === 'number' &&
      Number.isSafeInteger(r.batch) &&
      r.batch > 0 &&
      r.batch < Number.MAX_SAFE_INTEGER
    )
      return r.batch
    if (
      typeof r.batch === 'string' &&
      /^[1-9]\d*$/.test(r.batch) &&
      BigInt(r.batch) < BigInt(Number.MAX_SAFE_INTEGER)
    )
      return Number(r.batch)
    throw new GuardError(EXIT.STATUS_MISMATCH, 'Invalid migration batch')
  })
  if (
    rows.some(
      (r, i) =>
        typeof r.id !== 'number' ||
        !Number.isInteger(r.id) ||
        r.id <= 0 ||
        r.id > 2147483647 ||
        (i > 0 && r.id <= (rows[i - 1].id as number)) ||
        typeof r.name !== 'string',
    )
  )
    throw new GuardError(EXIT.STATUS_MISMATCH, 'Invalid migration id/name')
  const applied = rows.map((r) => r.name as string)
  if (applied.some((n) => !expected.includes(n)) || new Set(applied).size !== applied.length)
    throw new GuardError(EXIT.STATUS_MISMATCH, 'Unknown/duplicate/dev migration history')
  // Payload (and this executor) apply files in sorted order and insert one row per file, so the
  // history in id order must be exactly the first N approved migrations with non-decreasing batch.
  if (
    applied.some((n, i) => n !== expected[i]) ||
    batches.some((batch, i) => i > 0 && batch < batches[i - 1])
  )
    throw new GuardError(
      EXIT.STATUS_MISMATCH,
      'Migration history is not an ordered prefix of the approved set; manual review required',
    )
  return {
    applied,
    pending: expected.filter((n) => !applied.includes(n)),
    batch: Math.max(0, ...batches) + 1,
  }
}
export const confirmationPhrase = (t: Target) =>
  `migrate ${t.name} ${t.database}@${t.host}:${t.port}`
/** A server ErrorResponse with severity ERROR on a live session (not FATAL/PANIC, not a socket error). */
export function isServerError(e: unknown) {
  const x = e as { severity?: unknown; code?: unknown } | null
  return x?.severity === 'ERROR' && typeof x.code === 'string' && /^[0-9A-Z]{5}$/.test(x.code)
}
/**
 * COMMIT was sent but did not come back as "COMMIT". FAILED only with positive evidence that the
 * transaction did not commit: the server itself answered (ERROR, or a ROLLBACK tag), the session
 * is still the same one, pg_xact_status reports "aborted" and the history row is absent.
 * Anything else, including a lost connection or a failing check, is UNCERTAIN.
 */
export async function resolveCommit(
  c: DbClient,
  xid: string,
  step: string,
  serverAnswered: boolean,
): Promise<'FAILED' | 'UNCERTAIN'> {
  if (!serverAnswered) return 'UNCERTAIN'
  try {
    const status = (await c.query('SELECT pg_xact_status($1::xid8) AS status', [xid])).rows[0]
      ?.status
    const table = (
      await c.query("SELECT to_regclass('public.payload_migrations') IS NOT NULL AS present")
    ).rows[0]?.present
    const recorded =
      table === true
        ? (
            await c.query(
              'SELECT EXISTS (SELECT 1 FROM public.payload_migrations WHERE name=$1) AS present',
              [step],
            )
          ).rows[0]?.present
        : table === false
          ? false
          : undefined
    return status === 'aborted' && recorded === false ? 'FAILED' : 'UNCERTAIN'
  } catch {
    return 'UNCERTAIN'
  }
}
export type Deps = {
  env: Record<string, string | undefined>
  log: (m: string) => void
  now: () => Date
  readText: (p: string) => Promise<string>
  inspectFile: (p: string) => Promise<FileFacts | null>
  validateArchive: (p: string) => Promise<boolean>
  connect: (config: DirectUrl) => Promise<DbClient>
  readConfirmation: (p: string) => Promise<string | undefined>
  loadPlan: () => Promise<MigrationPlan>
  readState: (t: Target) => Promise<RunState | null>
  writeState: (t: Target, s: RunState) => Promise<void>
  signal?: AbortSignal
}
/** SQL-only executor: lock, BEGIN, DDL, history INSERT and COMMIT all use ONE pg session. */
export async function runGuardedMigration(d: Deps): Promise<number> {
  let c: DbClient | null = null,
    locked = false,
    lost = false,
    began = false,
    started = false
  let target: Target | undefined, state: RunState | undefined
  let commit: Pick<RunState, 'step' | 'phase' | 'xid'> | null = null
  let commitAttempted = false,
    stateWriteFailed = false
  const stop = () => {
    lost = true
    c?.abort()
  }
  try {
    for (const key of ['MIGRATION_TARGET', 'MIGRATION_DATABASE_URL', 'MIGRATION_BACKUP_MANIFEST'])
      if (!nonEmpty(d.env[key]))
        throw new GuardError(EXIT.REFUSED, 'Missing migration configuration')
    if (
      (d.env.PAYLOAD_DROP_DATABASE && d.env.PAYLOAD_DROP_DATABASE !== 'false') ||
      d.env.PAYLOAD_CONFIG_PATH ||
      d.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
    )
      throw new GuardError(EXIT.REFUSED, 'Dangerous execution environment')
    target = parseTarget(
      await d.readText(d.env.MIGRATION_TARGETS_FILE || 'deploy/migration-targets.json'),
      d.env.MIGRATION_TARGET!,
    )
    if (
      (target.environment === 'production' && d.env.MIGRATION_ALLOW_PRODUCTION !== 'yes') ||
      (d.env.MIGRATION_LOCAL_ONLY === 'true' && target.environment !== 'local')
    )
      throw new GuardError(EXIT.REFUSED, 'Environment approval missing')
    const cfg = checkDirectUrl(d.env.MIGRATION_DATABASE_URL!, target, d.env.DATABASE_URL)
    const rawPrior = await d.readState(target)
    const prior = rawPrior === null ? null : validateRunState(rawPrior, target)
    if (prior && prior.outcome !== 'COMPLETE')
      throw new GuardError(
        EXIT.REFUSED,
        'Previous run needs owner reconciliation; no automatic retry',
      )
    const backupJson = await d.readText(d.env.MIGRATION_BACKUP_MANIFEST!)
    const backup = await verifyBackup(backupJson, target, d.now(), d.inspectFile)
    if (!(await d.validateArchive(backup.artifact.path)))
      throw new GuardError(EXIT.BACKUP, 'pg_restore --list rejected archive')
    const plan = await d.loadPlan(),
      expected = plan.steps.map((s) => s.name)
    if (d.signal?.aborted) throw new GuardError(EXIT.REFUSED, 'Cancelled before connection')
    c = await d.connect(cfg)
    c.onError(stop)
    d.signal?.addEventListener('abort', stop, { once: true })
    const alive = () => {
      if (lost || d.signal?.aborted)
        throw new GuardError(EXIT.UNCERTAIN, 'Execution cancelled or session lost')
    }
    alive()
    const pid = await checkIdentity(c, target)
    await acquireLock(c, pid)
    locked = true
    const rawLatest = await d.readState(target)
    const latest = rawLatest === null ? null : validateRunState(rawLatest, target)
    if (latest && latest.outcome !== 'COMPLETE')
      throw new GuardError(EXIT.REFUSED, 'Previous run needs owner reconciliation')
    const before = await readStatus(c, expected)
    if (!before.pending.length) return EXIT.OK
    if ((await d.readConfirmation(confirmationPhrase(target))) !== confirmationPhrase(target))
      throw new GuardError(EXIT.REFUSED, 'Confirmation mismatch')
    alive()
    await verifyBackup(backupJson, target, d.now(), d.inspectFile)
    if (!(await d.validateArchive(backup.artifact.path)))
      throw new GuardError(EXIT.BACKUP, 'Archive changed/invalid')
    if ((await d.loadPlan()).digest !== plan.digest)
      throw new GuardError(EXIT.REFUSED, 'Migration plan changed')
    state = {
      version: 2,
      identity: stateIdentity(target),
      outcome: 'RUNNING',
      runId: randomUUID(),
      plan: plan.digest,
    }
    await d.writeState(target, state)
    started = true
    for (const step of plan.steps.filter((s) => before.pending.includes(s.name))) {
      commitAttempted = false
      alive()
      if ((await d.loadPlan()).digest !== plan.digest)
        throw new GuardError(EXIT.REFUSED, 'Migration files changed')
      await assertLockHeld(c, pid)
      alive()
      await c.query('BEGIN')
      began = true
      for (const sql of step.statements) {
        alive()
        await assertLockHeld(c, pid)
        alive()
        await c.query(sql)
        alive()
      }
      await c.query(
        'INSERT INTO public.payload_migrations (name,batch,created_at,updated_at) VALUES ($1,$2,now(),now())',
        [step.name, before.batch],
      )
      alive()
      if ((await d.loadPlan()).digest !== plan.digest)
        throw new GuardError(EXIT.REFUSED, 'Migration files changed before commit')
      const xid = String(
        (await c.query('SELECT pg_current_xact_id()::text AS xid')).rows[0]?.xid ?? '',
      )
      if (!/^[1-9]\d*$/.test(xid)) throw new GuardError(EXIT.MIGRATION_FAILED, 'No transaction id')
      await assertLockHeld(c, pid)
      alive()
      commit = { step: step.name, xid, phase: 'commit-preparing' }
      await d.writeState(target, { ...state, ...commit })
      // Durable send intent must precede the socket operation. On restart commit-sent means
      // MAY have been sent, not proof that a packet reached PostgreSQL (no atomic fs/socket).
      await d.writeState(target, { ...state, ...commit, phase: 'commit-sent' })
      commit = { ...commit, phase: 'commit-sent' }
      // From here the outcome belongs to the server: no ROLLBACK, no retry.
      began = false
      let ack: { command?: string } | undefined, commitError: unknown
      try {
        commitAttempted = true
        ack = await c.query('COMMIT')
      } catch (e) {
        commitError = e
      }
      if (commitError === undefined && ack?.command === 'COMMIT') {
        commit = { ...commit, phase: 'committed' }
        try {
          await d.writeState(target, { ...state, ...commit })
        } catch {
          stateWriteFailed = true
          throw new GuardError(EXIT.STATE_FAILED, 'DB committed; recording state failed')
        }
        alive()
        continue
      }
      const verdict =
        lost || d.signal?.aborted
          ? 'UNCERTAIN'
          : await resolveCommit(
              c,
              xid,
              step.name,
              commitError === undefined ? ack?.command === 'ROLLBACK' : isServerError(commitError),
            )
      throw verdict === 'FAILED'
        ? new GuardError(EXIT.MIGRATION_FAILED, 'COMMIT rejected; transaction verified aborted')
        : new GuardError(EXIT.UNCERTAIN, 'COMMIT outcome unknown')
    }
    const after = await readStatus(c, expected)
    if (after.pending.length) throw new GuardError(EXIT.STATUS_MISMATCH, 'Incomplete migration set')
    try {
      await d.writeState(target, { ...state, ...commit, outcome: 'COMPLETE' })
    } catch {
      stateWriteFailed = true
      throw new GuardError(EXIT.STATE_FAILED, 'DB committed; recording state failed')
    }
    d.log('Migration complete; status verified.')
    return EXIT.OK
  } catch (err) {
    let code: number =
      err instanceof GuardError ? err.exitCode : started ? EXIT.MIGRATION_FAILED : EXIT.REFUSED
    if (lost && !stateWriteFailed) code = EXIT.UNCERTAIN
    if (began && c && !lost) {
      try {
        await c.query('ROLLBACK')
      } catch {
        code = EXIT.UNCERTAIN
      }
    }
    if (started && state && target) {
      try {
        await d.writeState(target, {
          ...state,
          ...commit,
          outcome: stateWriteFailed
            ? 'STATE_FAILED'
            : code === EXIT.UNCERTAIN
              ? 'UNCERTAIN'
              : 'FAILED',
        })
      } catch {
        code = stateWriteFailed ? EXIT.STATE_FAILED : EXIT.UNCERTAIN
      }
    }
    // No raw exception, SQL, identifier, child output or input is forwarded.
    if (stateWriteFailed) {
      d.log(
        `DB committed; recording state failed. step=${commit?.step} xid=${commit?.xid}; owner reconciliation required; no automatic retry.`,
      )
      return EXIT.STATE_FAILED
    }
    if (commit?.phase === 'committed')
      d.log('Last acknowledged DB COMMIT remains applied; later work or verification failed.')
    if (commit?.phase === 'commit-preparing')
      d.log('COMMIT not sent; preparation/state write failed; session cleanup attempted.')
    if (commitAttempted && commit?.phase === 'commit-sent')
      d.log(
        `COMMIT of ${commit.step} ${code === EXIT.UNCERTAIN ? 'has an UNKNOWN outcome' : 'was rejected (verified aborted)'}; transaction id is in the state file.`,
      )
    d.log(
      code === EXIT.UNCERTAIN
        ? 'UNCERTAIN: owner reconciliation required; automatic retry blocked.'
        : 'Migration refused/failed; no retry or schema rollback performed.',
    )
    return code
  } finally {
    d.signal?.removeEventListener('abort', stop)
    if (c) {
      if (locked && !lost) await releaseLock(c).catch(() => {})
      await c.end().catch(() => {})
    }
  }
}
