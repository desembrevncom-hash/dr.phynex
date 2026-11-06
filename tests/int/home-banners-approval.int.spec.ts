import { assertDisposableDatabase } from '../helpers/database'
import { randomBytes } from 'crypto'
import { getPayload, handleEndpoints, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import { bannersApprovedFor, readApprovals, sharedRevision } from '@/lib/banner-revision'
import type { HomePage, Media, User } from '@/payload-types'

// P1: approval must cover the SHARED banner configuration. Disposable *_test database only.

type Loc = 'ko' | 'en' | 'vi'
type Data = Record<string, unknown>
let payload: Payload
let admin: User
let editor: User
let translator: User
let editorPassword: string
let imageA: Media
let imageB: Media

const password = () => randomBytes(16).toString('hex')
const guest = { overrideAccess: false, fallbackLocale: false } as const
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const released = async (name: string) => {
  const m = await payload.create({
    collection: 'media',
    locale: 'ko',
    data: { alt: name },
    file: { data: png, mimetype: 'image/png', name: `${name}-${Date.now()}.png`, size: png.length },
    user: editor,
    overrideAccess: false,
  })
  return payload.update({
    collection: 'media',
    id: m.id,
    data: { publicRelease: true },
    user: editor,
    overrideAccess: false,
  })
}
const draft = (locale: Loc, data: Data, user: User = editor) =>
  payload.updateGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    data,
    user,
    overrideAccess: false,
  })
const approve = (locale: Loc) => draft(locale, { translationStatus: 'approved' })
const publish = (locale: Loc) =>
  payload.updateGlobal({
    slug: 'home-page',
    locale,
    data: { _status: 'published' },
    user: editor,
    overrideAccess: false,
  })
const guestHome = (locale: Loc) =>
  payload.findGlobal({ slug: 'home-page', locale, depth: 1, ...guest }) as Promise<HomePage>
const latest = (locale: Loc, depth = 0) =>
  payload.findGlobal({
    slug: 'home-page',
    locale,
    depth,
    draft: true,
    fallbackLocale: false,
    user: editor,
    overrideAccess: false,
  }) as Promise<HomePage>
