import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { internalHref, RichText } from '@/components/ui/RichText'
import { alternatesFor, publicImage, siteURL, withSocial } from '@/lib/seo'
import { buildSitemap, type LocaleContent } from '@/lib/sitemap'
import { articleLd, breadcrumbLd, organizationLd, productLd, serializeJsonLd, websiteLd } from '@/lib/structured-data'

const empty: LocaleContent = {
  products: [],
  productLines: [],
  articles: [],
  ingredients: [],
  technologies: [],
  legalPages: [],
  storeCount: 0,
  brandPage: false,
}

describe('JSON-LD', () => {
  it('cannot break out of its script element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>', note: `a${String.fromCharCode(0x2028)}b & c` })
    expect(out).not.toMatch(/<\/script>/i)
    expect(out).not.toContain(String.fromCharCode(0x2028))
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })

  it('product markup carries no invented commercial or quality data', () => {
    const ld = productLd({ locale: 'vi', path: '/vi/products/x', name: 'X', description: 'Desc' })
    for (const key of ['offers', 'aggregateRating', 'review', 'manufacturer', 'countryOfOrigin', 'award']) expect(ld).not.toHaveProperty(key)
    expect(ld).toMatchObject({ '@type': 'Product', name: 'X', url: `${siteURL}/vi/products/x`, brand: { '@type': 'Brand' } })
  })

  it('uses inLanguage only on types schema.org allows (CreativeWork family), not on Product', () => {
    expect(productLd({ locale: 'vi', path: '/vi/products/x', name: 'X' })).not.toHaveProperty('inLanguage')
    expect(articleLd({ locale: 'ko', path: '/ko/journal/a', headline: 'A' })).toMatchObject({ inLanguage: 'ko' })
    expect(websiteLd('en')).toMatchObject({ '@type': 'WebSite', inLanguage: 'en' })
    expect(organizationLd()).toMatchObject({ '@type': 'Organization', name: 'Dr.PhynEX' })
  })

  it('article markup omits fields the CMS does not have', () => {
    const ld = articleLd({ locale: 'en', path: '/en/journal/a', headline: 'A' })
    expect(ld).not.toHaveProperty('author')
    expect(ld).not.toHaveProperty('datePublished')
    expect(articleLd({ locale: 'en', path: '/en/journal/a', headline: 'A', author: 'Kim' }).author).toEqual({ '@type': 'Person', name: 'Kim' })
  })

  it('breadcrumb: absolute URLs, last item is the current page without a URL', () => {
    const ld = breadcrumbLd([{ name: 'Products', path: '/en/products' }, { name: 'X' }]) as { itemListElement: Record<string, unknown>[] }
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, item: `${siteURL}/en/products` })
    expect(ld.itemListElement[1]).not.toHaveProperty('item')
  })
})

describe('social metadata', () => {
  it('mirrors title/description/canonical and lists only available alternate locales', () => {
    const meta = withSocial({ title: 'T', description: 'D', alternates: alternatesFor('vi', '/products/x', ['vi', 'ko']) }, 'vi')
    expect(meta.openGraph).toMatchObject({ title: 'T', description: 'D', url: `${siteURL}/vi/products/x`, locale: 'vi_VN', alternateLocale: ['ko_KR'] })
    expect(meta.twitter).toMatchObject({ card: 'summary' })
  })

  it('never uses an image that is not cleared for publication', () => {
    expect(publicImage({ url: '/api/media/file/a.webp', publicRelease: false })).toBeNull()
    expect(publicImage({ url: '/api/media/file/a.webp', publicRelease: true, width: 10, height: 10 })).toMatchObject({ url: `${siteURL}/api/media/file/a.webp` })
    const meta = withSocial({ title: 'T' }, 'en', { image: publicImage({ url: '/x.webp', publicRelease: true }) })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' })
  })
})

describe('sitemap', () => {
  it('with nothing approved lists only the always-present pages', () => {
    const map = buildSitemap({ ko: empty, en: empty, vi: empty })
    expect(map.map((e) => e.url.replace(siteURL, ''))).toEqual(
      ['ko', 'en', 'vi'].flatMap((l) => [`/${l}`, `/${l}/contact`, `/${l}/partnership`]),
    )
  })

  it('lists approved documents per locale with matching hreflang, and only routable legal pages', () => {
    const vi: LocaleContent = {
      ...empty,
      products: [{ slug: 'mx-02-luma', updatedAt: '2026-10-30T00:00:00.000Z' }],
      legalPages: [{ slug: 'privacy' }, { slug: 'not-a-route' }],
    }
    const en: LocaleContent = { ...empty, legalPages: [{ slug: 'privacy' }] }
    const map = buildSitemap({ ko: empty, en, vi })
    const urls = map.map((e) => e.url.replace(siteURL, ''))
    expect(urls).toContain('/vi/products/mx-02-luma')
    expect(urls).toContain('/vi/products')
    expect(urls).not.toContain('/en/products/mx-02-luma')
    expect(urls).not.toContain('/vi/not-a-route')
    const product = map.find((e) => e.url.endsWith('/vi/products/mx-02-luma'))!
    expect(Object.keys(product.alternates!.languages!)).toEqual(['vi'])
    const privacy = map.find((e) => e.url.endsWith('/vi/privacy'))!
    expect(Object.keys(privacy.alternates!.languages!).sort()).toEqual(['en', 'vi', 'x-default'])
  })
})

describe('rich text', () => {
  const doc = (children: unknown[]) => ({ root: { type: 'root', version: 1, children, direction: null, format: '', indent: 0 } })
  const text = (t: string) => ({ type: 'text', version: 1, text: t, format: 0, detail: 0, mode: 'normal', style: '' })

  it('maps internal links to localized routes; unpublished targets render as plain text', () => {
    expect(internalHref({ relationTo: 'products', value: { id: 1, slug: 'rx-matrix-balm' } }, 'vi')).toBe('/vi/products/rx-matrix-balm')
    expect(internalHref({ relationTo: 'articles', value: { id: 1, slug: 'a' } }, 'ko')).toBe('/ko/journal/a')
    expect(internalHref({ relationTo: 'products', value: 7 }, 'vi')).toBeNull()
    expect(internalHref({ relationTo: 'users', value: { id: 1, slug: 'x' } }, 'vi')).toBeNull()

    const link = (doc: unknown) => ({ type: 'link', version: 3, fields: { linkType: 'internal', doc }, children: [text('Balm')] })
    const html = renderToStaticMarkup(
      createElement(RichText, {
        locale: 'vi',
        data: doc([
          { type: 'paragraph', version: 1, children: [link({ relationTo: 'products', value: { id: 1, slug: 'rx-matrix-balm' } })] },
          { type: 'paragraph', version: 1, children: [link({ relationTo: 'products', value: 9 })] },
        ]),
      }),
    )
    expect(html).toContain('href="/vi/products/rx-matrix-balm"')
    expect(html).not.toContain('href="#"')
    expect(html.match(/<a /g)).toHaveLength(1)
  })

  it('never renders an h1 from CMS text', () => {
    const html = renderToStaticMarkup(
      createElement(RichText, {
        locale: 'en',
        data: doc([
          { type: 'heading', tag: 'h1', version: 1, children: [text('Big')] },
          { type: 'heading', tag: 'h3', version: 1, children: [text('Small')] },
        ]),
      }),
    )
    expect(html).not.toContain('<h1')
    expect(html).toContain('<h2>Big</h2>')
    expect(html).toContain('<h3>Small</h3>')
  })
})
