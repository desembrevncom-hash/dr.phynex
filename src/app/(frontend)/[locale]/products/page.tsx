import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Where } from 'payload'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterLinks } from '@/components/ui/LinkList'
import { PageHeading } from '@/components/ui/PageHeading'
import { findPublic } from '@/lib/content'
import { firstParam, pageLocale, type LocaleParams, type SearchParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getTranslations({ locale, namespace: 'products' })
  return { title: t('title'), alternates: alternatesFor(locale, '/products') }
}

export default async function ProductsPage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await pageLocale(params)
  const query = await searchParams
  const lineSlug = firstParam(query.line)
  const concernSlug = firstParam(query.concern)

  const [t, lines, concerns] = await Promise.all([
    getTranslations('products'),
    findPublic('product-lines', locale, { limit: 100, depth: 0, sort: 'order' }),
    findPublic('skin-concerns', locale, { limit: 100, depth: 0, sort: 'order' }),
  ])

  const line = lineSlug ? lines.docs.find((l) => l.slug === lineSlug) : undefined
  const concern = concernSlug ? concerns.docs.find((c) => c.slug === concernSlug) : undefined

  const and: Where[] = []
  if (lineSlug) and.push({ line: { equals: line?.id ?? -1 } })
  if (concernSlug) and.push({ concerns: { contains: concern?.id ?? -1 } })
  const products = await findPublic('products', locale, { where: and.length ? { and } : undefined, limit: 48, sort: 'name' })

  const base = localizedPath(locale, '/products')
  const href = (next: { line?: string; concern?: string }) => {
    const qs = new URLSearchParams()
    if (next.line) qs.set('line', next.line)
    if (next.concern) qs.set('concern', next.concern)
    const s = qs.toString()
    return s ? `${base}?${s}` : base
  }
  const filtered = and.length > 0

  return (
    <PageShell locale={locale} path="/products">
      <PageHeading>{t('title')}</PageHeading>

      {lines.docs.length > 0 || concerns.docs.length > 0 ? (
        <section aria-label={t('filters')} className="mb-10 space-y-5">
          {lines.docs.length > 0 ? (
            <FilterLinks
              label={t('byLine')}
              options={[
                { href: href({ concern: concernSlug }), label: t('all'), active: !lineSlug },
                ...lines.docs.map((l) => ({
                  href: href({ line: l.slug, concern: concernSlug }),
                  label: l.name,
                  active: l.slug === lineSlug,
                })),
              ]}
            />
          ) : null}
          {concerns.docs.length > 0 ? (
            <FilterLinks
              label={t('byConcern')}
              options={[
                { href: href({ line: lineSlug }), label: t('all'), active: !concernSlug },
                ...concerns.docs.map((c) => ({
                  href: href({ line: lineSlug, concern: c.slug }),
                  label: c.name,
                  active: c.slug === concernSlug,
                })),
              ]}
            />
          ) : null}
        </section>
      ) : null}

      {products.docs.length > 0 ? (
        <ProductGrid products={products.docs} locale={locale} />
      ) : filtered ? (
        <p role="status" className="text-ink-muted">
          {t('noResults')}
        </p>
      ) : (
        <EmptyState />
      )}
    </PageShell>
  )
}
