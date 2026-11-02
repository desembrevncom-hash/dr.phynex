/** Safe per-step case evidence. No I/O of its own: the caller supplies the writer. */
export type Typed = { type: string; repr: string }
/** Type and explicit text, so NaN, Infinity, -0, null and the string "NaN" stay distinct in JSON. */
export function typed(v: unknown): Typed {
  if (v === null) return { type: 'null', repr: 'null' }
  if (v === undefined) return { type: 'undefined', repr: 'undefined' }
  if (typeof v === 'number') return { type: 'number', repr: Object.is(v, -0) ? '-0' : String(v) }
  if (typeof v === 'string') return { type: 'string', repr: JSON.stringify(v) }
  if (typeof v === 'boolean' || typeof v === 'bigint') return { type: typeof v, repr: String(v) }
  return { type: 'object', repr: '<omitted>' }
}
export const typedRows = (rows: readonly Record<string, unknown>[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typed(v)])))
/** Fixed harness messages; none carries a value, SQL or credential. */
const HARNESS_MESSAGES = new Set([
  'Disposable resource inspection failed',
  'Unsafe live disposable connection',
  'Container database identity failed',
  'URL and container are not the same database instance',
  'Use the isolated integration launcher',
  'Test-only dump failed',
  'Invalid server address',
  'Invalid server host address',
])
/** A classification only. Raw error text never leaves this function. */
export function classifyFailure(e: unknown) {
  const err = e as { name?: unknown; message?: unknown; code?: unknown } | null
  const name =
    typeof err?.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'unknown'
  const message = typeof err?.message === 'string' ? err.message : ''
  if (name === 'AssertionError') return { kind: 'assertion' }
  const policy = /^Disposable resource policy mismatch: ([a-z-]+)$/.exec(message)
  if (policy) return { kind: 'resource-policy', code: policy[1] }
  if (HARNESS_MESSAGES.has(message)) return { kind: 'harness', message }
  if (typeof err?.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code))
    return { kind: 'sql', sqlstate: err.code }
  return { kind: 'other', name }
}
/**
 * Runs named steps in order and saves after every observation and failure, so a failed assertion
 * still leaves the step that failed and everything seen before it.
 */
export class StepRecorder {
  readonly record: {
    case: string
    complete: boolean
    steps: { id: string; outcome: 'ok' | 'failed'; failure?: ReturnType<typeof classifyFailure> }[]
    observations: Record<string, unknown>
  }
  saveFailed = false
  constructor(
    id: string,
    private save: (value: unknown) => void,
  ) {
    this.record = { case: id, complete: false, steps: [], observations: {} }
  }
  async step<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
    try {
      const value = await fn()
      this.record.steps.push({ id, outcome: 'ok' })
      return value
    } catch (e) {
      this.record.steps.push({ id, outcome: 'failed', failure: classifyFailure(e) })
      this.flush()
      throw e
    }
  }
  observe(key: string, value: unknown) {
    this.record.observations[key] = value
    this.flush()
  }
  flush() {
    try {
      this.save(this.record)
    } catch {
      this.saveFailed = true
    }
  }
}
