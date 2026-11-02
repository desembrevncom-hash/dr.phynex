import { beforeEach, describe, expect, it, vi } from 'vitest'

const spawnSync = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawnSync }))

import { assertDisposable } from '../guard/fixture-support'
import {
  type ResourcePolicy,
  assertResourcesUnchanged,
  inspectNetworkMembers,
} from '../guard/resource-policy'

// Synthetic metadata written by hand: spawnSync is mocked, so no process or Docker engine is used.
const A = 'a'.repeat(64),
  B = 'b'.repeat(64),
  NET = 'c'.repeat(64),
  OTHER_NET = 'd'.repeat(64),
  NAME = 'drphynex-b5-test-net',
  LABEL = { 'com.drphynex.migration-guard-test': 'disposable-v1' }
const policy: ResourcePolicy = {
  version: 1,
  containerId: A,
  ports: [{ containerPort: '5432/tcp', hostIp: '127.0.0.1', hostPort: 55499 }],
  volumes: [],
  networks: [{ name: NAME, id: NET }],
}
const row = (Id: string, Networks: Record<string, { NetworkID: string }>, NetworkMode = NAME) => ({
  Id,
  HostConfig: { NetworkMode },
  NetworkSettings: { Networks },
})
const approved = row(A, { [NAME]: { NetworkID: NET } })
const running = {
  ...approved,
  State: { Running: true, StartedAt: 't1' },
  Config: { Labels: LABEL },
  Mounts: [],
  NetworkSettings: {
    Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55499' }] },
    Networks: { [NAME]: { NetworkID: NET, IPAddress: '172.31.0.2' } },
  },
}
const bridge = {
  Id: NET,
  Name: NAME,
  Scope: 'local',
  Driver: 'bridge',
  Internal: false,
  Ingress: false,
  ConfigOnly: false,
  Options: {},
  Labels: LABEL,
  Containers: { [A]: {} },
}
const mismatch = (reason: string) => 'Disposable resource policy mismatch: ' + reason

describe('network membership across every container state', () => {
  it('accepts A alone and a stopped container on another network', () => {
    expect(() => inspectNetworkMembers([A], [approved], policy)).not.toThrow()
    expect(() =>
      inspectNetworkMembers(
        [A, B],
        [approved, row(B, { other: { NetworkID: OTHER_NET } }, 'other')],
        policy,
      ),
    ).not.toThrow()
  })
  it('refuses stopped B on the bridge, which network inspect does not list', () =>
    expect(() =>
      inspectNetworkMembers([A, B], [approved, row(B, { [NAME]: { NetworkID: NET } })], policy),
    ).toThrow(mismatch('network-member')))
  it('compares the attachment ID, whatever the entry is called', () =>
    expect(() =>
      inspectNetworkMembers(
        [A, B],
        [approved, row(B, { alias: { NetworkID: NET } }, 'alias')],
        policy,
      ),
    ).toThrow(mismatch('network-member')))
  it.each([NAME, NET])('refuses B whose network mode still names the bridge (%s)', (mode) =>
    expect(() =>
      inspectNetworkMembers(
        [A, B],
        [approved, row(B, { other: { NetworkID: OTHER_NET } }, mode)],
        policy,
      ),
    ).toThrow(mismatch('network-member')),
  )
  it('refuses B sharing the network namespace of A', () =>
    expect(() =>
      inspectNetworkMembers([A, B], [approved, row(B, {}, 'container:' + A)], policy),
    ).toThrow(mismatch('network-member')))
  it('refuses a namespace reference that is not a full ID', () =>
    expect(() =>
      inspectNetworkMembers([A, B], [approved, row(B, {}, 'container:postgres')], policy),
    ).toThrow(mismatch('network-members-incomplete')))
  it('refuses when A is not attached to the bridge', () =>
    expect(() =>
      inspectNetworkMembers([A], [row(A, { other: { NetworkID: OTHER_NET } }, 'other')], policy),
    ).toThrow(mismatch('network-member')))
  it.each([
    ['A missing from the list', [B], [row(B, {})]],
    ['listing shorter than inspect', [A], [approved, row(B, {})]],
    ['inspect shorter than listing', [A, B], [approved]],
    ['row outside the listing', [A, B], [approved, row('e'.repeat(64), {})]],
    ['duplicate ID', [A, A], [approved, approved]],
    ['truncated ID', [A, B.slice(0, 12)], [approved, row(B.slice(0, 12), {})]],
    ['listing not an array', 'not-a-list', [approved]],
    ['inspect not an array', [A], {}],
    ['empty attachment ID', [A, B], [approved, row(B, { other: { NetworkID: '' } }, 'other')]],
    ['Networks missing', [A, B], [approved, { Id: B, HostConfig: { NetworkMode: 'none' } }]],
    ['HostConfig missing', [A, B], [approved, { Id: B, NetworkSettings: { Networks: {} } }]],
  ])('fails closed on incomplete metadata: %s', (_name, listed, rows) =>
    expect(() => inspectNetworkMembers(listed, rows, policy)).toThrow(
      mismatch('network-members-incomplete'),
    ),
  )
  it('refuses a resource that changed between two verification passes', () => {
    expect(() => assertResourcesUnchanged('same', 'same')).not.toThrow()
    expect(() => assertResourcesUnchanged('first', 'second')).toThrow(mismatch('resource-changed'))
  })
})

