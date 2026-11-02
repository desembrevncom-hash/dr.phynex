import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { describe, it, expect, vi } from 'vitest'
import {
  verifyContainerInspection,
  waitForFixtureExit,
  registerOwnedFixture,
  stopOwnedFixture,
} from '../guard/fixture-support'
import {
  type ResourcePolicy,
  inspectApprovedAttachments,
  inspectVolumeUsers,
} from '../guard/resource-policy'
import { integrationEnvironment, fixtureEnvironment } from '../guard/test-environment.mjs'
import { safeResults, allCasesPassed } from '../guard/safe-reporter.mjs'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const target = { host: '127.0.0.1', port: 55499 }
const policy: ResourcePolicy = {
  version: 1,
  containerId: 'a'.repeat(64),
  ports: [{ containerPort: '5432/tcp', hostIp: '127.0.0.1', hostPort: 55499 }],
  volumes: [],
  networks: [{ name: 'drphynex-b5-test-net', id: 'b'.repeat(64) }],
}
const good = {
  Id: policy.containerId,
  State: { Running: true },
  Config: { Labels: { 'com.drphynex.migration-guard-test': 'disposable-v1' } },
  HostConfig: { NetworkMode: 'drphynex-b5-test-net' },
  Mounts: [],
  NetworkSettings: {
    Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55499' }] },
    Networks: { 'drphynex-b5-test-net': { NetworkID: 'b'.repeat(64), IPAddress: '172.31.0.2' } },
  },
}
describe('resource isolation regressions (metadata only)', () => {
  it('rejects a volume also used by any other container, including a stopped one', () => {
    expect(() => inspectVolumeUsers([policy.containerId], policy)).not.toThrow()
    expect(() => inspectVolumeUsers([policy.containerId, 'c'.repeat(64)], policy)).toThrow()
  })
  it('accepts an exactly declared dedicated container/network', () => {
    expect(verifyContainerInspection([good], target, policy).id).toBe(policy.containerId)
    expect(() =>
      inspectApprovedAttachments(
        [],
        [
          {
            Id: policy.networks[0].id,
            Name: policy.networks[0].name,
            Driver: 'bridge',
            Internal: true,
            Labels: { 'com.drphynex.migration-guard-test': 'disposable-v1' },
            Containers: { [policy.containerId]: {} },
          },
        ],
        policy,
      ),
    ).not.toThrow()
  })
  it('refuses a shared or externally routed network despite the right label', () => {
    const n = {
      Id: policy.networks[0].id,
      Name: policy.networks[0].name,
      Driver: 'bridge',
      Internal: true,
      Labels: { 'com.drphynex.migration-guard-test': 'disposable-v1' },
      Containers: { [policy.containerId]: {}, ['c'.repeat(64)]: {} },
    }
    expect(() => inspectApprovedAttachments([], [n], policy)).toThrow()
    expect(() =>
      inspectApprovedAttachments([], [{ ...n, Containers: {}, Internal: false }], policy),
    ).toThrow()
  })
  it.each([
    {
      ...good,
      NetworkSettings: {
        ...good.NetworkSettings,
        Ports: {
          '5432/tcp': [
            ...good.NetworkSettings.Ports['5432/tcp'],
            { HostIp: '0.0.0.0', HostPort: '55499' },
          ],
        },
      },
    },
    {
      ...good,
      NetworkSettings: {
        ...good.NetworkSettings,
        Ports: {
          ...good.NetworkSettings.Ports,
          '9999/tcp': [{ HostIp: '0.0.0.0', HostPort: '9999' }],
        },
      },
    },
    {
      ...good,
      Mounts: [
        {
          Type: 'bind',
          Source: '/business-data',
          Destination: '/var/lib/postgresql/data',
          RW: true,
        },
      ],
    },
    {
      ...good,
      Mounts: [
        {
          Type: 'volume',
          Name: 'business-volume',
          Destination: '/var/lib/postgresql/data',
          RW: true,
        },
      ],
    },
    {
      ...good,
      NetworkSettings: {
        ...good.NetworkSettings,
        Networks: {
          ...good.NetworkSettings.Networks,
          business: { NetworkID: 'c'.repeat(64), IPAddress: '172.30.0.2' },
        },
      },
    },
  ])('refuses mixed approved and unapproved resources', (raw) =>
    expect(() => verifyContainerInspection([raw], target as never, policy)).toThrow(),
  )
})
describe('idempotent owned-child wait regressions (no processes)', () => {
  it('SIGKILL during cleanup is signalled once even if cleanup is called twice', async () => {
    const fake = Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: null as string | null,
      killed: false,
      kill: vi.fn(() => true),
    })
    fake.kill.mockImplementation(() => {
      fake.killed = true
      queueMicrotask(() => {
        fake.signalCode = 'SIGKILL'
        fake.emit('exit', null, 'SIGKILL')
      })
      return true
    })
    registerOwnedFixture(fake as unknown as ChildProcess)
    await Promise.all([
      stopOwnedFixture(fake as unknown as ChildProcess),
      stopOwnedFixture(fake as unknown as ChildProcess),
    ])
    expect(fake.kill).toHaveBeenCalledTimes(1)
    expect(fake.listenerCount('exit')).toBe(0)
  })
  it('handles normal exit after registration and repeated cleanup without a second kill', async () => {
    const fake = Object.assign(new EventEmitter(), {
      exitCode: null as number | null,
      signalCode: null as string | null,
      killed: false,
      kill: vi.fn(() => true),
    })
    registerOwnedFixture(fake as unknown as ChildProcess)
    const waiting = waitForFixtureExit(fake as unknown as ChildProcess)
    fake.exitCode = 0
    fake.emit('exit', 0, null)
    await waiting
    await stopOwnedFixture(fake as unknown as ChildProcess)
    await stopOwnedFixture(fake as unknown as ChildProcess)
    expect(fake.kill).not.toHaveBeenCalled()
  })
  it('never signals an unregistered handle', async () => {
    const fake = Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: null,
      kill: vi.fn(),
    })
    await expect(stopOwnedFixture(fake as unknown as ChildProcess)).rejects.toThrow()
    expect(fake.kill).not.toHaveBeenCalled()
  })
  it.each([
    { exitCode: 0, signalCode: null },
    { exitCode: null, signalCode: 'SIGKILL' },
  ])('recognizes a process already gone', async (state) => {
    vi.useFakeTimers()
    try {
      const child = Object.assign(new EventEmitter(), state) as unknown as ChildProcess
      const a = waitForFixtureExit(child).then(
          () => true,
          () => false,
        ),
        b = waitForFixtureExit(child).then(
          () => true,
          () => false,
        )
      await vi.advanceTimersByTimeAsync(5000)
      expect(await a).toBe(true)
      expect(await b).toBe(true)
      expect(child.listenerCount('exit')).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
  it('closes the check/listener race even if the exit event has already been lost', async () => {
    vi.useFakeTimers()
    try {
      const child = Object.assign(new EventEmitter(), {
          exitCode: null as number | null,
          signalCode: null as string | null,
        }),
        once = child.once.bind(child)
      child.once = ((event: string, listener: (...args: unknown[]) => void) => {
        if (event === 'exit') child.signalCode = 'SIGKILL'
        return once(event, listener)
      }) as typeof child.once
      const result = waitForFixtureExit(child as unknown as ChildProcess).then(
        () => true,
        () => false,
      )
      await vi.advanceTimersByTimeAsync(5000)
      expect(await result).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
describe('test environment and reporter sentinels (no env file or service)', () => {
  it('does not turn a skipped or incomplete matrix into launcher success', () => {
    const all = Array.from({ length: 12 }, (_, i) => ({ id: 'I' + (i + 1), status: 'pass' }))
    expect(allCasesPassed(all)).toBe(true)
    expect(allCasesPassed(all.slice(0, 11))).toBe(false)
    expect(allCasesPassed([...all.slice(0, 11), { id: 'I12', status: 'skip' }])).toBe(false)
  })
  it('loads only test configuration and explicitly disables Vite env-file discovery', () => {
    const source = readFileSync('vitest.guard.config.mts', 'utf8'),
      exported: { default?: { envDir?: boolean; test: { maxWorkers: number; retry: number } } } = {}
    runInNewContext(
      ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
        .outputText,
      {
        exports: exported,
        require: (name: string) => {
          expect(name).toBe('vitest/config')
          return { defineConfig: (x: unknown) => x }
        },
      },
    )
    expect(exported.default?.envDir).toBe(false)
    expect(exported.default?.test).toMatchObject({ maxWorkers: 1, retry: 0 })
  })
  it('forwards only explicit test variables, fixed heap and minimal system paths', () => {
    const source = {
      PATH: 'safe-path',
      SystemRoot: 'C:/Windows',
      MIGRATION_GUARD_TEST_URL: 'postgresql://limited:FAKE@127.0.0.1/test',
      MIGRATION_GUARD_TEST_CONTAINER: policy.containerId,
      B5_TEST_RESOURCES_FILE: '/approved/resources.json',
      DATABASE_URL: 'BUSINESS_SENTINEL',
      AWS_SECRET_ACCESS_KEY: 'AWS_SENTINEL',
      SMTP_PASS: 'MAIL_SENTINEL',
      NODE_OPTIONS: '--import=EVIL_SENTINEL',
      DOCKER_CONTEXT: 'REMOTE_SENTINEL',
      HOME: 'HOME_SENTINEL',
      USERPROFILE: 'PROFILE_SENTINEL',
    }
    const env = integrationEnvironment(source, {
      runDir: '/owned/run',
      dockerConfig: '/owned/run/docker',
    })
    expect(JSON.stringify(env)).not.toMatch(
      /BUSINESS_SENTINEL|AWS_SENTINEL|MAIL_SENTINEL|EVIL_SENTINEL|REMOTE_SENTINEL|HOME_SENTINEL|PROFILE_SENTINEL/,
    )
    expect(env.NODE_OPTIONS).toBe('--max-old-space-size=2048')
    const child = fixtureEnvironment(env, '/owned/run/state.json')
    expect(child.B5_TEST_URL).toBe(source.MIGRATION_GUARD_TEST_URL)
    expect(child).not.toHaveProperty('DATABASE_URL')
    expect(child).not.toHaveProperty('MIGRATION_GUARD_TEST_URL')
  })
  it('never emits raw titles/errors/SQL from the integration reporter', () => {
    const result = safeResults([
      {
        tasks: [
          {
            name: 'I12 SECRET_SQL_SENTINEL',
            type: 'test',
            result: { state: 'fail', error: 'PASSWORD_SENTINEL' },
          },
        ],
      },
    ])
    expect(result).toEqual([{ id: 'I12', status: 'fail' }])
    expect(JSON.stringify(result)).not.toMatch(/SENTINEL/)
  })
})
