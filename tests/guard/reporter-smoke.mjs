/**
 * Reporter smoke through real Vitest processes started by the launcher's own runner. No PostgreSQL,
 * Docker or env file. Run: node tests/guard/reporter-smoke.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { judge, runIsolatedVitest } from './run-integration.mjs'
import { readResults } from './safe-reporter.mjs'
import { systemTestEnvironment } from './test-environment.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const checks = []
const check = (mode, name, ok) => checks.push({ mode, name, ok: !!ok })
async function run(mode) {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'drphynex-b5-smoke-'))
  const env = {
    ...systemTestEnvironment(process.env, { runDir, dockerConfig: path.join(runDir, 'docker') }),
    B5_SMOKE_MODE: mode,
  }
  const verdict = await runIsolatedVitest({
    root,
    config: path.join(root, 'tests/guard/vitest.reporter-smoke.config.mts'),
    env,
    runDir,
    deadlineMs: 120000,
  })
  const read = (name) => {
    try {
      return readFileSync(path.join(runDir, name), 'utf8')
    } catch {
      return null
    }
  }
  return { verdict, launcher: JSON.parse(read('launcher.json')), rawResults: read('results.json') }
}

const pass = await run('pass')
const passed = JSON.parse(pass.rawResults ?? 'null')
check('pass', 'verdict pass', pass.verdict === 'pass')
check(
  'pass',
  'Vitest exit 0 recorded',
  pass.launcher.vitest.code === 0 && pass.launcher.vitest.signal === null,
)
check(
  'pass',
  'results written by onTestRunEnd',
  pass.launcher.results === 'valid' && passed?.reason === 'passed',
)
check('pass', 'twelve passed cases', passed?.totals.passed === 12 && passed.cases.length === 12)

const fail = await run('fail')
const failed = JSON.parse(fail.rawResults ?? 'null')
check('fail', 'verdict fail', fail.verdict === 'fail')
check('fail', 'Vitest exit 1 recorded', fail.launcher.vitest.code === 1)
// Observed in Vitest 4.1.12: bail stops the run and reports it as interrupted.
check('fail', 'run reason recorded (bail: interrupted)', failed?.reason === 'interrupted')
check('fail', 'I5 failed', failed?.cases.find((c) => c.id === 'I5')?.state === 'failed')
check(
  'fail',
  'I1-I4 passed',
  ['I1', 'I2', 'I3', 'I4'].every(
    (id) => failed?.cases.find((c) => c.id === id)?.state === 'passed',
  ),
)
check(
  'fail',
  'cases after bail recorded as pending',
  ['I6', 'I7', 'I8', 'I9', 'I10', 'I11', 'I12'].every(
    (id) => failed?.cases.find((c) => c.id === id)?.state === 'pending',
  ),
)
check(
  'fail',
  'no title or error text kept',
  !/SENTINEL|passing value/.test(fail.rawResults ?? 'SENTINEL'),
)

const none = await run('no-results')
check('no-results', 'verdict evidence-error', none.verdict === 'evidence-error')
check(
  'no-results',
  'Vitest exit kept separately',
  none.launcher.vitest.code === 0 && none.launcher.results === 'missing',
)

// A truncated or old-format file is an evidence error too, whatever Vitest returned.
const scratch = mkdtempSync(path.join(os.tmpdir(), 'drphynex-b5-smoke-'))
writeFileSync(path.join(scratch, 'broken.json'), '{"version":2,')
writeFileSync(path.join(scratch, 'old.json'), JSON.stringify([{ id: 'I1', status: 'pass' }]))
for (const name of ['broken.json', 'old.json']) {
  const results = readResults(path.join(scratch, name))
  check('corrupt', name + ' is invalid evidence', results.status === 'invalid')
  check(
    'corrupt',
    name + ' never passes',
    judge({ code: 0, signal: null, stopped: false, spawnError: false }, results) ===
      'evidence-error',
  )
}

for (const c of checks) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.mode.padEnd(11) + c.name)
console.log('after-bail states: ' + JSON.stringify(failed?.cases.slice(5).map((c) => c.state)))
console.log('fail totals: ' + JSON.stringify(failed?.totals))
const bad = checks.filter((c) => !c.ok).length
console.log('checks=' + checks.length + ' failed=' + bad)
process.exitCode = bad ? 1 : 0
