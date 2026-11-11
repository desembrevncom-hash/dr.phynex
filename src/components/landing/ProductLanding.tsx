import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { accentBar } from '@/components/product/ProductTile'
import { Arrow } from '@/components/ui/Arrow'
import { MediaImage } from '@/components/ui/MediaImage'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/locales'
import { contactHrefFor } from '@/lib/contact-interest'
import { populated, populatedList } from '@/lib/content'
import { blockIssues, type ProductProvides, type Tone } from '@/lib/landing'
import { localizedPath } from '@/lib/seo'
import { keepBrandTogether } from '@/lib/text'
import { productBriefs } from '@/lib/product-brief'

import { LandingPreviewBridge } from './LandingPreviewBridge'
import type { Ingredient, Media, Product, ProductLine } from '@/payload-types'

type Block = NonNullable<Product['landing']>[number]
type BlockOf<T extends Block['blockType']> = Extract<Block, { blockType: T }>

const hasRich = (v: unknown) => /"text":"[^"\s]/.test(JSON.stringify(v ?? ''))
const filled = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
/** A media value the current viewer may see (guests only get released files populated). */
const usable = (v: unknown): Media | null => {
  const m = populated<Media>(v)
  return m?.url ? m : null
}
/** What a visitor (not staff) would see: only released files. */
const isPublic = (v: unknown) => usable(v)?.publicRelease === true

