/**
 * Seeds clearly marked TEST content into the separate acceptance database only:
 * a journal topic, a long and a short article, and long privacy/terms pages, with mixed
 * per-language approval so list, detail, empty and language-switch states can be checked.
 * Refuses to run against any other database. Run:
 *   npm run payload -- run scripts/acceptance/seed-test-content.ts
 */
process.env.DATABASE_URL = process.env.DATABASE_URL!.replace(/\/([^/?]+)(\?|$)/, '/drphynex_acceptance$2')
if (!process.env.DATABASE_URL.includes('/drphynex_acceptance')) throw new Error('Acceptance database only')
const { getPayload } = await import('payload')
const { withContentLocaleGuard } = await import('../../src/lib/content-mutations')
const { default: config } = await import('../../src/payload.config')
const payload = withContentLocaleGuard(await getPayload({ config: await config }))

const locales = ['ko', 'en', 'vi'] as const
type Locale = (typeof locales)[number]
const para = (text: string) => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0,
  children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
})
const heading = (text: string) => ({
  type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
})
const doc = (children: unknown[]) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children } })
const long = (label: string) =>
  doc(
    Array.from({ length: 6 }, (_, i) => [
      heading(`${label} — mục ${i + 1} / section ${i + 1} / 섹션 ${i + 1}`),
      para(`[TEST] ${label}. Đoạn văn dài để kiểm tra xuống dòng, độ rộng dòng và khoảng cách. Nội dung thử nghiệm, không phải văn bản thật của thương hiệu. 테스트용 긴 문단입니다. This is placeholder text for layout testing only, repeated to reach a realistic length for a policy or article page. `.repeat(3)),
    ]).flat(),
  )

const titles: Record<Locale, string> = { ko: '[TEST] 아주 긴 제목의 테스트 아티클: 줄바꿈과 레이아웃 확인용', en: '[TEST] A very long article title used only to check wrapping and layout', vi: '[TEST] Tiêu đề bài viết rất dài chỉ dùng để kiểm tra xuống dòng và bố cục' }

async function upsert(collection: 'journal-topics' | 'articles' | 'legal-pages', slug: string, perLocale: (l: Locale) => Record<string, unknown>, approved: Locale[], shared: Record<string, unknown> = {}) {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, overrideAccess: true, limit: 1 })
  let id = found.docs[0]?.id
  for (const [i, locale] of locales.entries()) {
    const data = { ...(i === 0 ? { ...shared, slug } : {}), ...perLocale(locale), translationStatus: approved.includes(locale) ? 'approved' : 'in-review', _status: 'published' }
    if (!id) id = (await payload.create({ collection, locale, data: data as never, overrideAccess: true })).id
    else await payload.update({ collection, id, locale, data: data as never, overrideAccess: true })
  }
  return id!
}

const topic = await upsert('journal-topics', 'test-topic', (l) => ({ name: { ko: '[TEST] 주제', en: '[TEST] Topic', vi: '[TEST] Chủ đề' }[l] }), ['ko', 'en', 'vi'])
await upsert('articles', 'test-long-article', (l) => ({ title: titles[l], excerpt: `[TEST] ${titles[l]}`, body: long(titles[l]) }), ['ko', 'en', 'vi'], { topic, author: 'TEST', publishedAt: '2026-10-29T00:00:00.000Z' })
await upsert('articles', 'test-ko-only', (l) => ({ title: `[TEST] ${l.toUpperCase()} short article`, body: doc([para('[TEST] short')]) }), ['ko'], { publishedAt: '2026-10-28T00:00:00.000Z' })
await upsert('legal-pages', 'privacy', (l) => ({ title: { ko: '[TEST] 개인정보 처리방침', en: '[TEST] Privacy policy', vi: '[TEST] Chính sách bảo mật' }[l], body: long('Privacy') }), ['ko', 'en'], { slug: 'privacy' })
await upsert('legal-pages', 'terms', (l) => ({ title: { ko: '[TEST] 이용약관', en: '[TEST] Terms of use', vi: '[TEST] Điều khoản sử dụng' }[l], body: long('Terms') }), ['ko', 'en', 'vi'], { slug: 'terms' })
payload.logger.info('Acceptance test content ready (drphynex_acceptance only)')
process.exit(0)

export {}
