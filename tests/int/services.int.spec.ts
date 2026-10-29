import { assertDisposableDatabase } from '../helpers/database'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { migrations } from '@/migrations'
import config from '@/payload.config'
import { clientIp, rateLimitKey, sharedRateLimited } from '@/lib/rate-limit'
import { PUBLIC_CONTENT_TAG } from '@/lib/revalidate'

// Deployment-related wiring that can be checked without external services. Runs against the
// *_test database (see vitest.setup.ts); SMTP and S3 are not contacted.

let payload: Payload

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  await assertDisposableDatabase(payload)
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  await (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`DELETE FROM "form_rate_limits"`)
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('shared form rate limit', () => {
  it('allows five attempts per window, then blocks, per form and visitor', async () => {
    const key = rateLimitKey('contact', '203.0.113.7')
    const results = []
    for (let i = 0; i < 6; i++) results.push(await sharedRateLimited(payload, key))
    expect(results).toEqual([false, false, false, false, false, true])
    expect(await sharedRateLimited(payload, rateLimitKey('partnership', '203.0.113.7'))).toBe(false)
    expect(await sharedRateLimited(payload, rateLimitKey('contact', '203.0.113.8'))).toBe(false)
  })

  it('starts a new window once the old one has passed', async () => {
    const key = rateLimitKey('contact', '203.0.113.9')
    for (let i = 0; i < 6; i++) await sharedRateLimited(payload, key)
    await (payload.db as unknown as PostgresAdapter).drizzle.execute(
      sql`UPDATE "form_rate_limits" SET "window_start" = now() - interval '11 minutes' WHERE "key" = ${key}`,
    )
    expect(await sharedRateLimited(payload, key)).toBe(false)
  })

  it('never stores the IP address itself', async () => {
    const key = rateLimitKey('contact', '203.0.113.7')
    expect(key).not.toContain('203.0.113.7')
    expect(key).toMatch(/^contact:[0-9a-f]{40}$/)
  })

  it('takes the IP from the platform header first', () => {
    const h = new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1', 'x-real-ip': '203.0.113.5' })
    expect(clientIp(h)).toBe('203.0.113.5')
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe('198.51.100.1')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})

describe('configuration', () => {
  it('disables GraphQL', () => {
    expect(payload.config.graphQL.disable).toBe(true)
  })

  it('clears the public cache only for collections shown on the site', () => {
    const hooks = (slug: string) => payload.collections[slug as 'products'].config.hooks
    for (const slug of ['products', 'ingredients', 'articles', 'legal-pages', 'media', 'stores']) {
      expect(hooks(slug).afterChange.some((h) => h.name === 'revalidateAfterChange'), slug).toBe(true)
      expect(hooks(slug).afterDelete.some((h) => h.name === 'revalidateAfterDelete'), slug).toBe(true)
    }
    for (const slug of ['contact-submissions', 'partner-inquiries', 'users', 'source-documents']) {
      expect(hooks(slug).afterChange.some((h) => h.name === 'revalidateAfterChange'), slug).toBe(false)
    }
    expect(PUBLIC_CONTENT_TAG).toBe('cms-public')
  })

  it('keeps uploads on local disk when no bucket is configured', () => {
    expect(process.env.S3_BUCKET).toBeUndefined()
    expect(payload.collections.media.config.upload.staticDir).toContain('drphynex-review-')
  })
})

describe('form notification email', () => {
  const create = () =>
    payload.create({
      collection: 'contact-submissions',
      overrideAccess: true,
      data: { name: 'Test Person', email: 'person@test.local', message: 'Test message', consent: true, status: 'new' },
    })

  it('sends nothing when email is not configured', async () => {
    const send = vi.spyOn(payload, 'sendEmail')
    await create()
    expect(send).not.toHaveBeenCalled()
    send.mockRestore()
  })

  it('sends a notification without personal data when configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.invalid'
    process.env.FORM_NOTIFY_TO = 'inbox@test.local'
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    try {
      const doc = await create()
      expect(send).toHaveBeenCalledTimes(1)
      const message = send.mock.calls[0][0] as { to: string; subject: string; text: string }
      expect(message.to).toBe('inbox@test.local')
      expect(message.subject).toBe(`[Dr.PhynEX] Contact message #${doc.id}`)
      for (const field of [message.subject, message.text]) {
        expect(field).not.toContain('Test Person')
        expect(field).not.toContain('person@test.local')
        expect(field).not.toContain('Test message')
      }
      expect(message.text).toContain(`/admin/collections/contact-submissions/${doc.id}`)
    } finally {
      send.mockRestore()
      delete process.env.SMTP_HOST
      delete process.env.FORM_NOTIFY_TO
    }
  })

  it('keeps the submission when the email fails', async () => {
    process.env.SMTP_HOST = 'smtp.test.invalid'
    process.env.FORM_NOTIFY_TO = 'inbox@test.local'
    const send = vi.spyOn(payload, 'sendEmail').mockRejectedValue(new Error('SMTP down'))
    try {
      const doc = await create()
      const stored = await payload.findByID({ collection: 'contact-submissions', id: doc.id, overrideAccess: true })
      expect(stored.email).toBe('person@test.local')
    } finally {
      send.mockRestore()
      delete process.env.SMTP_HOST
      delete process.env.FORM_NOTIFY_TO
    }
  })
})
