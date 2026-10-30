import type { Metadata } from 'next'

import { locales, routingDefaultLocale, type Locale } from '@/i18n/locales'

export const siteURL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Brand name as printed on the packaging; identical in every language. */
export const siteName = 'Dr.PhynEX'

/** `path` is the locale-less path, e.g. "" for home or "/products/abc". */
export const localizedPath = (locale: Locale, path: string) => `/${locale}${path}`

/**
 * Canonical + hreflang for the locales where this page is actually available.
 * x-default points at /en when English is available.
 */
export function alternatesFor(locale: Locale, path: string, available: readonly Locale[] = locales): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const l of available) languages[l] = `${siteURL}${localizedPath(l, path)}`
  if (available.includes(routingDefaultLocale)) {
    languages['x-default'] = `${siteURL}${localizedPath(routingDefaultLocale, path)}`
  }
  return { canonical: `${siteURL}${localizedPath(locale, path)}`, languages }
}

export const ogLocales: Record<Locale, string> = { ko: 'ko_KR', en: 'en_US', vi: 'vi_VN' }

export type SocialImage = { url: string; width?: number; height?: number; alt?: string }

/**
 * A CMS image usable in public metadata: only files an editor has cleared for publication
 * (in draft preview staff can read unreleased files; those must never reach share cards).
 */
export function publicImage(media: unknown): SocialImage | null {
  if (!media || typeof media !== 'object') return null
  const m = media as { url?: string | null; publicRelease?: boolean | null; width?: number | null; height?: number | null; alt?: string | null }
  if (!m.publicRelease || !m.url) return null
  const url = m.url.startsWith('http') ? m.url : `${siteURL}${m.url}`
  return { url, width: m.width ?? undefined, height: m.height ?? undefined, alt: m.alt ?? undefined }
}

type SocialOptions = {
  type?: 'website' | 'article'
  image?: SocialImage | null
  publishedTime?: string | null
  modifiedTime?: string | null
}

/**
 * Adds Open Graph and Twitter/X card tags derived from the page's own title, description and
 * canonical, so share previews never contradict the page. Nothing is invented: no fallback
 * description or image is added when the CMS has none.
 */
export function withSocial(meta: Metadata, locale: Locale, options: SocialOptions = {}): Metadata {
  const title = typeof meta.title === 'string' ? meta.title : (meta.title as { absolute?: string } | undefined)?.absolute
  const description = typeof meta.description === 'string' ? meta.description : undefined
  const alternates = meta.alternates ?? undefined
  const url = typeof alternates?.canonical === 'string' ? alternates.canonical : undefined
  const alternateLocale = Object.keys(alternates?.languages ?? {})
    .filter((l): l is Locale => (locales as readonly string[]).includes(l) && l !== locale)
    .map((l) => ogLocales[l])
  const images = options.image ? [options.image] : undefined
  const isArticle = options.type === 'article'

  return {
    ...meta,
    openGraph: {
      siteName,
      title,
      description,
      url,
      locale: ogLocales[locale],
      alternateLocale,
      images,
      ...(isArticle
        ? {
            type: 'article',
            publishedTime: options.publishedTime || undefined,
            modifiedTime: options.modifiedTime || undefined,
          }
        : { type: 'website' }),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images?.map((i) => i.url),
    },
  }
}
