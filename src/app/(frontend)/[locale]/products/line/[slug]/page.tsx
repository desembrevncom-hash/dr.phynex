import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { LineGroup } from '@/components/product/LineGroup'
import { approvedLocalesFor, findPublic, findPublicBySlug } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor, localizedPath, withSocial } from '@/lib/seo'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const line = await findPublicBySlug('product-lines', slug, locale)
  if (!line) return {}
  return withSocial(
    {
      title: line.name,
      description: line.description || undefined,
      alternates: alternatesFor(locale, `/products/line/${slug}`, await approvedLocalesFor('product-lines', slug)),
    },
    locale,
  )
}

export default async function ProductLinePage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const line = await findPublicBySlug('product-lines', slug, locale, 1)
  if (!line) notFound()

  const [t, available, products] = await Promise.all([
    getTranslations(),
    approvedLocalesFor('product-lines', slug),
    findPublic('products', locale, { where: { line: { equals: line.id } }, limit: 96, sort: 'createdAt' }),
  ])

  return (
    <PageShell locale={locale} path={`/products/line/${slug}`} available={available} bleed>
      <nav aria-label={t('products.breadcrumb')} className="container-page pt-6 lg:pt-10">
        <ol className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          <li>
            <Link href={localizedPath(locale, '/products')} className="hover:text-navy hover:underline">
              {t('nav.products')}
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {line.name}
            </span>
          </li>
        </ol>
      </nav>
      <LineGroup line={line} products={products.docs} locale={locale} showLineLink={false} headingLevel="h1" />
    </PageShell>
  )
}
