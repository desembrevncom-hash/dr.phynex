import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { Product, User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

// Product landing blocks on the disposable *_test database: shared structure vs per-language text,
// who may change what, approval, and what visitors receive.
let payload: Payload
let admin: User, editor: User, translator: User
let productId: number
let privateImage: number
const password = () => randomBytes(16).toString('hex')

const read = (locale: 'vi' | 'ko', draft = true) =>
  payload.findByID({ collection: 'products', id: productId, locale, draft, depth: 0, overrideAccess: true }) as Promise<Product>
const save = (user: User, locale: 'vi' | 'ko', data: Record<string, unknown>, draft = true) =>
  payload.update({ collection: 'products', id: productId, locale, draft, data: data as never, user, overrideAccess: false })

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
  // Published + approved in vi, with a landing page.
  const created = await payload.create({
    collection: 'products',
    locale: 'vi',
    data: {
      name: '[MẪU] Landing',
      slug: 'int-landing',
      translationStatus: 'approved',
      _status: 'published',
      landing: [
        { blockType: 'hero', tagline: 'Câu duyệt' },
        { blockType: 'band', image: privateImage, alt: 'Ảnh' },
      ],
    } as never,
    overrideAccess: true,
  })
  productId = created.id
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('landing page blocks', () => {
  it('structure is shared by every language, texts are per language', async () => {
    const vi = await read('vi')
    const ko = await read('ko')
    expect(vi.landing?.map((b) => b.blockType)).toEqual(['hero', 'band'])
    expect(ko.landing?.map((b) => b.id)).toEqual(vi.landing?.map((b) => b.id))
    expect((vi.landing?.[0] as { tagline?: string }).tagline).toBe('Câu duyệt')
    expect((ko.landing?.[0] as { tagline?: string | null }).tagline ?? null).toBeNull()
  })

  it('a translator may edit the texts of a block; the language goes back to In review', async () => {
    const vi = await read('vi')
    const landing = vi.landing!.map((b) => (b.blockType === 'hero' ? { ...b, tagline: 'Câu đã sửa' } : b))
    await save(translator, 'vi', { landing })
    const after = await read('vi')
    expect((after.landing?.[0] as { tagline?: string }).tagline).toBe('Câu đã sửa')
    expect(after.translationStatus).toBe('in-review')
  })

  it('a translator may NOT add, remove, reorder or hide blocks (shared structure)', async () => {
    const vi = await read('vi')
    await expect(save(translator, 'vi', { landing: [...vi.landing!, { blockType: 'cta' }] })).rejects.toThrow(/Chỉ biên tập viên/)
    await expect(save(translator, 'vi', { landing: [...vi.landing!].reverse() })).rejects.toThrow(/Chỉ biên tập viên/)
    // "hidden", images, tone and layout options are editor-only fields: Payload drops a translator's
    // value for them (field access), so the block is not hidden.
    await save(translator, 'vi', { landing: vi.landing!.map((b, i) => (i === 1 ? { ...b, hidden: true } : b)) })
    const after = await read('vi')
    expect(after.landing?.map((b) => b.blockType)).toEqual(['hero', 'band'])
    expect(after.landing?.[1].hidden ?? false).toBe(false)
  })

  it('an editor may change the structure; it is a content change for approval', async () => {
    await save(editor, 'vi', { translationStatus: 'approved' })
    expect((await read('vi')).translationStatus).toBe('approved')
    const vi = await read('vi')
    await save(editor, 'vi', { landing: [...vi.landing!].reverse() })
    const after = await read('vi')
    expect(after.landing?.map((b) => b.blockType)).toEqual(['band', 'hero'])
    expect(after.translationStatus).toBe('in-review')
    // Publishing a changed landing without saving the draft first is refused (as for other content).
    await expect(save(editor, 'vi', { landing: [...after.landing!].reverse(), _status: 'published' }, false)).rejects.toThrow(/bản nháp/)
  })

  it('re-publishing with the same landing data (as the Admin form sends it) is not mistaken for a change', async () => {
    await save(editor, 'vi', { translationStatus: 'approved' })
    const vi = await read('vi')
    await save(editor, 'vi', { landing: vi.landing, translationStatus: 'approved', _status: 'published' }, false)
    const pub = await read('vi', false)
    expect(pub._status).toBe('published')
    expect(pub.landing?.map((b) => b.blockType)).toEqual(['band', 'hero'])
  })

  it('visitors never receive a private image inside a block', async () => {
    const guest = await payload.find({ collection: 'products', locale: 'vi', where: { slug: { equals: 'int-landing' } }, depth: 1, overrideAccess: false, draft: false })
    const band = guest.docs[0].landing?.find((b) => b.blockType === 'band') as { image?: unknown }
    expect(typeof band.image === 'object' && band.image !== null).toBe(false) // id only, not the file
    const staff = await payload.find({ collection: 'products', locale: 'vi', where: { slug: { equals: 'int-landing' } }, depth: 1, overrideAccess: false, user: editor, draft: true })
    const staffBand = staff.docs[0].landing?.find((b) => b.blockType === 'band') as { image?: { url?: string } }
    expect(staffBand.image?.url).toBeTruthy()
  })
})
