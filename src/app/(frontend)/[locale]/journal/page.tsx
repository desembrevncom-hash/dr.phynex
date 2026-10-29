import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterLinks, LinkList } from '@/components/ui/LinkList'
import { PageHeading } from '@/components/ui/PageHeading'
import { findPublic } from '@/lib/content'
import { firstParam, pageLocale, type LocaleParams, type SearchParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'journal' })
  return { title: t('title'), alternates: alternatesFor(locale, '/journal') }
}

export default async function JournalPage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await pageLocale(params)
  const topicSlug = firstParam((await searchParams).topic)
  const [t, format, topics] = await Promise.all([
    getTranslations('journal'),
    getFormatter(),
    findPublic('journal-topics', locale, { limit: 100, depth: 0, sort: 'order' }),
  ])
  const topic = topicSlug ? topics.docs.find((x) => x.slug === topicSlug) : undefined
  const articles = await findPublic('articles', locale, {
    where: topicSlug ? { topic: { equals: topic?.id ?? -1 } } : undefined,
    depth: 0,
    limit: 24,
    sort: '-publishedAt',
  })
  const base = localizedPath(locale, '/journal')
  const all = await getTranslations('products')

  return (
    <PageShell locale={locale} path="/journal">
      <PageHeading>{t('title')}</PageHeading>
      {topics.docs.length > 0 ? (
        <div className="mb-8">
          <FilterLinks
            label={t('topics')}
            options={[
              { href: base, label: all('all'), active: !topicSlug },
              ...topics.docs.map((x) => ({ href: `${base}?topic=${x.slug}`, label: x.name, active: x.slug === topicSlug })),
            ]}
          />
        </div>
      ) : null}
      {articles.docs.length > 0 ? (
        <LinkList
          items={articles.docs.map((a) => ({
            id: a.id,
            href: localizedPath(locale, `/journal/${a.slug}`),
            title: a.title,
            description: [a.publishedAt ? format.dateTime(new Date(a.publishedAt), { dateStyle: 'medium' }) : null, a.excerpt]
              .filter(Boolean)
              .join(' · '),
          }))}
        />
      ) : topicSlug ? (
        <p role="status" className="text-ink-muted">
          {all('noResults')}
        </p>
      ) : (
        <EmptyState />
      )}
    </PageShell>
  )
}
