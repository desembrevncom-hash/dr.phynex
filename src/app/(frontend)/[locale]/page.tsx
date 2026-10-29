import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
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

// Accent colours come from each product's packaging (DESIGN.md §2).
const accentBar: Record<Product['accent'], string> = {
  navy: 'bg-navy',
  'rx-red': 'bg-red',
  'mx-cyan': 'bg-mx-cyan',
  'mx-pink': 'bg-mx-pink',
}
const accentText: Record<Product['accent'], string> = {
  navy: 'text-navy',
  'rx-red': 'text-red',
  'mx-cyan': 'text-mx-cyan',
  'mx-pink': 'text-mx-pink',
}

const firstImage = (product?: Product) =>
  Array.isArray(product?.images) ? product.images[0] : undefined

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  )
}

function ProductTile({
  product,
  locale,
  dark,
  label,
}: {
  product: Product
  locale: Locale
  dark: boolean
  label: string
}) {
  return (
    <li>
      <Link
        href={localizedPath(locale, `/products/${product.slug}`)}
        className={`group block rounded-lg ${dark ? 'bg-mx-raised p-3 sm:p-4' : ''}`}
      >
        <div className="overflow-hidden rounded-md bg-surface-muted">
          <div className="flex aspect-[4/5] items-center justify-center p-8 transition-transform duration-300 ease-out group-hover:scale-[1.02] sm:p-12">
            <MediaImage
              media={firstImage(product)}
              alt=""
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="blend-panel max-h-full w-auto object-contain"
            />
          </div>
        </div>
        <div className={dark ? 'px-1 pb-2 pt-5' : 'pt-5'}>
          <span aria-hidden="true" className={`block h-0.5 w-6 ${accentBar[product.accent]}`} />
          <h3
            className={`mt-4 text-xl font-bold leading-snug lg:text-2xl ${dark ? 'text-white' : 'text-navy'}`}
          >
            {keepBrandTogether(product.name)}
          </h3>
          {product.volume ? (
            <p className={`mt-1 text-sm ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>
              {product.volume}
            </p>
          ) : null}
          <p
            className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${dark ? 'text-white' : 'text-navy'}`}
          >
            {label}
            <Arrow />
          </p>
        </div>
      </Link>
    </li>
  )
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
      <div className="container-page py-20 lg:py-28">
        <div
          className={`grid gap-6 border-t pt-6 md:grid-cols-12 md:gap-8 ${dark ? 'border-white/40' : 'border-navy'}`}
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
              <p className={`max-w-prose ${dark ? 'text-mx-muted' : 'text-ink-muted'}`}>
                {line.description}
              </p>
            ) : (
              <Pending
                label={`mô tả dòng ${line.name}`}
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

        <ul className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:mt-16 lg:gap-x-10">
          {products.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              locale={locale}
              dark={dark}
              label={t('viewProduct')}
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
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-12 md:gap-8 lg:py-20">
          <div className="md:col-span-6 lg:col-span-6 xl:col-span-6">
            <h1
              id="hero-title"
              className="text-4xl font-extrabold leading-[1.08] tracking-tight text-navy sm:text-5xl lg:text-6xl"
            >
              {home?.headline || t('common.siteName')}
            </h1>
            {home?.headline ? null : (
              <Pending label="tiêu đề trang chủ" className="mt-4 text-ink-muted" />
            )}
            <div className="mt-6 max-w-md text-lg text-ink-muted">
              {home?.intro ? <p>{home.intro}</p> : <Pending label="đoạn giới thiệu trang chủ" />}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
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
                <Pending label="ảnh sản phẩm chính" className="text-ink-muted" />
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
          </figure>
        </div>
      </section>

      {sections.map(({ line, products }) => (
        <LineSection key={line.id} line={line} products={products} locale={locale} />
      ))}

      <section aria-labelledby="find-title" className="bg-surface-muted">
        <div className="container-page py-20 lg:py-28">
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
