/** Test-only resource approval. No Docker, network or filesystem work on import. */
import { readFileSync } from 'node:fs'
import path from 'node:path'
export type ResourcePolicy = {
  version: 1
  containerId: string
  ports: { containerPort: string; hostIp: string; hostPort: number }[]
  volumes: { name: string; destination: string; readOnly: boolean }[]
  networks: { name: string; id: string }[]
}
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const name = (v: unknown): v is string =>
  typeof v === 'string' && /^drphynex-b5-test-[a-z0-9_-]+$/.test(v)
/** The reason is a constant code from this file; no inspected value enters the message. */
const fail = (reason: string): never => {
  throw Error('Disposable resource policy mismatch: ' + reason)
}
export function validateResourcePolicy(raw: unknown): ResourcePolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('policy')
  const p = raw as ResourcePolicy
  if (
    p.version !== 1 ||
    !id(p.containerId) ||
    !Array.isArray(p.ports) ||
    !p.ports.length ||
    !Array.isArray(p.volumes) ||
    !Array.isArray(p.networks) ||
    p.networks.length !== 1
  )
    return fail('policy')
  if (
    p.ports.some(
      (v) =>
        !v ||
        v.containerPort !== '5432/tcp' ||
        !['127.0.0.1', '::1'].includes(v.hostIp) ||
        !Number.isInteger(v.hostPort) ||
        v.hostPort < 1 ||
        v.hostPort > 65535,
    )
  )
    return fail('policy')
  if (
    p.volumes.some(
      (v) =>
        !v ||
        !name(v.name) ||
        typeof v.destination !== 'string' ||
        !/^\/[a-zA-Z0-9_/-]+$/.test(v.destination) ||
        v.destination.includes('..') ||
        typeof v.readOnly !== 'boolean',
    )
  )
    return fail('policy')
  if (p.networks.some((v) => !v || !name(v.name) || !id(v.id))) return fail('policy')
  for (const a of [
    p.ports.map((v) => JSON.stringify(v)),
    p.volumes.map((v) => v.name),
    p.volumes.map((v) => v.destination),
    p.networks.map((v) => v.id),
    p.networks.map((v) => v.name),
  ])
    if (new Set(a).size !== a.length) return fail('policy')
  return p
}
export function readResourcePolicy(file: string | undefined) {
  if (!file || !path.isAbsolute(file)) return fail('policy')
  return validateResourcePolicy(JSON.parse(readFileSync(file, 'utf8')))
}
const same = (a: string[], b: string[]) => JSON.stringify(a.sort()) === JSON.stringify(b.sort())
export function inspectApprovedContainer(
  raw: unknown,
  target: { host: string; port: number },
  approval: ResourcePolicy,
  normalize: (v: unknown) => string,
) {
  const p = validateResourcePolicy(approval)
  const rows = raw as {
    Id: string
    State: { Running: boolean }
    Config: { Labels: Record<string, string> }
    HostConfig: { NetworkMode: string }
    Mounts: { Type: string; Name: string; Destination: string; RW: boolean }[]
    NetworkSettings: {
      Ports: Record<string, { HostIp: string; HostPort: string }[] | null>
      Networks: Record<
        string,
        { NetworkID: string; IPAddress?: string; GlobalIPv6Address?: string }
      >
    }
  }[]
  const c = Array.isArray(rows) && rows.length === 1 ? rows[0] : null
  if (
    !c ||
    c.Id !== p.containerId ||
    c.State?.Running !== true ||
    c.Config?.Labels?.['com.drphynex.migration-guard-test'] !== 'disposable-v1'
  )
    return fail('container-identity')
  if (
    !['localhost', '127.0.0.1', '::1'].includes(target.host) ||
    !p.ports.some((v) => v.hostPort === target.port)
  )
    return fail('endpoint')
  if (
    !c.NetworkSettings?.Ports ||
    !c.NetworkSettings.Networks ||
    !c.HostConfig ||
    !Array.isArray(c.Mounts)
  )
    return fail('container-shape')
  const actualPorts: string[] = []
  for (const [port, bindings] of Object.entries(c.NetworkSettings.Ports))
    for (const b of bindings ?? []) {
      if (!['127.0.0.1', '::1'].includes(b.HostIp) || !/^\d+$/.test(b.HostPort))
        return fail('port-public')
      actualPorts.push(JSON.stringify([port, b.HostIp, Number(b.HostPort)]))
    }
  if (
    !same(
      actualPorts,
      p.ports.map((v) => JSON.stringify([v.containerPort, v.hostIp, v.hostPort])),
    )
  )
    return fail('port-bindings')
  if (
    !same(
      c.Mounts.map((v) => {
        if (v.Type !== 'volume') return fail('mounts')
        if (
          typeof v.RW !== 'boolean' ||
          typeof v.Name !== 'string' ||
          typeof v.Destination !== 'string'
        )
          return fail('mounts')
        return JSON.stringify([v.Name, v.Destination, !v.RW])
      }),
      p.volumes.map((v) => JSON.stringify([v.name, v.destination, v.readOnly])),
    )
  )
    return fail('mounts')
  if (
    !same(
      Object.entries(c.NetworkSettings.Networks).map(([n, v]) => JSON.stringify([n, v.NetworkID])),
      p.networks.map((v) => JSON.stringify([v.name, v.id])),
    )
  )
    return fail('network-attachment')
  if (!p.networks.some((v) => [v.name, v.id].includes(c.HostConfig.NetworkMode)))
    return fail('network-mode')
  return {
    id: c.Id,
    addresses: Object.values(c.NetworkSettings.Networks)
      .flatMap((v) => [v.IPAddress, v.GlobalIPv6Address])
      .filter((v): v is string => !!v)
      .map(normalize),
  }
}
export function inspectApprovedAttachments(
  volumes: unknown,
  networks: unknown,
  approval: ResourcePolicy,
) {
  const p = validateResourcePolicy(approval)
  const vs = volumes as {
    Name: string
    Driver: string
    Scope: string
    Labels: Record<string, string>
    Options: Record<string, unknown> | null
  }[]
  const ns = networks as {
    Id: string
    Name: string
    Scope: string
    Driver: string
    Internal: boolean
    Ingress: boolean
    ConfigOnly: boolean
    Options: Record<string, string> | null
    Labels: Record<string, string>
    Containers: Record<string, unknown>
  }[]
  if (
    !Array.isArray(vs) ||
    !Array.isArray(ns) ||
    !same(
      vs.map((v) => v.Name),
      p.volumes.map((v) => v.name),
    ) ||
    !same(
      ns.map((v) => v.Id),
      p.networks.map((v) => v.id),
    )
  )
    return fail('attachment-set')
  if (
    vs.some(
      (v) =>
        v.Driver !== 'local' ||
        v.Scope !== 'local' ||
        v.Labels?.['com.drphynex.migration-guard-test'] !== 'disposable-v1' ||
        (v.Options && Object.keys(v.Options).length),
    )
  )
    return fail('volume')
  // Published ports require a non-internal bridge, so outbound access is accepted here. Exclusivity
  // comes from the exact identity, the label and the single approved attachment, not from Internal.
  for (const n of ns) {
    if (!p.networks.some((a) => a.id === n.Id && a.name === n.Name)) fail('network-identity')
    if (n.Driver !== 'bridge') fail('network-driver')
    if (n.Scope !== 'local' || n.Ingress !== false || n.ConfigOnly !== false) fail('network-scope')
    if (n.Options?.['com.docker.network.bridge.default_bridge'] === 'true') fail('network-default')
    if (n.Internal !== false) fail('network-internal')
    if (n.Labels?.['com.drphynex.migration-guard-test'] !== 'disposable-v1') fail('network-label')
    if (!same(Object.keys(n.Containers ?? {}), [p.containerId])) fail('network-exclusive')
  }
}
export function inspectVolumeUsers(ids: string[], p: ResourcePolicy) {
  if (ids.length !== 1 || ids[0] !== p.containerId) return fail('volume-exclusive')
}
