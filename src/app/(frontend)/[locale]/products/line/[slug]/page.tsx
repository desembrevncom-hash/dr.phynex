import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { MediaImage } from '@/components/ui/MediaImage'
import { PageHeading } from '@/components/ui/PageHeading'
import { approvedLocalesFor, findPublic, findPublicBySlug } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor } from '@/lib/seo'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const line = await findPublicBySlug('product-lines', slug, locale)
  if (!line) return {}
  return {
    title: line.name,
    description: line.description || undefined,
    alternates: alternatesFor(locale, `/products/line/${slug}`, await approvedLocalesFor('product-lines', slug)),
  }
}

export default async function ProductLinePage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const line = await findPublicBySlug('product-lines', slug, locale, 1)
  if (!line) notFound()

  const [available, products] = await Promise.all([
    approvedLocalesFor('product-lines', slug),
    findPublic('products', locale, { where: { line: { equals: line.id } }, limit: 48, sort: 'name' }),
  ])

  return (
    <PageShell locale={locale} path={`/products/line/${slug}`} available={available}>
      <PageHeading intro={line.description}>{line.name}</PageHeading>
      <MediaImage media={line.heroImage} priority className="mb-10 w-full rounded-lg" sizes="100vw" />
      <ProductGrid products={products.docs} locale={locale} />
    </PageShell>
  )
}