const formaImageId = (doc: HomePage) => {
  const v = doc.banners.forma.desktopImage
  return typeof v === 'object' && v ? v.id : v
}
/** What the Admin form sends back: the whole document, ids or populated objects, unchanged values. */
const adminPayload = (doc: HomePage, extra: Data) => {
  const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = doc as unknown as Data
  return { ...rest, _status: 'draft', ...extra }
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
  imageA = await released('shared-a')
  imageB = await released('shared-b')

  // KO and EN published with shared configuration S1; VI only a draft.
  await draft('ko', {
    banners: { forma: { visualType: 'fullBleed', desktopImage: imageA.id, title: 'KO v1' } },
  })
  await approve('ko')
  await publish('ko')
  await draft('en', { banners: { forma: { title: 'EN v1' } } })
  await approve('en')
  await publish('en')
  await draft('vi', { banners: { forma: { title: 'VI draft' } } })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('shared banner approval', () => {
  it('baseline: KO and EN public with S1, both approved for it; VI not approved', async () => {
    const ko = await guestHome('ko')
    const en = await guestHome('en')
    expect(formaImageId(ko)).toBe(imageA.id)
    expect(bannersApprovedFor(ko, 'ko')).toBe(true)
    expect(bannersApprovedFor(en, 'en')).toBe(true)
    expect(en.banners.forma.title).toBe('EN v1')
    const d = await latest('vi')
    expect(readApprovals(d.bannerApprovals).vi).toBeUndefined()
  })

  it('a localized title change only affects that locale', async () => {
    await draft('en', { banners: { forma: { title: 'EN v2' } } })
    const d = await latest('en')
    expect(d.translationStatus).toBe('in-review')
    const approvals = readApprovals(d.bannerApprovals)
    expect(approvals.en).toBeUndefined()
    expect(approvals.ko).toBe(sharedRevision(d.banners))
    // KO can still publish (its approval covers the unchanged shared settings).
    await expect(publish('ko')).resolves.toBeTruthy()
    await approve('en')
    expect(readApprovals((await latest('en')).bannerApprovals).en).toBe(sharedRevision(d.banners))
    await publish('en')
    expect((await guestHome('en')).banners.forma.title).toBe('EN v2')
  })

  it('re-sending the full Admin form with unchanged values does not revoke approval', async () => {
    const before = await latest('ko', 1) // populated media objects, like the Admin form state
    const r1 = sharedRevision(before.banners)
    await draft('ko', adminPayload(before, { translationStatus: 'approved' }))
    const after0 = await latest('ko', 0)
    expect(after0.translationStatus).toBe('approved')
    expect(readApprovals(after0.bannerApprovals).ko).toBe(r1)
    expect(readApprovals(after0.bannerApprovals).en).toBe(r1)
    await draft('ko', adminPayload(after0, { translationStatus: 'approved' })) // ids this time
    expect(readApprovals((await latest('ko')).bannerApprovals).ko).toBe(r1)
  })

  it('a client cannot forge approvals', async () => {
    const forged = sharedRevision({ forma: { desktopImage: 999 } })
    await draft('vi', { bannerApprovals: { ko: forged, en: forged, vi: forged } })
    const a = readApprovals((await latest('vi')).bannerApprovals)
    expect(a.vi).toBeUndefined()
    expect(a.ko).not.toBe(forged)
  })

  it('a translator cannot change shared fields and does not revoke anyone', async () => {
    const r = sharedRevision((await latest('ko')).banners)
    await draft(
      'ko',
      { banners: { forma: { desktopImage: imageB.id, theme: 'sheet' } } },
      translator,
    )
    const d = await latest('ko')
    expect(formaImageId(d)).toBe(imageA.id)
    expect(readApprovals(d.bannerApprovals)).toMatchObject({ ko: r, en: r })
  })

  it('content change together with Approved does not count as approval', async () => {
    await draft('vi', { banners: { forma: { title: 'VI edited' } }, translationStatus: 'approved' })
    const d = await latest('vi')
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals).vi).toBeUndefined()
  })

  it('a shared change must be a draft; publishing it directly is refused and nothing changes', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'home-page',
        locale: 'ko',
        data: { _status: 'published', banners: { forma: { desktopImage: imageB.id } } },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/draft/i)
    expect(formaImageId(await guestHome('ko'))).toBe(imageA.id)
    expect(formaImageId(await latest('ko'))).toBe(imageA.id)
  })

  it('a shared change (with Approved in the same request) revokes every locale but leaves the public version', async () => {
    await draft('ko', {
      banners: { forma: { desktopImage: imageB.id } },
      translationStatus: 'approved',
    })
    const d = await latest('ko')
    expect(formaImageId(d)).toBe(imageB.id)
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals)).toEqual({})
    expect((await latest('en')).bannerApprovalStatus).toMatch(
      /EN: needs approval|EN: cần duyệt lại|EN: 재승인/,
    )
    // Public KO/EN unchanged and still consistent.
    for (const l of ['ko', 'en'] as const) {
      const g = await guestHome(l)
      expect(formaImageId(g)).toBe(imageA.id)
      expect(bannersApprovedFor(g, l)).toBe(true)
    }
  })

  it('KO cannot publish the new shared settings while EN (public) has not approved them', async () => {
    await approve('ko')
    const r2 = sharedRevision((await latest('ko')).banners)
    expect(readApprovals((await latest('ko')).bannerApprovals)).toEqual({ ko: r2 })
    await expect(publish('ko')).rejects.toThrow(/EN/)
    const g = await guestHome('en')
    expect(formaImageId(g)).toBe(imageA.id)
    expect(bannersApprovedFor(g, 'en')).toBe(true)
  })

  it('EN cannot publish either until EN itself approved the new settings', async () => {
    await expect(publish('en')).rejects.toThrow(/EN/)
    expect(formaImageId(await guestHome('en'))).toBe(imageA.id)
  })

  it('after EN approves, KO publishes; both public locales show S2 with matching approvals', async () => {
    await approve('en')
    await publish('ko')
    for (const l of ['ko', 'en'] as const) {
      const g = await guestHome(l)
      expect(formaImageId(g)).toBe(imageB.id)
      expect(bannersApprovedFor(g, l)).toBe(true)
    }
    expect((await guestHome('en')).banners.forma.title).toBe('EN v2')
  })

  it('VI publishes only after its own approval, and publishing never exposes VI draft text early', async () => {
    expect((await guestHome('vi')).banners?.forma?.title ?? undefined).toBeUndefined()
    await expect(publish('vi')).rejects.toThrow()
    await approve('vi')
    await publish('vi')
    const vi = await guestHome('vi')
    expect(vi.banners.forma.title).toBe('VI edited')
    expect(bannersApprovedFor(vi, 'vi')).toBe(true)
    expect(formaImageId(vi)).toBe(imageB.id)
  })
})

