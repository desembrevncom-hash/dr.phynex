import { randomBytes } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import { readApprovals } from '@/lib/banner-revision'
import type { HomePage, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// Write ordering of the Home Page under the write lock. Disposable *_test database only.
// Both writers are real concurrent transactions on PostgreSQL. The test seam `afterHomePageLock`
// runs while the first writer holds the lock and before it has read anything: it starts the second
// writer and waits on a DATABASE condition (the second writer queued in pg_locks), so both writers
// have started before either can decide. No fixed delays are used to create the race.
//
// Limitation: the condition counts every advisory lock in the database cluster (pg_locks is not
// filtered by lock key or database). These tests therefore need an exclusive test environment: no
// other process may hold or wait for advisory locks on the same PostgreSQL server while they run
// (another session would satisfy "second writer queued" or keep "all locks released" from becoming
// true). Narrowing the query to this lock key and database is a follow-up; not changed here.

type Loc = 'ko' | 'en' | 'vi'
type Seen = { basis: string; revision: string }

let payload: Payload
let editor: User

const password = () => randomBytes(16).toString('hex')

const write = (locale: Loc, data: Record<string, unknown>, context: Record<string, unknown> = {}) =>
  payload.updateGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    data,
    context,
    user: editor,
    overrideAccess: false,
  })
const draft = (locale: Loc, data: Record<string, unknown>) => write(locale, data)
const read = (locale: Loc) =>
  payload.findGlobal({
    slug: 'home-page',
    locale,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    user: editor,
    overrideAccess: false,
  }) as Promise<HomePage>
const seen = async (locale: Loc) => (await read(locale)).approvalState as Seen
const approveWith = (locale: Loc, basis: string | undefined, extra: Record<string, unknown> = {}) =>
  write(locale, { translationStatus: 'approved' }, basis === undefined ? extra : { approvalBasis: basis, ...extra })
const approvals = async (locale: Loc) => readApprovals((await read(locale)).bannerApprovals)

type Rows = { rows: { n: number }[] }
const advisory = async (granted?: boolean) => {
  const where =
    granted === undefined ? sql`` : granted ? sql` and granted` : sql` and not granted`
  const result = await (
    payload.db as never as { drizzle: { execute: (q: unknown) => Promise<Rows> } }
  ).drizzle.execute(sql`select count(*)::int as n from pg_locks where locktype = 'advisory'${where}`)
  return result.rows[0].n
}
/** Waits (bounded) until the database reports the condition; never a fixed delay. */
const until = async (condition: () => Promise<boolean>, what: string) => {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (await condition()) return
    await new Promise((r) => setImmediate(r))
  }
  throw new Error('timed out waiting for ' + what)
}
const secondWriterQueued = () =>
  until(async () => (await advisory(false)) >= 1, 'second writer queued on the lock')
