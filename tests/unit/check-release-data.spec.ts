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

describe('check:release-data validates DATABASE_URL before creating a client', () => {
  // Every bad URL points at a counting listener where it can, so "no connection" is measured.
  const bad = (port: number): Array<[string, string, RegExp]> => [
    ['fixture-only', 'fixture-only', /not a URL/],
    ['mysql scheme', `mysql://checker:not-a-secret@127.0.0.1:${port}/file_db`, /scheme must be postgres:\/\/ or postgresql:\/\//],
    ['http scheme', `http://127.0.0.1:${port}/file_db`, /scheme must be/],
    ['port out of range', 'postgres://checker:not-a-secret@127.0.0.1:99999/file_db', /malformed URL or invalid port/],
    ['non-numeric port', 'postgres://checker:not-a-secret@127.0.0.1:5x32/file_db', /malformed URL or invalid port/],
    ['port zero', 'postgres://checker:not-a-secret@127.0.0.1:0/file_db', /invalid port/],
    ['missing host', `postgres://checker:not-a-secret@:${port}/file_db`, /malformed URL or invalid port|missing host/],
    ['missing database name', `postgres://checker:not-a-secret@127.0.0.1:${port}/`, /missing database name/],
    ['no path at all', `postgresql://checker:not-a-secret@127.0.0.1:${port}`, /missing database name/],
  ]
  // Parts of the bad URL that must never be echoed (the fixed reason text itself may say "postgres://").
  const leaks = (port: number) => ['not-a-secret', 'checker', '127.0.0.1', String(port), 'file_db', 'mysql', 'http:', '99999', '5x32', 'fixture-only']

  it('from the env file: each bad URL → exit 2, filtered message, no connection (shell URL set and ignored)', async () => {
    for (const [name, value, reason] of bad(fileDb.port)) {
      reset()
      writeFileSync(join(dir, 'bad.env'), `DATABASE_URL=${value}\n`)
      const r = await run([join(dir, 'bad.env')], urlFor(shellDb, 'shell_db'))
      expect(r.code, name).toBe(2)
      expect(r.out, name).toMatch(/CANNOT CHECK: DATABASE_URL from env file .* is not a valid PostgreSQL URL \(/)
      expect(r.out, name).toMatch(reason)
      for (const leak of leaks(fileDb.port)) expect(r.out.replace(dir, '<dir>'), `${name}: ${leak}`).not.toContain(leak)
      expect(fileDb.connections + shellDb.connections, name).toBe(0)
    }
  })

  it('from the shell (no file given): each bad URL → exit 2, filtered message, no connection', async () => {
    for (const [name, value, reason] of bad(shellDb.port)) {
      reset()
      const r = await run([], value)
      expect(r.code, name).toBe(2)
      expect(r.out, name).toMatch(/CANNOT CHECK: DATABASE_URL from shell DATABASE_URL is not a valid PostgreSQL URL \(/)
      expect(r.out, name).toMatch(reason)
      for (const leak of leaks(shellDb.port)) expect(r.out, `${name}: ${leak}`).not.toContain(leak)
      expect(fileDb.connections + shellDb.connections, name).toBe(0)
    }
  })

  it('valid URLs (postgres:// and postgresql://) still reach the chosen source only', async () => {
    reset()
    writeFileSync(join(dir, 'ok.env'), `DATABASE_URL=${urlFor(fileDb, 'file_db').replace('postgres://', 'postgresql://')}\n`)
    await run([join(dir, 'ok.env')], urlFor(shellDb, 'shell_db'))
    expect(fileDb.connections).toBeGreaterThan(0)
    expect(shellDb.connections).toBe(0)
    reset()
    await run([], urlFor(shellDb, 'shell_db'))
    expect(shellDb.connections).toBeGreaterThan(0)
    expect(fileDb.connections).toBe(0)
  })
})

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

  it('a connection failure is reported as a fixed reason, never the raw driver message', async () => {
    reset()
    writeFileSync(join(dir, 'target.env'), `DATABASE_URL=${urlFor(fileDb, 'file_db')}\n`)
    const r = await run([join(dir, 'target.env')])
    expect(r.code).toBe(2)
    expect(fileDb.connections).toBeGreaterThan(0)
    expect(r.out).toMatch(/CANNOT CHECK: (connection reset \(code ECONNRESET\)|connection or query failed)/)
    for (const leak of ['127.0.0.1', String(fileDb.port), 'checker', 'not-a-secret', 'file_db', 'postgres://', 'terminated']) {
      expect(r.out, leak).not.toContain(leak)
    }
  })

  it('never prints the connection string', async () => {
    reset()
    writeFileSync(join(dir, 'target.env'), `DATABASE_URL=${urlFor(fileDb, 'file_db')}\n`)
    const r = await run([join(dir, 'target.env')], urlFor(shellDb, 'shell_db'))
    expect(r.out).not.toContain('not-a-secret')
    expect(r.out).not.toContain('postgres://')
  })
})