describe('calls without a user (system exemption)', () => {
  const rest = (path: string, data: unknown, token?: string) =>
    handleEndpoints({
      config: payload.config,
      request: new Request('http://localhost:3016/api/' + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'JWT ' + token } : {}),
        },
        body: JSON.stringify(data),
      }),
    })

  it('a guest cannot write, approve or publish banners over REST', async () => {
    const before = JSON.stringify((await latest('ko')).bannerApprovals)
    for (const body of [
      { banners: { forma: { title: 'guest' } } },
      { translationStatus: 'approved' },
      { _status: 'published' },
      { bannerApprovals: { ko: sharedRevision({}) } },
    ]) {
      const res = await rest('globals/home-page?locale=ko&draft=true', body)
      expect([401, 403], JSON.stringify(body)).toContain(res.status)
    }
    expect(JSON.stringify((await latest('ko')).bannerApprovals)).toBe(before)
  })

  it('a Local API call without a user that does not bypass access is refused', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'home-page',
        locale: 'ko',
        draft: true,
        overrideAccess: false,
        data: { banners: { forma: { title: 'anon' } } },
      }),
    ).rejects.toThrow()
  })

  it('a client-sent bannerApprovals is ignored for a signed-in editor over REST', async () => {
    const login = await payload.login({
      collection: 'users',
      data: { email: 'editor@test.local', password: editorPassword },
    })
    const forged = sharedRevision({ forma: { desktopImage: 12345 } })
    const res = await rest(
      'globals/home-page?locale=vi&draft=true',
      { bannerApprovals: { vi: forged, ko: forged, en: forged } },
      login.token!,
    )
    expect(res.status).toBe(200)
    const d = await latest('vi')
    const a = readApprovals(d.bannerApprovals)
    // VI approved the real configuration earlier; the forged value never lands anywhere.
    expect(a.vi).toBe(sharedRevision(d.banners))
    expect(Object.values(a)).not.toContain(forged)
  })

  it('an explicit in-process system call (no user, overrideAccess) follows the same two-step review', async () => {
    // Content change: the existing review rules reset the status even for system calls.
    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'vi',
      draft: true,
      data: { banners: { forma: { title: 'VI system seed' } }, translationStatus: 'approved' },
    })
    let d = await latest('vi')
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals).vi).toBeUndefined()
    // Separate approval save without content changes records the approval for the exact revision.
    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'vi',
      draft: true,
      data: { translationStatus: 'approved' },
    })
    d = await latest('vi')
    expect(readApprovals(d.bannerApprovals).vi).toBe(sharedRevision(d.banners))
  })
})

// P1 (review r3): a trusted system caller (Local API, no user, overrideAccess true) only passes the
// caller check. Revision, approval and publish rules are the same as for an editor: no approval of
// its own, no early return. Run with an explicit overrideAccess and with the Local API default.
describe.each([
  { name: 'overrideAccess: true passed explicitly', extra: { overrideAccess: true } },
  { name: 'overrideAccess left at the Local API default', extra: {} },
] as const)('system caller without a user ($name)', ({ extra }) => {
  const sys = (locale: Loc, data: Data, isDraft = false) =>
    payload.updateGlobal({
      slug: 'home-page',
      locale,
      data,
      ...(isDraft ? { draft: true } : {}),
      ...extra,
    })
  const sysDraft = (locale: Loc, data: Data) => sys(locale, data, true)
  const sysApprove = (locale: Loc) => sysDraft(locale, { translationStatus: 'approved' })
  const sysPublish = (locale: Loc) => sys(locale, { _status: 'published' })
  const publicState = async () => {
    const out: Record<string, unknown> = {}
    for (const l of ['ko', 'en', 'vi'] as const) {
      const g = await guestHome(l)
      out[l] = {
        image: formaImageId(g),
        type: g.banners.forma.visualType,
        cta: g.banners.forma.ctaTarget,
        approved: bannersApprovedFor(g, l),
      }
    }
    return JSON.stringify(out)
  }
  let other: Media

  it('shared image + Approved in one request is not an approval and the public version stays', async () => {
    const cur = formaImageId(await latest('ko'))
    other = cur === imageA.id ? imageB : imageA
    const before = await publicState()
    await sysDraft('ko', {
      banners: { forma: { desktopImage: other.id } },
      translationStatus: 'approved',
    })
    const d = await latest('ko')
    expect(formaImageId(d)).toBe(other.id)
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals)).toEqual({})
    expect(await publicState()).toBe(before)
  })

  it('visualType + Approved and CTA + Approved in one request are not approvals either', async () => {
    const cur = (await latest('ko')).banners.forma
    await sysDraft('ko', {
      banners: { forma: { visualType: cur.visualType === 'packshot' ? 'fullBleed' : 'packshot' } },
      translationStatus: 'approved',
    })
    let d = await latest('ko')
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals)).toEqual({})
    await sysDraft('ko', {
      banners: { forma: { ctaTarget: cur.ctaTarget === 'contact' ? 'products' : 'contact' } },
      translationStatus: 'approved',
    })
    d = await latest('ko')
    expect(d.translationStatus).toBe('in-review')
    expect(readApprovals(d.bannerApprovals)).toEqual({})
  })

  it('publishing directly with a shared change is refused (must be a draft first)', async () => {
    const before = await publicState()
    await expect(
      sys('ko', { _status: 'published', banners: { forma: { desktopImage: imageA.id } } }),
    ).rejects.toThrow(/draft/i)
    expect(await publicState()).toBe(before)
  })

  it('publishing the unapproved draft right after the change is refused', async () => {
    const before = await publicState()
    await expect(sysPublish('ko')).rejects.toThrow(/review|approve/i)
    expect(await publicState()).toBe(before)
  })

  it('KO approved alone cannot publish while EN and VI are public without approving it', async () => {
    const before = await publicState()
    await sysApprove('ko')
    const d = await latest('ko')
    expect(readApprovals(d.bannerApprovals)).toEqual({ ko: sharedRevision(d.banners) })
    await expect(sysPublish('ko')).rejects.toThrow(/EN/)
    expect(await publicState()).toBe(before)
    await sysApprove('en')
    await expect(sysPublish('ko')).rejects.toThrow(/VI/)
    expect(await publicState()).toBe(before)
  })

  it('after each language was approved in its own save, publishing succeeds', async () => {
    await sysApprove('vi')
    const rev = sharedRevision((await latest('ko')).banners)
    const a = readApprovals((await latest('ko')).bannerApprovals)
    expect(a).toEqual({ ko: rev, en: rev, vi: rev })
    await sysPublish('ko')
    const state = JSON.parse(await publicState()) as Record<
      string,
      { image: unknown; approved: boolean }
    >
    for (const l of ['ko', 'en', 'vi']) {
      expect(state[l].approved).toBe(true)
      expect(state[l].image).toBe(other.id)
    }
  })

  it('a client-sent bannerApprovals is ignored for system calls too', async () => {
    const forged = sharedRevision({ forma: { desktopImage: 424242 } })
    await sysDraft('vi', { bannerApprovals: { ko: forged, en: forged, vi: forged } })
    expect(Object.values(readApprovals((await latest('vi')).bannerApprovals))).not.toContain(forged)
  })
})
