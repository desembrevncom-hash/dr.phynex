import { describe, it, expect } from 'vitest'
import { CommitWireGate } from '../guard/commit-wire-gate'
const frame = (type: string, body: string) => {
  const b = Buffer.from(body),
    h = Buffer.alloc(5)
  h[0] = type.charCodeAt(0)
  h.writeInt32BE(4 + b.length, 1)
  return Buffer.concat([h, b])
}
const startup = () => {
  const body = Buffer.from('user\0TEST_CREDENTIAL_SENTINEL\0\0'),
    h = Buffer.alloc(8)
  h.writeInt32BE(8 + body.length, 0)
  h.writeInt32BE(196608, 4)
  return Buffer.concat([h, body])
}
const query = frame('Q', 'COMMIT\0'),
  ack = frame('C', 'COMMIT\0'),
  ready = frame('Z', 'I')
describe('test-only transport framing, entirely in memory', () => {
  it('withholds CommandComplete and ReadyForQuery at every packet split', () => {
    const bytes = Buffer.concat([ack, ready])
    for (let split = 0; split <= bytes.length; split++) {
      const g = new CommitWireGate()
      g.frontend(startup())
      expect(g.frontend(query)).toEqual([query])
      expect([...g.backend(bytes.subarray(0, split)), ...g.backend(bytes.subarray(split))]).toEqual(
        [],
      )
      expect(g.evidence).toEqual({
        commitRequests: 1,
        serverCommitTags: 1,
        commitTagsDelivered: 0,
        cut: true,
      })
      expect(g.withheld).toEqual([
        { type: 'C', bytes: ack.length },
        { type: 'Z', bytes: ready.length },
      ])
      expect(JSON.stringify([g.evidence, g.withheld])).not.toContain('SENTINEL')
    }
  })
  it('keeps the backend PID from BackendKeyData and never the cancel key', () => {
    const g = new CommitWireGate()
    g.frontend(startup())
    const key = Buffer.alloc(13)
    key[0] = 75
    key.writeInt32BE(12, 1)
    key.writeInt32BE(4242, 5)
    key.writeInt32BE(0x5e5e5e5e, 9)
    expect(g.backend(key)).toEqual([key])
    expect(g.backendPid).toBe(4242)
    expect(JSON.stringify([g.evidence, g.withheld, g.backendPid])).not.toContain(String(0x5e5e5e5e))
  })
  it('assembles startup and query across all client-side splits without changing bytes', () => {
    const bytes = Buffer.concat([startup(), query])
    for (let split = 0; split <= bytes.length; split++) {
      const g = new CommitWireGate()
      const sent = [...g.frontend(bytes.subarray(0, split)), ...g.frontend(bytes.subarray(split))]
      expect(Buffer.concat(sent)).toEqual(bytes)
      expect(g.evidence.commitRequests).toBe(1)
    }
  })
  it('a SELECT mentioning COMMIT is not evidence of server COMMIT', () => {
    const g = new CommitWireGate()
    g.frontend(startup())
    g.frontend(frame('Q', "SELECT 'COMMIT'\0"))
    const result = frame('C', 'SELECT 1\0')
    expect(g.backend(result)).toEqual([result])
    expect(g.evidence.cut).toBe(false)
  })
  it('server rejection cannot manufacture successful transport evidence or expose its body', () => {
    const g = new CommitWireGate()
    g.frontend(startup())
    g.frontend(query)
    expect(() => g.backend(frame('E', 'PASSWORD_SENTINEL\0'))).toThrow(
      'Server rejected test COMMIT',
    )
    expect(g.evidence.serverCommitTags).toBe(0)
  })
  it('rejects TLS/startup variants and oversized frames rather than guessing', () => {
    const ssl = Buffer.alloc(8)
    ssl.writeInt32BE(8, 0)
    ssl.writeInt32BE(80877103, 4)
    expect(() => new CommitWireGate().frontend(ssl)).toThrow()
    const huge = Buffer.alloc(5)
    huge[0] = 81
    huge.writeInt32BE(2 * 1024 * 1024, 1)
    const g = new CommitWireGate()
    g.frontend(startup())
    expect(() => g.frontend(huge)).toThrow()
  })
})
