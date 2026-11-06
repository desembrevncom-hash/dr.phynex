import { randomBytes } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { ApprovalState } from '@/lib/approval-basis'
import { readApprovals } from '@/lib/banner-revision'
import { approvalView, saveMarker, type ApprovalViewInput } from '@/lib/approval-view'
import type { HomePage, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// Drafts saved before save markers (`bannerApprovals._save`) existed. Disposable *_test database
// only. "Legacy" drafts are produced here by removing the marker from the stored JSON of the test
// database (what the real database looks like after the upgrade); real data is never touched.

type Loc = 'ko' | 'en' | 'vi'
let payload: Payload
let editor: User

const password = () => randomBytes(16).toString('hex')
const exec = (q: unknown) =>
  (payload.db as never as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }).drizzle.execute(q)

/** Remove every save marker from the stored Home Page (main row and all versions). */
const makeLegacy = async () => {
  await exec(sql`update _home_page_v set version_banner_approvals = coalesce(version_banner_approvals, '{}'::jsonb) - '_save'`)
  await exec(sql`update home_page set banner_approvals = coalesce(banner_approvals, '{}'::jsonb) - '_save'`)
}
const storedMarkers = async () =>
  (await exec(sql`select version_banner_approvals ->> '_save' as m from _home_page_v order by updated_at desc limit 1`)).rows[0]?.m ?? null

const draft = (locale: Loc, data: Record<string, unknown>, context: Record<string, unknown> = {}) =>
  payload.updateGlobal({ slug: 'home-page', locale, draft: true, data, context, user: editor, overrideAccess: false })

/** Exactly the read the Admin document view makes (payload/next getDocumentData). */
const adminRead = (locale: Loc) =>
  payload.findGlobal({
    slug: 'home-page',
    locale,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    overrideAccess: false,
    user: editor,
  }) as Promise<HomePage>

/** What the panel decides for a form loaded as `loaded` once it has read `fresh` from the server. */
const panel = (loaded: HomePage, fresh: ApprovalState, over: Partial<ApprovalViewInput> = {}) =>
  approvalView({
    state: fresh,
    shownSave: saveMarker(loaded.bannerApprovals),
    loadedShownBasis: (loaded.approvalState as ApprovalState).shownBasis,
    canApprove: true,
    modified: false,
    busy: false,
    localeApproved: false,
    localeName: 'tiếng Việt',
    ...over,
  })
const fresh = async (locale: Loc) => (await adminRead(locale)).approvalState as ApprovalState
const approveWith = (locale: Loc, basis: string) => draft(locale, { translationStatus: 'approved' }, { approvalBasis: basis })

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

