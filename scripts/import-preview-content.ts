import { withContentLocaleGuard } from '../src/lib/content-mutations'
/**
 * Loads the four packaged products into the CMS as unpublished drafts for the design preview.
 *
 * - Everything stays `_status: draft` with `translationStatus: in-review`; guests never see it.
 * - Images are created with `publicRelease: false` (private until an editor clears them).
 * - Products: only names and pack sizes read from the packaging artwork. No claims,
 *   concentrations or company details: those wait for the brand's confirmation.
 * - Home headline/intro and line descriptions are draft copy from docs/content-drafts.md
 *   (`translationStatus: ai-draft`), built only from sourced facts.
 * - Idempotent and fill-only: documents are matched by slug, images by filename; on re-run only
 *   empty fields are filled, so edits made in the CMS are kept. Published or approved documents
 *   are skipped, and _status / existing translationStatus are never changed.
 *
 * Run (local only): npm run payload -- run scripts/import-preview-content.ts
 * Images are read from brand-assets/preview-images/ (git-ignored; see docs/image-audit.md).
 */
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'
import { isEmpty, isLocked, onlyEmpty } from './lib/fill'

if (process.env.NODE_ENV === 'production') throw new Error('Preview content is for local development only')

const imageDir = path.resolve(process.cwd(), 'brand-assets/preview-images')
const locales = ['ko', 'en', 'vi'] as const
type Locale = (typeof locales)[number]
type Localized = Record<Locale, string>

const lines = [
  {
    slug: 'rx',
    order: 1,
    appearance: 'light',
    name: { ko: 'RX', en: 'RX', vi: 'RX' },
    description: {
      ko: 'RX 라인은 RX 매트릭스 밤과 RX 매트릭스 시트, 두 가지 제품으로 구성됩니다.',
      en: 'The RX line has two products: RX Matrix Balm and RX Matrix Sheet.',
      vi: 'Dòng RX gồm hai sản phẩm: kem dưỡng RX Matrix Balm và mặt nạ RX Matrix Sheet.',
    },
  },
  {
    slug: 'mx',
    order: 2,
    appearance: 'dark',
    name: { ko: 'MX', en: 'MX', vi: 'MX' },
    description: {
      ko: 'MX 라인은 두 가지 MATRIX BOOST SHOT, MX-01 FORMA와 MX-02 LUMA로 구성되며 각각 8 mL 바이알 5개가 들어 있습니다.',
      en: 'The MX line has two MATRIX BOOST SHOT products, MX-01 FORMA and MX-02 LUMA, each with five 8 mL vials.',
      vi: 'Dòng MX gồm hai sản phẩm MATRIX BOOST SHOT là MX-01 FORMA và MX-02 LUMA, mỗi hộp 5 lọ 8 mL.',
    },
  },
] as const

// Draft copy, option A in docs/content-drafts.md.
const home = {
  headline: {
    ko: '한국에서 온 바이오사이언스 더마톨로지',
    en: 'Bioscience dermatology from Korea',
    vi: 'Bioscience Dermatology từ Hàn Quốc',
  },
  intro: {
    ko: 'Dr.PhynEX는 더마코스메틱을 지향하는 한국 화장품 브랜드로, RX와 MX 두 라인을 선보입니다. 모든 제품 포장에는 전문가용(For professional use only)으로 표기되어 있습니다.',
    en: 'Dr.PhynEX is a Korean dermocosmetic brand with two product lines, RX and MX. Each pack is labelled "For professional use only".',
    vi: 'Dr.PhynEX là thương hiệu mỹ phẩm Hàn Quốc theo định hướng dermocosmetic, gồm hai dòng sản phẩm RX và MX. Bao bì của mỗi sản phẩm đều ghi "For professional use only" (dành cho sử dụng chuyên nghiệp).',
  },
}

// Names: en as printed on the box, ko from the artwork file names (same pattern as the
// Korean vial labels), vi as supplied by the client on 29/10/2026. Volumes: box artwork.
const products = [
  {
    slug: 'rx-matrix-balm',
    line: 'rx',
    accent: 'rx-red',
    volume: '40 mL',
    name: { ko: '닥터피넥스 알엑스 매트릭스 밤', en: 'RX Matrix Balm', vi: 'Kem dưỡng Dr. PhynEX RX Matrix Balm' },
    image: 'rx-matrix-balm-box.webp',
    note: 'Source: 1.Kem dưỡng…/Generated-Image-October-23,-2026---3_12PM.png. Box front checked against box artwork. Preview only.',
  },
  {
    slug: 'rx-matrix-sheet',
    line: 'rx',
    accent: 'rx-red',
    volume: '25 mL × 5',
    name: { ko: '닥터피넥스 알엑스 매트릭스 시트', en: 'RX Matrix Sheet', vi: 'Mặt nạ Dr. PhynEX RX Matrix Sheet' },
    image: 'rx-matrix-sheet-pouch.webp',
    note: 'Source: 2.Mặt nạ…/Generated Image October 23, 2026 - 5_34PM.psd (pouch front). Checked against pouch artwork. Preview only.',
  },
  {
    slug: 'mx-01-forma',
    line: 'mx',
    accent: 'mx-cyan',
    volume: '8 mL × 5',
    name: { ko: '닥터피넥스 엠엑스 01 포마', en: 'MX-01 FORMA', vi: 'Tế bào gốc Dr. PhynEX MX-01 FORMA' },
    image: 'mx-01-forma-vial.webp',
    note: 'Source: New folder/Generated Image October 16, 2026 - 1_46PM.jpg (0° tile only; back views in that file have Korean typos). Preview only.',
  },
  {
    slug: 'mx-02-luma',
    line: 'mx',
    accent: 'mx-pink',
    volume: '8 mL × 5',
    name: { ko: '닥터피넥스 엠엑스 02 루마', en: 'MX-02 LUMA', vi: 'Tế bào gốc Dr. PhynEX MX-02 LUMA' },
    image: 'mx-02-luma-vial.webp',
    note: 'Source: New folder/Generated Image October 16, 2026 - 11_30AM.jpg (front vial). Label checked against vial artwork. Preview only.',
  },
] as const

