import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { localeLabels, locales, type Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

type Props = {
  locale: Locale
  /** Locale-less path of the current page. */
  path: string
  /** Query string to keep (filters whose values are the same in every language). */
  search?: string
  /** Locales where this exact page is published + approved. */
  available: readonly Locale[]
}

/**
 * Keeps the visitor on the same page; locales without an approved translation are shown
 * disabled. Shows short codes (KO / EN / VI) with the full language name for assistive tech.
 */
export async function LanguageSwitcher({ locale, path, search = '', available }: Props) {
  const t = await getTranslations('common')
  const base = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm tracking-wide'

  return (
    <nav aria-label={t('language')}>
      <ul className="flex items-center">
        {locales.map((l) => {
          const code = l.toUpperCase()
          const name = <span className="sr-only">{localeLabels[l]}</span>
          if (l === locale) {
            return (
              <li key={l}>
                <span aria-current="true" lang={l} className={`${base} font-semibold text-navy underline decoration-2 underline-offset-8`}>
                  <span aria-hidden="true">{code}</span>
                  {name}
                </span>
              </li>
            )
          }
          if (!available.includes(l)) {
            return (
              <li key={l}>
                <span lang={l} aria-disabled="true" title={t('languageUnavailable')} className={`${base} cursor-not-allowed text-ink-subtle line-through`}>
                  <span aria-hidden="true">{code}</span>
                  {name}
                  <span className="sr-only"> ({t('languageUnavailable')})</span>
                </span>
              </li>
            )
          }
          return (
            <li key={l}>
              <Link href={`${localizedPath(l, path)}${search}`} hrefLang={l} lang={l} className={`${base} text-ink-muted hover:text-navy`}>
                <span aria-hidden="true">{code}</span>
                {name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
