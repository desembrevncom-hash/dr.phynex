import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { MediaImage } from '@/components/ui/MediaImage'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublicBySlug, populated, populatedList } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor } from '@/lib/seo'
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

  const [t, format, available] = await Promise.all([
    getTranslations('journal'),
    getFormatter(),
    approvedLocalesFor('articles', slug),
  ])
  const topic = populated<JournalTopic>(article.topic)
  const related = populatedList<Product>(article.relatedProducts)

  return (
    <PageShell locale={locale} path={`/journal/${slug}`} available={available}>
      <article>
        <header className="mb-8">
          {topic ? <p className="text-sm text-ink-muted">{topic.name}</p> : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            {article.publishedAt ? (
              <time dateTime={article.publishedAt}>{format.dateTime(new Date(article.publishedAt), { dateStyle: 'long' })}</time>
            ) : null}
            {article.author ? <span> · {article.author}</span> : null}
          </p>
        </header>
        <MediaImage media={article.cover} priority className="mb-8 w-full rounded-lg" sizes="100vw" />
        <RichText data={article.body} />
      </article>
      {related.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="related-products">
          <h2 id="related-products" className="mb-6 text-xl font-semibold">
            {t('relatedProducts')}
          </h2>
          <ProductGrid products={related} locale={locale} />
        </section>
      ) : null}
    </PageShell>
  )
}
