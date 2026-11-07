import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Runs the real script as a child process. Two local TCP listeners stand in for "the shell's
// database" and "the file's database": they only count connection attempts (no PostgreSQL, no
// data), so the tests prove which source the script used and that it did not connect at all
// when it must refuse.
const script = resolve(__dirname, '../../scripts/check-release-data.mjs')

type Listener = { server: Server; port: number; connections: number }
const listen = () =>
  new Promise<Listener>((done) => {
    const l = { connections: 0 } as Listener
    l.server = createServer((socket) => {
      l.connections++
      socket.destroy()
    })
    l.server.listen(0, '127.0.0.1', () => {
      l.port = (l.server.address() as { port: number }).port
      done(l)
    })
  })
const urlFor = (l: Listener, db: string) => `postgres://checker:not-a-secret@127.0.0.1:${l.port}/${db}`

const run = (args: string[], shellUrl?: string) =>
  new Promise<{ code: number | null; out: string }>((done) => {
    const env = { ...process.env }
    delete env.DATABASE_URL
    if (shellUrl) env.DATABASE_URL = shellUrl
    const child = spawn(process.execPath, [script, ...args], { env, cwd: tmpdir() })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('close', (code) => done({ code, out }))
  })

let shellDb: Listener
let fileDb: Listener
let dir: string
beforeAll(async () => {
  shellDb = await listen()
  fileDb = await listen()
  dir = mkdtempSync(join(tmpdir(), 'release-check-'))
})
afterAll(() => {
  shellDb.server.close()
  fileDb.server.close()
  rmSync(dir, { recursive: true, force: true })
})
const reset = () => {
  shellDb.connections = 0
  fileDb.connections = 0
}

describe('check:release-data reads DATABASE_URL only from the env file it was given', () => {
  it('1. wrong .env path while the shell has DATABASE_URL → exit 2, no connection at all', async () => {
    reset()
    const r = await run([join(dir, 'missing.env')], urlFor(shellDb, 'shell_db'))
    expect(r.code).toBe(2)
    expect(r.out).toMatch(/CANNOT CHECK: cannot read env file .*missing\.env/)
    expect(r.out).toMatch(/shell's DATABASE_URL is not used/)
    expect(shellDb.connections).toBe(0)
    expect(fileDb.connections).toBe(0)
  })

  it('2. .env exists but has no (or an empty) DATABASE_URL → exit 2, no connection at all', async () => {
    for (const [name, body] of [
      ['no-url.env', 'PAYLOAD_SECRET=x\n'],
      ['empty-url.env', 'DATABASE_URL=\n'],
      ['blank-url.env', 'DATABASE_URL="   "\n'],
    ]) {
      reset()
      writeFileSync(join(dir, name), body)
      const r = await run([join(dir, name)], urlFor(shellDb, 'shell_db'))
      expect(r.code, name).toBe(2)
      expect(r.out, name).toMatch(/CANNOT CHECK: no DATABASE_URL in .*; the shell's DATABASE_URL is not used/)
      expect(shellDb.connections, name).toBe(0)
      expect(fileDb.connections, name).toBe(0)
    }
  })

  it('3. file and shell point to different databases → only the file database is contacted', async () => {
    reset()
    writeFileSync(join(dir, 'target.env'), `DATABASE_URL=${urlFor(fileDb, 'file_db')}\n`)
    const r = await run([join(dir, 'target.env')], urlFor(shellDb, 'shell_db'))
    expect(fileDb.connections).toBeGreaterThan(0)
    expect(shellDb.connections).toBe(0)
    // The stand-in is not PostgreSQL, so the check itself cannot complete: still "cannot check".
    expect(r.code).toBe(2)
  })

  it('no file given → the shell DATABASE_URL is used (unchanged behaviour)', async () => {
    reset()
    const r = await run([], urlFor(shellDb, 'shell_db'))
    expect(shellDb.connections).toBeGreaterThan(0)
    expect(fileDb.connections).toBe(0)
    expect(r.code).toBe(2)
  })

  it('no file and no shell DATABASE_URL → exit 2 without connecting', async () => {
    reset()
    const r = await run([])
    expect(r.code).toBe(2)
    expect(r.out).toMatch(/no env file given and no DATABASE_URL in the shell/)
    expect(shellDb.connections + fileDb.connections).toBe(0)
  })

  it('never prints the connection string', async () => {
    reset()
    writeFileSync(join(dir, 'target.env'), `DATABASE_URL=${urlFor(fileDb, 'file_db')}\n`)
    const r = await run([join(dir, 'target.env')], urlFor(shellDb, 'shell_db'))
    expect(r.out).not.toContain('not-a-secret')
    expect(r.out).not.toContain('postgres://')
  })
})