async function upsertImage(payload: Payload, filename: string, alt: Localized, note: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    overrideAccess: true,
  })
  let id = existing.docs[0]?.id
  if (!id) {
    const data = fs.readFileSync(path.join(imageDir, filename))
    const created = await payload.create({
      collection: 'media',
      locale: 'ko',
      data: { alt: alt.ko, publicRelease: false, reviewNote: note },
      file: { data, mimetype: 'image/webp', name: filename, size: data.length },
      overrideAccess: true,
    })
    id = created.id
  }
  // Alt text: fill missing languages only; publicRelease is never touched after creation.
  for (const locale of locales) {
    const current = await payload.findByID({ collection: 'media', id, locale, fallbackLocale: false, overrideAccess: true })
    if (isEmpty(current.alt)) {
      await payload.update({ collection: 'media', id, locale, data: { alt: alt[locale] }, overrideAccess: true })
    }
  }
  return id
}

/**
 * Creates the document if it does not exist; otherwise only fills empty fields, per language.
 * Published or approved documents are skipped. Existing translationStatus is never changed.
 */
async function upsertDraft(
  payload: Payload,
  collection: 'product-lines' | 'products',
  slug: string,
  shared: Record<string, unknown>,
  localized: Record<string, Localized>,
  statusOnCreate: 'ai-draft' | 'in-review' = 'in-review',
) {
  const current = await Promise.all(
    locales.map(async (locale) => {
      const { docs } = await payload.find({
        collection,
        where: { slug: { equals: slug } },
        limit: 1,
        locale,
        fallbackLocale: false,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
      return docs[0] as unknown as Record<string, unknown> | undefined
    }),
  )
  const valuesFor = (locale: Locale) => Object.fromEntries(Object.entries(localized).map(([k, v]) => [k, v[locale]]))

  let id = current[0]?.id as number | string | undefined
  if (!id) {
    for (const [i, locale] of locales.entries()) {
      const data = { ...(i === 0 ? { ...shared, slug } : {}), ...valuesFor(locale), translationStatus: statusOnCreate }
      if (!id) id = (await payload.create({ collection, locale, draft: true, data: data as never, overrideAccess: true })).id
      else await payload.update({ collection, id, locale, draft: true, data: data as never, overrideAccess: true })
    }
    return id!
  }
  if (isLocked(current as never)) {
    payload.logger.warn(`${collection}/${slug} is published or approved: left untouched`)
    return id
  }
  for (const [i, locale] of locales.entries()) {
    const data = onlyEmpty(current[i], { ...(i === 0 ? shared : {}), ...valuesFor(locale) })
    if (Object.keys(data).length === 0) continue
    await payload.update({ collection, id, locale, draft: true, data: data as never, overrideAccess: true })
  }
  return id
}

const payload = withContentLocaleGuard(await getPayload({ config }))
const lineIds: Record<string, number | string> = {}
for (const line of lines) {
  lineIds[line.slug] = await upsertDraft(
    payload,
    'product-lines',
    line.slug,
    { order: line.order, appearance: line.appearance },
    { name: line.name, description: line.description },
    'ai-draft',
  )
}

const productIds: (number | string)[] = []
for (const product of products) {
  const image = await upsertImage(payload, product.image, product.name, product.note)
  productIds.push(
    await upsertDraft(
      payload,
      'products',
      product.slug,
      { line: lineIds[product.line], accent: product.accent, volume: product.volume, images: [image] },
      { name: product.name },
    ),
  )
}

const homeCurrent = await Promise.all(
  locales.map(
    async (locale) =>
      (await payload.findGlobal({
        slug: 'home-page',
        locale,
        fallbackLocale: false,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>,
  ),
)
if (isLocked(homeCurrent as never)) {
  payload.logger.warn('home-page is published or approved: left untouched')
} else {
  for (const [i, locale] of locales.entries()) {
    const fresh = isEmpty(homeCurrent[i]?.headline) && isEmpty(homeCurrent[i]?.intro)
    const data = onlyEmpty(homeCurrent[i], {
      featuredProducts: productIds,
      headline: home.headline[locale],
      intro: home.intro[locale],
    })
    if (Object.keys(data).length === 0) continue
    await payload.updateGlobal({
      slug: 'home-page',
      locale,
      draft: true,
      data: { ...data, ...(fresh ? { translationStatus: 'ai-draft' } : {}) } as never,
      overrideAccess: true,
    })
  }
}

payload.logger.info(`Preview drafts checked: ${lines.length} lines, ${products.length} products (fill-only, nothing published)`)
process.exit(0)
