import { assertDisposableDatabase } from '../helpers/database'
import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import * as homeBannersMigration from '@/migrations/20261105_085002_home_banners'
import config from '@/payload.config'
import { resolveHomeBanners } from '@/lib/home-banners'
import type { HomePage, Media, User } from '@/payload-types'

// Disposable *_test database only (vitest.setup.ts + assertDisposableDatabase). Neutral fixtures,
// random throwaway passwords, uploads in a temp folder. Nothing touches the live database.

let payload: Payload
let admin: User
let editor: User
let translator: User
let released: Media
let unreleased: Media

const password = () => randomBytes(16).toString('hex')
const guest = { overrideAccess: false, fallbackLocale: false } as const
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const upload = (name: string) =>
  payload.create({
    collection: 'media',
    locale: 'ko',
    data: { alt: `Alt ${name}` },
    file: { data: png, mimetype: 'image/png', name: `${name}-${Date.now()}.png`, size: png.length },
    user: editor,
    overrideAccess: false,
  })

type Data = Record<string, unknown>
const saveDraft = (locale: 'ko' | 'en' | 'vi', data: Data, user: User = editor) =>
  payload.updateGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    data,
    user,
    overrideAccess: false,
  })
/** The project workflow: content draft → separate approval save → publish this locale. */
const publish = async (locale: 'ko' | 'en' | 'vi', data: Data) => {
  await saveDraft(locale, data)
  await saveDraft(locale, { translationStatus: 'approved' })
  await payload.updateGlobal({
    slug: 'home-page',
    locale,
    data: { _status: 'published' },
    user: editor,
    overrideAccess: false,
  })
}
const guestHome = (locale: 'ko' | 'en' | 'vi') =>
  payload.findGlobal({ slug: 'home-page', locale, depth: 1, ...guest }) as Promise<HomePage>
const staffDraft = (locale: 'ko' | 'en' | 'vi') =>
  payload.findGlobal({
    slug: 'home-page',
    locale,
    depth: 1,
    draft: true,
    fallbackLocale: false,
    user: editor,
    overrideAccess: false,
  }) as Promise<HomePage>

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
  editor = await payload.create({
    collection: 'users',
    data: { email: 'editor@test.local', password: password(), role: 'editor' },
    user: admin,
    overrideAccess: false,
  })
  translator = await payload.create({
    collection: 'users',
    data: { email: 'translator@test.local', password: password(), role: 'translator' },
    user: admin,
    overrideAccess: false,
  })
  released = await upload('released')
  released = await payload.update({
    collection: 'media',
    id: released.id,
    data: { publicRelease: true },
    user: editor,
    overrideAccess: false,
  })
  unreleased = await upload('private')
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('migration 20261105_085002_home_banners', () => {
  it('is additive: existing published Home Page content survives down → up and gets slot defaults', async () => {
    await publish('ko', { headline: 'Existing KO headline' })
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const args = { db, payload, req: {} } as never
    await homeBannersMigration.down(args)
    await homeBannersMigration.up(args)

    const ko = await guestHome('ko')
    expect(ko.headline).toBe('Existing KO headline')
    expect(ko.banners.brand.visualType).toBe('brandOptics')
    expect(ko.banners.forma.visualType).toBe('packshot')
    expect(ko.banners.sheet.ctaTarget).toBe('rx-matrix-sheet')
    expect(ko.banners.luma.theme).toBe('luma')
    // Nothing configured yet → every slot keeps the built-in content and visual.
    const slots = resolveHomeBanners(ko)
    expect(slots.map((s) => s.text.source)).toEqual(Array(5).fill('default'))
    expect(slots.map((s) => s.visual.kind)).toEqual([
      'brandOptics',
      'formula',
      'formula',
      'formula',
      'formula',
    ])
  })
})

