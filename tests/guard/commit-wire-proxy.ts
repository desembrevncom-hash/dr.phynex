/** Test-only loopback transport. Importing this module does not listen/connect. */
import net from 'node:net'
import type { DirectUrl } from '../../scripts/lib/migration-guard'
import { CommitWireGate } from './commit-wire-gate'
export async function openCommitWireProxy(config: DirectUrl) {
  if (!['localhost', '127.0.0.1', '::1'].includes(config.host) || config.ssl !== false)
    throw Error('Wire test requires approved loopback plaintext PostgreSQL')
  const gate = new CommitWireGate(),
    sockets = new Set<net.Socket>()
  const forward = (destination: net.Socket, source: net.Socket, frame: Buffer) => {
    if (destination.writableLength + frame.length > 2 * 1024 * 1024)
      throw Error('Test proxy backpressure limit')
    if (!destination.write(frame)) {
      source.pause()
      destination.once('drain', () => source.resume())
    }
  }
  let accepted = false,
    settled = false,
    closed: Promise<void> | undefined
  let resolveProof!: (value: typeof gate.evidence) => void, rejectProof!: (reason: Error) => void
  const proof = new Promise<typeof gate.evidence>((resolve, reject) => {
    resolveProof = resolve
    rejectProof = reject
  })
  void proof.catch(() => {}) // cleanup may happen before the test can await it; still rejects to caller.
  const fail = () => {
    if (!settled) {
      settled = true
      rejectProof(Error('Wire COMMIT evidence unavailable'))
    }
    for (const s of sockets) s.destroy()
  }
  const server = net.createServer((client) => {
    if (accepted) {
      client.destroy()
      fail()
      return
    }
    accepted = true
    const upstream = net.createConnection({ host: config.host, port: config.port })
    for (const socket of [client, upstream]) {
      sockets.add(socket)
      socket.once('close', () => {
        sockets.delete(socket)
        if (!settled) fail()
      })
      socket.on('error', fail)
    }
    client.on('data', (chunk) => {
      try {
        for (const frame of gate.frontend(chunk)) forward(upstream, client, frame)
      } catch {
        fail()
      }
    })
    upstream.on('data', (chunk) => {
      try {
        for (const frame of gate.backend(chunk)) forward(client, upstream, frame)
        if (gate.evidence.cut && !settled) {
          settled = true
          resolveProof({ ...gate.evidence })
          client.destroy()
          upstream.destroy()
        }
      } catch {
        fail()
      }
    })
    upstream.setTimeout(15000, fail)
    client.setTimeout(15000, fail)
  })
  server.on('error', fail)
  const close = () =>
    (closed ??= new Promise<void>((resolve, reject) => {
      clearTimeout(deadline)
      fail()
      if (!server.listening) {
        resolve()
        return
      }
      const timeout = setTimeout(() => reject(Error('Owned proxy did not close within 5s')), 5000)
      server.close((error) => {
        clearTimeout(timeout)
        if (error) reject(error)
        else resolve()
      })
    }))
  const deadline = setTimeout(() => {
    void close()
  }, 30000)
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
        server.removeListener('error', reject)
        resolve()
      })
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw Error('No loopback proxy endpoint')
    return { port: address.port, proof, close }
  } catch (e) {
    await close()
    throw e
  }
}
