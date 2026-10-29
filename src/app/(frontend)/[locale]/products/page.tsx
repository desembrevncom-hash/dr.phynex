import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Where } from 'payload'

import { PageShell } from '@/components/layout/PageShell'
import { LineGroup } from '@/components/product/LineGroup'
import { ProductTile } from '@/components/product/ProductTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { PageIntro } from '@/components/ui/PageIntro'
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
    getTranslations(),
    findPublic('product-lines', locale, { limit: 100, depth: 0, sort: 'order' }),
    findPublic('skin-concerns', locale, { limit: 100, depth: 0, sort: 'order' }),
  ])

  const line = lineSlug ? lines.docs.find((l) => l.slug === lineSlug) : undefined
  const concern = concernSlug ? concerns.docs.find((c) => c.slug === concernSlug) : undefined

  const and: Where[] = []
  if (lineSlug) and.push({ line: { equals: line?.id ?? -1 } })
  if (concernSlug) and.push({ concerns: { contains: concern?.id ?? -1 } })
  const products = await findPublic('products', locale, {
    where: and.length ? { and } : undefined,
    limit: 96,
    sort: 'createdAt',
  })
  const filtered = and.length > 0

  const base = localizedPath(locale, '/products')
  const href = (next: { line?: string; concern?: string }) => {
    const qs = new URLSearchParams()
    if (next.line) qs.set('line', next.line)
    if (next.concern) qs.set('concern', next.concern)
    const s = qs.toString()
    return s ? `${base}?${s}` : base
  }

  // Group by line (in line order); products without a visible line go last, ungrouped.
  const lineId = (p: (typeof products.docs)[number]) => (typeof p.line === 'object' && p.line ? p.line.id : p.line)
  const groups = lines.docs
    .filter((l) => !line || l.id === line.id)
    .map((l) => ({ line: l, items: products.docs.filter((p) => lineId(p) === l.id) }))
    .filter((g) => g.items.length > 0)
  const ungrouped = products.docs.filter((p) => !groups.some((g) => g.items.includes(p)))

  return (
    <PageShell
      locale={locale}
      path="/products"
      search={(() => {
        // Keep only filters that matched something; line and concern slugs are shared across languages.
        const qs = new URLSearchParams()
        if (line) qs.set('line', line.slug)
        if (concern) qs.set('concern', concern.slug)
        const s = qs.toString()
        return s ? `?${s}` : ''
      })()}
      bleed
    >
      <PageIntro
        title={t('products.title')}
        lead={products.totalDocs > 0 ? <p role="status">{t('products.count', { count: products.totalDocs })}</p> : null}
      />

      {lines.docs.length > 1 || concerns.docs.length > 0 ? (
        <div className="container-page mt-6 space-y-3">
          {lines.docs.length > 1 ? (
            <FilterTabs
              label={t('products.filterLabel')}
              options={[
                { href: href({ concern: concernSlug }), label: t('products.all'), active: !lineSlug },
                ...lines.docs.map((l) => ({
                  href: href({ line: l.slug, concern: concernSlug }),
                  label: l.name,
                  active: l.slug === lineSlug,
                })),
              ]}
            />
          ) : null}
          {concerns.docs.length > 0 ? (
            <FilterTabs
              label={t('products.byConcern')}
              options={[
                { href: href({ line: lineSlug }), label: t('products.all'), active: !concernSlug },
                ...concerns.docs.map((c) => ({
                  href: href({ line: lineSlug, concern: c.slug }),
                  label: c.name,
                  active: c.slug === concernSlug,
                })),
              ]}
            />
          ) : null}
        </div>
      ) : null}

      {products.docs.length === 0 ? (
        <div className="container-page py-12 lg:py-16">
          {filtered ? (
            <div role="status" className="rounded-lg bg-surface-muted p-8">
              <p className="text-ink">{t('products.noResults')}</p>
              <Link href={base} className="mt-4 inline-flex min-h-11 items-center font-medium text-navy underline underline-offset-4">
                {t('products.viewAll')}
              </Link>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      ) : (
        <div className="mt-2">
          {groups.map((g) => (
            <LineGroup key={g.line.id} line={g.line} products={g.items} locale={locale} showCount={groups.length > 1} />
          ))}
          {ungrouped.length > 0 ? (
            <div className="container-page py-12">
              <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {ungrouped.map((p) => (
                  <ProductTile key={p.id} product={p} locale={locale} label={t('home.viewProduct')} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
