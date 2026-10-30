import type { Locale } from '@/i18n/locales'

import { siteName, siteURL, type SocialImage } from './seo'

/**
 * schema.org JSON-LD built only from data the page itself shows. No ratings, reviews, prices,
 * offers, origins or certifications are emitted: the site sells nothing and has none approved.
 */
type Thing = Record<string, unknown>

export const organizationId = `${siteURL}/#organization`
const websiteId = (locale: Locale) => `${siteURL}/${locale}#website`

const absolute = (path: string) => (path.startsWith('http') ? path : `${siteURL}${path}`)

export function organizationLd(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId,
    name: siteName,
    url: siteURL,
    logo: `${siteURL}/brand/drphynex-logo-web.svg`,
  }
}

export function websiteLd(locale: Locale): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(locale),
    name: siteName,
    url: `${siteURL}/${locale}`,
    inLanguage: locale,
    publisher: { '@id': organizationId },
  }
}

/** Breadcrumb trail; the last item is the current page and carries no `item` URL. */
export function breadcrumbLd(items: { name: string; path?: string }[]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.path && i < items.length - 1 ? { item: absolute(item.path) } : {}),
    })),
  }
}

export function articleLd(args: {
  locale: Locale
  path: string
  headline: string
  description?: string | null
  author?: string | null
  datePublished?: string | null
  dateModified?: string | null
  image?: SocialImage | null
}): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.headline,
    ...(args.description ? { description: args.description } : {}),
    inLanguage: args.locale,
    url: absolute(args.path),
    mainEntityOfPage: absolute(args.path),
    ...(args.datePublished ? { datePublished: args.datePublished } : {}),
    ...(args.dateModified ? { dateModified: args.dateModified } : {}),
    ...(args.author ? { author: { '@type': 'Person', name: args.author } } : {}),
    ...(args.image ? { image: [args.image.url] } : {}),
    publisher: { '@id': organizationId },
  }
}

export function productLd(args: {
  locale: Locale
  path: string
  name: string
  description?: string | null
  sku?: string | null
  image?: SocialImage | null
}): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: args.name,
    ...(args.description ? { description: args.description } : {}),
    url: absolute(args.path),
    inLanguage: args.locale,
    ...(args.sku ? { sku: args.sku } : {}),
    ...(args.image ? { image: [args.image.url] } : {}),
    // Brand only: the packaging names a different company as manufacturer, so none is claimed here.
    brand: { '@type': 'Brand', name: siteName },
  }
}

// Built from code points so the source never contains the raw separator characters.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g')
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g')

/** JSON for a <script> element: escapes characters that could close the tag or break parsing. */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029')
}
