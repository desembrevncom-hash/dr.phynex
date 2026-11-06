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
import { contactHrefFor, duplicateWindowStart, interestMessage, interestSlug } from '@/lib/contact-interest'

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

describe('repeated submissions', () => {
  it('the same email + message within 10 minutes is not stored twice and not counted as a second lead', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 1 }] })
    const r = await submitContact({ status: 'idle' }, form())
    expect(r).toEqual({ status: 'success' })
    expect(create).not.toHaveBeenCalled()
    const where = JSON.stringify((find.mock.calls[0] as unknown as [{ where: unknown }])[0].where)
    expect(where).toContain('t@example.invalid')
    expect(where).toContain('"message":{"equals":"Hello"}')
  })

  it('the window starts ten minutes back', () => {
    expect(duplicateWindowStart(Date.UTC(2026, 10, 6, 12, 0, 0)).toISOString()).toBe('2026-11-06T11:50:00.000Z')
  })
})
