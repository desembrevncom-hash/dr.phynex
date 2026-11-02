/** No I/O on import. Database operations are opt-in integration code, never unit setup. */
import { spawnSync, type ChildProcess } from 'node:child_process'
import { isIP } from 'node:net'
import { buildPlan, hash, type MigrationPlan } from '../../scripts/lib/migration-plan'
import { archiveToolEnvironment } from '../../scripts/lib/archive-tool'
import type { DbClient, Target } from '../../scripts/lib/migration-guard'

export const TEST_DB = 'drphynex_migration_guard_test'
export const TEST_MARKER = 'drphynex:migration-guard-test:disposable-v1'
export const BOOTSTRAP =
  'CREATE TABLE public.payload_migrations (id serial PRIMARY KEY,name varchar,batch numeric,created_at timestamptz,updated_at timestamptz); CREATE TABLE public.b5_before(id int);'
export const BLOCKED_DDL = 'ALTER TABLE public.b5_gate ADD COLUMN marker integer'
export const FAILURE_DDL = 'ALTER TABLE public.b5_missing_table ADD COLUMN marker integer'
export const NEXT_DDL = 'CREATE TABLE public.b5_should_not_exist(id int)'
export const blockedSql = [BOOTSTRAP, BLOCKED_DDL, NEXT_DDL]
// Executor-only integration probes for COMMIT semantics. This constructor is test harness code,
// never imported by production CLI and has no env/CLI switch enabling it there.
export const DEFERRED_SQL =
  BOOTSTRAP +
  ' CREATE TABLE public.b5_parent(id integer PRIMARY KEY); CREATE TABLE public.b5_child(parent integer REFERENCES public.b5_parent(id) DEFERRABLE INITIALLY DEFERRED); INSERT INTO public.b5_child VALUES (99);'
export function testOnlyPlan(sqls: readonly string[]): MigrationPlan {
  const steps = sqls.map((sql, i) =>
    Object.freeze({
      name: 'm' + (i + 1),
      filename: 'test-only-' + (i + 1),
      sha256: hash(sql),
      statements: Object.freeze([sql]),
    }),
  )
  return Object.freeze({
    steps: Object.freeze(steps),
    digest: hash('executor-test-only:' + JSON.stringify(sqls)),
  })
}
/** inet::text can include a full /32 or /128 host mask; never accept a subnet as a host. */
export function normalizeServerAddress(raw: unknown): string {
  if (typeof raw !== 'string') throw Error('Invalid server address')
  const parts = raw.split('/'),
    family = isIP(parts[0])
  if (
    !family ||
    parts.length > 2 ||
    (parts.length === 2 && parts[1] !== String(family === 4 ? 32 : 128))
  )
    throw Error('Invalid server host address')
  return family === 6 ? new URL('http://[' + parts[0] + ']/').hostname.slice(1, -1) : parts[0]
}
export function fixturePlan(sqls: readonly string[]) {
  const sources = Object.fromEntries(
    sqls.map((sql, i) => [
      'm' + (i + 1) + '.ts',
      'import {sql} from "@payloadcms/db-postgres";export async function up({db}){await db.execute(sql`' +
        sql +
        '`)}',
    ]),
  )
  const files = Object.keys(sources)
  return buildPlan(
    files,
    sources,
    JSON.stringify({
      version: 1,
      files: files.map((filename) => ({ filename, sha256: hash(sources[filename]) })),
    }),
  )
}
export function verifyContainerInspection(raw: unknown, target: Target) {
  const a = raw as {
    Id?: string
    State?: { Running?: boolean }
    Config?: { Labels?: Record<string, string> }
    NetworkSettings?: {
      Ports?: Record<string, { HostIp: string; HostPort: string }[]>
      Networks?: Record<string, { IPAddress?: string; GlobalIPv6Address?: string }>
    }
  }[]
  const c = Array.isArray(a) && a.length === 1 ? a[0] : null
  if (
    !c?.Id ||
    !/^[a-f0-9]{64}$/.test(c.Id) ||
    c.State?.Running !== true ||
    c.Config?.Labels?.['com.drphynex.migration-guard-test'] !== 'disposable-v1'
  )
    throw Error('Unapproved disposable container')
  if (
    !['localhost', '127.0.0.1', '::1'].includes(target.host) ||
    !c.NetworkSettings?.Ports?.['5432/tcp']?.some(
      (p) => ['127.0.0.1', '::1'].includes(p.HostIp) && p.HostPort === String(target.port),
    )
  )
    throw Error('Container endpoint does not match URL')
  return {
    id: c.Id,
    addresses: Object.values(c.NetworkSettings.Networks ?? {})
      .flatMap((n) => [n.IPAddress, n.GlobalIPv6Address])
      .filter((s): s is string => !!s)
      .map(normalizeServerAddress),
  }
}
const IDENTITY_SQL =
  "SELECT current_database() db,current_user usr,d.oid::text oid,shobj_description(d.oid,'pg_database') marker,(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls) privileged,inet_server_addr()::text address,inet_server_port() port,pg_postmaster_start_time()::text started FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()"