const toneClass: Record<Tone, string> = {
  light: 'bg-surface text-ink',
  muted: 'bg-surface-muted text-ink',
  dark: 'on-dark bg-mx-charcoal text-white',
  accent: 'bg-surface text-ink border-t-4',
}
const accentBorder: Record<Product['accent'], string> = {
  navy: 'border-navy',
  'rx-red': 'border-red',
  'mx-cyan': 'border-mx-cyan',
  'mx-pink': 'border-mx-pink',
}
const headingClass = (tone: Tone) => (tone === 'dark' ? 'text-white' : 'text-navy')
const mutedClass = (tone: Tone) => (tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted')

/** Staff-only marker (draft preview): why visitors would not see something. Vietnamese, as the Admin. */
function StaffMark({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 inline-block rounded border border-dashed border-current px-2.5 py-1 text-xs font-mono opacity-90">
      [Xem trước] {children}
    </p>
  )
}

function Section({
  tone,
  product,
  label,
  mark,
  eyebrow,
  title,
  children,
  className = '',
}: {
  tone: Tone
  product: Product
  label: string
  mark?: ReactNode
  eyebrow?: string
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={label} className={`${toneClass[tone]} ${tone === 'accent' ? accentBorder[product.accent] : ''} ${className}`}>
      <div className="container-page py-16 lg:py-24">
        {mark}
        {eyebrow || title ? (
          <header className={`mb-10 lg:mb-12 border-b pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3 ${
            tone === 'dark' ? 'border-white/10' : 'border-line'
          }`}>
            <div>
              {eyebrow ? (
                <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                  tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted'
                }`}>
                  {eyebrow}
                </span>
              ) : null}
              {title ? (
                <h2 className={`mt-1 text-2xl font-bold tracking-tight lg:text-3xl ${headingClass(tone)}`}>
                  {title}
                </h2>
              ) : null}
            </div>
          </header>
        ) : null}
        {children}
      </div>
    </section>
  )
}

function Rule({ product, className = '' }: { product: Product; className?: string }) {
  return <span aria-hidden="true" className={`block h-[3px] w-12 rounded-full ${accentBar[product.accent]} ${className}`} />
}

const getLineDisplayName = (locale: Locale, line: ProductLine | null | undefined) => {
  if (!line?.name) return null
  if (locale === 'vi') return `Dòng ${line.name}`
  if (locale === 'ko') return `${line.name} 라인`
  return `${line.name} Series`
}

const getTickerText = (locale: Locale, product: Product, line: ProductLine | null | undefined) => {
  const lineName = line?.name?.trim()
  let lineLabel = ''
  if (lineName) {
    if (locale === 'vi') lineLabel = `DÒNG ${lineName.toUpperCase()}`
    else if (locale === 'ko') lineLabel = `${lineName.toUpperCase()} 라인`
    else lineLabel = `${lineName.toUpperCase()} SERIES`
  }

  let prodCode = ''
  const slug = product.slug
  if (slug === 'mx-01-forma') prodCode = 'MX-01 FORMA'
  else if (slug === 'mx-02-luma') prodCode = 'MX-02 LUMA'
  else if (slug === 'rx-matrix-balm') prodCode = 'RX MATRIX BALM'
  else if (slug === 'rx-matrix-sheet') prodCode = 'RX MATRIX SHEET'
  else if (product.name) prodCode = product.name.toUpperCase()

  if (lineLabel && prodCode) return `${lineLabel} — ${prodCode}`
  return lineLabel || prodCode || 'DR.PHYNEX'
}

const getProductIndex = (slug: string | undefined) => {
  if (slug === 'mx-01-forma') return '01 / 04'
  if (slug === 'mx-02-luma') return '02 / 04'
  if (slug === 'rx-matrix-balm') return '03 / 04'
  if (slug === 'rx-matrix-sheet') return '04 / 04'
  return ''
}

/** Agreed short product name (MX-01 FORMA, MX-02 LUMA, RX MATRIX BALM, RX MATRIX SHEET). */
const getProductShortName = (product: Product) =>
  productBriefs.find((p) => p.slug === product.slug)?.name ?? product.name ?? ''

const getIngredientDetailLabel = (locale: Locale) => {
  if (locale === 'vi') return 'Chi tiết thành phần'
  if (locale === 'ko') return '성분 상세 보기'
  return 'Ingredient details'
}

export async function ProductLanding({
  product,
  locale,
  preview,
  editable = false,
}: {
  product: Product
  locale: Locale
  preview: boolean
  /** Staff preview inside the Admin builder (also "view as guest"): blocks can be clicked to edit. */
  editable?: boolean
}) {
  const t = await getTranslations()
  const href = (p: string) => localizedPath(locale, p)
  const slug = product.slug ?? ''
  const contactHref = contactHrefFor(href('/contact'), slug)
  const line = populated<ProductLine>(product.line)
  const productImages = populatedList<Media>(product.images).filter((m) => m.url)
  const keyIngredients = populatedList<Ingredient>(product.keyIngredients)
  const provides = (viewerImage: (v: unknown) => boolean): ProductProvides => ({
    image: productImages.some((m) => viewerImage(m)),
    packSize: filled(product.volume),
    inci: filled(product.inci),
    howToUse: hasRich(product.howToUse),
    cautions: hasRich(product.cautions),
    keyIngredients: keyIngredients.length > 0,
  })
  const forViewer = provides((v) => usable(v) !== null)
  const forGuest = provides(isPublic)

  const blocks = (product.landing ?? []).filter((b) => b.hidden !== true)
  const rendered: ReactNode[] = []
  for (const block of blocks) {
    const start = rendered.length
    const viewer = blockIssues(block as never, forViewer, (v) => usable(v) !== null)
    const guest = blockIssues(block as never, forGuest, isPublic)
    // Visitors: a block with missing required content is left out entirely.
    if (viewer.required.length > 0 && !preview) continue
    const guestHidden = guest.required.length > 0
    const mark = preview
      ? guestHidden
        ? <StaffMark>Khách chưa thấy khối này: thiếu {guest.required.join(', ')}.</StaffMark>
        : viewer.optional.length > 0
          ? <StaffMark>Nên bổ sung: {viewer.optional.join(', ')}.</StaffMark>
          : null
      : null
    const tone = (block.tone ?? 'light') as Tone
    const key = block.id ?? `${block.blockType}-${rendered.length}`
    const privateNote = (m: Media | null) =>
      preview && m && !m.publicRelease ? (
        <StaffMark>Ảnh chưa được phép công khai: khách sẽ không thấy ảnh này.</StaffMark>
      ) : null

    switch (block.blockType) {
      case 'hero': {
        const b = block as BlockOf<'hero'>
        const img = usable(b.image) ?? productImages.find((m) => usable(m)) ?? null
        const intro = filled(b.intro) ? b.intro : product.shortDescription
        rendered.push(
          <section key={key} aria-labelledby="landing-title" className={`${toneClass[tone]} ${tone === 'accent' ? accentBorder[product.accent] : ''} border-b border-line`}>
            <div className="container-page flex flex-col md:grid md:grid-cols-12 md:items-center gap-6 md:gap-10 py-8 lg:py-20">
              <div className="contents md:block md:col-span-6">
                {/* Block A: Title & Intro (order-1 on mobile) */}
                <div className="order-1">
                  {mark}
                  {line ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-surface/90 text-xs font-semibold tracking-wider uppercase text-ink-muted mb-3 sm:mb-4 shadow-2xs">
                      <span className={`inline-block w-2 h-2 rounded-full ${accentBar[product.accent]}`} />
                      <Link href={href(`/products/line/${line.slug}`)} className="hover:text-navy hover:underline">
                        {t.rich('home.lineHeading', { line: line.name, code: (c) => <span className="font-extrabold">{c}</span> })}
                      </Link>
                      <span className="text-line-strong">•</span>
                      <span className="font-mono text-[10px] tracking-normal text-ink-muted/80">{getProductShortName(product)}</span>
                    </div>
                  ) : null}
                  <h1 id="landing-title" className={`text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.12] tracking-tight ${headingClass(tone)}`}>
                    {keepBrandTogether(product.name)}
                  </h1>
                  {filled(b.tagline) ? (
                    <p className={`mt-2.5 sm:mt-3 text-base sm:text-xl font-semibold leading-snug ${headingClass(tone)} opacity-90`}>
                      {b.tagline}
                    </p>
                  ) : null}
                  <Rule product={product} className="mt-4 mb-4 sm:mt-5 sm:mb-5" />
                  {filled(intro) ? (
                    <p className={`max-w-xl text-sm sm:text-base lg:text-lg leading-relaxed ${mutedClass(tone)}`}>
                      {intro}
                    </p>
                  ) : null}
                </div>

                {/* Block B: Clinical Label Fact Sheet (order-4 on mobile, after buttons) */}
                {b.showPack !== false && filled(product.volume) ? (
                  <div className="order-4 md:order-none mt-5 md:mt-6 rounded-lg border border-line bg-surface/90 p-3.5 sm:p-4 shadow-2xs backdrop-blur-xs">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:gap-y-3 text-xs sm:text-sm">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          {t('products.volume')}
                        </span>
                        <span className="font-semibold text-ink">{product.volume}</span>
                      </div>
                      {line?.name ? (
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                            {t('products.line')}
                          </span>
                          <span className="font-semibold text-ink">{getLineDisplayName(locale, line)}</span>
                        </div>
                      ) : null}
                      {keyIngredients.length > 0 ? (
                        <div className="col-span-2 pt-2 border-t border-line/60">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                            {t('products.keyIngredients')}
                          </span>
                          <span className="font-medium text-ink">
                            {keyIngredients.slice(0, 4).map((k) => k.name).join(' · ')}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Block C: Primary & Secondary CTA Cluster (order-3 on mobile, directly under bottle image) */}
                <div className="order-3 md:order-none mt-4 sm:mt-6 md:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-6">
                  <Link
                    href={contactHref}
                    className="inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-2.5 rounded-sm bg-navy px-6 sm:px-7 text-sm font-semibold text-white shadow-xs transition-all hover:bg-navy-strong focus-visible:outline-2"
                  >
                    <span>{filled(b.ctaLabel) ? b.ctaLabel : t('products.ctaConsult')}</span>
                    <Arrow />
                  </Link>
                  <Link
                    href={href('/stores')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-navy-strong underline underline-offset-8 decoration-line-strong hover:decoration-navy transition-all"
                  >
                    <span>{t('products.ctaStores')}</span>
                    <Arrow />
                  </Link>
                </div>
              </div>

              {/* Block D: Product Visual Stage (order-2 on mobile, directly under intro) */}
              <div className="order-2 md:order-none md:col-span-6">
                {img ? (
                  <>
                    {privateNote(img)}
                    <div className="relative flex min-h-[220px] sm:min-h-[260px] md:min-h-[440px] lg:min-h-[520px] items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-[#F5F8FA] via-white to-surface-muted p-4 sm:p-6 md:p-8 lg:p-12 shadow-xs overflow-hidden">
                      {/* Orbital concentric clinical rings from Dr. PhynEX brand identity */}
                      <svg
                        className="pointer-events-none absolute inset-0 w-full h-full text-navy/10"
                        viewBox="0 0 500 500"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="250" cy="250" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                        <ellipse cx="250" cy="250" rx="205" ry="175" stroke="currentColor" strokeWidth="1" transform="rotate(-15 250 250)" />
                        <ellipse cx="250" cy="250" rx="165" ry="215" stroke="currentColor" strokeWidth="0.8" transform="rotate(25 250 250)" opacity="0.6" />
                        <circle cx="250" cy="250" r="125" stroke="currentColor" strokeWidth="0.75" />
                      </svg>
                      {/* Watermark formula text */}
                      <div className="pointer-events-none absolute bottom-3 right-4 sm:bottom-4 sm:right-5 text-[8px] sm:text-[9px] font-mono tracking-[0.22em] uppercase text-navy/40">
                        FORMULA / INSIGHT / CARE
                      </div>
                      {/* Corner clinical registration marks */}
                      <span className="pointer-events-none absolute top-3 left-3 text-[10px] font-mono text-ink-muted/50">+</span>
                      <span className="pointer-events-none absolute top-3 right-3 text-[10px] font-mono text-ink-muted/50">+</span>
                      <span className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-mono text-ink-muted/50">+</span>
                      <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] font-mono text-ink-muted/50">+</span>
                      <div className="pointer-events-none absolute bottom-3 left-5 text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-ink-muted/60 hidden sm:block">
                        {getProductShortName(product)}
                      </div>
                      <MediaImage
                        media={img}
                        sizes="(min-width: 768px) 50vw, 100vw"
                        priority
                        className="relative z-10 max-h-[180px] sm:max-h-[220px] md:max-h-[380px] lg:max-h-[460px] w-auto object-contain transition-transform duration-500 hover:scale-[1.02]"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Clinical Ticker Strip */}
            <div className={`border-t ${tone === 'dark' ? 'border-white/10' : 'border-line/70'}`}>
              <div className="container-page py-3 text-[11px] font-mono tracking-wider text-ink-muted flex items-center justify-between gap-3">
                <span className={`font-semibold shrink-0 ${tone === 'dark' ? 'text-white' : 'text-navy'}`}>Dr.PhynEX™</span>
                <span className={`uppercase text-center truncate ${tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted'}`}>
                  {getTickerText(locale, product, line)}
                </span>
                <span className={`font-semibold shrink-0 ${tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted'}`}>
                  {getProductIndex(product.slug)}
                </span>
              </div>
            </div>
          </section>,
        )
        break
      }
      case 'band': {
        const b = block as BlockOf<'band'>
        const img = usable(b.image)
        const mobile = usable(b.mobileImage)
        if (!img) {
          if (preview) rendered.push(<Section key={key} tone={tone} product={product} label={t('products.gallery')} mark={mark}>{null}</Section>)
          break
        }
        const alt = filled(b.alt) ? b.alt : img.alt
        const light = tone === 'light' || tone === 'muted' || tone === 'accent'
        rendered.push(
          <section key={key} aria-label={filled(b.caption) ? b.caption : alt || t('products.gallery')} className={`${toneClass[tone]} ${tone === 'accent' ? accentBorder[product.accent] : ''}`}>
            <div className="container-page py-10 lg:py-16">
              {mark}
              {privateNote(img)}
              <figure>
                <div className={`flex h-[clamp(320px,72vh,760px)] items-center justify-center overflow-hidden rounded-2xl border border-line ${light ? 'bg-surface-muted/40' : 'bg-white/5'}`}>
                  {mobile ? (
                    <>
                      <MediaImage media={mobile} alt={alt} sizes="100vw" className={`max-h-full w-auto object-contain md:hidden ${light ? 'blend-panel' : ''}`} />
                      <MediaImage media={img} alt={alt} sizes="100vw" className={`hidden max-h-full w-auto object-contain md:block ${light ? 'blend-panel' : ''}`} />
                    </>
                  ) : (
                    <MediaImage media={img} alt={alt} sizes="100vw" className={`max-h-full w-auto object-contain ${light ? 'blend-panel' : ''}`} />
                  )}
                </div>
                {filled(b.caption) ? <figcaption className={`mt-4 text-center text-sm ${mutedClass(tone)}`}>{b.caption}</figcaption> : null}
              </figure>
            </div>
          </section>,
        )
        break
      }
      case 'split': {
        const b = block as BlockOf<'split'>
        const img = usable(b.image)
        const right = b.imageSide === 'right'
        rendered.push(
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.details')} mark={mark}>
            <div className="grid gap-8 md:grid-cols-12 md:items-center md:gap-12">
              <div className={`md:col-span-6 ${right ? 'md:order-2' : ''}`}>
                {privateNote(img)}
                {img ? (
                  <div className={`flex h-[clamp(280px,50vh,520px)] items-center justify-center rounded-2xl border p-8 shadow-xs ${
                    tone === 'dark' ? 'border-white/10 bg-white/5' : 'border-line bg-surface-muted/60'
                  }`}>
                    <MediaImage
                      media={img}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className={`max-h-full w-auto object-contain ${tone === 'dark' ? '' : 'blend-panel'}`}
                    />
                  </div>
                ) : null}
              </div>
              <div className={`md:col-span-6 lg:col-span-5 ${right ? 'md:order-1' : 'lg:col-start-8'}`}>
                <Rule product={product} />
                {filled(b.heading) ? <h2 className={`mt-5 text-2xl font-bold tracking-tight lg:text-4xl ${headingClass(tone)}`}>{b.heading}</h2> : null}
                {filled(b.body) ? <p className={`mt-5 whitespace-pre-line text-base leading-relaxed lg:text-lg ${mutedClass(tone)}`}>{b.body}</p> : null}
              </div>
            </div>
          </Section>,
        )
        break
      }
      case 'points': {
        const b = block as BlockOf<'points'>
        const items = (b.items ?? []).filter((i) => filled(i.title))
        rendered.push(
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.claims')} mark={mark} eyebrow={t('landing.highlights')} title={filled(b.heading) ? b.heading : t('products.claims')}>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => (
                <li
                  key={i.id}
                  className={`rounded-xl border p-6 shadow-2xs hover:shadow-xs transition-shadow ${
                    tone === 'dark'
                      ? 'border-white/10 bg-mx-raised text-white'
                      : 'border-line bg-surface text-ink'
                  }`}
                >
                  <Rule product={product} />
                  <h3 className={`mt-4 text-lg font-bold ${headingClass(tone)}`}>{i.title}</h3>
                  {filled(i.text) ? <p className={`mt-2 text-sm leading-relaxed ${mutedClass(tone)}`}>{i.text}</p> : null}
                </li>
              ))}
            </ul>
          </Section>,
        )
        break
      }
      case 'ingredients': {
        const b = block as BlockOf<'ingredients'>
        const items = (b.items ?? []).length
          ? (b.items ?? []).map((i) => {
              const ing = populated<Ingredient>(i.ingredient)
              return {
                id: i.id ?? ing?.id ?? i.name,
                name: filled(i.name) ? i.name : ing?.name,
                text: filled(i.text) ? i.text : ing?.summary,
                image: usable(i.image) ?? usable(ing?.image),
                link: ing?.slug ? href(`/ingredients/${ing.slug}`) : null,
              }
            })
          : keyIngredients.map((ing) => ({ id: ing.id, name: ing.name, text: ing.summary, image: usable(ing.image), link: href(`/ingredients/${ing.slug}`) }))
        const shown = items.filter((i) => filled(i.name))
        rendered.push(
          <Section
            key={key}
            tone={tone}
            product={product}
            label={filled(b.heading) ? b.heading : t('products.keyIngredients')}
            mark={mark}
            eyebrow={`01 · ${t('landing.ingredientsLabel')}`}
            title={filled(b.heading) ? b.heading : t('products.keyIngredients')}
          >
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((i, idx) => (
                <li
                  key={String(i.id)}
                  className={`group flex flex-col justify-between rounded-xl border p-6 shadow-2xs hover:shadow-xs transition-all ${
                    tone === 'dark'
                      ? 'border-white/10 bg-mx-raised text-white'
                      : 'border-line bg-surface text-ink'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`block h-[2px] w-8 ${accentBar[product.accent]}`} />
                      <span
                        className={`font-mono text-[10px] font-bold tracking-wider uppercase ${
                          tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted/60'
                        }`}
                      >
                        ACT-{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    {i.image ? (
                      <div
                        className={`mb-4 flex aspect-square items-center justify-center rounded-lg p-4 ${
                          tone === 'dark' ? 'bg-white/5' : 'bg-surface-muted/60'
                        }`}
                      >
                        <MediaImage
                          media={i.image}
                          sizes="(min-width: 1024px) 20vw, 50vw"
                          className={`max-h-full w-auto object-contain ${
                            tone === 'dark' ? '' : 'blend-panel'
                          }`}
                        />
                      </div>
                    ) : null}
                    <h3 className={`text-lg font-bold ${headingClass(tone)}`}>
                      {i.link ? (
                        <Link href={i.link} className="hover:underline">
                          {i.name}
                        </Link>
                      ) : (
                        i.name
                      )}
                    </h3>
                    {filled(i.text) ? (
                      <p className={`mt-2 text-sm leading-relaxed ${mutedClass(tone)}`}>{i.text}</p>
                    ) : null}
                  </div>
                  {i.link ? (
                    <div
                      className={`mt-4 pt-3 border-t ${
                        tone === 'dark' ? 'border-white/10' : 'border-line/60'
                      }`}
                    >
                      <Link
                        href={i.link}
                        className={`text-xs font-semibold hover:underline inline-flex items-center gap-1 ${
                          tone === 'dark'
                            ? 'text-white hover:text-white/80'
                            : 'text-navy hover:text-navy-strong'
                        }`}
                      >
                        <span>{getIngredientDetailLabel(locale)}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>,
        )
        break
      }
      case 'details': {
        const b = block as BlockOf<'details'>
        const rows: Array<[string, ReactNode]> = []
        if (b.showPack !== false && filled(product.volume)) rows.push([t('products.volume'), <p key="v" className="font-semibold">{product.volume}</p>])
        if (b.showHowToUse !== false && hasRich(product.howToUse)) rows.push([t('products.howToUse'), <RichText key="h" data={product.howToUse} locale={locale} className="prose-basic" />])
        if (b.showCautions !== false && hasRich(product.cautions)) rows.push([t('products.cautions'), <RichText key="c" data={product.cautions} locale={locale} className="prose-basic" />])
        if (b.showInci !== false && filled(product.inci)) rows.push([t('products.inci'), <p key="i" lang="en" className="max-w-prose text-xs sm:text-sm font-mono leading-relaxed opacity-90">{product.inci}</p>])
        rendered.push(
          <Section
            key={key}
            tone={tone}
            product={product}
            label={filled(b.heading) ? b.heading : t('products.details')}
            mark={mark}
            eyebrow={`02 · ${t('landing.detailsLabel')}`}
            title={filled(b.heading) ? b.heading : t('products.details')}
          >
            <div
              className={`overflow-hidden rounded-xl border shadow-2xs divide-y ${
                tone === 'dark'
                  ? 'border-white/10 bg-mx-raised divide-white/10 text-white'
                  : 'border-line bg-surface divide-line text-ink'
              }`}
            >
              {rows.map(([title, body]) => (
                <div
                  key={title}
                  className={`grid gap-3 p-6 md:grid-cols-12 md:gap-8 transition-colors ${
                    tone === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-surface-muted/20'
                  }`}
                >
                  <h3
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider md:col-span-4 self-start pt-0.5 ${
                      tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted'
                    }`}
                  >
                    {title}
                  </h3>
                  <div
                    className={`md:col-span-8 text-sm sm:text-base leading-relaxed ${
                      tone === 'dark' ? 'text-white/90' : 'text-ink'
                    }`}
                  >
                    {body}
                  </div>
                </div>
              ))}
            </div>
          </Section>,
        )
        break
      }
      case 'faq': {
        const b = block as BlockOf<'faq'>
        const items = (b.items ?? []).filter((i) => filled(i.question) && filled(i.answer))
        rendered.push(
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('landing.faq')} mark={mark} eyebrow={`03 · ${t('landing.faqLabel')}`} title={filled(b.heading) ? b.heading : t('landing.faq')}>
            <div
              className={`max-w-3xl overflow-hidden rounded-xl border shadow-2xs divide-y ${
                tone === 'dark'
                  ? 'border-white/10 bg-mx-raised divide-white/10 text-white'
                  : 'border-line bg-surface divide-line text-ink'
              }`}
            >
              {items.map((i) => (
                <details
                  key={i.id}
                  className={`group p-6 transition-colors ${
                    tone === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-surface-muted/20'
                  }`}
                >
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold ${headingClass(
                      tone,
                    )}`}
                  >
                    {i.question}
                    <span
                      aria-hidden="true"
                      className={`text-xl leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none ${
                        tone === 'dark' ? 'text-mx-muted' : 'text-ink-muted'
                      }`}
                    >
                      +
                    </span>
                  </summary>
                  <p
                    className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${mutedClass(
                      tone,
                    )}`}
                  >
                    {i.answer}
                  </p>
                </details>
              ))}
            </div>
          </Section>,
        )
        break
      }
      case 'cta': {
        const b = block as BlockOf<'cta'>
        rendered.push(
          <Section
            key={key}
            tone={tone}
            product={product}
            label={filled(b.heading) ? b.heading : t('products.ctaTitle')}
            mark={mark}
            className={`border-t-4 ${accentBorder[product.accent]}`}
          >
            <div className="grid gap-10 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <Rule product={product} className="mb-4" />
                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight ${headingClass(tone)} leading-[1.12]`}>
                  {filled(b.heading) ? b.heading : t('products.ctaTitle')}
                </h2>
                <p className={`mt-4 max-w-xl text-base lg:text-lg leading-relaxed ${mutedClass(tone)}`}>
                  {filled(b.body) ? b.body : t('products.ctaBody')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3.5 md:col-span-5 md:justify-end">
                <Link
                  href={contactHref}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-semibold transition-all shadow-sm ${
                    tone === 'dark'
                      ? 'bg-white text-navy hover:bg-surface-muted'
                      : 'bg-navy text-white hover:bg-navy-strong'
                  }`}
                >
                  <span>{filled(b.ctaLabel) ? b.ctaLabel : t('products.ctaConsult')}</span>
                  <Arrow />
                </Link>
                <Link
                  href={href('/stores')}
                  className={`inline-flex min-h-12 items-center justify-center rounded-md border px-6 text-sm font-semibold transition-all ${
                    tone === 'dark'
                      ? 'border-white/30 text-white hover:bg-white/10'
                      : 'border-line-strong text-ink hover:border-navy hover:text-navy'
                  }`}
                >
                  {t('products.ctaStores')}
                </Link>
              </div>
            </div>
          </Section>,
        )
        break
      }
    }
    // Builder preview only: tag the block's markup so a click can open it in Admin.
    if (editable && block.id) {
      for (let k = start; k < rendered.length; k++) {
        rendered[k] = (
          <div key={`lp-${block.id}-${k}`} data-lp-id={block.id} data-lp-type={block.blockType}>
            {rendered[k]}
          </div>
        )
      }
    }
  }
  // Every product page keeps exactly one h1: without a hero block, a compact title opens the page.
  const hasHero = blocks.some((b) => b.blockType === 'hero')
  return (
    <>
      {hasHero ? null : (
        <header className="container-page pb-6 pt-4 lg:pt-8">
          <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight text-navy sm:text-4xl lg:text-5xl">
            {keepBrandTogether(product.name)}
          </h1>
        </header>
      )}
      {rendered}
      {editable ? <LandingPreviewBridge /> : null}
    </>
  )
}
