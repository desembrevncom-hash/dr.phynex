import { describe, it, expect } from 'vitest'
import pg from 'pg'
import { StepRecorder, classifyFailure, typed, typedRows } from '../guard/case-evidence'
import { readStatus, EXIT } from '../../scripts/lib/migration-guard'

describe('I10 data path for batch NaN (no database)', () => {
  it('pg returns unconstrained numeric NaN as the string "NaN"', () => {
    expect(pg.types.getTypeParser(1700, 'text')('NaN')).toBe('NaN')
  })
  it.each(['NaN', Number.NaN])('readStatus refuses batch %s before any write', async (batch) => {
    const calls: string[] = []
    const client = {
      query: async (sql: string) => {
        calls.push(sql)
        return sql.includes('to_regclass')
          ? { rows: [{ present: true }] }
          : { rows: [{ id: 1, name: 'm1', batch }] }
      },
      end: async () => {},
      abort: () => {},
      onError: () => {},
    }
    await expect(readStatus(client, ['m1'])).rejects.toMatchObject({
      exitCode: EXIT.STATUS_MISMATCH,
    })
    expect(calls).toHaveLength(2)
  })
})

describe('typed evidence values', () => {
  it('keeps NaN, Infinity, -0, null and the string "NaN" distinct through JSON', () => {
    const values = [Number.NaN, '"NaN"', 'NaN', Infinity, -0, 0, null, undefined, true, 10n]
    const out = JSON.parse(JSON.stringify(values.map(typed)))
    expect(out).toEqual([
      { type: 'number', repr: 'NaN' },
      { type: 'string', repr: '"\\"NaN\\""' },
      { type: 'string', repr: '"NaN"' },
      { type: 'number', repr: 'Infinity' },
      { type: 'number', repr: '-0' },
      { type: 'number', repr: '0' },
      { type: 'null', repr: 'null' },
      { type: 'undefined', repr: 'undefined' },
      { type: 'boolean', repr: 'true' },
      { type: 'bigint', repr: '10' },
    ])
    expect(new Set(out.map((v: { type: string; repr: string }) => v.type + v.repr)).size).toBe(values.length)
  })
  it('types every column of a row and omits objects', () => {
    expect(typedRows([{ batch: 'NaN', id: 1, extra: { secret: 'S' } }])).toEqual([
      {
        batch: { type: 'string', repr: '"NaN"' },
        id: { type: 'number', repr: '1' },
        extra: { type: 'object', repr: '<omitted>' },
      },
    ])
  })
})

describe('failure classification never carries raw text', () => {
  const capture = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      return e
    }
  }
  it.each([
    [capture(() => expect('PASSWORD_SENTINEL').toBe('x')), { kind: 'assertion' }],
    [
      Error('Disposable resource policy mismatch: resource-changed'),
      { kind: 'resource-policy', code: 'resource-changed' },
    ],
    [Error('Test-only dump failed'), { kind: 'harness', message: 'Test-only dump failed' }],
    [
      Object.assign(Error('canceling statement SQL_SENTINEL'), { code: '57014' }),
      { kind: 'sql', sqlstate: '57014' },
    ],
    [Error('connect postgresql://u:PASSWORD_SENTINEL@h/db'), { kind: 'other', name: 'Error' }],
    [new AggregateError([], 'SENTINEL'), { kind: 'other', name: 'AggregateError' }],
    ['not an error', { kind: 'other', name: 'unknown' }],
  ])('classifies %#', (error, expected) => {
    const result = classifyFailure(error)
    expect(result).toEqual(expected)
    expect(JSON.stringify(result)).not.toMatch(/SENTINEL/)
  })
})

describe('step recorder', () => {
  it('saves the failing step ID and rethrows the original failure', async () => {
    const saved: string[] = []
    const rec = new StepRecorder('I10', (v) => saved.push(JSON.stringify(v)))
    await rec.step('I10.r1.A1', () => 1)
    rec.observe('I10.r1.run1', { exit: EXIT.STATUS_MISMATCH, batch: typed(Number.NaN) })
    const original = capture(() => expect(1).toBe(2))
    await expect(
      rec.step('I10.r1.A2', () => {
        throw original
      }),
    ).rejects.toBe(original)
    const last = JSON.parse(saved.at(-1)!)
    expect(last.steps).toEqual([
      { id: 'I10.r1.A1', outcome: 'ok' },
      { id: 'I10.r1.A2', outcome: 'failed', failure: { kind: 'assertion' } },
    ])
    expect(last.observations['I10.r1.run1'].batch).toEqual({ type: 'number', repr: 'NaN' })
    expect(last.complete).toBe(false)
  })
  it('reports a failed save instead of hiding it', () => {
    const rec = new StepRecorder('I10', () => {
      throw Error('disk full')
    })
    rec.observe('x', 1)
    expect(rec.saveFailed).toBe(true)
  })
})
function capture(fn: () => void) {
  try {
    fn()
  } catch (e) {
    return e
  }
}