type Query = Pick<DbClient, 'query'>
export async function assertDisposable(c: Query, t: Target, container: string) {
  // Both commands are read-only; neither provisions a role/container/database.
  const inspect = spawnSync('docker', ['inspect', container], {
    encoding: 'utf8',
    env: archiveToolEnvironment(process.env),
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 10000,
  })
  if (inspect.status !== 0) throw Error('Container inspection failed')
  const proof = verifyContainerInspection(JSON.parse(inspect.stdout), t)
  const live = (await c.query(IDENTITY_SQL)).rows[0]
  if (
    !live ||
    live.db !== TEST_DB ||
    t.database !== TEST_DB ||
    t.marker !== TEST_MARKER ||
    live.marker !== TEST_MARKER ||
    live.usr !== t.role ||
    live.privileged !== false ||
    live.port !== 5432 ||
    !proof.addresses.includes(normalizeServerAddress(live.address))
  )
    throw Error('Unsafe live disposable connection')
  const cli = spawnSync(
    'docker',
    [
      'exec',
      proof.id,
      'psql',
      '-X',
      '-h',
      '127.0.0.1',
      '-U',
      t.role,
      '-d',
      TEST_DB,
      '-At',
      '-c',
      'SELECT row_to_json(i) FROM (' + IDENTITY_SQL + ') i',
    ],
    {
      encoding: 'utf8',
      env: archiveToolEnvironment(process.env),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    },
  )
  if (cli.status !== 0) throw Error('Container database identity failed')
  const inside = JSON.parse(cli.stdout.trim())
  if (
    inside.db !== live.db ||
    inside.usr !== live.usr ||
    inside.oid !== live.oid ||
    inside.marker !== live.marker ||
    inside.privileged !== false ||
    inside.started !== live.started ||
    inside.port !== live.port
  )
    throw Error('URL and container are not the same database instance')
}
export async function waitForBlockedExecutor(control: Query, t: Target) {
  const until = Date.now() + 5000
  while (Date.now() < until) {
    // PG17 27.2.2: pg_stat_activity is cached inside a transaction too. The controller must
    // retain its table lock, so clear its stats snapshot before EACH bounded observation.
    await control.query('SELECT pg_stat_clear_snapshot()')
    const r = await control.query(
      "SELECT pid FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND application_name='drphynex-migrate-guard' AND query=$3 AND wait_event_type='Lock' AND pg_backend_pid()=ANY(pg_blocking_pids(pid))",
      [t.database, t.role, BLOCKED_DDL],
    )
    if (r.rows.length === 1) return Number(r.rows[0].pid)
    if (r.rows.length > 1) throw Error('Ambiguous blocked executor')
    await new Promise((r) => setTimeout(r, 25))
  }
  throw Error('Approved fixture never reached blocked DDL')
}
export function waitForFixtureExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer)
      child.removeListener('exit', exited)
      child.removeListener('error', failed)
      if (error) reject(error)
      else resolve()
    }
    const exited = () => finish(),
      failed = () => finish(Error('Owned fixture process failed'))
    const timer = setTimeout(
      () => finish(Error('Owned fixture process did not exit within 5s')),
      5000,
    )
    child.once('exit', exited)
    child.once('error', failed)
  })
}
