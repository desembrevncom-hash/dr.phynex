import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/preview', () => ({ getPreviewUser: async () => null }))

import { withVisitorRelations } from '@/lib/guest-relations'
import { asGuestView } from '@/lib/guest-view'
import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { Product, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// "Xem như khách" in the landing builder must show the related documents of a product (product line,
// product types, key ingredients, technologies, ingredients picked in a landing block) exactly as the
// public page does: published and approved in the language viewed, nothing else. Three fixture
// products, all public in VI with a published landing page, each linked to documents in one state:
//   draft     → the linked documents were never published
//   ko-only   → published and approved in KO only (VI is a draft)
//   vi-public → published and approved in VI
// For each: guest view of the staff draft read === the public page read (names, slugs, images = links).
type Loc = 'ko' | 'en' | 'vi'
type State = 'draft' | 'ko-only' | 'vi-public'
const states: State[] = ['draft', 'ko-only', 'vi-public']
let payload: Payload
let admin: User, editor: User
const products: Record<State, number> = {} as never
const password = () => randomBytes(16).toString('hex')

/** Create a document in the given state (VI is the language viewed). */
async function linked(collection: 'product-lines' | 'product-categories' | 'ingredients' | 'technologies', state: State, extra: Record<string, unknown>) {
  const slug = `int-gr-${collection}-${state}`
  const name = (l: Loc) => `[MẪU] ${collection} ${state} ${l.toUpperCase()}`
  const publicLocale: Loc | null = state === 'ko-only' ? 'ko' : state === 'vi-public' ? 'vi' : null
  const first: Loc = publicLocale ?? 'vi'
  const { id } = await payload.create({
    collection,
    locale: first,
    data: { name: name(first), slug, ...extra, ...(publicLocale ? { translationStatus: 'approved', _status: 'published' } : {}) } as never,
    draft: !publicLocale,
    overrideAccess: true,
  })
  // A VI text also exists as a draft when VI is not the public language.
  if (state === 'ko-only') await payload.update({ collection, id, locale: 'vi', draft: true, data: { name: name('vi') } as never, overrideAccess: true })
  return id
}

const media = (m: unknown) => (m && typeof m === 'object' ? ((m as { url?: string }).url ?? null) : null)
const doc = (d: unknown) => {
  if (!d || typeof d !== 'object') return null
  const o = d as Record<string, unknown>
  return { id: o.id, name: o.name, slug: o.slug, image: media(o.image ?? o.heroImage) }
}
const list = (v: unknown) => (Array.isArray(v) ? v.map(doc).filter(Boolean) : [])
/** What the page shows from the related documents: breadcrumb/JSON-LD line, types, ingredients, technologies. */
const shown = (p: Product) => ({
  line: doc(p.line),
  categories: list(p.categories),
  keyIngredients: list(p.keyIngredients),
  technologies: list(p.technologies),
  landingIngredients: (p.landing ?? []).flatMap((b) => (b.blockType === 'ingredients' ? (b.items ?? []).map((i) => doc(i.ingredient)).filter(Boolean) : [])),
})

/** Public page read (lib/content.ts guest read of findPublicBySlug: no user, published, depth 2). */
const publicPage = async (id: number, locale: Loc) =>
  (await payload.find({ collection: 'products', locale, fallbackLocale: false, overrideAccess: false, draft: false, depth: 2, where: { id: { equals: id } } })).docs[0] as Product | undefined
/** Staff draft preview read (same arguments as lib/content.ts for a signed-in editor). */
const staffRead = async (id: number, locale: Loc) =>
  (await payload.find({ collection: 'products', locale, fallbackLocale: false, overrideAccess: false, draft: true, user: editor, depth: 2, where: { id: { equals: id } } })).docs[0] as Product

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: password(), role: 'admin' }, overrideAccess: true })
  editor = await payload.create({ collection: 'users', data: { email: 'editor@test.local', password: password(), role: 'editor' }, user: admin, overrideAccess: false })
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#cccccc' } }).png().toBuffer()
  const image = async (name: string) =>
    (await payload.create({ collection: 'media', locale: 'vi', data: { alt: name, publicRelease: true }, file: { data: png, mimetype: 'image/png', name: `${name}.png`, size: png.length }, overrideAccess: true })).id

  for (const state of states) {
    const line = await linked('product-lines', state, { heroImage: await image(`line-${state}`) })
    const category = await linked('product-categories', state, {})
    const ingredient = await linked('ingredients', state, { image: await image(`ing-${state}`) })
    const technology = await linked('technologies', state, { image: await image(`tech-${state}`) })
    // Fixture product, public in VI, linked to those documents.
    const id = (
      await payload.create({
        collection: 'products',
        locale: 'vi',
        data: { name: `[MẪU] Sản phẩm ${state}`, slug: `int-gr-product-${state}`, line, categories: [category], keyIngredients: [ingredient], technologies: [technology], translationStatus: 'approved', _status: 'published' } as never,
        overrideAccess: true,
      })
    ).id
    // Landing page with an ingredients block picking the same ingredient: draft → approve VI → publish VI.
    await payload.update({ collection: 'products', id, locale: 'vi', draft: true, data: { landing: [{ blockType: 'hero', tagline: '[MẪU] hero' }, { blockType: 'ingredients', items: [{ ingredient }] }] } as never, user: editor, overrideAccess: false })
    await payload.update({ collection: 'products', id, locale: 'vi', draft: true, data: { translationStatus: 'approved' } as never, user: editor, overrideAccess: false })
    await payload.update({ collection: 'products', id, locale: 'vi', data: { _status: 'published' } as never, user: editor, overrideAccess: false })
    products[state] = id
  }
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('Xem như khách: related documents read like the public page (VI)', () => {
  for (const state of states) {
    it(`${state}: guest view shows exactly what the public page shows`, async () => {
      const pub = await publicPage(products[state], 'vi')
      expect(pub, 'fixture product is public in VI').toBeDefined()
      expect(pub!.landing?.map((b) => b.blockType)).toEqual(['hero', 'ingredients'])
      const guest = await withVisitorRelations(asGuestView(await staffRead(products[state], 'vi')), 'vi')
      expect(shown(guest)).toEqual(shown(pub!))
    })
  }

  it('draft links: nothing from them in guest view (no line in breadcrumb, no type, ingredient or technology)', async () => {
    const guest = await withVisitorRelations(asGuestView(await staffRead(products.draft, 'vi')), 'vi')
    expect(shown(guest)).toEqual({ line: null, categories: [], keyIngredients: [], technologies: [], landingIngredients: [] })
  })

  it('links public only in KO: nothing from them in the VI guest view (no KO text, no fallback)', async () => {
    const guest = await withVisitorRelations(asGuestView(await staffRead(products['ko-only'], 'vi')), 'vi')
    expect(shown(guest)).toEqual({ line: null, categories: [], keyIngredients: [], technologies: [], landingIngredients: [] })
    // Not vacuous: the same documents are public for KO visitors, and not for VI visitors.
    for (const collection of ['product-lines', 'product-categories', 'ingredients', 'technologies'] as const) {
      const where = { slug: { equals: `int-gr-${collection}-ko-only` } }
      const visitor = (locale: Loc) => payload.count({ collection, locale, where, overrideAccess: false })
      expect((await visitor('ko')).totalDocs, `${collection} public in KO`).toBe(1)
      expect((await visitor('vi')).totalDocs, `${collection} not public in VI`).toBe(0)
    }
  })

  it('links public in VI: names, slugs (links) and released images are shown', async () => {
    const s = shown(await withVisitorRelations(asGuestView(await staffRead(products['vi-public'], 'vi')), 'vi'))
    expect(s.line).toMatchObject({ name: '[MẪU] product-lines vi-public VI', slug: 'int-gr-product-lines-vi-public' })
    expect(s.line?.image).toMatch(/line-vi-public/)
    expect(s.categories).toMatchObject([{ name: '[MẪU] product-categories vi-public VI' }])
    expect(s.keyIngredients).toMatchObject([{ name: '[MẪU] ingredients vi-public VI', slug: 'int-gr-ingredients-vi-public' }])
    expect(s.keyIngredients[0]?.image).toMatch(/ing-vi-public/)
    expect(s.technologies).toMatchObject([{ name: '[MẪU] technologies vi-public VI' }])
    expect(s.technologies[0]?.image).toMatch(/tech-vi-public/)
    expect(s.landingIngredients).toMatchObject([{ name: '[MẪU] ingredients vi-public VI' }])
  })

  it('staff view keeps showing draft and other-language links (permissions unchanged)', async () => {
    const draft = shown(await staffRead(products.draft, 'vi'))
    expect(draft.line).toMatchObject({ name: '[MẪU] product-lines draft VI' })
    expect(draft.keyIngredients).toMatchObject([{ name: '[MẪU] ingredients draft VI' }])
    expect(draft.landingIngredients).toMatchObject([{ name: '[MẪU] ingredients draft VI' }])
    const koOnly = shown(await staffRead(products['ko-only'], 'vi'))
    expect(koOnly.line).toMatchObject({ name: '[MẪU] product-lines ko-only VI' })
    expect(koOnly.technologies).toMatchObject([{ name: '[MẪU] technologies ko-only VI' }])
  })
})
