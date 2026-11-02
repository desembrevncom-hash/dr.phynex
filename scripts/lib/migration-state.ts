import { createHash } from 'node:crypto'

export type CommitPhase = 'commit-preparing' | 'commit-sent' | 'committed'
export type RunState = {
  version: 2
  identity: string
  outcome: 'RUNNING' | 'COMPLETE' | 'FAILED' | 'UNCERTAIN' | 'STATE_FAILED'
  runId: string
  plan: string
  /** Last step reaching commit preparation; not necessarily the step that failed later. */
  step?: string
  phase?: CommitPhase
  xid?: string
}
type Identity = {
  name: string
  host: string
  port: number
  database: string
  role: string
  marker: string
}
export function stateIdentity(t: Identity) {
  return createHash('sha256')
    .update(JSON.stringify([t.name, t.host, t.port, t.database, t.role, t.marker]))
    .digest('hex')
}
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** ENOENT is handled by the reader; JSON null and every unknown shape are errors. */
export function validateRunState(value: unknown, target: Identity): RunState {
  const fail = (): never => {
    throw new Error('Unrecognized migration state; owner reconciliation required')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const s = value as Record<string, unknown>
  if (
    !text(s.runId) ||
    !hash(s.plan) ||
    typeof s.outcome !== 'string' ||
    !['RUNNING', 'COMPLETE', 'FAILED', 'UNCERTAIN', 'STATE_FAILED'].includes(s.outcome)
  )
    return fail()
  const allowed = ['version', 'identity', 'outcome', 'runId', 'plan', 'step', 'phase', 'xid']
  if (Object.keys(s).some((k) => !allowed.includes(k))) return fail()
  // No real target has run this runner: there is no legacy state to migrate or trust.
  if (s.version !== 2 || !hash(s.identity) || s.identity !== stateIdentity(target)) return fail()
  const fields = [s.step, s.phase, s.xid]
  if (fields.some((v) => v !== undefined)) {
    if (
      !text(s.step) ||
      !/^[A-Za-z0-9_-]+$/.test(s.step) ||
      typeof s.phase !== 'string' ||
      !['commit-preparing', 'commit-sent', 'committed'].includes(s.phase) ||
      typeof s.xid !== 'string' ||
      !/^[1-9]\d*$/.test(s.xid) ||
      BigInt(s.xid) > 18446744073709551615n
    )
      return fail()
  }
  if (
    (s.outcome === 'STATE_FAILED' || (s.version === 2 && s.outcome === 'COMPLETE')) &&
    s.phase !== 'committed'
  )
    return fail()
  return { ...s } as RunState
}

export function parseRunState(json: string, target: Identity) {
  return validateRunState(JSON.parse(json), target)
}
