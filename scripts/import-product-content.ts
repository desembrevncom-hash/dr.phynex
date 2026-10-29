/**
 * Loads product detail content transcribed from the packaging (scripts/data/product-content.ts)
 * into the CMS as unpublished drafts, and attaches the packaging PDFs as private source documents.
 *
 * Safe to re-run:
 * - products/ingredients matched by slug, source documents by filename: nothing is duplicated;
 * - fill-only: a field is written only while it is empty, so edits made in the CMS are kept;
 * - documents that are published or have any approved language are skipped entirely;
 * - `_status` is never changed, and translationStatus is only set when a document is created.
 *
 * Each product gets a staff-only editorial note per language recording where that language
 * version came from (packaging / translation / AI-proposed) and open questions for the brand.
 *
 * Run (local only, after scripts/import-preview-content.ts):
 *   npm run payload -- run scripts/import-product-content.ts
 * Needs brand-assets/packaging/*.pdf (git-ignored).
 */
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'
import { ingredients, products, type L, type ProductContent } from './data/product-content'
import { isLocked, onlyEmpty } from './lib/fill'

if (process.env.NODE_ENV === 'production') throw new Error('Draft content import is for local development only')

const locales = ['ko', 'en', 'vi'] as const
type Locale = (typeof locales)[number]
const statusOnCreate = (locale: Locale): 'ai-draft' | 'in-review' => (locale === 'vi' ? 'ai-draft' : 'in-review')
const packagingDir = path.resolve(process.cwd(), 'brand-assets/packaging')

/** Minimal Lexical document: one paragraph per entry. */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      textFormat: 0,
      children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
    })),
  },
})

function editorialNote(p: ProductContent, locale: Locale) {
  const lines = {
    ko: [
      `Tiếng Hàn: CHÉP TỪ BAO BÌ, ${p.sources.ko}. Cần thương hiệu kiểm tra bản chép.`,
      'Mô tả ngắn: AI ĐỀ XUẤT (rút gọn từ mô tả trên bao bì, không in nguyên văn).',
    ],
    en: [
      `Tiếng Anh: mô tả, cách dùng, lưu ý, INCI CHÉP TỪ BAO BÌ, ${p.sources.en}.`,
      'Công dụng: BẢN DỊCH (AI dịch từ mục [효능/효과] tiếng Hàn, bao bì tiếng Anh không có mục này).',
      'Mô tả ngắn: AI ĐỀ XUẤT.',
    ],
    vi: [
      'Tiếng Việt: BẢN DỊCH do AI dịch từ nội dung tiếng Hàn trên bao bì; cần người bản ngữ duyệt.',
      'Tên sản phẩm tiếng Việt: do khách cung cấp ngày 29/10/2026. Mô tả ngắn: AI ĐỀ XUẤT.',
    ],
  }[locale]
  return [...lines, `Thành phần nổi bật: ${p.sources.front}.`, ...(p.issues ?? []).map((i) => `CẦN XÁC NHẬN: ${i}`)].join('\n')
}

async function upsertSourceDocument(payload: Payload, filename: string, title: string) {
  const found = await payload.find({
    collection: 'source-documents',
    where: { filename: { equals: filename } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0].id
  const data = fs.readFileSync(path.join(packagingDir, filename))
  const created = await payload.create({
    collection: 'source-documents',
    data: { title, note: 'Final packaging artwork (Vietnam import). Copy in brand-assets/packaging/.' },
    file: { data, mimetype: 'application/pdf', name: filename, size: data.length },
    overrideAccess: true,
  })
  return created.id
}

/** Create if missing; otherwise fill empty fields only, per language. Locked documents are skipped. */
async function fillBySlug(
  payload: Payload,
  collection: 'ingredients' | 'products',
  slug: string,
  perLocale: (locale: Locale) => Record<string, unknown>,
  shared: Record<string, unknown> = {},
  { mustExist = false } = {},
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
  let id = current[0]?.id as number | string | undefined
  if (!id) {
    if (mustExist) throw new Error(`Run scripts/import-preview-content.ts first: ${collection}/${slug} is missing`)
    for (const [i, locale] of locales.entries()) {
      const data = { ...(i === 0 ? { ...shared, slug } : {}), ...perLocale(locale), translationStatus: statusOnCreate(locale) }
      if (!id) id = (await payload.create({ collection, locale, draft: true, data: data as never, overrideAccess: true })).id
      else await payload.update({ collection, id, locale, draft: true, data: data as never, overrideAccess: true })
    }
    return { id: id!, changed: true }
  }
  if (isLocked(current as never)) {
    payload.logger.warn(`${collection}/${slug} is published or approved: left untouched`)
    return { id, changed: false }
  }
  let changed = false
  for (const [i, locale] of locales.entries()) {
    const data = onlyEmpty(current[i], { ...(i === 0 ? shared : {}), ...perLocale(locale) })
    if (Object.keys(data).length === 0) continue
    await payload.update({ collection, id, locale, draft: true, data: data as never, overrideAccess: true })
    changed = true
  }
  return { id, changed }
}

const payload = await getPayload({ config })
const pick = (l: L, locale: Locale) => l[locale]

const sourceIds: Record<string, number | string> = {}
for (const p of products) {
  sourceIds[p.slug] = await upsertSourceDocument(payload, p.sourceFile, `Packaging artwork: ${p.slug} (${p.sourceFile})`)
}

const ingredientIds: Record<string, number | string> = {}
let ingredientsChanged = 0
for (const ing of ingredients) {
  const r = await fillBySlug(payload, 'ingredients', ing.slug, (locale) => ({ name: pick(ing.name, locale) }), {
    inciName: ing.inciName,
    sources: [{ title: 'Named on the front of the packaging (see product sources)', note: 'No ingredient description supplied yet.' }],
  })
  ingredientIds[ing.slug] = r.id
  if (r.changed) ingredientsChanged++
}

let productsChanged = 0
for (const p of products) {
  const r = await fillBySlug(
    payload,
    'products',
    p.slug,
    (locale) => ({
      shortDescription: pick(p.shortDescription, locale),
      description: richText([pick(p.description, locale)]),
      howToUse: richText(p.howToUse[locale]),
      cautions: richText(p.cautions[locale]),
      editorialNote: editorialNote(p, locale),
      claims: p.claims.map((c) => ({
        text: pick(c.text, locale),
        sourceDocument: c.source,
        sourceFile: sourceIds[p.slug],
        sourceNote: c.note,
      })),
    }),
    { inci: p.inci, keyIngredients: p.ingredients.map((s) => ingredientIds[s]) },
    { mustExist: true },
  )
  if (r.changed) productsChanged++
}

payload.logger.info(
  `Product content checked: ${productsChanged}/${products.length} products and ${ingredientsChanged}/${ingredients.length} ingredients had empty fields filled; ${Object.keys(sourceIds).length} source documents (fill-only, nothing published)`,
)
process.exit(0)