const noLocks = () => until(async () => (await advisory()) === 0, 'all advisory locks released')
const ignore = (p: Promise<unknown>) => p.catch(() => undefined)

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test'))
    throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  const admin = await payload.create({
    collection: 'users',
    data: { email: 'admin@test.local', password: password(), role: 'admin' },
    overrideAccess: true,
  })
  editor = await payload.create({
    collection: 'users',
    data: { email: 'editor@test.local', password: password(), role: 'editor' },
    user: admin,
    overrideAccess: false,
  })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('Home Page write ordering under the lock (two real PostgreSQL transactions)', () => {
  it('content first, approval second: the approval of the older view is refused and nothing stays approved', async () => {
    await draft('vi', { banners: { forma: { title: 'O1 base' } } })
    const viewed = await seen('vi')
    let approval: Promise<unknown> | undefined
    // Writer 1 (content) holds the lock; writer 2 (approval of the OLD view) has started and is queued.
    const content = write('vi', { banners: { forma: { title: 'O1 new content' } } }, {
      afterHomePageLock: async () => {
        approval = approveWith('vi', viewed.basis).then(
          () => 'approved',
          (e: Error) => e.message,
        )
        await secondWriterQueued()
      },
    })
    await content
    expect(await approval).toMatch(/thay đổi kể từ lúc bạn mở trang/)
    const stored = await read('vi')
    expect(stored.banners.forma.title).toBe('O1 new content')
    expect(stored.translationStatus).toBe('in-review')
    expect((await approvals('vi')).vi).toBeUndefined()
    await noLocks()
  })

  it('approval first, content second: the new content does not keep the approval of the old content', async () => {
    await draft('vi', { banners: { forma: { title: 'O2 base' } } })
    const viewed = await seen('vi')
    let content: Promise<unknown> | undefined
    const approval = approveWith('vi', viewed.basis, {
      afterHomePageLock: async () => {
        content = draft('vi', { banners: { forma: { title: 'O2 new content' } } })
        ignore(content)
        await secondWriterQueued()
      },
    })
    expect(((await approval) as { translationStatus?: string }).translationStatus).toBe('approved')
    await content
    const stored = await read('vi')
    expect(stored.banners.forma.title).toBe('O2 new content')
    expect(stored.translationStatus).toBe('in-review')
    expect((await approvals('vi')).vi).toBeUndefined()
    await noLocks()
  })

  it('already-approved branch: a re-save that needs no proof cannot keep an approval a concurrent shared change revoked', async () => {
    await draft('vi', { banners: { forma: { title: 'O3 base', theme: 'forma' } } })
    await approveWith('vi', (await seen('vi')).basis)
    expect((await approvals('vi')).vi).toBeDefined()
    let resave: Promise<string> | undefined
    // Writer 1 changes the SHARED configuration (revokes every approval); writer 2 re-saves "approved".
    const shared = write('vi', { banners: { forma: { theme: 'sheet' } } }, {
      afterHomePageLock: async () => {
        resave = approveWith('vi', undefined).then(
          () => 'saved',
          (e: Error) => e.message,
        )
        await secondWriterQueued()
      },
    })
    await shared
    expect(await resave).toMatch(/nút "Duyệt cấu hình"/)
    const stored = await read('vi')
    expect(stored.banners.forma.theme).toBe('sheet')
    expect(stored.translationStatus).toBe('in-review')
    expect(await approvals('vi')).toEqual({})
    await draft('vi', { banners: { forma: { theme: 'forma' } } })
    await noLocks()
  })

  it('rollback releases the lock and leaves no approval (failure after the check, before the write)', async () => {
    await draft('vi', { banners: { forma: { title: 'O4 base' } } })
    const viewed = await seen('vi')
    await expect(
      approveWith('vi', viewed.basis, {
        afterApprovalCheck: async () => {
          throw new Error('boom after check')
        },
      }),
    ).rejects.toThrow(/boom after check/)
    await noLocks()
    expect((await read('vi')).translationStatus).toBe('in-review')
    expect((await approvals('vi')).vi).toBeUndefined()
    // The next writer is not blocked and the same proof still works.
    await approveWith('vi', (await seen('vi')).basis)
    expect((await approvals('vi')).vi).toBeDefined()
    await noLocks()
  })

  it('a writer that fails right after taking the lock rolls back and releases it', async () => {
    await draft('vi', { banners: { forma: { title: 'O5 base' } } })
    const before = await read('vi')
    await expect(
      write('vi', { banners: { forma: { title: 'O5 never stored' } } }, {
        afterHomePageLock: async () => {
          throw new Error('boom after lock')
        },
      }),
    ).rejects.toThrow(/boom after lock/)
    await noLocks()
    expect((await read('vi')).banners.forma.title).toBe(before.banners.forma.title)
    await expect(draft('vi', { banners: { forma: { title: 'O5 next writer' } } })).resolves.toBeTruthy()
    await noLocks()
  })

  it('commit releases the lock after every kind of successful write', async () => {
    await draft('vi', { banners: { forma: { title: 'O6' } } })
    await noLocks()
    await approveWith('vi', (await seen('vi')).basis)
    await noLocks()
    expect(await advisory(true)).toBe(0)
  })
})
