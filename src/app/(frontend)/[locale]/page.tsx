import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaImage } from '@/components/ui/MediaImage'
import { findPublicGlobal, populatedList } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import type { Product } from '@/payload-types'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, home] = await Promise.all([getTranslations({ locale, namespace: 'common' }), findPublicGlobal('home-page', locale)])
  return {
    title: home?.seo?.title || { absolute: t('siteName') },
    description: home?.seo?.description || undefined,
    alternates: alternatesFor(locale, ''),
  }
}

const sections = [
  ['products', '/products'],
  ['ingredients', '/ingredients'],
  ['journal', '/journal'],
  ['stores', '/stores'],
] as const

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, home] = await Promise.all([getTranslations(), findPublicGlobal('home-page', locale)])
  const featured = populatedList<Product>(home?.featuredProducts)

  return (
    <PageShell locale={locale} path="">
      {home?.headline ? (
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{home.headline}</h1>
            {home.intro ? <p className="mt-4 max-w-prose text-lg text-ink-muted">{home.intro}</p> : null}
          </div>
          <MediaImage media={home.heroImage} priority className="w-full rounded-lg" />
        </section>
      ) : (
        <>
          <h1 className="sr-only">{t('common.siteName')}</h1>
          <EmptyState />
        </>
      )}

      {featured.length > 0 ? (
        <section className="mt-16" aria-labelledby="featured-products">
          <h2 id="featured-products" className="mb-6 text-xl font-semibold">
            {t('home.featuredProducts')}
          </h2>
          <ProductGrid products={featured} locale={locale} />
        </section>
      ) : null}

      <section className="mt-16" aria-labelledby="explore">
        <h2 id="explore" className="mb-4 text-xl font-semibold">
          {t('home.explore')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map(([key, path]) => (
            <li key={key}>
              <Link
                href={localizedPath(locale, path)}
                className="block rounded-lg border border-line p-5 font-medium hover:border-ink"
              >
                {t(`nav.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  )
}
