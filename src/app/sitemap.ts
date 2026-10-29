import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/locales'
import { findPublic } from '@/lib/content'
import { siteURL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const staticPaths = ['', '/brand', '/products', '/ingredients', '/journal', '/stores', '/contact', '/partnership']

/** Only lists documents that are published and approved in each locale. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    for (const path of staticPaths) entries.push({ url: `${siteURL}/${locale}${path}` })

    const [products, articles, ingredients, technologies] = await Promise.all([
      findPublic('products', locale, { limit: 1000, depth: 0 }),
      findPublic('articles', locale, { limit: 1000, depth: 0 }),
      findPublic('ingredients', locale, { limit: 1000, depth: 0 }),
      findPublic('technologies', locale, { limit: 1000, depth: 0 }),
    ])
    for (const d of products.docs) entries.push({ url: `${siteURL}/${locale}/products/${d.slug}`, lastModified: d.updatedAt })
    for (const d of articles.docs) entries.push({ url: `${siteURL}/${locale}/journal/${d.slug}`, lastModified: d.updatedAt })
    for (const d of [...ingredients.docs, ...technologies.docs]) {
      entries.push({ url: `${siteURL}/${locale}/ingredients/${d.slug}`, lastModified: d.updatedAt })
    }
  }
  return entries
}
