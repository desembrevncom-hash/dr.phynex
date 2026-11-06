import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ANCHOR_NAME,
  StateStoreError,
  createAnchor,
  nodeFs,
  readAnchor,
  readStateText,
  writeAtomic,
  writeStateText,
  type Fs,
} from '../../scripts/lib/state-store'

const ID = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)
let dir: string
let file: string
let expected: string
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'state-store-'))
  file = path.join(dir, 'state.json')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))
const names = () => readdirSync(dir).sort()
const anchorFile = () => path.join(dir, ANCHOR_NAME)
const provision = async () => {
  expected = (await createAnchor(dir, ID)).anchorId // the owner copies this into the trusted catalog
}
const code = (p: Promise<unknown>) =>
  p.then(
    () => 'no error',
    (e) => (e instanceof StateStoreError ? e.code : `other:${(e as Error).message}`),
  )
// Explicit wrappers: spreading a FileHandle would lose its prototype methods.
const handleWith = async (
  p: string,
  mode: number,
  over: {
    writeFile?: (s: string) => Promise<void>
    sync?: () => Promise<void>
    close?: () => Promise<void>
  },
) => {
  const h = await nodeFs.openWrite(p, mode)
  let closes = 0
  return {
    writeFile: over.writeFile ?? ((s: string) => h.writeFile(s)),
    sync: over.sync ?? (() => h.sync()),
    close: async () => {
      closes += 1
      await h.close() // the real descriptor is always released
      if (over.close && closes === 1) await over.close()
    },
  }
}

describe('volume anchor and the trusted expected ID', () => {
  it('refuses to read or write when the anchor is missing (empty or wrong volume)', async () => {
    expected = 'c'.repeat(32)
    expect(await code(readStateText(file, ID, expected))).toBe('ANCHOR_MISSING')
    expect(await code(writeStateText(file, ID, expected, '{}'))).toBe('ANCHOR_MISSING')
    expect(names()).toEqual([])
  })

  it('refuses when no expected ID is configured: it is never read from the volume', async () => {
    await provision()
    for (const missing of [undefined, '', 'short', 42, null]) {
      expect(await code(readStateText(file, ID, missing as never))).toBe('ANCHOR_ID_UNCONFIGURED')
      expect(await code(writeStateText(file, ID, missing as never, '{}'))).toBe(
        'ANCHOR_ID_UNCONFIGURED',
      )
    }
    expect(names()).toEqual([ANCHOR_NAME])
  })

  it('refuses an anchor of another target and a corrupt or malformed anchor', async () => {
    await provision()
    expect(await code(readAnchor(dir, OTHER, expected))).toBe('ANCHOR_WRONG_TARGET')
    const a = JSON.parse(readFileSync(anchorFile(), 'utf8'))
    for (const bad of [
      'not json',
      JSON.stringify({ ...a, extra: 1 }),
      JSON.stringify({ ...a, runStarted: 'yes' }),
      JSON.stringify({ ...a, version: 2 }),
      JSON.stringify({ ...a, anchorId: 'short' }),
      'null',
    ]) {
      writeFileSync(anchorFile(), bad)
      expect(await code(readAnchor(dir, ID, expected))).toBe('ANCHOR_CORRUPT')
    }
  })

  it('REGRESSION: a replaced anchor (same identity, other ID, runStarted=false) with a lost state is refused', async () => {
    await provision()
    await writeStateText(file, ID, expected, '{"run":1}\n')
    // A forged or copied anchor for the same target identity claiming no run ever started,
    // while the state file is gone: a self-describing anchor alone could not catch this.
    rmSync(file)
    writeFileSync(
      anchorFile(),
      JSON.stringify({ version: 1, identity: ID, anchorId: 'd'.repeat(32), runStarted: false }) +
        '\n',
    )
    expect(await code(readStateText(file, ID, expected))).toBe('ANCHOR_ID_MISMATCH')
    expect(await code(writeStateText(file, ID, expected, '{"run":2}\n'))).toBe('ANCHOR_ID_MISMATCH')
    expect(names()).toEqual([ANCHOR_NAME]) // nothing was written
  })

  it('refuses the same replaced anchor even when the volume still has the state file', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'kept\n')
    writeFileSync(
      anchorFile(),
      JSON.stringify({ version: 1, identity: ID, anchorId: 'e'.repeat(32), runStarted: true }) +
        '\n',
    )
    expect(await code(readStateText(file, ID, expected))).toBe('ANCHOR_ID_MISMATCH')
    expect(readFileSync(file, 'utf8')).toBe('kept\n')
  })

  it('is created once and never overwritten', async () => {
    await provision()
    const before = readFileSync(anchorFile(), 'utf8')
    await expect(createAnchor(dir, ID)).rejects.toThrow()
    expect(readFileSync(anchorFile(), 'utf8')).toBe(before)
  })

  it('a fresh anchor means "no previous run"; after a write the latch cannot silently vanish', async () => {
    await provision()
    expect(await readStateText(file, ID, expected)).toBeNull()
    await writeStateText(file, ID, expected, '{"a":1}\n')
    expect(await readStateText(file, ID, expected)).toBe('{"a":1}\n')
    expect((await readAnchor(dir, ID, expected)).runStarted).toBe(true)
    rmSync(file) // the volume lost the state file but kept the anchor
    expect(await code(readStateText(file, ID, expected))).toBe('STATE_LOST')
  })
})

