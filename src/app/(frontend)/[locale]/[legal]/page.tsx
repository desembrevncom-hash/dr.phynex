import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { legalSlugs } from '@/collections/LegalPages'
import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublicBySlug } from '@/lib/content'
import { pageLocale } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import { hasRichText } from '@/lib/text'

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

  const [t, page, available] = await Promise.all([
    getTranslations(),
    findPublicBySlug('legal-pages', legal, locale),
    approvedLocalesFor('legal-pages', legal),
  ])
  const other: LegalSlug = legal === 'privacy' ? 'terms' : 'privacy'

  return (
    // The page exists in every language (it is a fixed site page); the policy text appears only
    // where it is published + approved, so the switcher stays enabled on the empty state.
    <PageShell locale={locale} path={`/${legal}`} available={page ? available : undefined} bleed>
      <PageIntro title={page?.title || t(`nav.${legal}`)} />
      <div className="container-page py-10 lg:py-14">
        {page && hasRichText(page.body) ? (
          <div className="max-w-3xl">
            <RichText data={page.body} className="text-ink" />
          </div>
        ) : (
          <>
            <Pending label="legalBody" className="mb-6 text-ink-muted" />
            <EmptyState
              links={[
                { href: localizedPath(locale, `/${other}`), title: t(`nav.${other}`) },
                { href: localizedPath(locale, '/contact'), title: t('contact.title'), body: t('contact.lead') },
              ]}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
