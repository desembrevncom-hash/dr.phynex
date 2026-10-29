import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PartnershipForm } from '@/components/forms/PartnershipForm'
import { PageShell } from '@/components/layout/PageShell'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
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

const hasText = (value: unknown) => /"text":"[^"\s]/.test(JSON.stringify(value ?? ''))

export default async function PartnershipPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations('partnership'), findPublicGlobal('partnership-page', locale)])

  return (
    <PageShell locale={locale} path="/partnership" bleed>
      {/* Programme copy comes only from the Partnership page global; the form works without it. */}
      <PageIntro
        title={page?.title || t('title')}
        lead={page?.intro ? <p>{page.intro}</p> : <p>{t('forWho')}</p>}
        aside={page?.intro ? null : <Pending label="partnershipIntro" />}
      />

      <div className="container-page grid gap-10 py-10 md:grid-cols-12 md:gap-8 lg:py-14">
        <section aria-labelledby="partnership-form" className="rounded-lg bg-surface-muted p-5 sm:p-8 md:col-span-7 md:col-start-6 md:row-start-1">
          <h2 id="partnership-form" className="mb-6 text-xl font-bold text-navy">
            {t('formTitle')}
          </h2>
          <PartnershipForm locale={locale} privacyHref={localizedPath(locale, '/privacy')} />
        </section>

        <div className="md:col-span-4 md:row-start-1">
          {page && hasText(page.body) ? (
            <RichText data={page.body} className="text-ink" />
          ) : (
            <Pending label="partnershipBody" className="text-ink-muted" />
          )}
        </div>
      </div>
    </PageShell>
  )
}