describe('Home Page banners: drafts, locales and media access', () => {
  it('a KO draft is invisible to guests until approved and published; the public version stays', async () => {
    await saveDraft('ko', {
      banners: {
        forma: {
          visualType: 'fullBleed',
          desktopImage: released.id,
          mobileImage: unreleased.id,
          title: 'KO campaign title',
          tagline: 'KO tagline',
          ctaLabel: 'KO CTA',
          ctaTarget: 'contact',
          textTone: 'light',
        },
      },
    })
    expect((await guestHome('ko')).banners?.forma?.title ?? undefined).toBeUndefined()
    expect((await staffDraft('ko')).banners.forma.title).toBe('KO campaign title')

    await saveDraft('ko', { translationStatus: 'approved' })
    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'ko',
      data: { _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    const ko = await guestHome('ko')
    expect(ko.banners.forma.title).toBe('KO campaign title')
    expect(ko.headline).toBe('Existing KO headline')

    // A newer draft does not replace what guests see.
    await saveDraft('ko', { banners: { forma: { title: 'KO title v2' } } })
    expect((await guestHome('ko')).banners.forma.title).toBe('KO campaign title')
    expect((await staffDraft('ko')).banners.forma.title).toBe('KO title v2')
  })

  it('guests never receive an unreleased banner image; staff preview does', async () => {
    const ko = await guestHome('ko')
    const json = JSON.stringify(ko)
    expect(typeof ko.banners.forma.desktopImage).toBe('object')
    expect((ko.banners.forma.desktopImage as Media).url).toContain(released.filename!)
    // Unreleased media is not populated for guests: no URL, filename or alt in the payload.
    expect(json).not.toContain(unreleased.filename!)
    expect(json).not.toContain('Alt private')

    const forma = resolveHomeBanners(ko)[1]
    expect(forma.visual.kind).toBe('fullBleed')
    expect(forma.visual.kind === 'fullBleed' && forma.visual.mobile).toBeNull()
    expect(forma.tone).toBe('light')
    expect(forma.text).toMatchObject({
      source: 'cms',
      title: 'KO campaign title',
      ctaTarget: 'contact',
    })

    const preview = resolveHomeBanners(await staffDraft('ko'))[1]
    expect(preview.visual.kind === 'fullBleed' && preview.visual.mobile?.id).toBe(unreleased.id)
  })

  it('an image that guests may not see is never swapped for another image', async () => {
    await publish('ko', {
      banners: { luma: { visualType: 'packshot', desktopImage: unreleased.id, title: 'Luma KO' } },
    })
    const ko = await guestHome('ko')
    const productImage = released // what the old behaviour would have pulled from the product
    const luma = resolveHomeBanners(ko, { luma: productImage })[2]
    expect(luma.visual.kind).toBe('formula')
    expect(luma.text).toMatchObject({ source: 'cms', title: 'Luma KO' })
  })

  it('each locale has its own text and no language falls back to another', async () => {
    // EN never approved: guests get nothing localized and the site keeps its built-in EN text.
    const en = await guestHome('en')
    expect(en.banners?.forma?.title ?? undefined).toBeUndefined()

    // A pending, unpublished KO edit must not go live when VI is published.
    const koPublicBefore = (await guestHome('ko')).banners.forma.title
    await saveDraft('ko', { banners: { forma: { title: 'KO pending, unpublished' } } })

    await publish('vi', {
      banners: {
        forma: { title: 'VI tiêu đề', tagline: 'VI mô tả', localeDesktopImage: released.id },
      },
    })
    const vi = await guestHome('vi')
    expect(vi.banners.forma.title).toBe('VI tiêu đề')
    expect((vi.banners.forma.localeDesktopImage as Media).id).toBe(released.id)
    // Shared (non-localized) settings published with VI are the same for every locale.
    expect(vi.banners.forma.visualType).toBe('fullBleed')
    const ko = await guestHome('ko')
    expect(koPublicBefore).toBeTruthy()
    expect(ko.banners.forma.title).toBe(koPublicBefore)
    expect(ko.banners.forma.title).not.toBe('KO pending, unpublished')
    expect(ko.banners.forma.localeDesktopImage ?? null).toBeNull()
  })

  it('translators may edit localized text but not images, visual type, CTA target or colours', async () => {
    await saveDraft(
      'en',
      {
        banners: {
          forma: {
            title: 'EN by translator',
            visualType: 'brandOptics',
            desktopImage: unreleased.id,
            ctaTarget: 'brand',
            theme: 'sheet',
          },
        },
      },
      translator,
    )
    const draft = await staffDraft('en')
    expect(draft.banners.forma.title).toBe('EN by translator')
    expect(draft.banners.forma.visualType).toBe('fullBleed')
    expect((draft.banners.forma.desktopImage as Media).id).toBe(released.id)
    expect(draft.banners.forma.ctaTarget).toBe('contact')
    expect(draft.banners.forma.theme).toBe('forma')
  })

  it('rejects values outside the presets (no free-form CSS or targets)', async () => {
    await expect(
      saveDraft('ko', { banners: { balm: { theme: 'url(javascript:alert(1))' } } }),
    ).rejects.toThrow()
    await expect(
      saveDraft('ko', { banners: { balm: { ctaTarget: 'https://evil.example' } } }),
    ).rejects.toThrow()
    await expect(
      saveDraft('ko', { banners: { balm: { imagePosition: '0 0; color:red' } } }),
    ).rejects.toThrow()
  })
})
