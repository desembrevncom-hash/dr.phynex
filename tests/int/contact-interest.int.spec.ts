import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Contact flow from a product page against the disposable *_test database: the product of interest
// is kept only when the visitor may see that product, repeats are not stored twice, submissions
// stay admin-only, and no email is sent (no notification address is configured in tests).
const { preview } = vi.hoisted(() => ({ preview: { user: null as unknown } }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '198.51.100.7' }) }))
vi.mock('@/lib/preview', () => ({ getPreviewUser: async () => preview.user }))
vi.mock('@/lib/rate-limit', () => ({ clientIp: () => '198.51.100.7', rateLimitKey: () => 'k', sharedRateLimited: async () => false }))

import { submitContact } from '@/app/(frontend)/[locale]/actions'
import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import { assertDisposableDatabase } from '../helpers/database'

let payload: Payload
let admin: User
const password = () => randomBytes(16).toString('hex')

const form = (extra: Record<string, string> = {}) => {
  const f = new FormData()
  const values = { name: 'Khách thử', email: 'guest@example.invalid', message: 'Tôi muốn hỏi giá và cách mua.', consent: 'on', locale: 'vi', topic: 'product', ...extra }
  for (const [k, v] of Object.entries(values)) f.set(k, v)
  return f
}
const stored = async () =>
  (await payload.find({ collection: 'contact-submissions', overrideAccess: true, sort: '-createdAt', limit: 100, depth: 0 })).docs

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  delete process.env.FORM_NOTIFY_TO
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  admin = await payload.create({ collection: 'users', data: { email: 'admin@test.local', password: password(), role: 'admin' }, overrideAccess: true })
  // One product published + approved in vi, one only a draft.
  await payload.create({
    collection: 'products',
    locale: 'vi',
    data: { name: '[MẪU] Sản phẩm công khai', slug: 'int-public', translationStatus: 'approved', _status: 'published', editorialNote: 'nội bộ' } as never,
    overrideAccess: true,
  })
  await payload.create({
    collection: 'products',
    locale: 'vi',
    draft: true,
    data: { name: '[MẪU] Tên nháp bí mật', slug: 'int-draft', translationStatus: 'ai-draft', _status: 'draft' } as never,
    overrideAccess: true,
  })
})

afterAll(async () => {
  await payload?.destroy?.()
})

beforeEach(async () => {
  preview.user = null
  await payload.delete({ collection: 'contact-submissions', where: { id: { exists: true } }, overrideAccess: true })
})

describe('contact from a product page', () => {
  it('guest + published product: stored once, product line first, message unchanged', async () => {
    const sendEmail = vi.spyOn(payload, 'sendEmail')
    const r = await submitContact({ status: 'idle' }, form({ product: 'int-public' }))
    expect(r.status).toBe('success')
    expect(r.leadId).toBeTruthy()
    const [doc, ...rest] = await stored()
    expect(rest).toHaveLength(0)
    expect(doc.message).toBe('Sản phẩm quan tâm: [MẪU] Sản phẩm công khai (/products/int-public)\n\nTôi muốn hỏi giá và cách mua.')
    expect(doc).toMatchObject({ topic: 'product', locale: 'vi', status: 'new', consent: true })
    expect(sendEmail).not.toHaveBeenCalled()
    sendEmail.mockRestore()
  })

  it('guest + draft product: the draft name never reaches the record', async () => {
    await submitContact({ status: 'idle' }, form({ product: 'int-draft' }))
    const [doc] = await stored()
    expect(doc.message).toBe('Tôi muốn hỏi giá và cách mua.')
    expect(JSON.stringify(doc)).not.toContain('bí mật')
  })

  it('staff in draft preview may test with a draft product', async () => {
    preview.user = admin
    await submitContact({ status: 'idle' }, form({ product: 'int-draft' }))
    const [doc] = await stored()
    expect(doc.message.startsWith('Sản phẩm quan tâm: [MẪU] Tên nháp bí mật (/products/int-draft)')).toBe(true)
  })

  it('a repeated click / resubmit of the same message is stored once and counted once', async () => {
    const a = await submitContact({ status: 'idle' }, form({ product: 'int-public' }))
    const b = await submitContact({ status: 'idle' }, form({ product: 'int-public' }))
    expect(a.leadId).toBeTruthy()
    expect(b).toEqual({ status: 'success' })
    expect(await stored()).toHaveLength(1)
    // A different message, or another email, is a new request.
    await submitContact({ status: 'idle' }, form({ product: 'int-public', message: 'Câu hỏi khác' }))
    await submitContact({ status: 'idle' }, form({ product: 'int-public', email: 'other@example.invalid' }))
    expect(await stored()).toHaveLength(3)
  })

  it('missing required fields: nothing stored, errors per field', async () => {
    const r = await submitContact({ status: 'idle' }, form({ name: '', email: 'x', message: '', consent: '' , product: 'int-public'}))
    expect(r).toMatchObject({ status: 'error', code: 'invalid', errors: { name: 'required', email: 'email', message: 'required' } })
    expect(await stored()).toHaveLength(0)
  })
})

describe('access rules are unchanged', () => {
  it('submissions are not readable or creatable without an admin', async () => {
    await submitContact({ status: 'idle' }, form())
    await expect(payload.find({ collection: 'contact-submissions', overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.create({ collection: 'contact-submissions', overrideAccess: false, data: { name: 'x', email: 'x@example.invalid', message: 'x', consent: true } }),
    ).rejects.toThrow()
    expect((await payload.find({ collection: 'contact-submissions', overrideAccess: false, user: admin })).totalDocs).toBe(1)
  })

  it('guests read only the published product, without the staff-only editorial note', async () => {
    const guest = await payload.find({ collection: 'products', locale: 'vi', overrideAccess: false, draft: false, limit: 10 })
    expect(guest.docs.map((d) => d.slug)).toEqual(['int-public'])
    expect(guest.docs[0].editorialNote).toBeUndefined()
  })
})