describe('old drafts without a save marker', () => {
  it('the Admin read and the stored draft are compared with the same basis rules', async () => {
    await draft('vi', { banners: { forma: { title: 'L0' } } })
    const doc = await adminRead('vi')
    const s = doc.approvalState as ApprovalState
    expect(s.shownBasis).toBe(s.basis) // same content, computed by the same function
    expect(s.shownBasis).toMatch(/^[a-f0-9]{64}$/)
  })

  it('1. legacy draft whose content matches the form: approval allowed, and it approves exactly that content', async () => {
    await draft('vi', { banners: { forma: { title: 'L1 legacy' } } })
    await makeLegacy()
    expect(await storedMarkers()).toBeNull()
    const loaded = await adminRead('vi')
    expect(saveMarker(loaded.bannerApprovals)).toBeNull()
    const s = await fresh('vi')
    expect(s.docSave).toBeNull()
    expect(panel(loaded, s).reason).toBeNull()
    await approveWith('vi', s.basis)
    const after = await adminRead('vi')
    expect(after.banners.forma.title).toBe('L1 legacy')
    expect(after.translationStatus).toBe('approved')
    expect(readApprovals(after.bannerApprovals).vi).toBe(s.revision)
  })

  it('2. two sessions both without markers but with different content: blocked as "changed elsewhere"; server agrees', async () => {
    await draft('vi', { banners: { forma: { title: 'L2 seen by A' } } })
    await makeLegacy()
    const loadedA = await adminRead('vi') // session A opens the page
    // A legacy writer changes the content (no marker is written, as before the upgrade).
    await draft('vi', { banners: { forma: { title: 'L2 changed by B' } } })
    await makeLegacy()
    const s = await fresh('vi')
    expect(s.docSave).toBeNull()
    const v = panel(loadedA, s)
    expect(v.stale).toBe(true)
    expect(v.legacy).toBe(false)
    expect(v.reason).toMatch(/Nội dung đã thay đổi ở phiên khác/)
    // Even if a client ignored the panel, the server refuses A's proof.
    await expect(approveWith('vi', (loadedA.approvalState as ApprovalState).basis)).rejects.toThrow(
      /thay đổi kể từ lúc bạn mở trang/,
    )
    // Reloading shows B's content, which may then be approved.
    const reloaded = await adminRead('vi')
    expect(panel(reloaded, await fresh('vi')).reason).toBeNull()
  })

  it('3. another session saves (with a marker) while A prepares to approve the legacy draft: blocked, refused', async () => {
    await draft('vi', { banners: { forma: { title: 'L3 legacy' } } })
    await makeLegacy()
    const loadedA = await adminRead('vi')
    await draft('vi', { banners: { forma: { title: 'L3 saved by B' } } }) // new code writes a marker
    const s = await fresh('vi')
    expect(s.docSave).toBeTruthy()
    expect(panel(loadedA, s).stale).toBe(true)
    await expect(approveWith('vi', (loadedA.approvalState as ApprovalState).basis)).rejects.toThrow(
      /thay đổi kể từ lúc bạn mở trang/,
    )
    expect((await adminRead('vi')).translationStatus).toBe('in-review')
  })

  it('4. data with markers keeps working as before', async () => {
    await draft('vi', { banners: { forma: { title: 'L4 marked' } } })
    const loaded = await adminRead('vi')
    const s = await fresh('vi')
    expect(saveMarker(loaded.bannerApprovals)).toBe(s.docSave)
    expect(panel(loaded, s).reason).toBeNull()
    await approveWith('vi', s.basis)
    expect(readApprovals((await adminRead('vi')).bannerApprovals).vi).toBe(s.revision)
  })

  it('5. no comparison possible: only "update the draft" is offered; a failed update keeps the button locked', async () => {
    await draft('vi', { banners: { forma: { title: 'L5 legacy' } } })
    await makeLegacy()
    const loaded = await adminRead('vi')
    // A form without the shown basis (e.g. loaded without it) cannot be compared.
    const noBasis = { ...loaded, approvalState: { ...(loaded.approvalState as ApprovalState), shownBasis: undefined } } as HomePage
    expect(panel(noBasis, await fresh('vi'))).toMatchObject({ legacy: true, stale: false })
    // The update (a plain draft save of the form) fails after taking the lock: nothing is written.
    const form = { banners: loaded.banners, translationStatus: loaded.translationStatus }
    await expect(
      draft('vi', form, { afterHomePageLock: async () => { throw new Error('save failed') } }),
    ).rejects.toThrow(/save failed/)
    expect(await storedMarkers()).toBeNull()
    expect(panel(noBasis, await fresh('vi'))).toMatchObject({ legacy: true })
    // The update that succeeds: form and basis then come from that one save; nothing is approved.
    const saved = await draft('vi', form)
    const s = await fresh('vi')
    expect(saveMarker(saved.bannerApprovals)).toBe(s.docSave)
    expect(panel({ ...noBasis, bannerApprovals: saved.bannerApprovals } as HomePage, s).reason).toBeNull()
    const after = await adminRead('vi')
    expect(after.banners.forma.title).toBe('L5 legacy')
    expect(after.translationStatus).toBe('in-review')
    expect(readApprovals(after.bannerApprovals).vi).toBeUndefined()
  })
})
