import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
import { RichText } from '@/components/ui/RichText'
import { findPublicGlobal } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath, withSocial } from '@/lib/seo'
import { hasRichText } from '@/lib/text'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: 'nav' }), findPublicGlobal('brand-page', locale)])
  return withSocial(
    {
      title: page?.seo?.title || page?.title || t('brand'),
      description: page?.seo?.description || undefined,
      alternates: alternatesFor(locale, '/brand'),
    },
    locale,
  )
}

export default async function BrandPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, page] = await Promise.all([getTranslations(), findPublicGlobal('brand-page', locale)])
  // Brand story comes only from the Brand page global (published + approved); nothing is written here.
  const filled = Boolean(page && (page.intro || hasRichText(page.body)))

  return (
    <PageShell locale={locale} path="/brand" bleed>
      <PageIntro title={page?.title || t('nav.brand')} lead={page?.intro ? <p>{page.intro}</p> : null} />
      <div className="container-page py-10 lg:py-14">
        {filled ? (
          <div className="max-w-3xl">
            {hasRichText(page?.body) ? <RichText data={page?.body} locale={locale} className="text-ink" /> : null}
          </div>
        ) : (
          <>
            <Pending label="brandBody" className="mb-6 text-ink-muted" />
            <EmptyState
              links={[
                { href: localizedPath(locale, '/products'), title: t('common.viewProducts'), body: t('common.productsBody') },
                { href: localizedPath(locale, '/contact'), title: t('contact.title'), body: t('contact.lead') },
              ]}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
