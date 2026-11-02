/** Opt-in launcher. Not invoked by unit tests, never reads .env or provisions services. */
import { spawn, spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { integrationEnvironment } from './test-environment.mjs'
import { allCasesPassed, readResults } from './safe-reporter.mjs'

const MESSAGES = {
  pass: 'Integration child exited successfully; inspect case evidence.',
  fail: 'Integration failed; do not retry automatically.',
  interrupted: 'Integration stopped before completion; do not retry automatically.',
  'evidence-error':
    'Evidence error: test results missing or unreadable. This is not a test verdict.',
}
/**
 * Verdict from three separate records: the Vitest exit, results.json and the launcher's own stop.
 * Missing or malformed results never become PASS or an executor failure.
 */
export function judge({ code, signal, stopped, spawnError }, results) {
  if (results.status !== 'valid') return 'evidence-error'
  // bail:1 ends a run with a failed case as "interrupted"; a recorded failure stays a failure.
  if (results.results.cases.some((c) => c.state === 'failed')) return 'fail'
  if (stopped || spawnError || signal || results.results.reason === 'interrupted')
    return 'interrupted'
  if (code === 0 && allCasesPassed(results.results)) return 'pass'
  return 'fail'
}
/** Runs one Vitest child and writes launcher.json beside its results. Raw output stays suppressed. */
export async function runIsolatedVitest({ root, config, env, runDir, deadlineMs = 3600000 }) {
  const child = spawn(
    process.execPath,
    [
      '--max-old-space-size=2048',
      path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      config,
    ],
    { cwd: root, env, shell: false, windowsHide: true, stdio: 'ignore' },
  )
  const exit = await new Promise((resolve) => {
    const record = { code: null, signal: null, stopped: false, spawnError: false }
    let finished = false,
      killTimer
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(deadline)
      clearTimeout(killTimer)
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
      resolve(record)
    }
    const stop = () => {
      if (child.exitCode != null || child.signalCode != null) return
      record.stopped = true
      if (!child.killed) child.kill('SIGTERM')
      killTimer = setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null) child.kill('SIGKILL')
        finish()
      }, 5000)
    }
    const deadline = setTimeout(stop, deadlineMs)
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    child.once('error', () => {
      record.spawnError = true
      finish()
    })
    child.once('exit', (code, signal) => {
      record.code = code
      record.signal = signal
      finish()
    })
  })
  const results = readResults(path.join(runDir, 'results.json'))
  const i12 = readdirSync(runDir)
    .filter((n) => n.startsWith('case-'))
    .some((n) => existsSync(path.join(runDir, n, 'i12-evidence.json')))
  const verdict = judge(exit, results)
  writeFileSync(
    path.join(runDir, 'launcher.json'),
    JSON.stringify(
      { vitest: exit, results: results.status, i12Evidence: i12 ? 'present' : 'missing', verdict },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  )
  return verdict
}
export async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  let url
  try {
    url = new URL(process.env.MIGRATION_GUARD_TEST_URL ?? '')
  } catch {
    throw Error('Explicit disposable test URL required')
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/drphynex_migration_guard_test' ||
    !url.username ||
    !url.password ||
    !process.env.MIGRATION_GUARD_TEST_CONTAINER
  )
    throw Error('Refusing non-disposable endpoint')
  const resourceFile = process.env.B5_TEST_RESOURCES_FILE
  if (!resourceFile || !path.isAbsolute(resourceFile))
    throw Error('Explicit absolute resource approval file required')
  const resource = JSON.parse(readFileSync(resourceFile, 'utf8'))
  if (resource.version !== 1 || !resource.containerId) throw Error('Resource approval required')
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'drphynex-b5-test-')),
    dockerConfig = path.join(runDir, 'docker')
  mkdirSync(dockerConfig)
  writeFileSync(path.join(dockerConfig, 'config.json'), '{}\n', { mode: 0o600 })
  const git = (args) =>
    spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true })
  const head = git(['rev-parse', 'HEAD']),
    status = git(['status', '--porcelain'])
  writeFileSync(
    path.join(runDir, 'run-context.json'),
    JSON.stringify(
      {
        commit: head.status === 0 ? head.stdout.trim() : 'unavailable',
        // Paths only, never contents: the WIP must be visible in the evidence, not hidden.
        workingTree:
          status.status === 0 ? status.stdout.split(/\r?\n/).filter(Boolean) : 'unavailable',
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  )
  // Raw reporter errors could contain a test credential. Only constant status is forwarded.
  console.log(
    'Isolated integration launched; raw child output is suppressed. Evidence directory: ' + runDir,
  )
  const verdict = await runIsolatedVitest({
    root,
    config: path.join(root, 'vitest.guard.config.mts'),
    env: integrationEnvironment(process.env, { runDir, dockerConfig }),
    runDir,
  })
  console.log(MESSAGES[verdict])
  return verdict === 'pass' ? 0 : verdict === 'evidence-error' ? 2 : 1
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => {
      process.exitCode = Number(code)
    },
    () => {
      console.error('Integration setup refused; no raw error or credential forwarded.')
      process.exitCode = 1
    },
  )
}
