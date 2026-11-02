import { EventEmitter } from 'node:events'
import { describe, it, expect, vi } from 'vitest'
const made = vi.hoisted(() => ({ options: null as unknown, child: null as unknown }))
vi.mock('node:child_process', () => ({
  spawn: (_tool: unknown, _args: unknown, options: unknown) => {
    made.options = options
    const c = new EventEmitter() as EventEmitter & { kill: () => boolean }
    c.kill = () => true
    made.child = c
    queueMicrotask(() => c.emit('close', 1))
    return c
  },
}))
import { listArchive } from '../../scripts/lib/archive-tool'
describe('F04 raw output is discarded rather than redacted', () => {
  it('does not open stdout/stderr pipes, for every possible secret boundary', async () => {
    const secret = 'SYNTHETIC_%40_PASSWORD_秘密'
    const out = vi.spyOn(process.stdout, 'write'),
      err = vi.spyOn(process.stderr, 'write')
    try {
      for (let i = 0; i <= Buffer.byteLength(secret); i++) {
        expect(await listArchive(process.execPath, 'synthetic.dump', { PGPASSWORD: secret })).toBe(
          false,
        )
        expect(made.options).toMatchObject({ stdio: 'ignore', shell: false })
        const c = made.child as EventEmitter
        expect(c.listenerCount('data')).toBe(0)
        c.emit('data', Buffer.from(secret).subarray(0, i))
        c.emit('data', Buffer.from(secret).subarray(i))
      }
      expect(out.mock.calls.some((a) => String(a[0]).includes(secret))).toBe(false)
      expect(err.mock.calls.some((a) => String(a[0]).includes(secret))).toBe(false)
    } finally {
      out.mockRestore()
      err.mockRestore()
    }
  })
  it('fails closed without an absolute approved PostgreSQL tool', async () => {
    expect(await listArchive(undefined, 'x', {})).toBe(false)
    expect(await listArchive('pg_restore', 'x', {})).toBe(false)
  })
})
