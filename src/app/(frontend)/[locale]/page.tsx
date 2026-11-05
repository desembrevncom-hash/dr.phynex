import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageShell } from '@/components/layout/PageShell'
import { HomeSlider, type HomeSlide } from '@/components/home/HomeSlider'
import { MediaImage } from '@/components/ui/MediaImage'
import { firstImage } from '@/components/product/ProductTile'
import { findPublic, findPublicGlobal } from '@/lib/content'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { alternatesFor, localizedPath, withSocial } from '@/lib/seo'
import { productBriefs } from '@/lib/product-brief'

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await pageLocale(params)
  const [t, home] = await Promise.all([
    getTranslations({ locale, namespace: 'redesign' }),
    findPublicGlobal('home-page', locale),
  ])
  return withSocial(
    {
      title: home?.seo?.title || { absolute: 'Dr.PhynEX · INSIGHTLOGY™' },
      description: home?.seo?.description || t('heroBody'),
      alternates: alternatesFor(locale, ''),
    },
    locale,
  )
}

/** Slide order and themes follow the approved mockup: Brand → Forma → Luma → Balm → Sheet. */
const productThemes = {
  'mx-01-forma': { theme: 'forma', short: 'MX-01' },
  'mx-02-luma': { theme: 'luma', short: 'MX-02' },
  'rx-matrix-balm': { theme: 'balm', short: 'RX BALM' },
  'rx-matrix-sheet': { theme: 'sheet', short: 'RX SHEET' },
} as const

/** Original optical artwork; never imitates packaging. */
function BrandArt() {
  return (
    <div className="home-brand-art" aria-hidden="true">
      <span className="home-brand-disc home-brand-disc-1" />
      <span className="home-brand-disc home-brand-disc-2" />
      <span className="home-brand-disc home-brand-disc-3" />
      <span className="home-brand-disc-center">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </span>
    </div>
  )
}

/** Shown when no released (or, in staff preview, permitted) product image is available. */
function FormulaArt({ family, code }: { family: string; code: string }) {
  return (
    <div className="home-formula-art" aria-hidden="true">
      <span>{family}</span>
      <i />
      <span>{code}</span>
    </div>
  )
}

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, tr, home, products] = await Promise.all([
    getTranslations('homeSlider'),
    getTranslations('redesign'),
    findPublicGlobal('home-page', locale),
    // Access-checked: guests get published docs + released media only; staff preview uses its session.
    findPublic('products', locale, { limit: 12, depth: 2 }),
  ])
  const href = (path: string) => localizedPath(locale, path)

  const slides: HomeSlide[] = [
    {
      key: 'brand',
      theme: 'brand',
      name: 'Dr.PhynEX',
      title: (
        <>
          INSIGHTLOGY<sup>™</sup>
        </>
      ),
      headline: home?.headline || t('brandHeadline'),
      description: (
        <>
          <p lang="en">Science-Driven. Insight-Led. Formula-Focused.</p>
          <p>{home?.intro || tr('heroBody')}</p>
        </>
      ),
      cta: { label: t('brandCta'), href: href('/brand') },
      visual: <BrandArt />,
    },
    ...productBriefs.map((brief): HomeSlide => {
      const product = products.docs.find((p) => p.slug === brief.slug)
      const media = firstImage(product)
      const { theme, short } = productThemes[brief.slug]
      const image = media ? (
        <MediaImage
          media={media}
          alt={brief.name}
          className="home-slide-packshot"
          sizes="(min-width: 1024px) 34vw, (min-width: 768px) 40vw, 60vw"
        />
      ) : null
      return {
        key: brief.slug,
        theme,
        name: brief.name,
        title: brief.name,
        headline: tr(`products.${brief.slug}.line`),
        description: <p>{product?.shortDescription || tr(`products.${brief.slug}.body`)}</p>,
        cta: { label: t('productCta', { name: short }), href: href('/products/' + brief.slug) },
        visual: image ?? <FormulaArt family={brief.family} code={brief.code} />,
      }
    }),
  ]

  const total = slides.length
  return (
    <PageShell locale={locale} path="" bleed>
      <HomeSlider
        slides={slides}
        labels={{
          carousel: t('carousel'),
          controls: t('controls'),
          chooseSlide: t('chooseSlide'),
          pause: t('pause'),
          play: t('play'),
          slideLabels: slides.map((s, i) => t('slideLabel', { index: i + 1, total, name: s.name })),
          dotLabels: slides.map((s, i) => t('dotLabel', { index: i + 1, name: s.name })),
        }}
      />
    </PageShell>
  )
}
