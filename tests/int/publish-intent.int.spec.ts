import { randomBytes } from 'crypto'
import { REST_PATCH } from '@payloadcms/next/routes'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { landingRevision } from '@/lib/landing-approval'
import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { Product, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// A save that says "draft" and "published" at once. Payload publishes when `_status` is
// 'published' even with draft=true, while the project guards treat draft=true as a draft save and
// skip the approval checks. Fixture: a product public in KO and VI with an approved landing page;
// its structure is changed in a VI draft and only VI approves it. The contradictory request must be
// refused before anything is written; a valid publish still works once every language approved.
type Loc = 'ko' | 'en' | 'vi'
let payload: Payload
let admin: User, editor: User
let productId: number
let token = ''
const password = () => randomBytes(16).toString('hex')
const editorPassword = password()

const read = (locale: Loc) =>
  payload.findByID({ collection: 'products', id: productId, locale, draft: true, depth: 0, overrideAccess: true }) as Promise<Product>
const save = (locale: Loc, data: Record<string, unknown>, draft = true) =>
  payload.update({ collection: 'products', id: productId, locale, draft, data: data as never, user: editor, overrideAccess: false })
/** What a visitor gets in that language (published + approved only). */
const guest = async (locale: Loc) =>
  (await payload.find({ collection: 'products', locale, fallbackLocale: false, where: { id: { equals: productId } }, depth: 0, overrideAccess: false, draft: false })).docs[0] as Product | undefined
const publicView = async (locale: Loc) => {
  const p = await guest(locale)
  return p ? { name: p.name, landing: (p.landing ?? []).map((b) => [b.blockType, (b as { tagline?: string }).tagline ?? null]) } : null
}
const rest = async (path: string, body: unknown) => {
  const res = await REST_PATCH(config)(
    new Request(`http://localhost:3021/api/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: path.split('?')[0].split('/') }) },
  )
  return { status: res.status, json: (await res.json()) as { errors?: { message?: string }[] } }
}
const versionCount = async () =>
  (await payload.countVersions({ collection: 'products', where: { parent: { equals: productId } }, overrideAccess: true })).totalDocs

let before: Record<'ko' | 'vi', unknown>
const NEW_ORDER = ['hero', 'band', 'cta']

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: password(), role: 'admin' }, overrideAccess: true })
  editor = await payload.create({ collection: 'users', data: { email: 'editor@test.local', password: editorPassword, role: 'editor' }, user: admin, overrideAccess: false })
  token = (await payload.login({ collection: 'users', data: { email: 'editor@test.local', password: editorPassword } })).token ?? ''

  // Product public in VI and KO …
  productId = (await payload.create({ collection: 'products', locale: 'vi', data: { name: '[MẪU] Sản phẩm VI', slug: 'int-publish-intent', translationStatus: 'approved', _status: 'published' } as never, overrideAccess: true })).id
  await payload.update({ collection: 'products', id: productId, locale: 'ko', draft: true, data: { name: '[샘플] 제품 KO' } as never, overrideAccess: true })
  await payload.update({ collection: 'products', id: productId, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
  await payload.update({ collection: 'products', id: productId, locale: 'ko', data: { _status: 'published' } as never, overrideAccess: true })
  // … with a landing page (hero + band) approved and published in both languages.
  await save('vi', { landing: [{ blockType: 'hero', tagline: '[MẪU] VI công khai' }, { blockType: 'band', alt: '[MẪU] ảnh' }] })
  const ko = await read('ko')
  await save('ko', { landing: ko.landing!.map((b) => (b.blockType === 'hero' ? { ...b, tagline: '[샘플] KO 공개' } : b)) })
  await save('vi', { translationStatus: 'approved' })
  await save('ko', { translationStatus: 'approved' })
  await save('vi', { _status: 'published' }, false)
  await save('ko', { _status: 'published' }, false)
  before = { ko: await publicView('ko'), vi: await publicView('vi') }
  expect(before.vi).toMatchObject({ landing: [['hero', '[MẪU] VI công khai'], ['band', null]] })
  expect(before.ko).toMatchObject({ landing: [['hero', '[샘플] KO 공개'], ['band', null]] })

  // Structure change in a VI draft (a CTA block added), then only VI approves it.
  const vi = await read('vi')
  await save('vi', { landing: [...vi.landing!.map((b) => (b.blockType === 'hero' ? { ...b, tagline: '[MẪU] VI nháp mới' } : b)), { blockType: 'cta' }] })
  await save('vi', { translationStatus: 'approved' })
  const rev = landingRevision((await read('vi')).landing)
  expect((await read('vi')).landingApprovals).toEqual({ vi: rev })
})

afterAll(async () => {
  await payload?.destroy?.()
})

const unchanged = async () => {
  expect(await publicView('ko')).toEqual(before.ko)
  expect(await publicView('vi')).toEqual(before.vi)
  const draft = await read('vi')
  expect(draft._status).toBe('draft')
  expect((draft.landing ?? []).map((b) => b.blockType)).toEqual(NEW_ORDER)
  expect((draft.landing ?? []).find((b) => b.blockType === 'hero')).toMatchObject({ tagline: '[MẪU] VI nháp mới' })
}

describe('draft=true together with _status "published" is refused before writing', () => {
  it('REST PATCH ?locale=vi&draft=true {_status: published} → 400; public KO/VI unchanged, VI draft kept', async () => {
    const versions = await versionCount()
    const res = await rest(`products/${productId}?locale=vi&draft=true`, { _status: 'published' })
    expect(res.status).toBe(400)
    expect(res.json.errors?.[0]?.message).toMatch(/mâu thuẫn/)
    expect(await versionCount()).toBe(versions)
    await unchanged()
  })

  it('REST with the full form data (as a client would send it) → 400 as well', async () => {
    const draft = await read('vi')
    const res = await rest(`products/${productId}?locale=vi&draft=true&depth=0`, { name: draft.name, landing: draft.landing, _status: 'published' })
    expect(res.status).toBe(400)
    await unchanged()
  })

  it('REST ?draft=true&publishSpecificLocale=vi {_status: published} → 400', async () => {
    const res = await rest(`products/${productId}?locale=vi&draft=true&publishSpecificLocale=vi`, { _status: 'published' })
    expect(res.status).toBe(400)
    await unchanged()
  })

  it('Local API update({ draft: true, data: { _status: published } }) → refused', async () => {
    await expect(save('vi', { _status: 'published' }, true)).rejects.toThrow(/mâu thuẫn/)
    await unchanged()
  })
})

describe('valid publishing still works', () => {
  it('a plain draft save still works (draft=true, _status draft)', async () => {
    const res = await rest(`products/${productId}?locale=vi&draft=true`, { _status: 'draft' })
    expect(res.status).toBe(200)
    await unchanged()
  })

  it('publishing VI while KO (public) has not approved the new structure is refused, as before', async () => {
    await expect(save('vi', { _status: 'published' }, false)).rejects.toThrow()
    await unchanged()
  })

  it('once KO approves the structure too, VI then KO publish; visitors get the new structure', async () => {
    await save('ko', { translationStatus: 'approved' })
    const res = await rest(`products/${productId}?locale=vi`, { _status: 'published' })
    expect(res.status).toBe(200)
    expect(await publicView('vi')).toEqual({ name: '[MẪU] Sản phẩm VI', landing: [['hero', '[MẪU] VI nháp mới'], ['band', null], ['cta', null]] })
    // KO public copy is untouched by the VI publish until KO is published itself.
    const ko = await publicView('ko')
    expect(ko?.name).toBe('[샘플] 제품 KO')
    await save('ko', { _status: 'published' }, false)
    expect((await publicView('ko'))?.landing).toEqual([['hero', '[샘플] KO 공개'], ['band', null], ['cta', null]])
  })
})
