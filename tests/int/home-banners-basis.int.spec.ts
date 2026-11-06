import { randomBytes } from 'crypto'
import { getPayload, handleEndpoints, type Migration, type Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import { readApprovals, sharedRevision } from '@/lib/banner-revision'
import type { HomePage, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// The approval must cover exactly what the approving editor was shown (lib/approval-basis.ts).
// Disposable *_test database only.

type Loc = 'ko' | 'en' | 'vi'
type Seen = {
  basis: string
  revision: string
  approved: Record<Loc, boolean>
  status: string
  docSave: string | null
}

let payload: Payload
let admin: User
let editor: User
let translator: User
let editorPassword: string

const password = () => randomBytes(16).toString('hex')

const draft = (locale: Loc, data: Record<string, unknown>, user: User = editor) =>
  payload.updateGlobal({ slug: 'home-page', locale, draft: true, data, user, overrideAccess: false })

const read = (locale: Loc, user: User = editor) =>
  payload.findGlobal({
    slug: 'home-page',
    locale,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    user,
    overrideAccess: false,
  }) as Promise<HomePage>

/** What the Admin page shows the editor: the server-computed state read together with the document. */
const seen = async (locale: Loc, user: User = editor) =>
  (await read(locale, user)).approvalState as Seen

const approveWith = (locale: Loc, basis: string | undefined, user: User = editor) =>
  payload.updateGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    data: { translationStatus: 'approved' },
    context: basis === undefined ? {} : { approvalBasis: basis },
    user,
    overrideAccess: false,
  })

const approvals = async (locale: Loc) => readApprovals((await read(locale)).bannerApprovals)

