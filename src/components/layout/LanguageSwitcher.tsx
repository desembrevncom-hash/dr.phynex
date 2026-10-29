import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { localeLabels, locales, type Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

type Props = {
  locale: Locale
  /** Locale-less path of the current page. */
  path: string
  /** Locales where this exact page is published + approved. */
  available: readonly Locale[]
}

/** Keeps the visitor on the same page; locales without an approved translation are shown disabled. */
export async function LanguageSwitcher({ locale, path, available }: Props) {
  const t = await getTranslations('common')

  return (
    <nav aria-label={t('language')}>
      <ul className="flex items-center gap-1 text-sm">
        {locales.map((l) => {
          const label = localeLabels[l]
          if (l === locale) {
            return (
              <li key={l}>
                <span aria-current="true" lang={l} className="rounded px-2 py-1 font-semibold text-ink">
                  {label}
                </span>
              </li>
            )
          }
          if (!available.includes(l)) {
            return (
              <li key={l}>
                <span
                  lang={l}
                  aria-disabled="true"
                  title={t('languageUnavailable')}
                  className="cursor-not-allowed rounded px-2 py-1 text-ink-subtle line-through"
                >
                  {label}
                  <span className="sr-only"> ({t('languageUnavailable')})</span>
                </span>
              </li>
            )
          }
          return (
            <li key={l}>
              <Link
                href={localizedPath(l, path)}
                hrefLang={l}
                lang={l}
                className="rounded px-2 py-1 text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
