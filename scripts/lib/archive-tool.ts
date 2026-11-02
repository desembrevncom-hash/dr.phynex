import { spawn } from 'node:child_process'
import path from 'node:path'
/** Only the read-only archive tool is a child. No Payload CLI, env loader, raw output or shell. */
export function archiveToolEnvironment(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { NODE_ENV: 'production' }
  for (const key of [
    'SystemRoot',
    'WINDIR',
    'PATH',
    'PATHEXT',
    'TEMP',
    'TMP',
    'HOME',
    'USERPROFILE',
    'LANG',
  ])
    if (env[key]) out[key] = env[key]
  return out
}
export async function listArchive(
  tool: string | undefined,
  file: string,
  env: Record<string, string | undefined>,
): Promise<boolean> {
  if (!tool || !path.isAbsolute(tool)) return false
  return new Promise((resolve) => {
    const child = spawn(tool, ['--list', path.resolve(file)], {
      shell: false,
      env: archiveToolEnvironment(env),
      stdio: 'ignore',
      windowsHide: true,
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve(false)
    }, 15000)
    child.once('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
  })
}
