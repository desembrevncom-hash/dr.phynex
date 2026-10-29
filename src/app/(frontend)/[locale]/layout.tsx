import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { routing } from '@/i18n/routing'
import { siteURL } from '@/lib/seo'

import '../globals.css'

// Content comes from the CMS on every request until revalidation hooks are added.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'common' })
  return {
    metadataBase: new URL(siteURL),
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    // Not public yet: keep every environment out of search indexes until launch is approved.
    robots: { index: false, follow: false },
  }
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
