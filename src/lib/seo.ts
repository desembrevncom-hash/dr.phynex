import type { Metadata } from 'next'

import { locales, routingDefaultLocale, type Locale } from '@/i18n/locales'

export const siteURL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

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
