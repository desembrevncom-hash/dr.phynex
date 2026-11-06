import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageShell } from '@/components/layout/PageShell'
import { BannerPicture } from '@/components/home/BannerPicture'
import { HomeSlider, type HomeSlide } from '@/components/home/HomeSlider'
import { firstImage } from '@/components/product/ProductTile'
import { populated, findPublic, findPublicGlobal } from '@/lib/content'
import { ctaPath, resolveHomeBanners, type ResolvedSlot } from '@/lib/home-banners'
import { bannersApprovedFor } from '@/lib/banner-revision'
import { pageLocale, type LocaleParams } from '@/lib/locale'
import { getPreviewUser } from '@/lib/preview'
import { alternatesFor, localizedPath, withSocial } from '@/lib/seo'
import { productBriefs } from '@/lib/product-brief'
import type { CtaTarget } from '@/globals/homeBanners'
import type { Media } from '@/payload-types'

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

/** Neutral visual when no image the reader may see was chosen; never a packaging imitation. */
function FormulaArt({ family, code }: { family: string; code: string }) {
  return (
    <div className="home-formula-art" aria-hidden="true">
      <span>{family}</span>
      <i />
      <span>{code}</span>
    </div>
  )
}

const PACKSHOT_SIZES = '(min-width: 1024px) 34vw, (min-width: 768px) 40vw, 60vw'

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await pageLocale(params)
  const [t, tr, nav, home, products, preview] = await Promise.all([
    getTranslations('homeSlider'),
    getTranslations('redesign'),
    getTranslations('nav'),
    // Guest: published + approved in this locale only; staff preview: latest draft. No fallback.
    findPublicGlobal('home-page', locale),
    // Access-checked: guests get published docs + released media only; staff preview uses its session.
    findPublic('products', locale, { limit: 12, depth: 2 }),
    getPreviewUser(),
  ])
  const href = (path: string) => localizedPath(locale, path)

  const productImages = Object.fromEntries(
    productBriefs.map((brief) => {
      const product = products.docs.find((p) => p.slug === brief.slug)
      return [productThemes[brief.slug].theme, populated<Media>(firstImage(product))]
    }),
  )
  // Guests only get CMS banners whose shared settings this locale approved (defence in depth for
  // the publish guard); otherwise the built-in slides. Staff preview shows the draft as is.
  const resolved = resolveHomeBanners(
    preview || bannersApprovedFor(home, locale) ? home : null,
    productImages,
  )

  const ctaLabelFor = (target: CtaTarget) => {
    if (target === 'brand') return t('brandCta')
    if (target === 'contact' || target === 'partnership' || target === 'products')
      return nav(target)
    const brief = productBriefs.find((b) => b.slug === target)
    return t('productCta', { name: brief ? productThemes[brief.slug].short : target })
  }

  /** Visual + CMS text for one slot; `fallback` is the built-in content of that slot. */
  const toSlide = (
    r: ResolvedSlot,
    fallback: HomeSlide,
    neutral: HomeSlide['visual'],
  ): HomeSlide => {
    const v = r.visual
    const visual =
      v.kind === 'brandOptics' ? (
        <BrandArt />
      ) : v.kind === 'packshot' ? (
        <BannerPicture
          desktop={v.desktop}
          mobile={v.mobile}
          alt={v.source === 'product' ? fallback.name : v.alt}
          className="home-slide-packshot"
          sizes={PACKSHOT_SIZES}
        />
      ) : (
        neutral
      )
    const background =
      v.kind === 'fullBleed' ? (
        <BannerPicture
          desktop={v.desktop}
          mobile={v.mobile}
          alt={v.alt}
          className="home-slide-bg-img"
          sizes="100vw"
          position={v.position}
        />
      ) : undefined
    const base: HomeSlide = {
      ...fallback,
      theme: r.theme,
      visual,
      background,
      tone: r.tone,
      copyHidden: r.copyHidden,
    }
    if (r.text.source === 'default') return base
    return {
      ...base,
      title: r.text.title,
      titleLang: locale,
      name: r.text.title,
      headline: r.text.tagline,
      description: null,
      cta: {
        label: r.text.ctaLabel ?? ctaLabelFor(r.text.ctaTarget),
        href: href(ctaPath(r.text.ctaTarget)),
      },
    }
  }

  const brandFallback: HomeSlide = {
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
  }

  const slides: HomeSlide[] = [
    toSlide(resolved[0], brandFallback, <BrandArt />),
    ...productBriefs.map((brief, i): HomeSlide => {
      const product = products.docs.find((p) => p.slug === brief.slug)
      const { theme, short } = productThemes[brief.slug]
      const fallback: HomeSlide = {
        key: brief.slug,
        theme,
        name: brief.name,
        title: brief.name,
        headline: tr(`products.${brief.slug}.line`),
        description: <p>{product?.shortDescription || tr(`products.${brief.slug}.body`)}</p>,
        cta: { label: t('productCta', { name: short }), href: href('/products/' + brief.slug) },
        visual: null,
      }
      return toSlide(
        resolved[i + 1],
        fallback,
        <FormulaArt family={brief.family} code={brief.code} />,
      )
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
