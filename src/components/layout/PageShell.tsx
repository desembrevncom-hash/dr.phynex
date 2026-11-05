/* eslint-disable @next/next/no-img-element -- the logo is the brand's SVG artwork, shown unmodified */
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Suspense, type ReactNode } from 'react'

import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider'
import { ConsentSettingsButton } from '@/components/analytics/ConsentSettingsButton'
import { locales, type Locale } from '@/i18n/locales'
import { trackingConfig } from '@/lib/analytics/config'
import { getPreviewUser } from '@/lib/preview'
import { localizedPath } from '@/lib/seo'
import { productBriefs } from '@/lib/product-brief'

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
  /** Active filter query (e.g. "?line=mx") kept when switching language; slugs are shared. */
  search?: string
  children: ReactNode
}

function Logo({ className }: { className: string }) {
  // Web copy of the original artwork: identical paths, viewBox trimmed to the artwork (1178×330)
  // so it renders larger at the same height. Light backgrounds only (DESIGN.md §2).
  return (
    <img
      src="/brand/drphynex-logo-web.svg"
      alt=""
      width={1178}
      height={330}
      className={className}
    />
  )
}

export async function PageShell({
  locale,
  path,
  available = locales,
  bleed = false,
  search = '',
  children,
}: Props) {
  const [t, preview] = await Promise.all([getTranslations(), getPreviewUser()])
  const href = (p: string) => localizedPath(locale, p)
  // Off by default (env flag + IDs); never in staff preview. The admin has no PageShell.
  const tracking = trackingConfig()
  const trackingOn = tracking.enabled && !preview
  const items = mainNav.map(([key, p]) => ({
    key,
    label: t(`nav.${key}`),
    href: href(p),
    current: path === p || path.startsWith(`${p}/`),
  }))
  const headerItems = [
    ...productBriefs.map((p) => ({
      key: p.slug,
      label: p.name,
      href: href('/products/' + p.slug),
      current: path === '/products/' + p.slug,
    })),
    ...items.filter((i) => i.key === 'brand' || i.key === 'contact'),
  ]
  const switcher = (variant: 'inline' | 'list') => (
    <LanguageSwitcher
      locale={locale}
      path={path}
      search={search}
      available={available}
      variant={variant}
    />
  )
  const productLinks = headerItems.slice(0, productBriefs.length)
  // Agreed footer scope: Brand and Contact only (plus the products and policy links).
  const aboutKeys = ['brand', 'contact']
  const aboutLinks = aboutKeys.flatMap((k) => items.filter((i) => i.key === k))

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
            <a
              href={`/preview/exit?path=${encodeURIComponent(href(path))}`}
              className="underline underline-offset-4"
            >
              {t('preview.exit')}
            </a>
          </div>
        </div>
      ) : null}

      <header className="brand-header">
        <div className="container-page brand-masthead">
          <Link href={href('')} className="brand-logo" aria-label={t('common.logoAlt')}>
            <Logo className="w-full h-auto" />
          </Link>
          <div className="brand-tools">
            <div className="brand-lang-desktop">{switcher('inline')}</div>
            <span className="brand-lang-tag" aria-hidden="true">
              {locale.toUpperCase()}
            </span>
            <MobileMenu
              items={headerItems}
              menuLabel={t('nav.menu')}
              closeLabel={t('nav.close')}
              navLabel={t('common.mainNav')}
              footer={switcher('list')}
            />
          </div>
        </div>
        <nav aria-label={t('common.mainNav')} className="brand-desktop-nav">
          <ul className="container-page">
            {headerItems.map((item) => (
              <li key={item.key}>
                <Link href={item.href} aria-current={item.current ? 'page' : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`flex-1 focus:outline-none ${bleed ? '' : 'container-page py-10 lg:py-16'}`}
      >
        {children}
      </main>

      <footer className="site-footer on-dark">
        <div className="container-page">
          <div className="site-footer-grid">
            <div>
              <p className="site-footer-brand" lang="en">
                Dr.PhynEX
              </p>
              <p className="site-footer-sub" lang="en">
                BIOSCIENCE DERMATOLOGY
              </p>
              <p className="site-footer-tagline" lang="en">
                Science-Driven. Insight-Led. Formula-Focused.
              </p>
            </div>
            <nav aria-label={t('footer.products')}>
              <h2 className="site-footer-heading">{t('footer.products')}</h2>
              <ul className="site-footer-list">
                {productLinks.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t('footer.about')}>
              <h2 className="site-footer-heading">{t('footer.about')}</h2>
              <ul className="site-footer-list">
                {aboutLinks.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="site-footer-bottom">
            <p>
              © 2026 <span lang="en">Dr.PhynEX</span>. {t('footer.rights')}
            </p>
            <ul aria-label={t('common.footerNav')} className="site-footer-legal">
              {legalNav.map(([key, p]) => (
                <li key={key}>
                  <Link href={href(p)}>{t(`nav.${key}`)}</Link>
                </li>
              ))}
              {trackingOn ? (
                <li>
                  <ConsentSettingsButton label={t('consent.settings')} />
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </footer>

      {trackingOn ? (
        <Suspense fallback={null}>
          <AnalyticsProvider config={tracking} locale={locale} privacyHref={href('/privacy')} />
        </Suspense>
      ) : null}
    </>
  )
}
