import { describe, expect, it } from 'vitest'

import {
  EXIT,
  GuardError,
  checkIdentity,
  type DbClient,
  type Target,
} from '../../scripts/lib/migration-guard'

// Pure in-memory: the fake session answers the identity query with a canned row. What PostgreSQL
// returns for risky_roles is proven separately against a real disposable database (rehearsal 3).
const target = {
  name: 'rehearsal3',
  environment: 'local',
  host: '127.0.0.1',
  port: 55499,
  database: 'db',
  role: 'migrator',
  marker: 'marker',
  settings: {},
  backupMaxAgeHours: 24,
  stateFile: '/x/state.json',
} as Target
const row = (over: Record<string, unknown> = {}) => ({
  db: 'db',
  usr: 'migrator',
  marker: 'marker',
  pid: 7,
  super: false,
  createdb: false,
  createrole: false,
  replication: false,
  bypassrls: false,
  risky_roles: '',
  ...over,
})
const client = (r: Record<string, unknown>): DbClient => ({
  query: async () => ({ rows: [r] }),
  end: async () => {},
  abort: () => {},
  onError: () => {},
})
const outcome = (r: Record<string, unknown>) =>
  checkIdentity(client(r), target).then(
    (pid) => ({ ok: true as const, pid }),
    (e) => ({
      ok: false as const,
      exit: e instanceof GuardError ? e.exitCode : -1,
      msg: e.message,
    }),
  )

describe('migration role identity', () => {
  it('accepts a limited role that reaches no privileged role', async () => {
    expect(await outcome(row())).toEqual({ ok: true, pid: 7 })
  })

  it('refuses each privilege flag on the role itself', async () => {
    for (const k of ['super', 'createdb', 'createrole', 'replication', 'bypassrls'])
      expect(await outcome(row({ [k]: true }))).toMatchObject({ ok: false, exit: EXIT.IDENTITY })
  })

  it('refuses a role that can reach a privileged role by membership, inheritance or SET ROLE', async () => {
    for (const reach of ['drphynex', 'pg_execute_server_program', 'a,b'])
      expect(await outcome(row({ risky_roles: reach }))).toEqual({
        ok: false,
        exit: EXIT.IDENTITY,
        msg: 'Migration role can reach a privileged role',
      })
  })

  it('fails closed when the answer lacks the reachability column or has the wrong type', async () => {
    const { risky_roles: _drop, ...without } = row()
    for (const r of [without, row({ risky_roles: null }), row({ risky_roles: ['x'] })])
      expect(await outcome(r)).toMatchObject({ ok: false, exit: EXIT.IDENTITY })
  })

  it('still refuses a wrong database, role or marker', async () => {
    for (const over of [{ db: 'other' }, { usr: 'other' }, { marker: 'other' }])
      expect(await outcome(row(over))).toMatchObject({ ok: false, exit: EXIT.IDENTITY })
  })
})
