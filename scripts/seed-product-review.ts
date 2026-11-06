/**
 * Review-only seed for the product pages + contact flow. DISPOSABLE review database only
 * (drphynex_independent_review_test, marker drphynex-independent-review-disposable-v1); refuses any other.
 *
 *   node_modules/.bin/tsx scripts/seed-product-review.ts reset    → drop + migrate + 3 test staff accounts
 *   (then the existing importers: scripts/import-preview-content.ts, scripts/import-product-content.ts)
 *   node_modules/.bin/tsx scripts/seed-product-review.ts guest    → one "[MẪU]" product, published + approved
 *
 * The four real products stay drafts exactly as the importers create them (packaging transcriptions,
 * KO/EN in review, VI AI draft, private images). The "[MẪU]" product exists only so the guest path
 * (published page → contact with the product kept) can be exercised; it has no claims and no images.
 * Staff passwords are random per run and written only to a file in the OS temp folder.
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getPayload, type Migration } from 'payload'

import { migrations } from '@/migrations'
import config from '@/payload.config'

import { assertDisposableDatabase } from '../tests/helpers/database'

export const GUEST_SAMPLE_SLUG = 'mau-san-pham-thu'
const fixturePath = join(tmpdir(), 'drphynex-products-review-fixture.json')
const phase = process.argv[2]
if (phase !== 'reset' && phase !== 'guest') throw new Error('Usage: seed-product-review.ts reset|guest')

const payload = await getPayload({ config: await config })
try {
  await assertDisposableDatabase(payload)

  if (phase === 'reset') {
    await payload.db.dropDatabase({ adapter: payload.db as never })
    await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
    const accounts = Object.fromEntries(
      (['admin', 'editor', 'translator'] as const).map((role) => [
        role,
        { email: `review-${role}@test.local`, password: randomBytes(18).toString('hex') },
      ]),
    ) as Record<'admin' | 'editor' | 'translator', { email: string; password: string }>
    const admin = await payload.create({
      collection: 'users',
      data: { ...accounts.admin, role: 'admin', name: 'Tài khoản thử Admin' },
      overrideAccess: true,
    })
    for (const role of ['editor', 'translator'] as const) {
      await payload.create({
        collection: 'users',
        data: { ...accounts[role], role, name: `Tài khoản thử ${role}` },
        user: admin,
        overrideAccess: false,
      })
    }
    writeFileSync(fixturePath, JSON.stringify(accounts, null, 2))
    console.log(`Reset done; test accounts written to ${fixturePath}`)
  }

  if (phase === 'guest') {
    const names = { ko: '[샘플] 테스트 제품', en: '[SAMPLE] Test product', vi: '[MẪU] Sản phẩm thử' } as const
    const short = {
      ko: '[샘플] 공개 경로 확인용 테스트 데이터입니다. 실제 제품이 아닙니다.',
      en: '[SAMPLE] Test data for checking the public path. Not a real product.',
      vi: '[MẪU] Dữ liệu thử để kiểm tra đường đi của khách. Không phải sản phẩm thật.',
    } as const
    const existing = await payload.find({ collection: 'products', where: { slug: { equals: GUEST_SAMPLE_SLUG } }, limit: 1, overrideAccess: true })
    let id = existing.docs[0]?.id
    for (const locale of ['ko', 'en', 'vi'] as const) {
      const data = { name: names[locale], shortDescription: short[locale], slug: GUEST_SAMPLE_SLUG, volume: '[MẪU]', translationStatus: 'approved', _status: 'published' }
      if (!id) id = (await payload.create({ collection: 'products', locale, data: data as never, overrideAccess: true })).id
      else await payload.update({ collection: 'products', id, locale, data: data as never, overrideAccess: true })
    }
    console.log(`Guest sample product published (test database only): /products/${GUEST_SAMPLE_SLUG}`)

    // Mirror the real database: the Vietnamese versions of the four products are AI drafts there.
    const real = await payload.find({ collection: 'products', where: { slug: { not_equals: GUEST_SAMPLE_SLUG } }, limit: 10, draft: true, overrideAccess: true })
    for (const doc of real.docs) {
      await payload.update({ collection: 'products', id: doc.id, locale: 'vi', draft: true, data: { translationStatus: 'ai-draft' } as never, overrideAccess: true })
    }
    console.log(`VI marked ai-draft on ${real.docs.length} drafts (as in the real database)`)
  }
} finally {
  await payload.destroy?.()
}
process.exit(0)
