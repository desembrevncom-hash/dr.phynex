import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { localeLabels, locales, type Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

type Props = {
  locale: Locale
  path: string
  search?: string
  available: readonly Locale[]
  /** inline: "KO | EN | VI" (desktop header). list: full names (mobile menu). */
  variant?: 'inline' | 'list'
}

/** Plain links, no JavaScript; keeps path + allowed query, only approved locales stay navigable. */
export async function LanguageSwitcher({
  locale,
  path,
  search = '',
  available,
  variant = 'inline',
}: Props) {
  const t = await getTranslations('common')
  // Visible code stays in the accessible name (label-in-name); the full name follows for AT.
  const text = (l: Locale) =>
    variant === 'inline' ? (
      <>
        {l.toUpperCase()}
        <span className="sr-only"> {localeLabels[l]}</span>
      </>
    ) : (
      `${localeLabels[l]} (${l.toUpperCase()})`
    )
  return (
    <nav aria-label={t('language')} className={`language-switch language-switch-${variant}`}>
      <ul>
        {locales.map((l) => (
          <li key={l}>
            {l === locale ? (
              <span lang={l} aria-current="true">
                {text(l)}
              </span>
            ) : !available.includes(l) ? (
              <span lang={l} aria-disabled="true" title={t('languageUnavailable')}>
                {text(l)}
              </span>
            ) : (
              <Link href={localizedPath(l, path) + search} hrefLang={l} lang={l}>
                {text(l)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
