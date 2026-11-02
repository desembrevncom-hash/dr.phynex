import { describe, it, expect } from 'vitest'
import { assertI9Evidence, type I9Evidence, type I9Phase } from '../guard/i9-assertions'
import type { RunState } from '../../scripts/lib/migration-guard'

const phases: I9Phase[] = ['commit-preparing', 'commit-sent', 'committed', 'COMPLETE']
function fixture(phase: I9Phase) {
  const complete = phase === 'COMPLETE', applied = complete || phase === 'committed'
  const common = {
    version: 2 as const, identity: 'a'.repeat(64), plan: 'b'.repeat(64), runId: 'memory-only',
    step: complete ? 'm2' : 'm1', xid: complete ? '1002' : '1001',
  }
  const evidence: I9Evidence = {
    state: { ...common, outcome: applied ? 'STATE_FAILED' : 'FAILED',
      phase: applied ? 'committed' : 'commit-preparing' },
    history: (complete ? ['m1', 'm2'] : applied ? ['m1'] : []).map(name => ({ name, batch: '1' })),
    effects: { first: applied, next: complete },
    transactions: complete
      ? [{ step: 'm1', xid: '1001', status: 'committed' }, { step: 'm2', xid: '1002', status: 'committed' }]
      : [{ step: 'm1', xid: '1001', status: applied ? 'committed' : 'aborted' }],
    queries: complete ? ['first SQL', 'COMMIT', 'next SQL', 'COMMIT']
      : applied ? ['first SQL', 'COMMIT'] : ['first SQL'],
  }
  const input = {
    phase, identity: common.identity, plan: common.plan, statements: ['first SQL', 'next SQL'],
    failedAttempt: { ...common, outcome: complete ? 'COMPLETE' : 'RUNNING',
      phase: complete ? 'committed' : phase } as RunState,
    read: async () => structuredClone(evidence),
    restart: async () => 2, refusedCode: 2,
  }
  return { evidence, input }
}
describe('I9 live assertion sensitivity, entirely in memory', () => {
  for (const phase of phases) {
    it(`${phase}: accepts the last persisted catch marker, not the failed write`, async () => {
      await expect(assertI9Evidence(fixture(phase).input)).resolves.toBeUndefined()
    })
    for (const field of ['identity', 'plan', 'step', 'outcome', 'phase', 'xid'] as const) {
      it(`${phase}: detects wrong durable ${field}`, async () => {
        const { evidence, input } = fixture(phase)
        Object.assign(evidence.state!, { [field]: 'wrong' })
        await expect(assertI9Evidence(input)).rejects.toThrow('durable marker')
      })
    }
    it(`${phase}: requires the intended injection point`, async () => {
      const { input } = fixture(phase)
      input.failedAttempt.step = 'wrong'
      await expect(assertI9Evidence(input)).rejects.toThrow('injection point')
    })
    it(`${phase}: rejects a missing durable marker`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.state = null
      await expect(assertI9Evidence(input)).rejects.toThrow('durable marker')
    })
    it(`${phase}: rejects additional history`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.history.push({ name: 'extra', batch: '1' })
      await expect(assertI9Evidence(input)).rejects.toThrow('ordered history')
    })
    it(`${phase}: rejects repeated SQL`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.queries.push('first SQL')
      await expect(assertI9Evidence(input)).rejects.toThrow('forbidden next step')
    })
    it(`${phase}: rejects an extra COMMIT`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.queries.push('COMMIT')
      await expect(assertI9Evidence(input)).rejects.toThrow('COMMIT attempts')
    })
    it(`${phase}: detects incorrect SQL effect`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.effects.first = !evidence.effects.first
      await expect(assertI9Evidence(input)).rejects.toThrow('SQL effects')
    })
    it(`${phase}: detects incorrect independent xid outcome`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.transactions[0].status = 'in progress'
      await expect(assertI9Evidence(input)).rejects.toThrow('xid outcomes')
    })
    for (const change of ['state', 'history', 'effect', 'query', 'xid'] as const) {
      it(`${phase}: restart cannot change ${change}`, async () => {
        const { evidence, input } = fixture(phase)
        input.restart = async () => {
          if (change === 'state') evidence.state!.runId = 'changed'
          if (change === 'history') evidence.history.push({ name: 'extra', batch: '2' })
          if (change === 'effect') evidence.effects.next = !evidence.effects.next
          if (change === 'query') evidence.queries.push('SELECT unexpected')
          if (change === 'xid') evidence.transactions[0].xid = '9999'
          return 2
        }
        await expect(assertI9Evidence(input)).rejects.toThrow('restart cannot change')
      })
    }
  }
  for (const change of ['name', 'order', 'batch', 'missing'] as const) {
    it(`detects ${change} in full committed history`, async () => {
      const { evidence, input } = fixture('COMPLETE')
      if (change === 'name') evidence.history[0].name = 'wrong'
      if (change === 'order') evidence.history.reverse()
      if (change === 'batch') evidence.history[0].batch = '2'
      if (change === 'missing') evidence.history.pop()
      await expect(assertI9Evidence(input)).rejects.toThrow('ordered history')
    })
  }
  for (const phase of phases.filter(p => p !== 'COMPLETE')) {
    it(`${phase}: rejects forbidden next effect even without actor trace`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.effects.next = true
      await expect(assertI9Evidence(input)).rejects.toThrow('SQL effects')
    })
    it(`${phase}: detects next statement even if its effect was rolled back`, async () => {
      const { evidence, input } = fixture(phase)
      evidence.queries.push('next SQL')
      await expect(assertI9Evidence(input)).rejects.toThrow('forbidden next step')
    })
  }
  it('COMPLETE requires distinct xids for both committed steps', async () => {
    const { evidence, input } = fixture('COMPLETE')
    evidence.transactions[0].xid = '1002'
    await expect(assertI9Evidence(input)).rejects.toThrow('own xid')
  })
  it('requires refused restart code even if evidence stays unchanged', async () => {
    const { input } = fixture('committed')
    input.restart = async () => 0
    await expect(assertI9Evidence(input)).rejects.toThrow('restart must refuse')
  })
})
