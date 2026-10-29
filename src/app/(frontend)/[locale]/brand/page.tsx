import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeading } from '@/components/ui/PageHeading'
import { RichText } from '@/components/ui/RichText'
import { findPublicGlobal } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: 'nav' }), findPublicGlobal('brand-page', locale)])
  return {
    title: page?.seo?.title || page?.title || t('brand'),
    description: page?.seo?.description || undefined,
    alternates: alternatesFor(locale, '/brand'),
  }
}

export default async function BrandPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations('nav'), findPublicGlobal('brand-page', locale)])

  return (
    <PageShell locale={locale} path="/brand">
      <PageHeading intro={page?.intro}>{page?.title || t('brand')}</PageHeading>
      {page ? <RichText data={page.body} /> : <EmptyState />}
    </PageShell>
  )
}
