import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { accentText, firstImage, ProductTile } from '@/components/product/ProductTile'
import { Arrow } from '@/components/ui/Arrow'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaImage } from '@/components/ui/MediaImage'
import { Pending } from '@/components/ui/Pending'
import type { Locale } from '@/i18n/locales'
import { findPublic, findPublicGlobal, populatedList } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { getPreviewUser } from '@/lib/preview'
import { keepBrandTogether } from '@/lib/text'
import { alternatesFor, localizedPath } from '@/lib/seo'
import type { Product, ProductLine } from '@/payload-types'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, home] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    findPublicGlobal('home-page', locale),
  ])
  return {
    title: home?.seo?.title || { absolute: t('siteName') },
    description: home?.seo?.description || undefined,
    alternates: alternatesFor(locale, ''),
  }
}

async function LineSection({
  line,
  products,
  locale,
}: {
  line: ProductLine
  products: Product[]
  locale: Locale
}) {
  const t = await getTranslations('home')
  const dark = line.appearance === 'dark'
  const codeColour = dark ? 'text-white' : accentText[products[0]?.accent ?? 'navy']
  const headingId = `line-${line.slug}`

  return (
    <section
      aria-labelledby={headingId}
      className={dark ? 'on-dark bg-mx-charcoal text-white' : 'bg-surface'}
    >
      <div className="container-page py-16 lg:py-24">
        <div
          className={`grid gap-5 border-t pt-6 md:grid-cols-12 md:gap-8 ${dark ? 'border-white/40' : 'border-navy'}`}
        >
          <h2
            id={headingId}
            className={`text-3xl font-bold tracking-tight md:col-span-5 lg:text-5xl ${dark ? 'text-white' : 'text-navy'}`}
          >
            {t.rich('lineHeading', {
              line: line.name,
              code: (chunks) => <span className={`font-extrabold ${codeColour}`}>{chunks}</span>,
            })}
          </h2>
          <div className="md:col-span-7 md:pt-2">
            {line.description ? (
              <p className={`max-w-prose text-base lg:text-lg ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>
                {line.description}
              </p>
            ) : (
              <Pending
                label="lineDescription"
                values={{ line: line.name }}
                className={dark ? 'text-mx-muted' : 'text-ink-muted'}
              />
            )}
            <p className="mt-4">
              <Link
                href={localizedPath(locale, `/products/line/${line.slug}`)}
                className={`group inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline ${dark ? 'text-white' : 'text-navy'}`}
              >
                {t('viewLine', { line: line.name })}
                <Arrow />
              </Link>
            </p>
          </div>
        </div>

        {/* Two products: a wide lead tile and a narrower one set lower, so the line reads as a
            composition rather than a catalogue grid. Other counts fall back to an even grid. */}
        <ul className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-12 lg:mt-14 lg:gap-x-10">
          {products.map((product, i) => (
            <ProductTile
              key={product.id}
              product={product}
              locale={locale}
              dark={dark}
              label={t('viewProduct')}
              className={
                products.length === 2
                  ? i === 0
                    ? 'md:col-span-7'
                    : 'md:col-span-5 md:mt-28 lg:mt-40'
                  : 'md:col-span-6 lg:col-span-4'
              }
            />
          ))}
        </ul>
      </div>
    </section>
  )
}

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, home, lines, preview] = await Promise.all([
    getTranslations(),
    findPublicGlobal('home-page', locale),
    findPublic('product-lines', locale, { sort: 'order', limit: 20 }),
    getPreviewUser(),
  ])
  const lineProducts = await Promise.all(
    lines.docs.map(async (line) => {
      const { docs } = await findPublic('products', locale, {
        where: { line: { equals: line.id } },
        sort: 'createdAt',
        limit: 12,
      })
      return { line, products: docs }
    }),
  )
  const sections = lineProducts.filter((s) => s.products.length > 0)
  // Featured products come back at depth 1 (images not populated); reuse the line queries' copies.
  const listed = sections.flatMap((s) => s.products)
  const featuredId = populatedList<Product>(home?.featuredProducts)[0]?.id
  const heroProduct = listed.find((p) => p.id === featuredId) ?? listed[0]
  const heroMedia = home?.heroImage ?? firstImage(heroProduct)

  if (!home?.headline && sections.length === 0 && !preview) {
    return (
      <PageShell locale={locale} path="">
        <h1 className="sr-only">{t('common.siteName')}</h1>
        <EmptyState />
      </PageShell>
    )
  }

  const find = [
    ['stores', '/stores', t('home.storesTitle'), t('home.storesBody')],
    ['partnership', '/partnership', t('home.partnerTitle'), t('home.partnerBody')],
    ['contact', '/contact', t('home.contactTitle'), t('home.contactBody')],
  ] as const

  return (
    <PageShell locale={locale} path="" bleed>
      <section aria-labelledby="hero-title" className="bg-surface">
        <div className="container-page grid items-center gap-10 py-10 md:grid-cols-12 md:gap-8 lg:py-16">
          <div className="md:col-span-6 lg:col-span-6 xl:col-span-6">
            <h1 id="hero-title" className="display-hero text-navy">
              {home?.headline || t('common.siteName')}
            </h1>
            {home?.headline ? null : (
              <Pending label="headline" className="mt-4 text-ink-muted" />
            )}
            <div className="mt-6 max-w-[34rem] text-base text-ink-muted sm:text-lg">
              {home?.intro ? <p>{home.intro}</p> : <Pending label="intro" />}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 lg:mt-10">
              <Link
                href={localizedPath(locale, '/products')}
                className="inline-flex min-h-12 items-center rounded bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-strong"
              >
                {t('home.ctaProducts')}
              </Link>
              <Link
                href={localizedPath(locale, '/stores')}
                className="inline-flex min-h-12 items-center rounded border border-navy px-6 text-sm font-semibold text-navy transition-colors hover:bg-surface-muted"
              >
                {t('home.ctaStores')}
              </Link>
            </div>
          </div>

          <figure className="hero-enter md:col-span-6 lg:col-span-6 xl:col-span-5 xl:col-start-8">
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-surface-muted p-8 lg:p-12">
              {heroMedia ? (
                <MediaImage
                  media={heroMedia}
                  priority
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="blend-panel h-full max-h-full w-auto object-contain"
                />
              ) : (
                <Pending label="productImage" className="text-ink-muted" />
              )}
            </div>
            {heroProduct ? (
              <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-sm">
                <Link
                  href={localizedPath(locale, `/products/${heroProduct.slug}`)}
                  className="font-medium text-navy hover:underline"
                >
                  {keepBrandTogether(heroProduct.name)}
                </Link>
                {heroProduct.volume ? (
                  <span className="shrink-0 text-ink-muted">{heroProduct.volume}</span>
                ) : null}
              </figcaption>
            ) : null}
            {home?.heroImage ? null : <Pending label="heroImage" className="mt-3 text-ink-muted" />}
          </figure>
        </div>
      </section>

      {sections.map(({ line, products }) => (
        <LineSection key={line.id} line={line} products={products} locale={locale} />
      ))}

      <section aria-labelledby="find-title" className="bg-surface-muted">
        <div className="container-page py-16 lg:py-24">
          <h2 id="find-title" className="text-2xl font-bold tracking-tight text-navy lg:text-4xl">
            {t('home.findTitle')}
          </h2>
          <ul className="mt-10 grid gap-x-8 md:grid-cols-3">
            {find.map(([key, path, title, body]) => (
              <li key={key} className="border-t border-navy">
                <Link
                  href={localizedPath(locale, path)}
                  className="group flex min-h-32 flex-col justify-between gap-6 py-6"
                >
                  <span>
                    <span className="block text-lg font-semibold text-navy">{title}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{body}</span>
                  </span>
                  <span className="text-navy">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  )
}
