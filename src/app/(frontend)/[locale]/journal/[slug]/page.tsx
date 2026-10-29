import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductTile } from '@/components/product/ProductTile'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { MediaImage } from '@/components/ui/MediaImage'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublicBySlug, populated, populatedList } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import type { JournalTopic, Product } from '@/payload-types'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const article = await findPublicBySlug('articles', slug, locale)
  if (!article) return {}
  return {
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.excerpt || undefined,
    alternates: alternatesFor(locale, `/journal/${slug}`, await approvedLocalesFor('articles', slug)),
  }
}

export default async function ArticlePage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const article = await findPublicBySlug('articles', slug, locale)
  if (!article) notFound()

  const [t, format, available] = await Promise.all([getTranslations(), getFormatter(), approvedLocalesFor('articles', slug)])
  const topic = populated<JournalTopic>(article.topic)
  // Related products the viewer cannot see (drafts, for guests) are not populated, so never linked.
  const related = populatedList<Product>(article.relatedProducts)
  const journal = localizedPath(locale, '/journal')

  return (
    <PageShell locale={locale} path={`/journal/${slug}`} available={available} bleed>
      <Breadcrumb
        items={[
          { href: journal, label: t('journal.title') },
          ...(topic ? [{ href: `${journal}?topic=${topic.slug}`, label: topic.name }] : []),
          { label: article.title },
        ]}
      />
      <article className="container-page pb-10 pt-6 lg:pb-14 lg:pt-8">
        <header className="max-w-3xl border-t border-navy pt-6">
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-navy sm:text-4xl lg:text-5xl">{article.title}</h1>
          <p className="mt-4 text-sm text-ink-muted">
            {article.publishedAt ? (
              <time dateTime={article.publishedAt}>{format.dateTime(new Date(article.publishedAt), { dateStyle: 'long' })}</time>
            ) : null}
            {article.author ? <span> · {t('journal.by', { author: article.author })}</span> : null}
          </p>
          {article.excerpt ? <p className="mt-6 text-lg text-ink-muted">{article.excerpt}</p> : null}
        </header>
        {article.cover ? (
          <div className="mt-8 overflow-hidden rounded-lg bg-surface-muted">
            <MediaImage media={article.cover} priority className="w-full object-cover" sizes="100vw" />
          </div>
        ) : null}
        <div className="mt-8 max-w-3xl">
          <RichText data={article.body} className="text-ink" />
        </div>
      </article>
      {related.length > 0 ? (
        <section aria-labelledby="related-products">
          <div className="container-page pb-14">
            <h2 id="related-products" className="border-t border-navy pt-6 text-2xl font-bold tracking-tight text-navy">
              {t('journal.relatedProducts')}
            </h2>
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductTile key={p.id} product={p} locale={locale} label={t('home.viewProduct')} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </PageShell>
  )
}
