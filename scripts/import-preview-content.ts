/**
 * Loads the four packaged products into the CMS as unpublished drafts for the design preview.
 *
 * - Everything stays `_status: draft` with `translationStatus: in-review`; guests never see it.
 * - Images are created with `publicRelease: false` (private until an editor clears them).
 * - Only names and pack sizes read from the packaging artwork. No claims, concentrations,
 *   company details or descriptions: those wait for the brand's confirmation.
 * - Idempotent: documents are matched by slug, images by filename.
 *
 * Run (local only): npm run payload -- run scripts/import-preview-content.ts
 * Images are read from brand-assets/preview-images/ (git-ignored; see docs/image-audit.md).
 */
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'

if (process.env.NODE_ENV === 'production') throw new Error('Preview content is for local development only')

const imageDir = path.resolve(process.cwd(), 'brand-assets/preview-images')
const locales = ['ko', 'en', 'vi'] as const
type Localized = Record<(typeof locales)[number], string>

const lines = [
  { slug: 'rx', order: 1, appearance: 'light', name: { ko: 'RX', en: 'RX', vi: 'RX' } },
  { slug: 'mx', order: 2, appearance: 'dark', name: { ko: 'MX', en: 'MX', vi: 'MX' } },
] as const

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
  for (const locale of locales) {
    await payload.update({ collection: 'media', id, locale, data: { alt: alt[locale] }, overrideAccess: true })
  }
  return id
}

async function upsertDraft(
  payload: Payload,
  collection: 'product-lines' | 'products',
  slug: string,
  shared: Record<string, unknown>,
  localized: Record<string, Localized>,
) {
  const found = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    draft: true,
    overrideAccess: true,
  })
  let id = found.docs[0]?.id
  for (const [i, locale] of locales.entries()) {
    const data = {
      ...(i === 0 ? { ...shared, slug } : {}),
      ...Object.fromEntries(Object.entries(localized).map(([k, v]) => [k, v[locale]])),
      translationStatus: 'in-review' as const,
    }
    if (!id) {
      const created = await payload.create({ collection, locale, draft: true, data: data as never, overrideAccess: true })
      id = created.id
    } else {
      await payload.update({ collection, id, locale, draft: true, data: data as never, overrideAccess: true })
    }
  }
  return id!
}

const payload = await getPayload({ config })
const lineIds: Record<string, number | string> = {}
for (const line of lines) {
  lineIds[line.slug] = await upsertDraft(
    payload,
    'product-lines',
    line.slug,
    { order: line.order, appearance: line.appearance },
    { name: line.name },
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

for (const locale of locales) {
  await payload.updateGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    data: { featuredProducts: productIds as never, translationStatus: 'in-review' },
    overrideAccess: true,
  })
}

payload.logger.info(`Preview drafts ready: ${lines.length} lines, ${products.length} products (nothing published)`)
process.exit(0)
