import { renameSync, writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
const CASE = /^I(?:1[0-2]|[1-9])\b/
const IDS = Array.from({ length: 12 }, (_, i) => 'I' + (i + 1))
const STATES = ['passed', 'failed', 'skipped', 'pending']
/**
 * Vitest 4 reporter data reduced to constants: a case ID, its state and counts. No test title beyond
 * the ID, no error text, SQL or value. `pending` means collected but never finished (interrupted).
 * @param {ReadonlyArray<any>} testModules @param {ReadonlyArray<unknown>} unhandledErrors @param {string} reason
 */
export function summarizeRun(testModules, unhandledErrors, reason) {
  /** @type {{id:string|null,state:string}[]} */ const cases = []
  const modules = []
  for (const m of testModules) {
    modules.push({ state: String(m.state()), collectionErrors: m.errors().length })
    for (const test of m.children.allTests()) {
      const state = test.result().state
      cases.push({
        id: CASE.exec(test.name)?.[0] ?? null,
        state: STATES.includes(state) ? state : 'unknown',
      })
    }
  }
  const count = (state) => cases.filter((c) => c.state === state).length
  return {
    version: 2,
    reason: ['passed', 'failed', 'interrupted'].includes(reason) ? reason : 'unknown',
    unhandledErrors: unhandledErrors.length,
    modules,
    cases,
    totals: {
      passed: count('passed'),
      failed: count('failed'),
      skipped: count('skipped'),
      pending: count('pending'),
      unknown: count('unknown'),
      unidentified: cases.filter((c) => !c.id).length,
    },
  }
}
/** PASS only for a clean, complete run: every one of I1–I12 exactly once and passed. */
export function allCasesPassed(results) {
  return (
    results?.version === 2 &&
    results.reason === 'passed' &&
    results.unhandledErrors === 0 &&
    Array.isArray(results.modules) &&
    results.modules.length > 0 &&
    results.modules.every((m) => m.state === 'passed' && m.collectionErrors === 0) &&
    Array.isArray(results.cases) &&
    results.cases.length === 12 &&
    IDS.every((id) => results.cases.filter((c) => c.id === id && c.state === 'passed').length === 1)
  )
}
/** Missing or malformed results are an evidence error, never a test verdict. @param {string} file */
export function readResults(file) {
  let raw
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return { status: 'missing' }
  }
  try {
    const results = JSON.parse(raw)
    if (
      results?.version !== 2 ||
      !Array.isArray(results.cases) ||
      !Array.isArray(results.modules) ||
      typeof results.reason !== 'string'
    )
      return { status: 'invalid' }
    return { status: 'valid', results }
  } catch {
    return { status: 'invalid' }
  }
}
// Vitest 4.1.12 calls onTestRunEnd; onFinished is not a reporter hook there, so it is not used.
export default class SafeReporter {
  onTestRunEnd(testModules, unhandledErrors, reason) {
    const dir = process.env.B5_TEST_RUN_DIR
    if (!dir) return
    const file = path.join(dir, 'results.json')
    // Renamed into place, so a reader never sees a half-written file.
    writeFileSync(
      file + '.next',
      JSON.stringify(summarizeRun(testModules, unhandledErrors, reason), null, 2) + '\n',
      {
        mode: 0o600,
      },
    )
    renameSync(file + '.next', file)
  }
}
