import type { Metadata } from 'next'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { Arrow } from '@/components/ui/Arrow'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { MediaImage } from '@/components/ui/MediaImage'
import { PageIntro } from '@/components/ui/PageIntro'
import { Pending } from '@/components/ui/Pending'
import { findPublic, populated } from '@/lib/content'
import { firstParam, pageLocale, type LocaleParams, type SearchParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import type { JournalTopic } from '@/payload-types'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'journal' })
  return { title: t('title'), alternates: alternatesFor(locale, '/journal') }
}

export default async function JournalPage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await pageLocale(params)
  const topicSlug = firstParam((await searchParams).topic)
  const [t, format, topics] = await Promise.all([
    getTranslations(),
    getFormatter(),
    findPublic('journal-topics', locale, { limit: 100, depth: 0, sort: 'order' }),
  ])
  const topic = topicSlug ? topics.docs.find((x) => x.slug === topicSlug) : undefined
  const articles = await findPublic('articles', locale, {
    where: topicSlug ? { topic: { equals: topic?.id ?? -1 } } : undefined,
    depth: 1,
    limit: 24,
    sort: '-publishedAt',
  })
  const base = localizedPath(locale, '/journal')

  return (
    <PageShell locale={locale} path="/journal" search={topic ? `?topic=${topic.slug}` : ''} bleed>
      <PageIntro title={t('journal.title')} />

      {topics.docs.length > 0 ? (
        <div className="container-page mt-6">
          <FilterTabs
            label={t('journal.topics')}
            options={[
              { href: base, label: t('journal.allTopics'), active: !topicSlug },
              ...topics.docs.map((x) => ({ href: `${base}?topic=${x.slug}`, label: x.name, active: x.slug === topicSlug })),
            ]}
          />
        </div>
      ) : null}

      <div className="container-page py-10 lg:py-14">
        {articles.docs.length > 0 ? (
          <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {articles.docs.map((a) => {
              const articleTopic = populated<JournalTopic>(a.topic)
              return (
                <li key={a.id}>
                  <Link href={localizedPath(locale, `/journal/${a.slug}`)} className="group block">
                    {a.cover ? (
                      <div className="mb-5 overflow-hidden rounded-lg bg-surface-muted">
                        <MediaImage
                          media={a.cover}
                          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
                          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : null}
                    <div className="border-t border-navy pt-4">
                      <p className="text-sm text-ink-muted">
                        {[articleTopic?.name, a.publishedAt ? format.dateTime(new Date(a.publishedAt), { dateStyle: 'medium' }) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <h2 className="mt-2 text-xl font-bold leading-snug text-navy group-hover:underline">{a.title}</h2>
                      {a.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{a.excerpt}</p> : null}
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-navy">
                        {t('journal.readMore')}
                        <Arrow />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : topicSlug ? (
          <div role="status" className="rounded-lg bg-surface-muted p-8">
            <p className="text-ink">{t('journal.noResults')}</p>
            <Link href={base} className="mt-4 inline-flex min-h-11 items-center font-medium text-navy underline underline-offset-4">
              {t('journal.allTopics')}
            </Link>
          </div>
        ) : (
          <>
            <Pending label="articles" className="mb-6 text-ink-muted" />
            <EmptyState
              body={t('journal.empty')}
              links={[{ href: localizedPath(locale, '/products'), title: t('common.viewProducts'), body: t('common.productsBody') }]}
            />
          </>
        )}
      </div>
    </PageShell>
  )
}
