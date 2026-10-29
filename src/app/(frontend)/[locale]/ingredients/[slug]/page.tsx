import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { MediaImage } from '@/components/ui/MediaImage'
import { PageHeading } from '@/components/ui/PageHeading'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublic, findPublicBySlug } from '@/lib/content'
import type { Locale } from '@/i18n/locales'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor } from '@/lib/seo'

/** /ingredients/[slug] serves both ingredients and technologies (ingredient wins on a slug clash). */
async function resolve(slug: string, locale: Locale) {
  const ingredient = await findPublicBySlug('ingredients', slug, locale, 1)
  if (ingredient) return { kind: 'ingredients' as const, doc: ingredient }
  const technology = await findPublicBySlug('technologies', slug, locale, 1)
  if (technology) return { kind: 'technologies' as const, doc: technology }
  return null
}

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const found = await resolve(slug, locale)
  if (!found) return {}
  return {
    title: found.doc.seo?.title || found.doc.name,
    description: found.doc.seo?.description || found.doc.summary || undefined,
    alternates: alternatesFor(locale, `/ingredients/${slug}`, await approvedLocalesFor(found.kind, slug)),
  }
}

export default async function IngredientPage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const found = await resolve(slug, locale)
  if (!found) notFound()
  const { kind, doc } = found

  const field = kind === 'ingredients' ? 'keyIngredients' : 'technologies'
  const [t, available, products] = await Promise.all([
    getTranslations('ingredients'),
    approvedLocalesFor(kind, slug),
    findPublic('products', locale, { where: { [field]: { contains: doc.id } }, limit: 24, sort: 'name' }),
  ])

  return (
    <PageShell locale={locale} path={`/ingredients/${slug}`} available={available}>
      <article>
        <PageHeading intro={doc.summary}>{doc.name}</PageHeading>
        {'inciName' in doc && doc.inciName ? (
          <p className="-mt-4 mb-8 text-sm text-ink-muted">
            {t('inciName')}: <span lang="en">{doc.inciName}</span>
          </p>
        ) : null}
        <MediaImage media={doc.image} className="mb-8 w-full max-w-2xl rounded-lg" />
        <RichText data={doc.body} />
      </article>
      {products.docs.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="products-containing">
          <h2 id="products-containing" className="mb-6 text-xl font-semibold">
            {t('productsContaining')}
          </h2>
          <ProductGrid products={products.docs} locale={locale} />
        </section>
      ) : null}
    </PageShell>
  )
}