const rest = async (path: string, data: unknown, headers: Record<string, string> = {}) => {
  const { token } = await payload.login({
    collection: 'users',
    data: { email: 'editor@test.local', password: editorPassword },
  })
  return handleEndpoints({
    config: payload.config,
    request: new Request('http://localhost:3016/api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'JWT ' + token!, ...headers },
      body: JSON.stringify(data),
    }),
  })
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test'))
    throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  admin = await payload.create({
    collection: 'users',
    data: { email: 'admin@test.local', password: password(), role: 'admin' },
    overrideAccess: true,
  })
  editorPassword = password()
  editor = await payload.create({
    collection: 'users',
    data: { email: 'editor@test.local', password: editorPassword, role: 'editor' },
    user: admin,
    overrideAccess: false,
  })
  translator = await payload.create({
    collection: 'users',
    data: { email: 'translator@test.local', password: password(), role: 'translator' },
    user: admin,
    overrideAccess: false,
  })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('approval proof: the server guarantees the approved revision is the one that was viewed', () => {
  it('two competing editing sessions: a stale session cannot approve what it never saw', async () => {
    await draft('vi', { banners: { forma: { title: 'VI session start' } } })
    const sessionA = await seen('vi') // editor A opens the page
    // Editor B (another session) saves a change to the same language before A approves.
    await draft('vi', { banners: { forma: { title: 'VI changed by B' } } })
    await expect(approveWith('vi', sessionA.basis)).rejects.toThrow(/thay đổi kể từ lúc bạn mở trang/)
    const stored = await read('vi')
    expect(stored.banners.forma.title).toBe('VI changed by B')
    expect(stored.translationStatus).toBe('in-review')
    expect((await approvals('vi')).vi).toBeUndefined()
    // After reloading, A sees B's version and may approve exactly that one.
    const reloaded = await seen('vi')
    expect(reloaded.basis).not.toBe(sessionA.basis)
    await approveWith('vi', reloaded.basis)
    expect((await approvals('vi')).vi).toBe(sharedRevision((await read('vi')).banners))
  })

  it('a stale session is refused after a shared change too, and nothing is approved', async () => {
    await draft('vi', { banners: { forma: { title: 'VI before shared change' } } })
    const sessionA = await seen('vi')
    await draft('vi', { banners: { forma: { theme: 'sheet' } } }) // shared: images, colours, CTA
    await expect(approveWith('vi', sessionA.basis)).rejects.toThrow(/thay đổi kể từ lúc bạn mở trang/)
    expect(await approvals('vi')).toEqual({})
    await draft('vi', { banners: { forma: { theme: 'forma' } } })
  })

  it('approving without a basis (native status change + save) is refused for users', async () => {
    await draft('vi', { banners: { forma: { title: 'VI no basis' } } })
    await expect(approveWith('vi', undefined)).rejects.toThrow(/nút "Duyệt cấu hình"/)
    await expect(approveWith('vi', 'f'.repeat(64))).rejects.toThrow(/thay đổi kể từ lúc bạn mở trang/)
    expect((await approvals('vi')).vi).toBeUndefined()
    expect((await read('vi')).translationStatus).toBe('in-review')
  })

  it('a change to another language does not invalidate this language, and approves nothing else', async () => {
    await draft('vi', { banners: { forma: { title: 'VI stays' } } })
    const sessionA = await seen('vi')
    await draft('en', { banners: { forma: { title: 'EN edited meanwhile' } } })
    expect((await seen('vi')).basis).toBe(sessionA.basis)
    await approveWith('vi', sessionA.basis)
    expect((await approvals('vi')).vi).toBeDefined()
    expect((await approvals('en')).en).toBeUndefined()
    expect((await approvals('ko')).ko).toBeUndefined()
  })

  it('approving neither saves other content nor publishes', async () => {
    await draft('vi', { banners: { forma: { title: 'VI not published' } } })
    const s = await seen('vi')
    const before = JSON.stringify((await read('vi')).banners)
    await approveWith('vi', s.basis)
    const after = await read('vi')
    expect(JSON.stringify(after.banners)).toBe(before)
    expect(after.translationStatus).toBe('approved')
    expect(after._status).toBe('draft')
    const published = await payload.findGlobal({
      slug: 'home-page',
      locale: 'vi',
      depth: 0,
      fallbackLocale: false,
      overrideAccess: true,
    })
    expect(published.banners?.forma?.title).not.toBe('VI not published')
  })

  it('re-saving an already approved revision records nothing new and needs no proof', async () => {
    await draft('vi', { banners: { forma: { title: 'VI approved twice' } } })
    await approveWith('vi', (await seen('vi')).basis)
    const first = await approvals('vi')
    await expect(approveWith('vi', undefined)).resolves.toBeTruthy()
    expect(await approvals('vi')).toEqual(first)
  })

  it('a translator cannot approve even with a valid proof', async () => {
    await draft('vi', { banners: { forma: { title: 'VI translator try' } } })
    const s = await seen('vi', translator)
    await expect(approveWith('vi', s.basis, translator)).rejects.toThrow(/biên tập viên/)
    expect((await approvals('vi')).vi).toBeUndefined()
  })

  it('the proof is the same for every staff role and is never shown to the public', async () => {
    const e = await seen('ko')
    const t = await seen('ko', translator)
    expect(t.basis).toBe(e.basis)
    expect(e.basis).toMatch(/^[a-f0-9]{64}$/)
    const guestView = (await payload.findGlobal({
      slug: 'home-page',
      locale: 'ko',
      depth: 0,
      fallbackLocale: false,
      overrideAccess: false,
    })) as HomePage
    expect(guestView.approvalState).toBeUndefined()
  })

  it('the state is paired with the exact save it was computed from (docSave = that save marker)', async () => {
    await draft('vi', { banners: { forma: { title: 'VI pairing' } } })
    const doc = await read('vi')
    const s = doc.approvalState as Seen
    expect(s.docSave).toBe((doc.bannerApprovals as { _save: string })._save)
    expect(s.docSave).toBeTruthy()
    await draft('vi', { banners: { forma: { title: 'VI pairing 2' } } })
    const next = await seen('vi')
    expect(next.docSave).not.toBe(s.docSave)
    expect(next.basis).not.toBe(s.basis)
  })

  it('a save that lands between the basis check and the approval write cannot be approved by mistake', async () => {
    await draft('vi', { banners: { forma: { title: 'VI race start' } } })
    const sessionA = await seen('vi')
    const waiting = async () => {
      const { rows } = await (payload.db as never as { drizzle: { execute: (q: unknown) => Promise<{ rows: { n: number }[] }> } }).drizzle.execute(
        sql`select count(*)::int as n from pg_locks where locktype = 'advisory' and not granted`,
      )
      return rows[0].n
    }
    let competing: Promise<unknown> | undefined
    let sawBlocked = false
    // Editor A's approval passed the basis check; its write is not committed yet. Editor B saves now.
    const afterApprovalCheck = async () => {
      competing = draft('vi', { banners: { forma: { title: 'VI saved by B during A approval' } } })
      competing.catch(() => undefined)
      // Controlled synchronisation: wait on a database condition (B queued behind A's lock), never on time.
      const deadline = Date.now() + 20000
      while (Date.now() < deadline && (await waiting()) < 1) await new Promise((r) => setImmediate(r))
      sawBlocked = (await waiting()) >= 1
    }
    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'vi',
      draft: true,
      data: { translationStatus: 'approved' },
      context: { approvalBasis: sessionA.basis, afterApprovalCheck },
      user: editor,
      overrideAccess: false,
    })
    expect(sawBlocked).toBe(true) // B really was held back until A committed
    await competing
    // B was applied after A: its content change reset the review, so nothing approves B's text.
    const stored = await read('vi')
    expect(stored.banners.forma.title).toBe('VI saved by B during A approval')
    expect(stored.translationStatus).toBe('in-review')
    expect((await approvals('vi')).vi).toBeUndefined()
    expect(await seen('vi')).toMatchObject({ approved: { vi: false } })
  })

  it('a single editor can still save, look and approve (happy path)', async () => {
    await draft('vi', { banners: { forma: { title: 'VI single editor' } } })
    const s = await seen('vi')
    await approveWith('vi', s.basis)
    expect((await approvals('vi')).vi).toBe(s.revision)
    expect((await seen('vi')).approved.vi).toBe(true)
  })

  it('over REST the proof travels in the x-approval-basis header (a missing or wrong one is refused)', async () => {
    await draft('vi', { banners: { forma: { title: 'VI over REST' } } })
    const s = await seen('vi')
    const url = 'globals/home-page?locale=vi&draft=true&fallback-locale=none'
    expect((await rest(url, { translationStatus: 'approved' })).status).toBe(409)
    const wrong = await rest(url, { translationStatus: 'approved' }, { 'x-approval-basis': 'a'.repeat(64) })
    expect(wrong.status).toBe(409)
    expect((await approvals('vi')).vi).toBeUndefined()
    const ok = await rest(url, { translationStatus: 'approved' }, { 'x-approval-basis': s.basis })
    expect(ok.status).toBe(200)
    expect((await approvals('vi')).vi).toBe(s.revision)
  })
})
