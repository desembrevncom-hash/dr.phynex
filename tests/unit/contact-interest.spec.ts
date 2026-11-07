import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '203.0.113.9' }) }))
const { create, find, findPublicBySlug } = vi.hoisted(() => ({
  create: vi.fn(async () => ({ id: 1 })),
  find: vi.fn(async (_args?: unknown) => ({ docs: [] as unknown[] })),
  findPublicBySlug: vi.fn(async (_c: string, slug: string, _l: string, _d?: number) =>
    slug === 'mx-01-forma' ? { id: 4, slug, name: 'MX-01 FORMA' } : null,
  ),
}))
vi.mock('@/lib/content', () => ({ getPayloadClient: async () => ({ create, find }), findPublicBySlug }))
vi.mock('@/lib/rate-limit', () => ({ clientIp: () => '203.0.113.9', rateLimitKey: () => 'k', sharedRateLimited: async () => false }))

import { submitContact } from '@/app/(frontend)/[locale]/actions'
import { contactHrefFor, duplicateWindowStart, interestMessage, interestSearch, interestSlug } from '@/lib/contact-interest'

// Database replaced by mocks: nothing is written anywhere.
const form = (extra: Record<string, string> = {}) => {
  const f = new FormData()
  for (const [k, v] of Object.entries({ name: 'Test', email: 't@example.invalid', message: 'Hello', consent: 'on', locale: 'vi', ...extra }))
    f.set(k, v)
  return f
}
const stored = () => (create.mock.calls.at(-1) as unknown as [{ data: Record<string, unknown> }])[0].data

afterEach(() => {
  create.mockClear()
  find.mockClear()
  findPublicBySlug.mockClear()
})

describe('product of interest', () => {
  it('only plain slugs are read from the URL', () => {
    expect(interestSlug('mx-01-forma')).toBe('mx-01-forma')
    for (const bad of [undefined, '', 'MX-01', '../admin', 'a b', 'x'.repeat(81), 'mx--01', '-mx']) expect(interestSlug(bad)).toBeUndefined()
    expect(contactHrefFor('/vi/contact', 'mx-01-forma')).toBe('/vi/contact?product=mx-01-forma')
  })

  it('a product the visitor can see is stored ahead of the unchanged message', async () => {
    const r = await submitContact({ status: 'idle' }, form({ product: 'mx-01-forma', topic: 'product' }))
    expect(r.status).toBe('success')
    expect(findPublicBySlug).toHaveBeenCalledWith('products', 'mx-01-forma', 'vi', 0)
    expect(stored().message).toBe(interestMessage('MX-01 FORMA', 'mx-01-forma', 'Hello'))
    expect(stored().message).toBe('Sản phẩm quan tâm: MX-01 FORMA (/products/mx-01-forma)\n\nHello')
    expect(stored().topic).toBe('product')
  })

  it('an unknown/unpublished product or a malformed value is dropped, never echoed', async () => {
    await submitContact({ status: 'idle' }, form({ product: 'draft-only' }))
    expect(stored().message).toBe('Hello')
    await submitContact({ status: 'idle' }, form({ product: '<script>' }))
    expect(stored().message).toBe('Hello')
    expect(findPublicBySlug).toHaveBeenCalledTimes(1) // the malformed value is not even looked up
  })

  it('validation errors keep the product so the form can be corrected', async () => {
    const r = await submitContact({ status: 'idle' }, form({ product: 'mx-01-forma', email: 'nope' }))
    expect(r).toMatchObject({ status: 'error', code: 'invalid', errors: { email: 'email' } })
    expect(r.values?.product).toBe('mx-01-forma')
    expect(create).not.toHaveBeenCalled()
  })
})

describe('language of the request', () => {
  it('missing or unknown locale → validation error; nothing looked up, rate-limited or stored', async () => {
    for (const bad of [{ locale: '' }, { locale: 'fr' }, { locale: 'VI' }, { locale: 'vi ' + 'x'.repeat(10) }]) {
      const r = await submitContact({ status: 'idle' }, form({ ...bad, product: 'mx-01-forma' }))
      expect(r).toMatchObject({ status: 'error', code: 'invalid' })
      expect(r.errors?.locale).toMatch(/^(required|tooLong)$/)
    }
    const f = form()
    f.delete('locale')
    expect(await submitContact({ status: 'idle' }, f)).toMatchObject({ status: 'error', code: 'invalid', errors: { locale: 'required' } })
    expect(findPublicBySlug).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('a valid locale is stored as sent and used for the product lookup', async () => {
    await submitContact({ status: 'idle' }, form({ locale: 'ko', product: 'mx-01-forma' }))
    expect(findPublicBySlug).toHaveBeenCalledWith('products', 'mx-01-forma', 'ko', 0)
    expect(stored().locale).toBe('ko')
  })
})

describe('one slug rule for page and action', () => {
  const at80 = 'a'.repeat(80)
  const at81 = 'a'.repeat(81)
  it('80 characters are accepted, 81 are ignored, by the shared helper', () => {
    expect(interestSlug(at80)).toBe(at80)
    expect(interestSlug(at81)).toBeUndefined()
  })
  it('the action applies the same rule: 81 characters are not looked up and not echoed', async () => {
    await submitContact({ status: 'idle' }, form({ product: at80 }))
    expect(findPublicBySlug).toHaveBeenCalledWith('products', at80, 'vi', 0)
    findPublicBySlug.mockClear()
    const r = await submitContact({ status: 'idle' }, form({ product: at81, email: 'bad' }))
    expect(r.values?.product).toBeUndefined()
    await submitContact({ status: 'idle' }, form({ product: at81 }))
    expect(findPublicBySlug).not.toHaveBeenCalled()
    expect(stored().message).toBe('Hello')
  })
})

describe('repeated submissions', () => {
  it('the same email + message within 10 minutes is not stored twice and not counted as a second lead', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 1 }] })
    const r = await submitContact({ status: 'idle' }, form())
    expect(r).toEqual({ status: 'success' })
    expect(create).not.toHaveBeenCalled()
    const where = JSON.stringify((find.mock.calls[0] as unknown as [{ where: unknown }])[0].where)
    expect(where).toContain('"email":{"equals":"t@example.invalid"}')
    expect(where).toContain('"name":{"equals":"Test"}')
    expect(where).toContain('"phone":{"exists":false}')
    expect(where).toContain('"topic":{"exists":false}')
    expect(where).toContain('"locale":{"equals":"vi"}')
    expect(where).toContain('"message":{"equals":"Hello"}')
  })

  it('the language switcher link keeps the product', () => {
    expect(interestSearch('mx-01-forma')).toBe('?product=mx-01-forma')
  })

  it('the window starts ten minutes back', () => {
    expect(duplicateWindowStart(Date.UTC(2026, 10, 6, 12, 0, 0)).toISOString()).toBe('2026-11-06T11:50:00.000Z')
  })
})
