/** Bounded PostgreSQL v3 frame parser for one test connection. No I/O or logs. */
const MAX_FRAME = 1024 * 1024
class Frames {
  private pending = Buffer.alloc(0)
  constructor(private startup = false) {}
  push(chunk: Buffer) {
    if (this.pending.length + chunk.length > MAX_FRAME * 2)
      throw Error('Test protocol buffer limit')
    this.pending = Buffer.concat([this.pending, chunk])
    const out: Buffer[] = []
    while (this.pending.length >= (this.startup ? 4 : 5)) {
      const offset = this.startup ? 0 : 1,
        length = this.pending.readInt32BE(offset),
        total = length + offset
      if (length < (this.startup ? 8 : 4) || total > MAX_FRAME)
        throw Error('Invalid test protocol frame')
      if (this.pending.length < total) break
      const frame = this.pending.subarray(0, total)
      this.pending = this.pending.subarray(total)
      if (this.startup) {
        if (frame.readInt32BE(4) !== 196608)
          throw Error('Only plaintext PG v3 startup is supported')
        this.startup = false
      }
      out.push(frame)
    }
    return out
  }
}
const COMMIT = Buffer.from('COMMIT\0')
export class CommitWireGate {
  private front = new Frames(true)
  private back = new Frames()
  private started = false
  private armed = false
  readonly evidence = { commitRequests: 0, serverCommitTags: 0, commitTagsDelivered: 0, cut: false }
  frontend(chunk: Buffer) {
    return this.front.push(chunk).map((frame) => {
      if (this.started && frame[0] === 81 && frame.subarray(5).equals(COMMIT)) {
        if (++this.evidence.commitRequests !== 1) throw Error('Unexpected repeated COMMIT')
        this.armed = true
      }
      this.started = true
      return frame
    })
  }
  backend(chunk: Buffer) {
    const send: Buffer[] = []
    for (const frame of this.back.push(chunk)) {
      if (this.armed) {
        if (frame[0] === 69) throw Error('Server rejected test COMMIT')
        if (frame[0] === 67) {
          if (!frame.subarray(5).equals(COMMIT)) throw Error('Unexpected COMMIT command tag')
          this.evidence.serverCommitTags++
          this.evidence.cut = true
        }
        // Withhold ALL server frames after COMMIT was forwarded, including C and Z.
      } else {
        if (frame[0] === 67 && frame.subarray(5).equals(COMMIT)) {
          this.evidence.commitTagsDelivered++
          throw Error('Unarmed COMMIT response')
        }
        send.push(frame)
      }
    }
    return send
  }
}
