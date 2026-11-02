import { describe, it, expect, vi } from 'vitest'
import { parseRunState, validateRunState, stateIdentity } from '../../scripts/lib/migration-state'
import {
  verifyContainerInspection,
  waitForBlockedExecutor,
  BLOCKED_DDL,
  normalizeServerAddress,
  waitForFixtureExit,
} from '../guard/fixture-support'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
const target = {
  name: 'test',
  host: '127.0.0.1',
  port: 55499,
  database: 'drphynex_migration_guard_test',
  role: 'limited',
  marker: 'marker',
  environment: 'local' as const,
  settings: {},
  backupMaxAgeHours: 1,
  stateFile: '/outside/state',
}
const legacy = { outcome: 'COMPLETE', runId: 'old-run', plan: 'a'.repeat(64) }
const current = {
  ...legacy,
  version: 2,
  identity: stateIdentity(target),
  phase: 'committed',
  step: 'm1',
  xid: '1001',
}
describe('versioned state validation (no filesystem or database)', () => {
  it.each(['null', '[]', '{}', '{"outcome":"COMPLETE"}', 'broken'])(
    'rejects corrupt state %s',
    (json) => expect(() => parseRunState(json, target)).toThrow(),
  )
  it('L4 refuses all unversioned records, including otherwise valid COMPLETE', () =>
    expect(() => validateRunState(legacy, target)).toThrow())
  it('validates the full v2 identity and commit fields', () =>
    expect(validateRunState(current, target)).toEqual(current))
  it.each([
    { ...current, version: 3 },
    { ...current, identity: 'b'.repeat(64) },
    { ...current, phase: 'unknown' },
    { ...current, xid: null },
    { ...current, xid: '18446744073709551616' },
    { ...current, step: undefined },
    { ...current, outcome: ['COMPLETE'] },
    { ...current, extra: true },
    { ...current, phase: undefined, xid: undefined, step: undefined },
  ])('rejects unknown/inconsistent records', (s) =>
    expect(() => validateRunState(s, target)).toThrow(),
  )
})
describe('disposable container endpoint proof (no Docker execution)', () => {
  it('L2 stops a nonmatching observer after 5s instead of extending its timeout', async () => {
    vi.useFakeTimers()
    try {
      const result = waitForBlockedExecutor({ query: async () => ({ rows: [] }) }, target).catch(
        (e) => e,
      )
      await vi.advanceTimersByTimeAsync(5000)
      expect(await result).toBeInstanceOf(Error)
    } finally {
      vi.useRealTimers()
    }
  })
  it('bounds waiting for its owned fixture child without spawning a process', async () => {
    vi.useFakeTimers()
    try {
      const fake = Object.assign(new EventEmitter(), { exitCode: null }) as unknown as ChildProcess
      const result = waitForFixtureExit(fake).catch((e) => e)
      await vi.advanceTimersByTimeAsync(5000)
      expect(await result).toBeInstanceOf(Error)
      expect(fake.listenerCount('exit')).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
  it('L1 compares actual inet text /32 and /128 with Docker host addresses', () => {
    expect(normalizeServerAddress('172.31.0.2/32')).toBe(normalizeServerAddress('172.31.0.2'))
    expect(normalizeServerAddress('2001:db8:0:0::2/128')).toBe(
      normalizeServerAddress('2001:db8::2'),
    )
    expect(() => normalizeServerAddress('172.31.0.0/24')).toThrow()
  })
  it('L2 discards a transaction-cached activity snapshot before polling', async () => {
    let cached = true,
      ticks = 0
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => ticks++ * 1000)
    const control = {
      query: async (sql: string) => {
        if (sql.includes('pg_stat_clear_snapshot')) {
          cached = false
          return { rows: [] }
        }
        return { rows: cached ? [] : [{ pid: 42 }] }
      },
    }
    try {
      expect(await waitForBlockedExecutor(control, target)).toBe(42)
    } finally {
      clock.mockRestore()
    }
  })
  it('synchronizes against the exact approved DDL blocked by the controller (memory only)', async () => {
    const calls: { sql: string; params?: unknown[] }[] = []
    const control = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params })
        return { rows: [{ pid: 42 }] }
      },
    }
    expect(await waitForBlockedExecutor(control, target)).toBe(42)
    const activity = calls.find((c) => c.sql.includes('pg_stat_activity'))!
    expect(activity.params).toEqual([target.database, target.role, BLOCKED_DDL])
    expect(activity.sql).toContain('pg_blocking_pids(pid)')
    expect(activity.sql).toContain("wait_event_type='Lock'")
  })
  const proof = {
    Id: 'a'.repeat(64),
    State: { Running: true },
    Config: { Labels: { 'com.drphynex.migration-guard-test': 'disposable-v1' } },
    NetworkSettings: {
      Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55499' }] },
      Networks: { test: { IPAddress: '172.31.0.2' } },
    },
  }
  it('accepts only the labelled running container and exact loopback mapping', () =>
    expect(verifyContainerInspection([proof], target).id).toBe(proof.Id))
  it.each([
    { ...proof, State: { Running: false } },
    { ...proof, Config: { Labels: {} } },
    {
      ...proof,
      NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '0.0.0.0', HostPort: '55499' }] } },
    },
    {
      ...proof,
      NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '5432' }] } },
    },
  ])('refuses unsafe endpoint/container metadata', (s) =>
    expect(() => verifyContainerInspection([s], target)).toThrow(),
  )
})
