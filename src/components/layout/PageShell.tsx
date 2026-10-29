import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { locales, type Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

import { LanguageSwitcher } from './LanguageSwitcher'

const mainNav = [
  ['brand', '/brand'],
  ['products', '/products'],
  ['ingredients', '/ingredients'],
  ['journal', '/journal'],
  ['stores', '/stores'],
  ['contact', '/contact'],
  ['partnership', '/partnership'],
] as const

const legalNav = [
  ['privacy', '/privacy'],
  ['terms', '/terms'],
] as const

type Props = {
  locale: Locale
  path: string
  /** Locales where this page exists; defaults to all (UI-only pages). */
  available?: readonly Locale[]
  children: ReactNode
}

export async function PageShell({ locale, path, available = locales, children }: Props) {
  const t = await getTranslations()
  const href = (p: string) => localizedPath(locale, p)

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
      >
        {t('common.skipToContent')}
      </a>
      <header className="border-b border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href={href('')} className="text-lg font-semibold tracking-tight">
            {t('common.siteName')}
          </Link>
          <LanguageSwitcher locale={locale} path={path} available={available} />
        </div>
        <nav aria-label={t('common.mainNav')} className="container-page pb-3">
          <ul className="-mx-2 flex flex-wrap gap-x-1 gap-y-1 text-sm">
            {mainNav.map(([key, p]) => {
              const current = path === p || path.startsWith(`${p}/`)
              return (
                <li key={key}>
                  <Link
                    href={href(p)}
                    aria-current={current ? 'page' : undefined}
                    className="inline-block rounded px-2 py-2 text-ink-muted hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="container-page flex-1 py-10 focus:outline-none">
        {children}
      </main>

      <footer className="border-t border-line">
        <nav aria-label={t('common.footerNav')} className="container-page flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-ink-muted">
          <span>{t('common.siteName')}</span>
          <ul className="flex gap-4">
            {legalNav.map(([key, p]) => (
              <li key={key}>
                <Link href={href(p)} className="hover:text-ink hover:underline">
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </>
  )
}
