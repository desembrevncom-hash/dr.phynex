import { readFileSync } from 'node:fs'

/**
 * Test-only allowlist: approved migrations plus the still-PROPOSED ones, so the byte/SQL pins can
 * cover a migration before a reviewer approves it. The real executor never reads the proposal file.
 */
export function testAllowlist(): string {
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as { files: unknown[] }
  const approved = read('deploy/migrations.approved.json')
  const proposed = read('deploy/migrations.proposed.json')
  return JSON.stringify({ version: 1, files: [...approved.files, ...proposed.files] })
}
