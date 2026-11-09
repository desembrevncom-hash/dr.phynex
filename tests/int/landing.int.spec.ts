import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import { landingRevision } from '@/lib/landing-approval'
import type { Product, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// Product landing blocks on the disposable *_test database: shared structure vs per-language text,
// who may change what, structure approval across languages, and what visitors receive.
type Loc = 'ko' | 'en' | 'vi'
let payload: Payload
let admin: User, editor: User, translator: User
let productId: number
let privateImage: number
const password = () => randomBytes(16).toString('hex')

const read = (locale: Loc, draft = true) =>
  payload.findByID({ collection: 'products', id: productId, locale, draft, depth: 0, overrideAccess: true }) as Promise<Product>
const save = (user: User, locale: Loc, data: Record<string, unknown>, draft = true) =>
  payload.update({ collection: 'products', id: productId, locale, draft, data: data as never, user, overrideAccess: false })
const approve = (locale: Loc) => save(editor, locale, { translationStatus: 'approved' })
const publish = (locale: Loc, data: Record<string, unknown> = {}) => save(editor, locale, { ...data, _status: 'published' }, false)
/** What a visitor gets in that language (published + approved only). */
const guest = async (locale: Loc) =>
  (await payload.find({ collection: 'products', locale, where: { id: { equals: productId } }, depth: 0, overrideAccess: false, draft: false })).docs[0] as Product | undefined
const order = (p?: Product) => (p?.landing ?? []).map((b) => b.blockType)
const approvalsOf = async () => ((await read('vi')).landingApprovals ?? {}) as Record<string, string>

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: password(), role: 'admin' }, overrideAccess: true })
  editor = await payload.create({ collection: 'users', data: { email: 'editor@test.local', password: password(), role: 'editor' }, user: admin, overrideAccess: false })
  translator = await payload.create({ collection: 'users', data: { email: 'translator@test.local', password: password(), role: 'translator' }, user: admin, overrideAccess: false })
  const data = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#cccccc' } }).png().toBuffer()
  privateImage = (await payload.create({ collection: 'media', locale: 'ko', data: { alt: 'private' }, file: { data, mimetype: 'image/png', name: 'private.png', size: data.length }, overrideAccess: true })).id
  // A product already public in VI and KO, without a landing page (as all products today).
  productId = (await payload.create({ collection: 'products', locale: 'vi', data: { name: '[MẪU] Landing VI', slug: 'int-landing', translationStatus: 'approved', _status: 'published' } as never, overrideAccess: true })).id
  await payload.update({ collection: 'products', id: productId, locale: 'ko', draft: true, data: { name: '[샘플] Landing KO' } as never, overrideAccess: true })
  await payload.update({ collection: 'products', id: productId, locale: 'ko', draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
  await payload.update({ collection: 'products', id: productId, locale: 'ko', data: { _status: 'published' } as never, overrideAccess: true })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('landing page: adding it to a public product follows the workflow', () => {
  it('a landing page cannot be published in the same request that adds it', async () => {
    await expect(publish('vi', { landing: [{ blockType: 'hero', tagline: 'x' }] })).rejects.toThrow(/bản nháp/)
    expect(order(await guest('vi'))).toEqual([])
  })

  it('draft → approve VI and KO for that structure → publish: guests in both languages get it', async () => {
    await save(editor, 'vi', { landing: [{ blockType: 'hero', tagline: 'Câu duyệt' }, { blockType: 'band', image: privateImage, alt: 'Ảnh' }] })
    expect(await approvalsOf()).toEqual({})
    // KO texts for the same blocks (texts only: no structure change, KO back to In review).
    const ko = await read('ko')
    await save(editor, 'ko', { landing: ko.landing!.map((b) => (b.blockType === 'hero' ? { ...b, tagline: '승인 문구' } : b)) })
    await approve('vi')
    await approve('ko')
    const rev = landingRevision((await read('vi')).landing)
    expect(await approvalsOf()).toEqual({ vi: rev, ko: rev })
    await publish('vi')
    await publish('ko')
    expect(order(await guest('vi'))).toEqual(['hero', 'band'])
    expect(order(await guest('ko'))).toEqual(['hero', 'band'])
  })
})

describe('shared structure approval (regression: KO public, reorder, only VI approved and published)', () => {
  it('reordering clears the approval of every language', async () => {
    const vi = await read('vi')
    await save(editor, 'vi', { landing: [...vi.landing!].reverse() })
    expect(await approvalsOf()).toEqual({})
    expect((await read('vi')).translationStatus).toBe('in-review')
  })

  it('approving only VI and publishing VI is refused while KO is public; guests keep the old layout', async () => {
    await approve('vi')
    await expect(publish('vi')).rejects.toThrow(/khách đang thấy ở KO/)
    expect(order(await guest('ko'))).toEqual(['hero', 'band'])
    expect(order(await guest('vi'))).toEqual(['hero', 'band'])
    expect(((await guest('ko'))?.landing?.[0] as { tagline?: string }).tagline).toBe('승인 문구')
  })

  it('after KO also approves exactly the new structure, publishing VI succeeds', async () => {
    await approve('ko')
    const rev = landingRevision((await read('vi')).landing)
    expect(await approvalsOf()).toEqual({ vi: rev, ko: rev })
    // What the Admin overview shows (virtual, computed on read from the saved draft).
    expect((await read('vi')).landingApprovalState).toEqual({ ko: true, en: false, vi: true })
    await publish('vi')
    expect(order(await guest('vi'))).toEqual(['band', 'hero'])
    expect(order(await guest('ko'))).toEqual(['band', 'hero'])
  })

  it('re-publishing with the same content and structure (as the Admin form sends it) still works', async () => {
    const vi = await read('vi')
    await publish('vi', { landing: vi.landing, translationStatus: 'approved' })
    await publish('ko')
    expect((await read('vi', false))._status).toBe('published')
  })
})

describe('text-only change in one language', () => {
  it('editing VI text only re-opens VI; KO keeps its approval and public text', async () => {
    const vi = await read('vi')
    await save(translator, 'vi', { landing: vi.landing!.map((b) => (b.blockType === 'hero' ? { ...b, tagline: 'Câu VI mới' } : b)) })
    const rev = landingRevision((await read('vi')).landing)
    expect((await read('vi')).translationStatus).toBe('in-review')
    expect(await approvalsOf()).toEqual({ ko: rev })
    expect((await read('ko')).landingApprovalState).toEqual({ ko: true, en: false, vi: false })
    await expect(publish('vi')).rejects.toThrow(/chưa được duyệt cho VI|Hãy lưu bản nháp/)
    await approve('vi')
    await publish('vi') // no KO re-approval needed: the structure did not change
    const heroVi = (await guest('vi'))?.landing?.find((b) => b.blockType === 'hero') as { tagline?: string }
    const heroKo = (await guest('ko'))?.landing?.find((b) => b.blockType === 'hero') as { tagline?: string }
    expect(heroVi.tagline).toBe('Câu VI mới')
    expect(heroKo.tagline).toBe('승인 문구')
  })
})

describe('a language never published', () => {
  it('stays a draft until approved on its own; its first publish needs only its own approval', async () => {
    await save(editor, 'en', { name: '[SAMPLE] Landing EN' })
    await expect(publish('en')).rejects.toThrow()
    expect(await guest('en')).toBeUndefined()
    await approve('en')
    await publish('en')
    expect(order(await guest('en'))).toEqual(['band', 'hero'])
  })
})

describe('who may change what', () => {
  it('a translator may NOT add, remove or reorder blocks; editor-only fields ignore their values', async () => {
    const vi = await read('vi')
    await expect(save(translator, 'vi', { landing: [...vi.landing!, { blockType: 'cta' }] })).rejects.toThrow(/Chỉ biên tập viên/)
    await expect(save(translator, 'vi', { landing: [...vi.landing!].reverse() })).rejects.toThrow(/Chỉ biên tập viên/)
    await save(translator, 'vi', { landing: vi.landing!.map((b, i) => (i === 0 ? { ...b, hidden: true } : b)) })
    const after = await read('vi')
    expect(order(after)).toEqual(['band', 'hero'])
    expect(after.landing?.[0].hidden ?? false).toBe(false)
  })

  it('landingApprovals is server-owned: a client value is replaced', async () => {
    await save(editor, 'vi', { landingApprovals: { ko: 'f'.repeat(64), vi: 'f'.repeat(64), en: 'f'.repeat(64) } })
    const stored = await approvalsOf()
    expect(Object.values(stored)).not.toContain('f'.repeat(64))
  })

  it('visitors never receive a private image inside a block', async () => {
    const g = await guest('vi')
    const band = g?.landing?.find((b) => b.blockType === 'band') as { image?: unknown }
    expect(typeof band.image === 'object' && band.image !== null).toBe(false)
    const staff = await payload.find({ collection: 'products', locale: 'vi', where: { id: { equals: productId } }, depth: 1, overrideAccess: false, user: editor, draft: true })
    expect((staff.docs[0].landing?.find((b) => b.blockType === 'band') as { image?: { url?: string } }).image?.url).toBeTruthy()
  })
})

describe('Admin stale-data check after a draft save', () => {
  it('the saved draft read back has the updatedAt the save returned (no "modified by another user" after own save)', async () => {
    const saved = await save(editor, 'vi', { editorialNote: 'kiểm tra lưu nháp' })
    const readBack = await payload.findByID({ collection: 'products', id: productId, locale: 'vi', draft: true, depth: 0, user: editor, overrideAccess: false, select: { updatedAt: true } })
    expect(readBack.updatedAt).toBe(saved.updatedAt)
  })
})
