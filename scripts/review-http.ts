import { withContentLocaleGuard } from '../src/lib/content-mutations'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local', override: true })
import { randomUUID } from 'crypto'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { assertDisposableDatabase } from '../tests/helpers/database'

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = withContentLocaleGuard(await getPayload({ config }))
  await assertDisposableDatabase(payload)
  const suffix = randomUUID().slice(0, 8)
  const origin = 'http://localhost:3015'
  let checks = 0
  const check = (value: unknown, label: string) => {
    assert.ok(value, label)
    checks++
    console.log('PASS ' + label)
  }
  const read = async (path: string) => {
    const response = await fetch(origin + path, { redirect: 'manual' })
    return { response, html: await response.text() }
  }
  try {
    const topic = await payload.create({
      collection: 'journal-topics',
      locale: 'en',
      data: {
        name: 'Review topic',
        slug: 'review-topic-' + suffix,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'journal-topics',
      id: topic.id,
      locale: 'ko',
      data: { name: 'Review topic KO', translationStatus: 'approved', _status: 'published' },
    })
    let firstArticle = 0
    for (let i = 1; i <= 25; i++) {
      const article = await payload.create({
        collection: 'articles',
        locale: 'en',
        data: {
          title: 'Review article ' + i,
          slug: 'review-' + suffix + '-' + i,
          topic: topic.id,
          publishedAt: new Date(Date.UTC(2026, 9, i)).toISOString(),
          translationStatus: 'approved',
          _status: 'published',
        },
      })
      if (i === 1) firstArticle = article.id
    }
    await payload.update({
      collection: 'articles',
      id: firstArticle,
      locale: 'ko',
      data: { title: 'Review article KO', translationStatus: 'approved', _status: 'published' },
    })
    const query = '?topic=' + topic.slug + '&page=2'
    const journal = await read('/en/journal' + query)
    check(
      journal.response.status === 200 && journal.html.includes('Review article 1</h2>'),
      'Journal page 2 contains the older article',
    )
    check(
      journal.html.includes('/ko/journal?topic=' + topic.slug + '&amp;page=2'),
      'language switch keeps topic and page',
    )
    const ko = await read('/ko/journal' + query)
    check(
      ko.response.status === 307 &&
        ko.response.headers.get('location') === '/ko/journal?topic=' + topic.slug,
      'target locale clamps page to available articles',
    )
    const invalid = await read('/en/journal?topic=' + topic.slug + '&page=999')
    check(
      invalid.response.status === 307 &&
        invalid.response.headers.get('location') === '/en/journal' + query,
      'out-of-range page redirects to last valid page',
    )
    const slug = 'review-collision-' + suffix
    const ingredient = await payload.create({
      collection: 'ingredients',
      locale: 'en',
      data: {
        name: 'Review distinct ingredient',
        slug,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    const technology = await payload.create({
      collection: 'technologies',
      locale: 'en',
      data: {
        name: 'Review distinct technology',
        slug,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    for (const [kind, label] of [
      ['ingredients', 'Review distinct ingredient'],
      ['technologies', 'Review distinct technology'],
    ]) {
      const page = await read('/en/' + kind + '/' + slug)
      check(
        page.response.status === 200 && page.html.includes(label + '</h1>'),
        kind + ' has its own detail URL despite identical slug',
      )
    }
    const sitemap = await read('/sitemap.xml')
    check(
      sitemap.html.includes('/en/ingredients/' + slug) &&
        sitemap.html.includes('/en/technologies/' + slug),
      'sitemap has both namespaces',
    )
    const oldTech = await payload.create({
      collection: 'technologies',
      locale: 'en',
      data: {
        name: 'Review legacy technology',
        slug: 'review-legacy-' + suffix,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    const legacy = await read('/en/ingredients/' + oldTech.slug)
    check(
      legacy.response.status === 308 &&
        legacy.response.headers.get('location') === '/en/technologies/' + oldTech.slug,
      'unambiguous legacy technology URL redirects',
    )
    const p = await payload.create({
      collection: 'products',
      locale: 'en',
      data: {
        name: 'Review approved product',
        accent: 'navy',
        slug: 'review-product-' + suffix,
        keyIngredients: [ingredient.id],
        technologies: [technology.id],
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    const productPath = '/en/products/' + p.slug
    let page = await read(productPath)
    check(
      page.response.status === 200 &&
        page.html.includes('/en/technologies/' + slug) &&
        page.html.includes('/en/ingredients/' + slug),
      'product links distinguish ingredient and technology',
    )
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      draft: true,
      data: { name: 'UNREVIEWED HTTP product', translationStatus: 'in-review' },
    })
    page = await read(productPath)
    check(
      page.response.status === 200 && !page.html.includes('UNREVIEWED HTTP product'),
      'pending draft does not enter public HTML or metadata',
    )
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      data: { _status: 'draft' },
    })
    page = await read(productPath)
    check(
      page.response.status === 404 && !page.html.includes('Review approved product'),
      'unpublish takes effect on next HTTP request',
    )
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      draft: true,
      data: { name: 'Review approved product' },
    })
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      draft: true,
      data: { translationStatus: 'approved' },
    })
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      data: { _status: 'published' },
    })
    check((await read(productPath)).response.status === 200, 'republish is visible immediately')
    await payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      data: { translationStatus: 'in-review', _status: 'published' },
    })
    check(
      (await read(productPath)).response.status === 404,
      'approval withdrawal is visible immediately',
    )
    const existing = await payload.find({
      collection: 'legal-pages',
      where: { slug: { equals: 'privacy' } },
      limit: 1,
    })
    const legalData = {
      title: 'Review privacy',
      slug: 'privacy' as const,
      translationStatus: 'approved' as const,
      _status: 'published' as const,
    }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'legal-pages',
        id: existing.docs[0].id,
        locale: 'en',
        draft: true,
        data: { title: legalData.title },
      })
      await payload.update({
        collection: 'legal-pages',
        id: existing.docs[0].id,
        locale: 'en',
        draft: true,
        data: { translationStatus: 'approved' },
      })
      await payload.update({
        collection: 'legal-pages',
        id: existing.docs[0].id,
        locale: 'en',
        data: { _status: 'published' },
      })
    } else await payload.create({ collection: 'legal-pages', locale: 'en', data: legalData })
    const legal = await read('/en/privacy')
    const alternates = legal.html.match(/<link[^>]+rel="alternate"[^>]*>/gi) || []
    check(
      alternates.some((x) => /hrefLang="en"/i.test(x)) &&
        !alternates.some((x) => /hrefLang="vi"/i.test(x)),
      'legal hreflang excludes unapproved VI',
    )
    const data = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
      'base64',
    )
    const m = await payload.create({
      collection: 'media',
      locale: 'en',
      data: { alt: 'Review image', publicRelease: true },
      file: {
        data,
        name: 'review-http-' + suffix + '.png',
        mimetype: 'image/png',
        size: data.length,
      },
    })
    const path = '/api/media/file/' + m.filename
    const before = await fetch(origin + path)
    check(
      before.status === 200 && before.headers.get('cache-control')?.includes('no-store'),
      'released original is no-store',
    )
    await before.body?.cancel()
    const optimizer = '/_next/image?url=' + encodeURIComponent(path) + '&w=640&q=75'
    check(
      (await fetch(origin + optimizer)).status === 410,
      'historical optimizer URL is denied before cache lookup',
    )
    await payload.update({
      collection: 'media',
      id: m.id,
      locale: 'en',
      data: { publicRelease: false },
    })
    check(
      (await fetch(origin + path)).status === 403 &&
        (await fetch(origin + optimizer)).status === 410,
      'revoked original and optimizer URL both denied',
    )
    console.log('HTTP review checks passed: ' + checks)
  } finally {
    await payload.destroy()
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'HTTP review failed')
    process.exit(1)
  })
