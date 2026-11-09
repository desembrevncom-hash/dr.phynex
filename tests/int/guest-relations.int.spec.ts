import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const preview = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/preview', () => ({ getPreviewUser: async () => preview.user }))

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { internalHref, RichText } from '@/components/ui/RichText'
import { findGuestGlobal, findPublicGlobal } from '@/lib/content'
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
type Lex = { type?: string; text?: string; fields?: { linkType?: string; doc?: { relationTo?: string; value?: unknown } }; children?: Lex[] }
const textOf = (n: Lex): string => n.text ?? (n.children ?? []).map(textOf).join('')
/** Internal links of a rich text field as the page renders them: words + href (null = shown without a link). */
const richLinks = (value: unknown) => {
  const out: { text: string; href: string | null }[] = []
  const walk = (n?: Lex) => {
    if (!n) return
    if (n.type === 'link' && n.fields?.linkType === 'internal') out.push({ text: textOf(n), href: internalHref(n.fields.doc as never, 'vi') })
    for (const c of n.children ?? []) walk(c)
  }
  walk((value as { root?: Lex } | null)?.root)
  return out
}
const textNode = (text: string) => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
/** Lexical rich text: one paragraph "Xem <link>" per target, internal links to CMS documents. */
const richText = (links: { relationTo: string; value: number; text: string }[]) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: links.map((l) => ({
      type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, textStyle: '',
      children: [
        textNode('Xem '),
        {
          type: 'link', format: '', indent: 0, version: 3, direction: 'ltr',
          fields: { linkType: 'internal', newTab: false, doc: { relationTo: l.relationTo, value: l.value } },
          children: [textNode(l.text)],
        },
      ],
    })),
  },
})
/** What the page shows from the related documents: breadcrumb/JSON-LD line, types, ingredients, technologies. */
const shown = (p: Product) => ({
  line: doc(p.line),
  categories: list(p.categories),
  keyIngredients: list(p.keyIngredients),
  technologies: list(p.technologies),
  landingIngredients: (p.landing ?? []).flatMap((b) => (b.blockType === 'ingredients' ? (b.items ?? []).map((i) => doc(i.ingredient)).filter(Boolean) : [])),
  howToUseLinks: richLinks(p.howToUse),
  cautionsLinks: richLinks(p.cautions),
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
        data: {
          name: `[MẪU] Sản phẩm ${state}`,
          slug: `int-gr-product-${state}`,
          line,
          categories: [category],
          keyIngredients: [ingredient],
          technologies: [technology],
          // Rich text links to the documents in this state (words stay; a link only when public in VI).
          howToUse: richText([{ relationTo: 'ingredients', value: ingredient, text: `thành phần ${state}` }]),
          cautions: richText([
            { relationTo: 'product-lines', value: line, text: `dòng ${state}` },
            { relationTo: 'technologies', value: technology, text: `công nghệ ${state}` },
          ]),
          translationStatus: 'approved',
          _status: 'published',
        } as never,
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
    expect(shown(guest)).toMatchObject({ line: null, categories: [], keyIngredients: [], technologies: [], landingIngredients: [] })
  })

  it('links public only in KO: nothing from them in the VI guest view (no KO text, no fallback)', async () => {
    const guest = await withVisitorRelations(asGuestView(await staffRead(products['ko-only'], 'vi')), 'vi')
    expect(shown(guest)).toMatchObject({ line: null, categories: [], keyIngredients: [], technologies: [], landingIngredients: [] })
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

describe('Xem như khách: CMS links in "Cách dùng" and "Lưu ý" (VI)', () => {
  const render = (value: unknown) => renderToStaticMarkup(createElement(RichText, { data: value, locale: 'vi' }))

  it('draft and KO-only targets: the words stay, the link is dropped (same as the public page)', async () => {
    for (const state of ['draft', 'ko-only'] as const) {
      const guest = await withVisitorRelations(asGuestView(await staffRead(products[state], 'vi')), 'vi')
      expect(richLinks(guest.howToUse)).toEqual([{ text: `thành phần ${state}`, href: null }])
      expect(richLinks(guest.cautions)).toEqual([
        { text: `dòng ${state}`, href: null },
        { text: `công nghệ ${state}`, href: null },
      ])
      const html = render(guest.howToUse) + render(guest.cautions)
      expect(html).toContain(`thành phần ${state}`)
      expect(html).toContain(`công nghệ ${state}`)
      expect(html).not.toContain('<a ')
      const pub = (await publicPage(products[state], 'vi'))!
      expect(render(pub.howToUse) + render(pub.cautions)).toBe(html)
    }
  })

  it('targets public in VI: links work and point at the VI page', async () => {
    const guest = await withVisitorRelations(asGuestView(await staffRead(products['vi-public'], 'vi')), 'vi')
    expect(richLinks(guest.howToUse)).toEqual([{ text: 'thành phần vi-public', href: '/vi/ingredients/int-gr-ingredients-vi-public' }])
    expect(richLinks(guest.cautions)).toEqual([
      { text: 'dòng vi-public', href: '/vi/products/line/int-gr-product-lines-vi-public' },
      { text: 'công nghệ vi-public', href: '/vi/technologies/int-gr-technologies-vi-public' },
    ])
    const html = render(guest.howToUse) + render(guest.cautions)
    expect(html).toContain('href="/vi/ingredients/int-gr-ingredients-vi-public"')
    const pub = (await publicPage(products['vi-public'], 'vi'))!
    expect(render(pub.howToUse) + render(pub.cautions)).toBe(html)
  })

  it('staff view still links to the draft and KO-only targets', async () => {
    expect(richLinks((await staffRead(products.draft, 'vi')).howToUse)).toEqual([
      { text: 'thành phần draft', href: '/vi/ingredients/int-gr-ingredients-draft' },
    ])
    expect(richLinks((await staffRead(products['ko-only'], 'vi')).cautions)[0]).toEqual({
      text: 'dòng ko-only',
      href: '/vi/products/line/int-gr-product-lines-ko-only',
    })
  })
})

describe('Xem như khách: footer contact (Site settings) read with the visitor permissions', () => {
  const PUBLIC_HOTLINE = '+82 10-1111-1111 [MẪU công khai]'
  const DRAFT_HOTLINE = '+82 10-2222-2222 [MẪU nháp]'
  beforeAll(async () => {
    await payload.updateGlobal({
      slug: 'site-settings',
      locale: 'vi',
      data: { contact: { phone: PUBLIC_HOTLINE, address: '[MẪU] Địa chỉ' }, translationStatus: 'approved', _status: 'published' } as never,
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'site-settings',
      locale: 'vi',
      draft: true,
      data: { contact: { phone: DRAFT_HOTLINE, address: '[MẪU] Địa chỉ' } } as never,
      user: editor,
      overrideAccess: false,
    })
  })

  it('guest view (PageShell guestView → findGuestGlobal) shows the public hotline; staff view the draft one', async () => {
    preview.user = null
    expect((await findGuestGlobal('site-settings', 'vi'))?.contact?.phone).toBe(PUBLIC_HOTLINE)
    // The public page itself (no preview user) shows the same hotline.
    expect((await findPublicGlobal('site-settings', 'vi'))?.contact?.phone).toBe(PUBLIC_HOTLINE)
    // Staff preview (signed-in editor): the draft hotline, as before; guest view still the public one.
    preview.user = editor
    try {
      expect((await findPublicGlobal('site-settings', 'vi'))?.contact?.phone).toBe(DRAFT_HOTLINE)
      expect((await findGuestGlobal('site-settings', 'vi'))?.contact?.phone).toBe(PUBLIC_HOTLINE)
    } finally {
      preview.user = null
    }
  })
})
