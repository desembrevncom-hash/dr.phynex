import type { MetadataRoute } from 'next'

import { legalSlugs } from '@/collections/LegalPages'
import { locales, routingDefaultLocale, type Locale } from '@/i18n/locales'

import { siteURL } from './seo'

type Doc = { slug: string; updatedAt?: string | null }

/** What a guest can see in one locale (published + approved only). */
export type LocaleContent = {
  products: Doc[]
  productLines: Doc[]
  articles: Doc[]
  ingredients: Doc[]
  technologies: Doc[]
  legalPages: Doc[]
  storeCount: number
  /** Globals published and approved in this locale. */
  brandPage: boolean
}

type Entry = { path: string; lastModified?: string | null }

/**
 * Pages worth listing for a locale. Home, Contact and Partnership always exist (navigation and
 * working forms); listing pages appear only when they list something; everything else only
 * when published and approved in that locale. Drafts and unapproved translations never appear.
 */
export function sitemapPaths(content: LocaleContent): Entry[] {
  const entries: Entry[] = [{ path: '' }, { path: '/contact' }, { path: '/partnership' }]
  if (content.brandPage) entries.push({ path: '/brand' })
  if (content.products.length > 0) entries.push({ path: '/products' })
  if (content.ingredients.length + content.technologies.length > 0) entries.push({ path: '/ingredients' })
  if (content.articles.length > 0) entries.push({ path: '/journal' })
  if (content.storeCount > 0) entries.push({ path: '/stores' })
  const docs = (prefix: string, list: Doc[]) => list.map((d) => ({ path: `${prefix}${d.slug}`, lastModified: d.updatedAt }))
  entries.push(
    ...docs('/products/line/', content.productLines),
    ...docs('/products/', content.products),
    ...docs('/journal/', content.articles),
    ...docs('/ingredients/', content.ingredients),
    ...docs('/technologies/', content.technologies),
    // Only slugs that have a route (/privacy, /terms); others would be 404.
    ...docs('/', content.legalPages.filter((d) => (legalSlugs as readonly string[]).includes(d.slug))),
  )
  return entries
}

/** Builds the sitemap with hreflang alternates limited to locales where the same page is listed. */
export function buildSitemap(byLocale: Record<Locale, LocaleContent>): MetadataRoute.Sitemap {
  const perLocale = locales.map((locale) => ({ locale, entries: sitemapPaths(byLocale[locale]) }))
  const localesByPath = new Map<string, Locale[]>()
  for (const { locale, entries } of perLocale) {
    for (const { path } of entries) localesByPath.set(path, [...(localesByPath.get(path) ?? []), locale])
  }
  return perLocale.flatMap(({ locale, entries }) =>
    entries.map(({ path, lastModified }) => {
      const available = localesByPath.get(path) ?? [locale]
      const languages: Record<string, string> = {}
      for (const l of available) languages[l] = `${siteURL}/${l}${path}`
      if (available.includes(routingDefaultLocale)) languages['x-default'] = `${siteURL}/${routingDefaultLocale}${path}`
      return {
        url: `${siteURL}/${locale}${path}`,
        ...(lastModified ? { lastModified } : {}),
        alternates: { languages },
      }
    }),
  )
}
