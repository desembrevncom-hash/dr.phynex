import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PartnershipForm } from '@/components/forms/PartnershipForm'
import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeading } from '@/components/ui/PageHeading'
import { RichText } from '@/components/ui/RichText'
import { findPublicGlobal } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([
    getTranslations({ locale, namespace: 'partnership' }),
    findPublicGlobal('partnership-page', locale),
  ])
  return {
    title: page?.seo?.title || page?.title || t('title'),
    description: page?.seo?.description || undefined,
    alternates: alternatesFor(locale, '/partnership'),
  }
}

export default async function PartnershipPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations('partnership'), findPublicGlobal('partnership-page', locale)])

  return (
    <PageShell locale={locale} path="/partnership">
      <PageHeading intro={page?.intro}>{page?.title || t('title')}</PageHeading>
      <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <div>{page ? <RichText data={page.body} /> : <EmptyState />}</div>
        <section aria-labelledby="partnership-form">
          <h2 id="partnership-form" className="mb-5 text-xl font-semibold">
            {t('formTitle')}
          </h2>
          <PartnershipForm locale={locale} privacyHref={localizedPath(locale, '/privacy')} />
        </section>
      </div>
    </PageShell>
  )
}