describe('replacement, cleanup and limits', () => {
  it('leaves no temp file after success and replaces the previous content completely', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'one\n')
    await writeStateText(file, ID, expected, 'two\n')
    expect(readFileSync(file, 'utf8')).toBe('two\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('a write that fails midway keeps the previous state and removes its temp file', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'old\n')
    const failing: Fs = {
      ...nodeFs,
      openWrite: (p, mode) =>
        handleWith(p, mode, {
          writeFile: async () => {
            writeFileSync(p, 'br') // a torn write into the temp file
            throw new Error('disk error')
          },
        }),
    }
    await expect(writeAtomic(file, 'brand new content\n', failing)).rejects.toThrow('disk error')
    expect(readFileSync(file, 'utf8')).toBe('old\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('REGRESSION: a failing close() on the success path removes the temp file and never renames', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'old\n')
    const closeFails: Fs = {
      ...nodeFs,
      openWrite: (p, mode) =>
        handleWith(p, mode, {
          close: async () => {
            throw new Error('close failed')
          },
        }),
    }
    await expect(writeAtomic(file, 'new\n', closeFails)).rejects.toThrow('close failed')
    expect(readFileSync(file, 'utf8')).toBe('old\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('a close() that also fails while cleaning up after another error still removes the temp file', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'old\n')
    const both: Fs = {
      ...nodeFs,
      openWrite: (p, mode) =>
        handleWith(p, mode, {
          sync: async () => {
            throw new Error('fsync failed')
          },
          close: async () => {
            throw new Error('close failed too')
          },
        }),
    }
    await expect(writeAtomic(file, 'new\n', both)).rejects.toThrow('fsync failed')
    expect(readFileSync(file, 'utf8')).toBe('old\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('a failed rename reports the error and removes its temp file', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'old\n')
    const renameFail: Fs = {
      ...nodeFs,
      rename: async () => {
        throw new Error('rename failed')
      },
    }
    await expect(writeAtomic(file, 'y\n', renameFail)).rejects.toThrow('rename failed')
    expect(readFileSync(file, 'utf8')).toBe('old\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('REGRESSION: rename succeeded but the directory fsync failed: new content is in place and the error says so', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'old\n')
    const dirSyncFails: Fs = {
      ...nodeFs,
      syncDir: async () => {
        throw new Error('EIO')
      },
    }
    const err = await writeAtomic(file, 'new\n', dirSyncFails).catch((e) => e)
    expect(err).toBeInstanceOf(StateStoreError)
    expect(err.code).toBe('STATE_RENAMED_SYNC_FAILED')
    expect(err.renamed).toBe(true)
    // The previous content is gone: callers must not assume "old state still there".
    expect(readFileSync(file, 'utf8')).toBe('new\n')
    expect(names()).toEqual([ANCHOR_NAME, 'state.json'])
  })

  it('a temp file left behind by a crash never affects reading the state', async () => {
    await provision()
    await writeStateText(file, ID, expected, 'good\n')
    writeFileSync(path.join(dir, '.state.json.deadbeefdeadbeef.tmp'), 'half-writ')
    expect(await readStateText(file, ID, expected)).toBe('good\n')
  })
})
