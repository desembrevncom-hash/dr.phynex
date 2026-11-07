import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '203.0.113.1' }) }))
const { create, find } = vi.hoisted(() => ({ create: vi.fn(), find: vi.fn(async () => ({ docs: [] })) }))
vi.mock('@/lib/content', () => ({ getPayloadClient: async () => ({ create, find }), findPublicBySlug: async () => null }))
vi.mock('@/lib/rate-limit', () => ({
  clientIp: () => '203.0.113.1',
  rateLimitKey: () => 'k',
  sharedRateLimited: async () => false,
}))

import { submitContact, submitPartnership } from '@/app/(frontend)/[locale]/actions'
import { isExcludedPath } from '@/lib/analytics/client'

// Server actions with the database replaced by a mock: nothing is written anywhere.
const form = (extra: Record<string, string> = {}) => {
  const f = new FormData()
  const values = {
    name: 'Test',
    email: 'test@example.invalid',
    message: 'Fixture',
    company: 'Test company',
    contactName: 'Test',
    country: 'VN',
    businessType: 'retailer',
    consent: 'on',
    locale: 'vi',
    ...extra,
  }
  for (const [k, v] of Object.entries(values)) f.set(k, v)
  return f
}

afterEach(() => create.mockReset())

describe('lead id is issued only for stored submissions', () => {
  it('success → a fresh leadId, never containing form data', async () => {
    create.mockResolvedValue({ id: 1 })
    for (const action of [submitContact, submitPartnership]) {
      const a = await action({ status: 'idle' }, form())
      const b = await action({ status: 'idle' }, form())
      expect(a.status).toBe('success')
      expect(a.leadId).toMatch(/^[0-9a-f-]{36}$/)
      expect(a.leadId).not.toBe(b.leadId)
      expect(JSON.stringify(a)).not.toMatch(/test@example|Fixture/)
    }
  })

  it('validation failure, storage failure and honeypot bots → no leadId', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      create.mockRejectedValue(new Error('db down'))
      for (const action of [submitContact, submitPartnership]) {
        expect((await action({ status: 'idle' }, form({ email: '' }))).leadId).toBeUndefined()
        expect((await action({ status: 'idle' }, form())).leadId).toBeUndefined()
        const bot = await action({ status: 'idle' }, form({ website: 'spam' }))
        expect(bot.status).toBe('success')
        expect(bot.leadId).toBeUndefined()
      }
    } finally {
      log.mockRestore()
    }
  })
})

describe('excluded routes', () => {
  it('admin, API and preview never initialise tracking', () => {
    for (const p of ['/admin', '/admin/collections/products', '/api/media/file/x', '/preview', '/preview/exit']) {
      expect(isExcludedPath(p)).toBe(true)
    }
    for (const p of ['/en', '/vi/products/x', '/ko/administration-notes']) expect(isExcludedPath(p)).toBe(false)
  })
})
