import type { MetadataRoute } from 'next'

import { locales, type Locale } from '@/i18n/locales'
import { findGuestGlobal, findPublic } from '@/lib/content'
import { buildSitemap, type LocaleContent } from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

/** Guest view only (never a preview session): published and approved content per locale. */
async function localeContent(locale: Locale): Promise<LocaleContent> {
  const guest = { limit: 1000, depth: 0, publicOnly: true } as const
  const [products, productLines, articles, ingredients, technologies, legalPages, stores, brandPage] = await Promise.all([
    findPublic('products', locale, guest),
    findPublic('product-lines', locale, guest),
    findPublic('articles', locale, guest),
    findPublic('ingredients', locale, guest),
    findPublic('technologies', locale, guest),
    findPublic('legal-pages', locale, guest),
    findPublic('stores', locale, { ...guest, limit: 1 }),
    findGuestGlobal('brand-page', locale),
  ])
  return {
    products: products.docs,
    productLines: productLines.docs,
    articles: articles.docs,
    ingredients: ingredients.docs,
    technologies: technologies.docs,
    legalPages: legalPages.docs,
    storeCount: stores.totalDocs,
    brandPage: Boolean(brandPage),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await Promise.all(locales.map(async (locale) => [locale, await localeContent(locale)] as const))
  return buildSitemap(Object.fromEntries(entries) as Record<Locale, LocaleContent>)
}
