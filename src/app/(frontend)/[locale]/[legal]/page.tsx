import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { legalSlugs } from '@/collections/LegalPages'
import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeading } from '@/components/ui/PageHeading'
import { RichText } from '@/components/ui/RichText'
import { findPublicBySlug } from '@/lib/content'
import { pageLocale } from '@/lib/locale'
import { alternatesFor } from '@/lib/seo'

type Params = Promise<{ locale: string; legal: string }>
type LegalSlug = (typeof legalSlugs)[number]
const isLegalSlug = (v: string): v is LegalSlug => (legalSlugs as readonly string[]).includes(v)

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { legal } = await params
  if (!isLegalSlug(legal)) return {}
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: 'nav' }), findPublicBySlug('legal-pages', legal, locale)])
  return { title: page?.title || t(legal), alternates: alternatesFor(locale, `/${legal}`) }
}

export default async function LegalPage({ params }: { params: Params }) {
  const locale = await pageLocale(params)
  const { legal } = await params
  if (!isLegalSlug(legal)) notFound()

  const [t, page] = await Promise.all([getTranslations('nav'), findPublicBySlug('legal-pages', legal, locale)])

  return (
    <PageShell locale={locale} path={`/${legal}`}>
      <PageHeading>{page?.title || t(legal)}</PageHeading>
      {page ? <RichText data={page.body} /> : <EmptyState />}
    </PageShell>
  )
}
