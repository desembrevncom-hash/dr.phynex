/* eslint-disable @next/next/no-img-element -- the logo is the brand's original SVG, shown unmodified */
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { locales, type Locale } from '@/i18n/locales'
import { getPreviewUser } from '@/lib/preview'
import { localizedPath } from '@/lib/seo'

import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'

const mainNav = [
  ['products', '/products'],
  ['ingredients', '/ingredients'],
  ['brand', '/brand'],
  ['journal', '/journal'],
  ['stores', '/stores'],
  ['partnership', '/partnership'],
  ['contact', '/contact'],
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
  /** Full-width sections manage their own container (home page). */
  bleed?: boolean
  children: ReactNode
}

function Logo({ className }: { className: string }) {
  // Original artwork, 1280×462 viewBox. Shown on light backgrounds only (DESIGN.md §2).
  return <img src="/brand/drphynex-logo.svg" alt="" width={1280} height={462} className={className} />
}

export async function PageShell({ locale, path, available = locales, bleed = false, children }: Props) {
  const [t, preview] = await Promise.all([getTranslations(), getPreviewUser()])
  const href = (p: string) => localizedPath(locale, p)
  const items = mainNav.map(([key, p]) => ({
    key,
    label: t(`nav.${key}`),
    href: href(p),
    current: path === p || path.startsWith(`${p}/`),
  }))
  const switcher = <LanguageSwitcher locale={locale} path={path} available={available} />

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
      >
        {t('common.skipToContent')}
      </a>

      {preview ? (
        <div role="note" className="bg-navy text-sm text-white">
          <div className="container-page on-dark flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <p>{t('preview.banner')}</p>
            <a href={`/preview/exit?path=${encodeURIComponent(href(path))}`} className="underline underline-offset-4">
              {t('preview.exit')}
            </a>
          </div>
        </div>
      ) : null}

      <header className="relative border-b border-line bg-surface">
        <div className="container-page flex min-h-16 items-center justify-between gap-6 lg:min-h-20">
          <Link href={href('')} className="shrink-0 py-2" aria-label={t('common.logoAlt')}>
            <Logo className="h-10 w-auto lg:h-12" />
          </Link>

          <nav aria-label={t('common.mainNav')} className="hidden lg:block">
            <ul className="flex items-center gap-1 xl:gap-2">
              {items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    className="relative inline-flex min-h-11 items-center px-2 text-sm text-ink-muted transition-colors hover:text-navy aria-[current=page]:text-navy after:absolute after:inset-x-2 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-navy after:transition-transform hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <div className="hidden lg:block">{switcher}</div>
            <MobileMenu
              items={items}
              menuLabel={t('nav.menu')}
              closeLabel={t('nav.close')}
              navLabel={t('common.mainNav')}
              footer={switcher}
            />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`flex-1 focus:outline-none ${bleed ? '' : 'container-page py-10 lg:py-16'}`}>
        {children}
      </main>

      <footer className="border-t border-navy bg-surface">
        <div className="container-page grid gap-10 py-12 md:grid-cols-[auto_1fr] md:gap-16 lg:py-16">
          <Link href={href('')} aria-label={t('common.logoAlt')} className="self-start">
            <Logo className="h-12 w-auto" />
          </Link>
          <nav aria-label={t('common.footerNav')} className="grid gap-8 sm:grid-cols-2 md:justify-self-end">
            <ul className="grid gap-1 text-sm">
              {items.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="inline-flex min-h-9 items-center text-ink-muted hover:text-navy">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="grid content-start gap-1 text-sm">
              {legalNav.map(([key, p]) => (
                <li key={key}>
                  <Link href={href(p)} className="inline-flex min-h-9 items-center text-ink-muted hover:text-navy">
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  )
}
