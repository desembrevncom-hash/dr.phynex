// Shared by the Admin (block header status) and the site (what visitors see). No server imports.

export type LandingBlockType = 'hero' | 'band' | 'split' | 'points' | 'ingredients' | 'details' | 'faq' | 'cta'
export type Tone = 'light' | 'muted' | 'dark' | 'accent'

type Row = Record<string, unknown>
const filled = (v: unknown) => typeof v === 'string' && v.trim() !== ''
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((r) => r && typeof r === 'object') as Row[]) : [])

/** What a product already provides to its landing page (read from the existing fields). */
export type ProductProvides = {
  image: boolean
  packSize: boolean
  inci: boolean
  howToUse: boolean
  cautions: boolean
  keyIngredients: boolean
}

/**
 * `image` answers "is this image usable here?" (Admin: chosen at all; site: populated, i.e. the
 * viewer may read it). Returns the missing items, in Vietnamese for the Admin; an empty list
 * means the block can be shown. `required` items hide the block from visitors; `optional` ones
 * are only reported.
 */
export function blockIssues(
  block: Row,
  provides: ProductProvides,
  image: (value: unknown) => boolean,
): { required: string[]; optional: string[] } {
  const required: string[] = []
  const optional: string[] = []
  switch (block.blockType as LandingBlockType) {
    case 'hero':
      if (!filled(block.tagline)) optional.push('câu giới thiệu')
      if (!image(block.image) && !provides.image) optional.push('ảnh')
      break
    case 'band':
      if (!image(block.image)) required.push('ảnh')
      if (!filled(block.alt)) optional.push('mô tả ảnh (alt)')
      break
    case 'split':
      if (!image(block.image)) required.push('ảnh')
      if (!filled(block.heading) && !filled(block.body)) required.push('tiêu đề hoặc đoạn mô tả')
      break
    case 'points':
      if (!rows(block.items).some((r) => filled(r.title))) required.push('ít nhất một thẻ có tiêu đề')
      break
    case 'ingredients': {
      const items = rows(block.items)
      if (items.length === 0 ? !provides.keyIngredients : !items.some((r) => filled(r.name) || r.ingredient))
        required.push('ít nhất một thành phần')
      break
    }
    case 'details':
      if (
        !(
          (block.showPack !== false && provides.packSize) ||
          (block.showInci !== false && provides.inci) ||
          (block.showHowToUse !== false && provides.howToUse) ||
          (block.showCautions !== false && provides.cautions)
        )
      )
        required.push('dữ liệu quy cách, INCI, cách dùng hoặc lưu ý của sản phẩm')
      break
    case 'faq':
      if (!rows(block.items).some((r) => filled(r.question) && filled(r.answer)))
        required.push('ít nhất một câu hỏi có câu trả lời')
      break
    case 'cta':
      break
  }
  return { required, optional }
}

export const blockTitles: Record<LandingBlockType, string> = {
  hero: 'Hero sản phẩm',
  band: 'Dải ảnh lớn',
  split: 'Ảnh + nội dung',
  points: 'Lưới điểm nổi bật',
  ingredients: 'Thành phần nổi bật',
  details: 'Chi tiết sản phẩm',
  faq: 'Câu hỏi thường gặp',
  cta: 'CTA cuối trang',
}

/** The landing page is used as soon as one block is not hidden; otherwise the existing layout. */
export const landingActive = (blocks: unknown) => rows(blocks).some((b) => b.hidden !== true)

// ---- Shared structure (same in every language) -------------------------------------------------

/** Per-language texts and the staff-only note: everything else in a block is shared structure. */
export const LANDING_TEXT_FIELDS = new Set([
  'tagline', 'intro', 'ctaLabel', 'alt', 'caption', 'heading', 'body', 'title', 'text', 'name',
  'question', 'answer', 'sourceNote', 'blockName',
])

const idOf = (v: unknown) =>
  v && typeof v === 'object' && 'id' in (v as Row) ? (v as Row).id : v

/** Canonical form for comparing what was saved with what is submitted (relations → ids, empty → absent). */
export function canonical(value: unknown, keep: (key: string) => boolean = () => true): unknown {
  if (Array.isArray(value)) return value.map((v) => canonical(v, keep))
  if (value && typeof value === 'object') {
    const o = value as Row
    // A populated upload/relationship (a document) compares by its id.
    if ('id' in o && ('createdAt' in o || 'filename' in o || 'url' in o) && !('blockType' in o)) return o.id
    const out: Row = {}
    for (const key of Object.keys(o).sort()) {
      if (!keep(key)) continue
      const v = canonical(o[key], keep)
      if (v === null || v === undefined || v === '') continue
      out[key] = v
    }
    return out
  }
  return value
}

/** Only the shared part of the landing blocks: block types, order, hide, tone, layout, images. */
export const landingStructure = (blocks: unknown) => canonical(rows(blocks), (key) => !LANDING_TEXT_FIELDS.has(key))
export const landingContent = (blocks: unknown) => canonical(rows(blocks))
export { idOf }
