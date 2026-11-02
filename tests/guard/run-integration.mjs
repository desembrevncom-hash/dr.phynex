/** Opt-in launcher. Not invoked by unit tests, never reads .env or provisions services. */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { integrationEnvironment } from './test-environment.mjs'
import { allCasesPassed } from './safe-reporter.mjs'

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
  const child = spawn(
    process.execPath,
    [
      '--max-old-space-size=2048',
      path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      path.join(root, 'vitest.guard.config.mts'),
    ],
    {
      cwd: root,
      env: integrationEnvironment(process.env, { runDir, dockerConfig }),
      shell: false,
      windowsHide: true,
      stdio: 'ignore',
    },
  )
  // Raw reporter errors could contain a test credential. Only constant status is forwarded.
  console.log(
    'Isolated integration launched; raw child output is suppressed. Evidence directory: ' + runDir,
  )
  return await new Promise((resolve) => {
    let finished = false,
      killTimer
    const finish = (code) => {
      if (finished) return
      finished = true
      clearTimeout(deadline)
      clearTimeout(killTimer)
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
      if (code === 0) {
        try {
          if (!allCasesPassed(JSON.parse(readFileSync(path.join(runDir, 'results.json'), 'utf8'))))
            code = 1
        } catch {
          code = 1
        }
      }
      console.log(
        code === 0
          ? 'Integration child exited successfully; inspect case evidence.'
          : 'Integration failed/stopped; do not retry automatically.',
      )
      resolve(code)
    }
    const stop = () => {
      if (child.exitCode != null || child.signalCode != null) return
      if (!child.killed) child.kill('SIGTERM')
      killTimer = setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null) child.kill('SIGKILL')
        finish(1)
      }, 5000)
    }
    const deadline = setTimeout(stop, 3600000)
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    child.once('error', () => finish(1))
    child.once('exit', (code, signal) => finish(signal ? 1 : (code ?? 1)))
  })
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
