import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { ProductGrid } from '@/components/product/ProductCard'
import { MediaImage } from '@/components/ui/MediaImage'
import { RichText } from '@/components/ui/RichText'
import { approvedLocalesFor, findPublicBySlug, populated, populatedList } from '@/lib/content'
import { pageLocale, type SlugParams } from '@/lib/locale'
import { alternatesFor, localizedPath } from '@/lib/seo'
import { keepBrandTogether } from '@/lib/text'
import type { Ingredient, Product, ProductLine, Technology } from '@/payload-types'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const { slug } = await params
  const product = await findPublicBySlug('products', slug, locale)
  if (!product) return {}
  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || product.shortDescription || undefined,
    alternates: alternatesFor(locale, `/products/${slug}`, await approvedLocalesFor('products', slug)),
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default async function ProductPage({ params }: { params: SlugParams }) {
  const locale = await pageLocale(params)
  const { slug } = await params
  const product = await findPublicBySlug('products', slug, locale)
  if (!product) notFound()

  const [t, available] = await Promise.all([getTranslations('products'), approvedLocalesFor('products', slug)])
  const line = populated<ProductLine>(product.line)
  const images = Array.isArray(product.images) ? product.images : []
  const ingredients = populatedList<Ingredient>(product.keyIngredients)
  const technologies = populatedList<Technology>(product.technologies)
  const related = populatedList<Product>(product.related)
  const claims = product.claims ?? []

  return (
    <PageShell locale={locale} path={`/products/${slug}`} available={available}>
      <article>
        <div className={images.length > 0 ? 'grid gap-8 md:grid-cols-2' : 'max-w-2xl'}>
          {images.length > 0 ? (
            <div className="space-y-4">
              {images.map((img, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-line bg-surface-muted">
                  <MediaImage media={img} priority={i === 0} className="h-auto w-full object-contain" />
                </div>
              ))}
            </div>
          ) : null}
          <div>
            {line ? (
              <p className="text-sm text-ink-muted">
                <Link href={localizedPath(locale, `/products/line/${line.slug}`)} className="hover:underline">
                  {line.name}
                </Link>
              </p>
            ) : null}
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{keepBrandTogether(product.name)}</h1>
            {product.volume ? (
              <p className="mt-2 text-sm text-ink-muted">
                {t('volume')}: {product.volume}
              </p>
            ) : null}
            {product.shortDescription ? <p className="mt-4 text-lg text-ink-muted">{product.shortDescription}</p> : null}
            <RichText data={product.description} className="mt-6" />

            <div className="mt-8 rounded-lg border border-line p-5">
              <h2 className="font-semibold">{t('ctaTitle')}</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={localizedPath(locale, '/stores')} className="rounded-md bg-ink px-4 py-2.5 text-surface hover:opacity-90">
                  {t('ctaStores')}
                </Link>
                <Link href={localizedPath(locale, '/contact')} className="rounded-md border border-ink px-4 py-2.5 hover:bg-surface-muted">
                  {t('ctaContact')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          {claims.length > 0 ? (
            <Section title={t('claims')}>
              <ul className="list-disc space-y-2 pl-5">
                {claims.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {ingredients.length > 0 ? (
            <Section title={t('keyIngredients')}>
              <ul className="flex flex-wrap gap-2">
                {ingredients.map((ing) => (
                  <li key={ing.id}>
                    <Link
                      href={localizedPath(locale, `/ingredients/${ing.slug}`)}
                      className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink"
                    >
                      {ing.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {technologies.length > 0 ? (
            <Section title={t('technologies')}>
              <ul className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <li key={tech.id}>
                    <Link
                      href={localizedPath(locale, `/ingredients/${tech.slug}`)}
                      className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-ink"
                    >
                      {tech.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {product.howToUse ? (
            <Section title={t('howToUse')}>
              <RichText data={product.howToUse} />
            </Section>
          ) : null}

          {product.cautions ? (
            <Section title={t('cautions')}>
              <RichText data={product.cautions} />
            </Section>
          ) : null}

          {product.inci ? (
            <Section title={t('inci')}>
              <p lang="en" className="max-w-prose text-sm leading-relaxed text-ink-muted">
                {product.inci}
              </p>
            </Section>
          ) : null}

          {related.length > 0 ? (
            <Section title={t('related')}>
              <ProductGrid products={related} locale={locale} />
            </Section>
          ) : null}
        </div>
      </article>
    </PageShell>
  )
}
