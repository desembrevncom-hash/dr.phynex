import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinkList } from '@/components/ui/LinkList'
import { PageHeading } from '@/components/ui/PageHeading'
import { findPublic } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'ingredients' })
  return { title: t('title'), alternates: alternatesFor(locale, '/ingredients') }
}

export default async function IngredientsPage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, ingredients, technologies] = await Promise.all([
    getTranslations('ingredients'),
    findPublic('ingredients', locale, { limit: 100, depth: 0, sort: 'order' }),
    findPublic('technologies', locale, { limit: 100, depth: 0, sort: 'order' }),
  ])
  const toItem = (d: { id: number; slug: string; name: string; summary?: string | null }) => ({
    id: d.id,
    href: localizedPath(locale, `/ingredients/${d.slug}`),
    title: d.name,
    description: d.summary,
  })

  return (
    <PageShell locale={locale} path="/ingredients">
      <PageHeading>{t('title')}</PageHeading>
      {ingredients.docs.length === 0 && technologies.docs.length === 0 ? <EmptyState /> : null}
      {technologies.docs.length > 0 ? (
        <section className="mb-12" aria-labelledby="technologies">
          <h2 id="technologies" className="mb-4 text-xl font-semibold">
            {t('technologies')}
          </h2>
          <LinkList items={technologies.docs.map(toItem)} />
        </section>
      ) : null}
      {ingredients.docs.length > 0 ? (
        <section aria-labelledby="ingredients">
          <h2 id="ingredients" className="mb-4 text-xl font-semibold">
            {t('ingredients')}
          </h2>
          <LinkList items={ingredients.docs.map(toItem)} />
        </section>
      ) : null}
    </PageShell>
  )
}
