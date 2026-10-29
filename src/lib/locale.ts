import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { isLocale, type Locale } from '@/i18n/locales'

export type LocaleParams = Promise<{ locale: string }>
export type SlugParams = Promise<{ locale: string; slug: string }>
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function pageLocale(params: LocaleParams): Promise<Locale> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)
  return locale
}

export const firstParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined
