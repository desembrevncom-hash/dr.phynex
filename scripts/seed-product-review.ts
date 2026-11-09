/**
 * Review-only seed for the product pages + contact flow. DISPOSABLE review database only
 * (drphynex_independent_review_test, marker drphynex-independent-review-disposable-v1); refuses any other.
 *
 *   node_modules/.bin/tsx scripts/seed-product-review.ts reset    → drop + migrate + 3 test staff accounts
 *   (then the existing importers: scripts/import-preview-content.ts, scripts/import-product-content.ts)
 *   node_modules/.bin/tsx scripts/seed-product-review.ts guest    → one "[MẪU]" product, published + approved
 *   node_modules/.bin/tsx scripts/seed-product-review.ts migrate  → apply pending migrations only (data kept)
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
if (phase !== 'reset' && phase !== 'guest' && phase !== 'migrate' && phase !== 'luma-landing')
  throw new Error('Usage: seed-product-review.ts reset|guest|migrate|luma-landing')

const payload = await getPayload({ config: await config })
try {
  await assertDisposableDatabase(payload)

  if (phase === 'luma-landing') {
    // Demo landing page for MX-02 LUMA, saved as a DRAFT by the review editor (as in Admin).
    // Only approved slider wording and names printed on the packaging; the highlight grid
    // (claims) stays empty until sources are confirmed.
    type Loc = 'ko' | 'en' | 'vi'
    const editor = (await payload.find({ collection: 'users', where: { email: { equals: 'review-editor@test.local' } }, limit: 1, overrideAccess: true })).docs[0]
    const luma = (await payload.find({ collection: 'products', where: { slug: { equals: 'mx-02-luma' } }, draft: true, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (!editor || !luma) throw new Error('review editor or mx-02-luma missing')
    const image = Array.isArray(luma.images) ? luma.images[0] : undefined
    const tagline: Record<Loc, string> = {
      ko: '닥터피넥스 MX-02 LUMA를 만나보세요',
      en: 'Discover Dr. PhynEX MX-02 LUMA',
      vi: 'Khám phá Dr. PhynEX MX-02 LUMA',
    }
    const alt: Record<Loc, string> = { ko: 'MX-02 LUMA 바이알', en: 'MX-02 LUMA vial', vi: 'Lọ MX-02 LUMA' }
    const ingredients: Record<Loc, string[]> = {
      ko: ['Sodium DNA', '우유엑소좀', '17종 아미노산', '비타민 컴플렉스'],
      en: ['Sodium DNA', 'Milk Exosome', '17 amino acids', 'Vitamin complex'],
      vi: ['Sodium DNA', 'Exosome sữa', '17 loại axit amin', 'Phức hợp vitamin'],
    }
    const source =
      'Hộp MX-02 LUMA (mx-02-luma_box.pdf): mô tả EN "Sodium DNA and Milk Exosome … 17 Amino Acids and a Vitamin Complex"; 전성분 KO "우유엑소좀".'
    // 1) Structure + VI texts.
    await payload.update({
      collection: 'products',
      id: luma.id,
      locale: 'vi',
      draft: true,
      user: editor,
      overrideAccess: false,
      data: {
        landing: [
          { blockType: 'hero', tagline: tagline.vi, showPack: true, tone: 'muted' },
          { blockType: 'band', image, alt: alt.vi, tone: 'light' },
          { blockType: 'ingredients', items: ingredients.vi.map((name) => ({ name, sourceNote: source })), tone: 'light' },
          { blockType: 'points', items: [], tone: 'muted' },
          { blockType: 'details', tone: 'light' },
          { blockType: 'cta', tone: 'dark' },
        ],
      } as never,
    })
    // 2) KO/EN texts on the same blocks (same row ids, shared fields unchanged).
    for (const locale of ['ko', 'en'] as Loc[]) {
      const doc = await payload.findByID({ collection: 'products', id: luma.id, locale, draft: true, depth: 0, overrideAccess: true })
      const landing = (doc.landing ?? []).map((b) => {
        if (b.blockType === 'hero') return { ...b, tagline: tagline[locale] }
        if (b.blockType === 'band') return { ...b, alt: alt[locale] }
        if (b.blockType === 'ingredients') return { ...b, items: (b.items ?? []).map((it, i) => ({ ...it, name: ingredients[locale][i] })) }
        return b
      })
      await payload.update({ collection: 'products', id: luma.id, locale, draft: true, user: editor, overrideAccess: false, data: { landing } as never })
    }
    for (const locale of ['ko', 'en', 'vi'] as Loc[]) {
      const doc = await payload.findByID({ collection: 'products', id: luma.id, locale, draft: true, depth: 0, overrideAccess: true })
      console.log(`${locale}: ${(doc.landing ?? []).map((b) => b.blockType).join(' → ')} | hero "${(doc.landing?.[0] as { tagline?: string })?.tagline}" | status ${doc._status}/${doc.translationStatus}`)
    }
  }

  if (phase === 'migrate') {
    // Pending migrations only (already-applied ones are skipped); existing rows are kept.
    await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
    console.log('Pending migrations applied to the disposable database')
  }

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