type Docker = (args: string[]) => { status: number | null; stdout: string }
const ok = (value: unknown) => ({ status: 0, stdout: JSON.stringify(value) })
/** Answers the read-only commands assertDisposable sends; a test overrides one of them. */
const docker =
  (override: Docker = () => ({ status: -1, stdout: '' })): Docker =>
  (args) => {
    const forced = override(args)
    if (forced.status !== -1) return forced
    if (args[0] === 'ps') return { status: 0, stdout: A + '\n' + B + '\n' }
    if (args[0] === 'network') return ok([bridge])
    if (args[0] === 'container') return ok([approved, row(B, {}, 'none')])
    return ok([running])
  }
describe('assertDisposable membership gate (mocked spawnSync)', () => {
  const query = vi.fn()
  const check = () =>
    assertDisposable({ query }, { host: '127.0.0.1', port: 55499 } as never, A, policy)
  beforeEach(() => {
    vi.stubEnv('B5_TEST_RUN_DIR', '/owned/run')
    vi.stubEnv('B5_TEST_DOCKER_CONFIG', '/owned/run/docker')
    query.mockReset()
    query.mockRejectedValue(Error('SQL reached'))
    spawnSync.mockReset()
  })
  const use = (fake: Docker) => spawnSync.mockImplementation((_bin, args: string[]) => fake(args))
  it('lists every state and reaches SQL only after two matching passes', async () => {
    use(docker())
    await expect(check()).rejects.toThrow('SQL reached')
    const lists = spawnSync.mock.calls.filter(([, args]) => args[0] === 'ps')
    expect(lists).toHaveLength(2)
    expect(lists[0][1]).toEqual(['ps', '--all', '--no-trunc', '--format', '{{.ID}}'])
  })
  it('refuses A running with B stopped on the same network before any SQL', async () => {
    use(
      docker((args) =>
        args[0] === 'container'
          ? ok([approved, row(B, { [NAME]: { NetworkID: NET } })])
          : { status: -1, stdout: '' },
      ),
    )
    await expect(check()).rejects.toThrow(mismatch('network-member'))
    expect(query).not.toHaveBeenCalled()
  })
  it.each([
    ['listing fails', 'ps', { status: 1, stdout: '' }],
    ['listing times out', 'ps', { status: null, stdout: '' }],
    ['inspect fails', 'container', { status: 1, stdout: '' }],
    ['inspect times out', 'container', { status: null, stdout: '' }],
    ['inspect returns unreadable output', 'container', { status: 0, stdout: 'not json' }],
  ])('refuses when %s', async (_name, verb, result) => {
    use(docker((args) => (args[0] === verb ? result : { status: -1, stdout: '' })))
    await expect(check()).rejects.toThrow()
    expect(query).not.toHaveBeenCalled()
  })
  it('refuses a container created on the list between the two passes', async () => {
    let lists = 0
    use(
      docker((args) =>
        args[0] === 'ps' && ++lists === 2
          ? { status: 0, stdout: [A, B, 'e'.repeat(64)].join('\n') }
          : args[0] === 'container' && args.length === 5
            ? ok([approved, row(B, {}, 'none'), row('e'.repeat(64), {}, 'none')])
            : { status: -1, stdout: '' },
      ),
    )
    await expect(check()).rejects.toThrow(mismatch('resource-changed'))
    expect(query).not.toHaveBeenCalled()
  })
  it('refuses a restart of the approved container between the two passes', async () => {
    let reads = 0
    use(
      docker((args) =>
        args[0] === 'inspect' && ++reads === 2
          ? ok([{ ...running, State: { Running: true, StartedAt: 't2' } }])
          : { status: -1, stdout: '' },
      ),
    )
    await expect(check()).rejects.toThrow(mismatch('resource-changed'))
    expect(query).not.toHaveBeenCalled()
  })
  it('splits a long listing so one argument list stays bounded', async () => {
    const many = Array.from({ length: 250 }, (_, i) => i.toString(16).padStart(64, '0'))
    use(
      docker((args) =>
        args[0] === 'ps'
          ? { status: 0, stdout: [A, ...many].join('\n') }
          : args[0] === 'container'
            ? ok(args.slice(2).map((v) => (v === A ? approved : row(v, {}, 'none'))))
            : { status: -1, stdout: '' },
      ),
    )
    await expect(check()).rejects.toThrow('SQL reached')
    const batches = spawnSync.mock.calls.filter(([, args]) => args[0] === 'container')
    expect(Math.max(...batches.map(([, args]) => args.length - 2))).toBeLessThanOrEqual(100)
  })
})
