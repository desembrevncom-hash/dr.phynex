import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { open, readFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'

/**
 * State file IO for the guarded migration executor: single-rename replacement + volume anchor.
 * This is IO only; the content of the state is validated by migration-state.ts.
 *
 * Replacement: write a new temp file in the same directory (exclusive create, mode 0600), fsync it,
 * close it, rename it over the state file, then fsync the directory. Rename replaces the file in
 * one step, so a reader sees the old or the new content, not a truncated mix. Limits, stated plainly:
 *  - Power-loss durability is NOT claimed. fsync of the file is requested, but file systems, drives
 *    and volume drivers may still lose or reorder data; nothing here proves otherwise.
 *  - On Windows a directory cannot be fsync'd, so that step is skipped there. The rename itself is
 *    then not known to be durable until the OS flushes it.
 *  - If the rename succeeded and the directory fsync then failed, the NEW file is in place but its
 *    durability is unconfirmed. This is reported as STATE_RENAMED_SYNC_FAILED (`renamed: true`);
 *    the old content is gone and must not be assumed. If rename itself reported failure, the old
 *    file is expected to remain, but that is the file system's behaviour, not something verified here.
 *
 * Volume anchor: the state directory must contain `.drphynex-volume-anchor.json`, created by the
 * owner (scripts/migration-anchor.ts). The expected anchor ID is NOT taken from that volume: it
 * comes from the trusted target catalog (outside the volume) and is compared on every read and
 * write. A missing, replaced, copied-from-elsewhere or edited anchor is refused. Once a run has
 * started the anchor records `runStarted: true`, so a state file that later disappears is refused
 * instead of being read as "no previous run". The executor never creates or edits the expected ID.
 */
export const ANCHOR_NAME = '.drphynex-volume-anchor.json'

export type StoreCode =
  | 'ANCHOR_ID_UNCONFIGURED'
  | 'ANCHOR_MISSING'
  | 'ANCHOR_UNREADABLE'
  | 'ANCHOR_CORRUPT'
  | 'ANCHOR_WRONG_TARGET'
  | 'ANCHOR_ID_MISMATCH'
  | 'STATE_LOST'
  | 'STATE_RENAMED_SYNC_FAILED'
/** Message is the fixed code: nothing from the file system or the files is copied into it. */
export class StateStoreError extends Error {
  constructor(
    public readonly code: StoreCode,
    public readonly renamed = false,
  ) {
    super(code)
    this.name = 'StateStoreError'
  }
}

export type Anchor = { version: 1; identity: string; anchorId: string; runStarted: boolean }
export type Fs = {
  readFile: (p: string, enc: 'utf8') => Promise<string>
  openWrite: (
    p: string,
    mode: number,
  ) => Promise<{
    writeFile: (s: string) => Promise<void>
    sync: () => Promise<void>
    close: () => Promise<void>
  }>
  rename: (a: string, b: string) => Promise<void>
  unlink: (p: string) => Promise<void>
  syncDir: (p: string) => Promise<void>
}
export const nodeFs: Fs = {
  readFile: (p, enc) => readFile(p, enc),
  openWrite: (p, mode) => open(p, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode),
  rename,
  unlink,
  async syncDir(p) {
    if (process.platform === 'win32') return // not supported by the OS; see header
    const h = await open(p, 'r')
    try {
      await h.sync()
    } finally {
      await h.close()
    }
  },
}
const enoent = (e: unknown) => (e as NodeJS.ErrnoException)?.code === 'ENOENT'
export const isAnchorId = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-f0-9]{32}$/.test(v)

export async function writeAtomic(file: string, text: string, fs: Fs = nodeFs) {
  const dir = path.dirname(file)
  const tmp = path.join(dir, `.${path.basename(file)}.${randomBytes(8).toString('hex')}.tmp`)
  const h = await fs.openWrite(tmp, 0o600) // exclusive create: a failure here created nothing
  let closed = false
  try {
    await h.writeFile(text)
    await h.sync()
    await h.close()
    closed = true
  } catch (e) {
    if (!closed) await h.close().catch(() => {})
    await fs.unlink(tmp).catch(() => {})
    throw e
  }
  try {
    await fs.rename(tmp, file)
  } catch (e) {
    await fs.unlink(tmp).catch(() => {})
    throw e
  }
  try {
    await fs.syncDir(dir)
  } catch {
    throw new StateStoreError('STATE_RENAMED_SYNC_FAILED', true)
  }
}

export async function readAnchor(
  dir: string,
  identity: string,
  expectedId: string,
  fs: Fs = nodeFs,
): Promise<Anchor> {
  if (!isAnchorId(expectedId)) throw new StateStoreError('ANCHOR_ID_UNCONFIGURED')
  let raw: string
  try {
    raw = await fs.readFile(path.join(dir, ANCHOR_NAME), 'utf8')
  } catch (e) {
    throw new StateStoreError(enoent(e) ? 'ANCHOR_MISSING' : 'ANCHOR_UNREADABLE')
  }
  let a: Record<string, unknown>
  try {
    a = JSON.parse(raw)
  } catch {
    throw new StateStoreError('ANCHOR_CORRUPT')
  }
  const keys = Object.keys(a ?? {})
    .sort()
    .join(',')
  if (
    !a ||
    typeof a !== 'object' ||
    keys !== 'anchorId,identity,runStarted,version' ||
    a.version !== 1 ||
    !isAnchorId(a.anchorId) ||
    typeof a.runStarted !== 'boolean'
  )
    throw new StateStoreError('ANCHOR_CORRUPT')
  if (a.identity !== identity) throw new StateStoreError('ANCHOR_WRONG_TARGET')
  // Same target identity but another ID: a replaced or copied anchor. Refused even if runStarted
  // is false and the state file is gone; only the owner can change the trusted expected ID.
  if (a.anchorId !== expectedId) throw new StateStoreError('ANCHOR_ID_MISMATCH')
  return a as unknown as Anchor
}

/**
 * Owner tool: create the anchor once (exclusive create, never overwrites). The caller records the
 * returned ID in the trusted catalog; the executor never does.
 */
export async function createAnchor(dir: string, identity: string, fs: Fs = nodeFs) {
  const anchor: Anchor = {
    version: 1,
    identity,
    anchorId: randomBytes(16).toString('hex'),
    runStarted: false,
  }
  const h = await fs.openWrite(path.join(dir, ANCHOR_NAME), 0o600)
  try {
    await h.writeFile(JSON.stringify(anchor) + '\n')
    await h.sync()
  } finally {
    await h.close()
  }
  await fs.syncDir(dir)
  return anchor
}

/** Reader for the executor: null only for a verified anchor of a target that never started a run. */
export async function readStateText(
  file: string,
  identity: string,
  expectedId: string,
  fs: Fs = nodeFs,
): Promise<string | null> {
  const anchor = await readAnchor(path.dirname(file), identity, expectedId, fs)
  try {
    return await fs.readFile(file, 'utf8')
  } catch (e) {
    if (!enoent(e)) throw e
    if (anchor.runStarted) throw new StateStoreError('STATE_LOST')
    return null
  }
}

export async function writeStateText(
  file: string,
  identity: string,
  expectedId: string,
  text: string,
  fs: Fs = nodeFs,
) {
  const dir = path.dirname(file)
  const anchor = await readAnchor(dir, identity, expectedId, fs)
  if (!anchor.runStarted)
    await writeAtomic(
      path.join(dir, ANCHOR_NAME),
      JSON.stringify({ ...anchor, runStarted: true }) + '\n',
      fs,
    )
  await writeAtomic(file, text, fs)
}
