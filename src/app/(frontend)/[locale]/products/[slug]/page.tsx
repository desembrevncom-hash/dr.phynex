import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGallery, type GalleryImage } from '@/components/product/ProductGallery'
import { accentBar, accentText, ProductTile } from '@/components/product/ProductTile'
import { Arrow } from '@/components/ui/Arrow'
import { mediaSrc } from '@/components/ui/MediaImage'
import { Pending, type PendingKey } from '@/components/ui/Pending'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublic, findPublicBySlug, populated, populatedList } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { getPreviewUser } from '@/lib/preview'
import { alternatesFor, localizedPath, publicImage, withSocial } from '@/lib/seo'
import { breadcrumbLd, productLd } from '@/lib/structured-data'
import { keepBrandTogether } from '@/lib/text'
import { JsonLd } from '@/components/seo/JsonLd'
import { TrackContent } from '@/components/analytics/TrackContent'
import type { Ingredient, Media, Product, ProductLine, Technology } from '@/payload-types'

/** First product image cleared for publication (share cards and structured data only). */
const firstPublicImage = (product: Product) =>
  populatedList<Media>(product.images).map(publicImage).find((image) => image !== null) ?? null

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const product = await findPublicBySlug('products', slug, locale)
  if (!product) return {}
  return withSocial(
    {
      title: product.seo?.title || product.name,
      description: product.seo?.description || product.shortDescription || undefined,
      alternates: alternatesFor(locale, `/products/${slug}`, await approvedLocalesFor('products', slug)),
    },
    locale,
    { image: firstPublicImage(product) },
  )
}

/** Rich text from the CMS is "empty" when the editor has no text nodes in it. */
const hasRichText = (value: unknown) => /"text":"[^"\s]/.test(JSON.stringify(value ?? ''))

/**
 * One information block. With content it always renders; without content it renders only
 * in staff preview (as a "to be supplied" marker) and is left out for visitors.
 */
function InfoSection({
  title,
  pending,
  preview,
  children,
}: {
  title: string
  pending: PendingKey
  preview: boolean
  children?: ReactNode
}) {
  if (!children && !preview) return null
  return (
    <section className="grid gap-3 border-t border-line py-6 md:grid-cols-12 md:gap-8 lg:py-8">
      <h2 className="text-lg font-bold text-navy md:col-span-4 lg:text-xl">{title}</h2>
      <div className="md:col-span-8">{children ?? <Pending label={pending} className="text-ink-muted" />}</div>
    </section>
  )
}

export default async function ProductPage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const product = await findPublicBySlug('products', slug, locale)
  if (!product) notFound()

  const [t, available, preview] = await Promise.all([
    getTranslations(),
    approvedLocalesFor('products', slug),
    getPreviewUser(),
  ])
  const line = populated<ProductLine>(product.line)
  const ingredients = populatedList<Ingredient>(product.keyIngredients)
  const technologies = populatedList<Technology>(product.technologies)
  const claims = product.claims ?? []

  // Related: editor's choice first, otherwise the rest of the same line.
  let related = populatedList<Product>(product.related)
  if (related.length === 0 && line) {
    const { docs } = await findPublic('products', locale, {
      where: { and: [{ line: { equals: line.id } }, { id: { not_equals: product.id } }] },
      sort: 'createdAt',
      limit: 6,
    })
    related = docs
  }

  const gallery: GalleryImage[] = populatedList<Media>(product.images)
    .filter((m) => m.url)
    .map((m) => ({
      src: mediaSrc(m.url!),
      alt: m.alt,
      width: m.width ?? 1200,
      height: m.height ?? 1500,
      unoptimized: !m.publicRelease,
    }))

  const href = (p: string) => localizedPath(locale, p)
  const frame = `border ${product.accent === 'navy' ? 'border-navy' : 'border-current'}`

  return (
    <PageShell locale={locale} path={`/products/${slug}`} available={available} bleed>
      <JsonLd
        data={[
          productLd({
            locale,
            path: href(`/products/${slug}`),
            name: product.name,
            description: product.shortDescription,
            sku: product.sku,
            image: firstPublicImage(product),
          }),
          breadcrumbLd([
            { name: t('nav.products'), path: href('/products') },
            ...(line ? [{ name: line.name, path: href(`/products/line/${line.slug}`) }] : []),
            { name: product.name },
          ]),
        ]}
      />
      <TrackContent event="view_product" contentId={slug} contentName={product.name} />
      <nav aria-label={t('products.breadcrumb')} className="container-page pt-6 lg:pt-10">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <li>
            <Link href={href('/products')} className="hover:text-navy hover:underline">
              {t('nav.products')}
            </Link>
          </li>
          {line ? (
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={href(`/products/line/${line.slug}`)} className="hover:text-navy hover:underline">
                {line.name}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {keepBrandTogether(product.name)}
            </span>
          </li>
        </ol>
      </nav>

      <article>
        {/* DOM order is name → images → details, so phones and tablets reach the name and
            pack size first and screen readers meet a single h1. On desktop the grid places the
            gallery on the left across both rows. */}
        <div className="container-page grid gap-x-10 gap-y-6 pb-10 pt-4 md:grid-cols-12 lg:gap-x-12 lg:pb-14 lg:pt-8">
          <header className="md:col-span-12 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:self-end">
            {line ? (
              <p className="text-sm font-medium">
                <Link href={href(`/products/line/${line.slug}`)} className={`hover:underline ${accentText[product.accent]}`}>
                  {t.rich('home.lineHeading', { line: line.name, code: (chunks) => <span className="font-extrabold">{chunks}</span> })}
                </Link>
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-extrabold leading-[1.12] tracking-tight text-navy sm:text-4xl lg:mt-3 lg:text-5xl">
              {keepBrandTogether(product.name)}
            </h1>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-ink-muted">{t('products.volume')}</dt>
                <dd className="font-semibold text-ink">{product.volume || '—'}</dd>
              </div>
              {line ? (
                <div className="flex gap-2">
                  <dt className="text-ink-muted">{t('products.line')}</dt>
                  <dd className="font-semibold text-ink">{line.name}</dd>
                </div>
              ) : null}
            </dl>
          </header>

          <div className="md:col-span-7 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            {gallery.length > 0 ? (
              <ProductGallery images={gallery} label={t('products.gallery')} thumbLabel={t('products.showImage')} />
            ) : (
              <div className="flex h-[clamp(300px,56vh,440px)] items-center justify-center rounded-lg bg-surface-muted md:h-[460px] lg:aspect-[4/5] lg:h-auto">
                <Pending label="productImage" className="text-ink-muted" />
              </div>
            )}
            {gallery.length < 2 ? <Pending label="moreImages" className="mt-3 text-ink-muted" /> : null}
          </div>

          <div className="md:col-span-5 lg:col-span-5 lg:col-start-8 lg:row-start-2">
            <span aria-hidden="true" className={`block h-0.5 w-8 ${accentBar[product.accent]}`} />
            <div className="mt-5 text-base text-ink-muted lg:text-lg">
              {product.shortDescription ? <p>{product.shortDescription}</p> : <Pending label="shortDescription" />}
            </div>
            <div className="mt-4">
              {hasRichText(product.description) ? (
                <RichText data={product.description} locale={locale} className="prose-basic text-ink" />
              ) : (
                <Pending label="description" className="text-ink-muted" />
              )}
            </div>

            <div className="mt-6 rounded-lg bg-surface-muted p-5 lg:mt-8 lg:p-6">
              <h2 className="text-base font-bold text-navy">{t('products.ctaTitle')}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={href('/stores')}
                  className="inline-flex min-h-12 items-center rounded bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-strong"
                >
                  {t('products.ctaStores')}
                </Link>
                <Link
                  href={href('/contact')}
                  className="inline-flex min-h-12 items-center rounded border border-navy px-6 text-sm font-semibold text-navy transition-colors hover:bg-surface"
                >
                  {t('products.ctaContact')}
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                {t('products.partnerPrompt')}{' '}
                <Link href={href('/partnership')} className="group inline-flex items-center gap-1 font-medium text-navy hover:underline">
                  {t('products.partnerLink')}
                  <Arrow />
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="container-page pb-10 lg:pb-14">
          <h2 className="sr-only">{t('products.details')}</h2>
          <InfoSection title={t('products.claims')} pending="claims" preview={!!preview}>
            {claims.length > 0 ? (
              <ul className="grid gap-3">
                {claims.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span aria-hidden="true" className={`mt-3 block h-0.5 w-3 shrink-0 ${accentBar[product.accent]}`} />
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            ) : undefined}
          </InfoSection>

          <InfoSection title={t('products.keyIngredients')} pending="keyIngredients" preview={!!preview}>
            {ingredients.length + technologies.length > 0 ? (
              <ul className={`flex flex-wrap gap-2 ${accentText[product.accent]}`}>
                {[...ingredients.map(item => ({ item, kind: 'ingredients' })), ...technologies.map(item => ({ item, kind: 'technologies' }))].map(({ item, kind }) => (
                  <li key={`${kind}-${item.id}-${item.slug}`}>
                    <Link
                      href={href(`/${kind}/${item.slug}`)}
                      className={`inline-flex min-h-11 items-center rounded px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-muted ${frame}`}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : undefined}
          </InfoSection>

          <InfoSection title={t('products.howToUse')} pending="howToUse" preview={!!preview}>
            {hasRichText(product.howToUse) ? <RichText data={product.howToUse} locale={locale} className="prose-basic" /> : undefined}
          </InfoSection>

          <InfoSection title={t('products.cautions')} pending="cautions" preview={!!preview}>
            {hasRichText(product.cautions) ? <RichText data={product.cautions} locale={locale} className="prose-basic" /> : undefined}
          </InfoSection>

          <InfoSection title={t('products.inci')} pending="inci" preview={!!preview}>
            {product.inci ? (
              <p lang="en" className="max-w-prose text-sm leading-relaxed text-ink-muted">
                {product.inci}
              </p>
            ) : undefined}
          </InfoSection>
        </div>
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="related-title" className="bg-surface">
          <div className="container-page py-12 lg:py-16">
            <h2 id="related-title" className="border-t border-navy pt-6 text-2xl font-bold tracking-tight text-navy lg:text-3xl">
              {line && populatedList<Product>(product.related).length === 0
                ? t('products.relatedSameLine', { line: line.name })
                : t('products.related')}
            </h2>
            <ul className="mt-8 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
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
