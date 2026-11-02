/** I9 evidence assertions shared by live fixture and memory sensitivity tests. No I/O. */
import assert from 'node:assert/strict'
import type { RunState } from '../../scripts/lib/migration-guard'
export type I9Phase = 'commit-preparing' | 'commit-sent' | 'committed' | 'COMPLETE'
export type I9Evidence = {
  state: RunState | null
  history: { name: string; batch: string }[]
  effects: { first: boolean; next: boolean }
  transactions: { step: string; xid: string; status: string }[]
  queries: string[]
}
export async function assertI9Evidence(input: {
  phase: I9Phase
  identity: string
  plan: string
  statements: readonly string[]
  failedAttempt: RunState
  read: () => Promise<I9Evidence>
  restart: () => Promise<number>
  refusedCode: number
}) {
  const { phase, identity, plan, statements } = input
  const applied = phase === 'committed' || phase === 'COMPLETE'
  const complete = phase === 'COMPLETE'
  const step = complete ? 'm2' : 'm1'
  const before = await input.read()
  // A failed write is NOT the durable marker: the catch can persist a later outcome.
  const fields = (s: RunState | null) => s && ({
    version: s.version, identity: s.identity, plan: s.plan, step: s.step,
    outcome: s.outcome, phase: s.phase, xid: s.xid,
  })
  const tx = before.transactions.at(-1)
  assert.ok(tx && /^[1-9]\d*$/.test(tx.xid), 'I9 transaction evidence missing')
  assert.deepEqual(fields(input.failedAttempt), {
    version: 2, identity, plan, step, xid: tx.xid,
    outcome: complete ? 'COMPLETE' : 'RUNNING',
    phase: complete ? 'committed' : phase,
  }, 'I9 failed write must reach the intended injection point')
  assert.deepEqual(fields(before.state), {
    version: 2, identity, plan, step, xid: tx.xid,
    outcome: applied ? 'STATE_FAILED' : 'FAILED',
    // Send-intent fsync fails before the executor advances its in-memory phase.
    phase: applied ? 'committed' : 'commit-preparing',
  }, 'I9 durable marker after error handling')
  assert.deepEqual(before.history,
    (complete ? ['m1', 'm2'] : applied ? ['m1'] : []).map(name => ({ name, batch: '1' })),
    'I9 ordered history and batch')
  assert.deepEqual(before.effects, { first: applied, next: complete }, 'I9 committed SQL effects')
  assert.deepEqual(before.transactions.map(t => ({ step: t.step, status: t.status })),
    complete ? [{ step: 'm1', status: 'committed' }, { step: 'm2', status: 'committed' }]
      : [{ step: 'm1', status: applied ? 'committed' : 'aborted' }], 'I9 independent xid outcomes')
  assert.equal(new Set(before.transactions.map(t => t.xid)).size, before.transactions.length,
    'I9 each step must have its own xid')
  assert.deepEqual(statements.map(sql => before.queries.filter(q => q === sql).length),
    [1, complete ? 1 : 0], 'I9 no repeated statements or forbidden next step')
  assert.equal(before.queries.filter(q => q === 'COMMIT').length, complete ? 2 : applied ? 1 : 0,
    'I9 actual COMMIT attempts')
  assert.equal(await input.restart(), input.refusedCode, 'I9 restart must refuse')
  assert.deepEqual(await input.read(), before,
    'I9 restart cannot change marker/history/effects/xids or actor queries')
}
