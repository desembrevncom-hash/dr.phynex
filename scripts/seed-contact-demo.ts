/**
 * Demo of the editable contact block. DISPOSABLE review database only
 * (drphynex_independent_review_test, marker drphynex-independent-review-disposable-v1); refuses any other.
 *
 *   node_modules/.bin/tsx scripts/seed-contact-demo.ts
 *
 * - Site settings → "Thông tin liên hệ": the contact details confirmed by the owner (06/11/2026).
 *   Email and hotline are shared by every language; address and hours are per language. Each language
 *   goes through the normal workflow (save draft → approve → publish) so guests see it as on the live
 *   site. The KO/EN/VI wording of address and hours is a translation to be reviewed.
 * - Three SAMPLE stores (Seoul, Busan, Incheon) in the Stores collection, labelled as samples in each
 *   language ("Điểm bán minh họa" / "예시 매장" / "Sample store"); city only, no invented address or
 *   phone. They exist only in this test database and must never be imported into a release.
 *
 * Re-runnable: settings are overwritten with the same values; stores are matched by their name.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import { withContentLocaleGuard } from '@/lib/content-mutations'
import config from '@/payload.config'

import { assertDisposableDatabase } from '../tests/helpers/database'

type Loc = 'ko' | 'en' | 'vi'
const locales: Loc[] = ['ko', 'en', 'vi']

export const confirmedContact = {
  email: 'contact@phynex.co.kr',
  phone: '+82 10-9876-5432',
  address: {
    ko: '대한민국 서울특별시 강남구 테헤란로',
    en: 'Teheran-ro, Gangnam-gu, Seoul, South Korea',
    vi: 'Teheran-ro, Gangnam-gu, Seoul, Hàn Quốc',
  },
  hours: {
    ko: '월요일–토요일, 08:00–17:00 (한국 표준시 KST, UTC+9)',
    en: 'Monday–Saturday, 08:00–17:00, Korea Standard Time (KST, UTC+9)',
    vi: 'Thứ Hai–Thứ Bảy, 08:00–17:00, giờ Hàn Quốc (KST, UTC+9)',
  },
} as const

const sampleLabel: Record<Loc, string> = { ko: '예시 매장', en: 'Sample store', vi: 'Điểm bán minh họa' }
const sampleStores = [
  { order: 1, city: { ko: '서울', en: 'Seoul', vi: 'Seoul' } },
  { order: 2, city: { ko: '부산', en: 'Busan', vi: 'Busan' } },
  { order: 3, city: { ko: '인천', en: 'Incheon', vi: 'Incheon' } },
] as const

// Project writes go through the locale guard (publishSpecificLocale must equal the locale).
const payload = withContentLocaleGuard(await getPayload({ config: await config }))
try {
  await assertDisposableDatabase(payload)

  // Site settings: content as a draft, then approve (separate save), then publish, per language.
  for (const locale of locales) {
    await payload.updateGlobal({
      slug: 'site-settings',
      locale,
      draft: true,
      overrideAccess: true,
      data: {
        contact: {
          email: confirmedContact.email,
          phone: confirmedContact.phone,
          address: confirmedContact.address[locale],
          hours: confirmedContact.hours[locale],
        },
      } as never,
    })
  }
  for (const locale of locales) {
    await payload.updateGlobal({ slug: 'site-settings', locale, draft: true, overrideAccess: true, data: { translationStatus: 'approved' } as never })
    await payload.updateGlobal({ slug: 'site-settings', locale, overrideAccess: true, data: { _status: 'published' } as never })
  }

  // Sample stores (published + approved in each language), matched by their Vietnamese name.
  for (const s of sampleStores) {
    const viName = `${sampleLabel.vi} — ${s.city.vi}`
    const found = await payload.find({ collection: 'stores', locale: 'vi', where: { name: { equals: viName } }, limit: 1, overrideAccess: true, draft: true })
    let id = found.docs[0]?.id
    for (const locale of locales) {
      const data = { name: `${sampleLabel[locale]} — ${s.city[locale]}`, city: s.city[locale], country: 'KR', type: 'store', order: s.order }
      if (!id) id = (await payload.create({ collection: 'stores', locale, draft: true, data: data as never, overrideAccess: true })).id
      else await payload.update({ collection: 'stores', id, locale, draft: true, data: data as never, overrideAccess: true })
    }
    for (const locale of locales) {
      await payload.update({ collection: 'stores', id, locale, draft: true, data: { translationStatus: 'approved' } as never, overrideAccess: true })
      await payload.update({ collection: 'stores', id, locale, data: { _status: 'published' } as never, overrideAccess: true })
    }
  }

  // Report what guests now get (published + approved, per language).
  for (const locale of locales) {
    const s = await payload.findGlobal({ slug: 'site-settings', locale, overrideAccess: false, draft: false, fallbackLocale: false })
    const stores = await payload.find({ collection: 'stores', locale, overrideAccess: false, draft: false, limit: 10 })
    const c = (s as { contact?: Record<string, unknown>; translationStatus?: string }).contact
    console.log(`${locale}: settings ${(s as { translationStatus?: string }).translationStatus} email=${c?.email} phone=${c?.phone} address=${c?.address} | hours=${c?.hours} | stores: ${stores.docs.map((d) => d.name).join(', ')}`)
  }
} finally {
  await payload.destroy?.()
}
process.exit(0)
