import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { accentBar, accentText } from '@/components/product/ProductTile'
import { Arrow } from '@/components/ui/Arrow'
import { MediaImage } from '@/components/ui/MediaImage'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/locales'
import { contactHrefFor } from '@/lib/contact-interest'
import { populated, populatedList } from '@/lib/content'
import { blockIssues, type ProductProvides, type Tone } from '@/lib/landing'
import { localizedPath } from '@/lib/seo'
import { keepBrandTogether } from '@/lib/text'

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
    <p className="mb-4 inline-block rounded border border-dashed border-current px-2 py-1 text-sm opacity-90">
      [Xem trước] {children}
    </p>
  )
}

function Section({
  tone,
  product,
  label,
  mark,
  children,
}: {
  tone: Tone
  product: Product
  label: string
  mark?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={label} className={`${toneClass[tone]} ${tone === 'accent' ? accentBorder[product.accent] : ''}`}>
      <div className="container-page py-14 lg:py-24">
        {mark}
        {children}
      </div>
    </section>
  )
}

function Rule({ product, className = '' }: { product: Product; className?: string }) {
  return <span aria-hidden="true" className={`block h-0.5 w-8 ${accentBar[product.accent]} ${className}`} />
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
          <section key={key} aria-labelledby="landing-title" className={`${toneClass[tone]} ${tone === 'accent' ? accentBorder[product.accent] : ''}`}>
            <div className="container-page grid gap-10 py-12 md:grid-cols-12 md:items-center lg:py-20">
              <div className="md:col-span-6 lg:col-span-5">
                {mark}
                {line ? (
                  <p className="text-sm font-medium">
                    <Link href={href(`/products/line/${line.slug}`)} className={`hover:underline ${tone === 'dark' ? 'text-mx-muted' : accentText[product.accent]}`}>
                      {t.rich('home.lineHeading', { line: line.name, code: (c) => <span className="font-extrabold">{c}</span> })}
                    </Link>
                  </p>
                ) : null}
                <h1 id="landing-title" className={`mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight lg:text-6xl ${headingClass(tone)}`}>
                  {keepBrandTogether(product.name)}
                </h1>
                {filled(b.tagline) ? <p className={`mt-4 text-xl font-semibold lg:text-2xl ${headingClass(tone)}`}>{b.tagline}</p> : null}
                <Rule product={product} className="mt-6" />
                {filled(intro) ? <p className={`mt-6 max-w-prose text-base lg:text-lg ${mutedClass(tone)}`}>{intro}</p> : null}
                {b.showPack !== false && filled(product.volume) ? (
                  <dl className="mt-6 flex gap-2 text-sm">
                    <dt className={mutedClass(tone)}>{t('products.volume')}</dt>
                    <dd className="font-semibold">{product.volume}</dd>
                  </dl>
                ) : null}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={contactHref} className="inline-flex min-h-12 items-center gap-2 rounded bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-strong">
                    {filled(b.ctaLabel) ? b.ctaLabel : t('products.ctaConsult')}
                    <Arrow />
                  </Link>
                </div>
              </div>
              <div className="md:col-span-6 lg:col-span-6 lg:col-start-7">
                {img ? (
                  <>
                    {privateNote(img)}
                    <div className="flex h-[clamp(320px,60vh,560px)] items-center justify-center rounded-lg bg-surface-muted p-8">
                      <MediaImage media={img} sizes="(min-width: 768px) 50vw, 100vw" priority className="blend-panel max-h-full w-auto object-contain" />
                    </div>
                  </>
                ) : null}
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
                <div className={`flex h-[clamp(320px,72vh,760px)] items-center justify-center overflow-hidden rounded-lg ${light ? '' : 'bg-white/5'}`}>
                  {mobile ? (
                    <>
                      <MediaImage media={mobile} alt={alt} sizes="100vw" className={`max-h-full w-auto object-contain md:hidden ${light ? 'blend-panel' : ''}`} />
                      <MediaImage media={img} alt={alt} sizes="100vw" className={`hidden max-h-full w-auto object-contain md:block ${light ? 'blend-panel' : ''}`} />
                    </>
                  ) : (
                    <MediaImage media={img} alt={alt} sizes="100vw" className={`max-h-full w-auto object-contain ${light ? 'blend-panel' : ''}`} />
                  )}
                </div>
                {filled(b.caption) ? <figcaption className={`mt-4 text-sm ${mutedClass(tone)}`}>{b.caption}</figcaption> : null}
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
                  <div className="flex h-[clamp(280px,50vh,520px)] items-center justify-center rounded-lg bg-surface-muted p-8">
                    <MediaImage media={img} sizes="(min-width: 768px) 50vw, 100vw" className="blend-panel max-h-full w-auto object-contain" />
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
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.claims')} mark={mark}>
            {filled(b.heading) ? <h2 className={`text-2xl font-bold tracking-tight lg:text-4xl ${headingClass(tone)}`}>{b.heading}</h2> : null}
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => (
                <li key={i.id} className={`rounded-lg p-6 ${tone === 'dark' ? 'bg-mx-raised' : 'bg-surface'}`}>
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
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.keyIngredients')} mark={mark}>
            <h2 className={`text-2xl font-bold tracking-tight lg:text-4xl ${headingClass(tone)}`}>
              {filled(b.heading) ? b.heading : t('products.keyIngredients')}
            </h2>
            <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((i) => (
                <li key={String(i.id)} className={`border-t pt-5 ${tone === 'dark' ? 'border-white/20' : 'border-line'}`}>
                  {i.image ? (
                    <div className="mb-4 flex aspect-square items-center justify-center rounded-md bg-surface-muted p-6">
                      <MediaImage media={i.image} sizes="(min-width: 1024px) 20vw, 50vw" className="blend-panel max-h-full w-auto object-contain" />
                    </div>
                  ) : null}
                  <h3 className={`text-lg font-bold ${headingClass(tone)}`}>
                    {i.link ? <Link href={i.link} className="hover:underline">{i.name}</Link> : i.name}
                  </h3>
                  {filled(i.text) ? <p className={`mt-2 text-sm leading-relaxed ${mutedClass(tone)}`}>{i.text}</p> : null}
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
        if (b.showPack !== false && filled(product.volume)) rows.push([t('products.volume'), <p key="v">{product.volume}</p>])
        if (b.showHowToUse !== false && hasRich(product.howToUse)) rows.push([t('products.howToUse'), <RichText key="h" data={product.howToUse} locale={locale} className="prose-basic" />])
        if (b.showCautions !== false && hasRich(product.cautions)) rows.push([t('products.cautions'), <RichText key="c" data={product.cautions} locale={locale} className="prose-basic" />])
        if (b.showInci !== false && filled(product.inci)) rows.push([t('products.inci'), <p key="i" lang="en" className="max-w-prose text-sm leading-relaxed">{product.inci}</p>])
        rendered.push(
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.details')} mark={mark}>
            <h2 className={`text-2xl font-bold tracking-tight lg:text-4xl ${headingClass(tone)}`}>
              {filled(b.heading) ? b.heading : t('products.details')}
            </h2>
            <div className="mt-8">
              {rows.map(([title, body]) => (
                <div key={title} className={`grid gap-3 border-t py-6 md:grid-cols-12 md:gap-8 ${tone === 'dark' ? 'border-white/20' : 'border-line'}`}>
                  <h3 className={`text-lg font-bold md:col-span-4 ${headingClass(tone)}`}>{title}</h3>
                  <div className={`md:col-span-8 ${mutedClass(tone)}`}>{body}</div>
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
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('landing.faq')} mark={mark}>
            <h2 className={`text-2xl font-bold tracking-tight lg:text-4xl ${headingClass(tone)}`}>
              {filled(b.heading) ? b.heading : t('landing.faq')}
            </h2>
            <div className="mt-8 max-w-3xl">
              {items.map((i) => (
                <details key={i.id} className={`group border-t py-5 ${tone === 'dark' ? 'border-white/20' : 'border-line'}`}>
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold ${headingClass(tone)}`}>
                    {i.question}
                    <span aria-hidden="true" className="text-xl leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
                  </summary>
                  <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${mutedClass(tone)}`}>{i.answer}</p>
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
          <Section key={key} tone={tone} product={product} label={filled(b.heading) ? b.heading : t('products.ctaTitle')} mark={mark}>
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <Rule product={product} />
                <h2 className={`mt-5 text-3xl font-bold tracking-tight lg:text-5xl ${headingClass(tone)}`}>
                  {filled(b.heading) ? b.heading : t('products.ctaTitle')}
                </h2>
                <p className={`mt-4 max-w-prose text-base lg:text-lg ${mutedClass(tone)}`}>{filled(b.body) ? b.body : t('products.ctaBody')}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
                <Link href={contactHref} className={`inline-flex min-h-12 items-center gap-2 rounded px-6 text-sm font-semibold transition-colors ${tone === 'dark' ? 'bg-white text-navy hover:bg-surface-muted' : 'bg-navy text-white hover:bg-navy-strong'}`}>
                  {filled(b.ctaLabel) ? b.ctaLabel : t('products.ctaConsult')}
                  <Arrow />
                </Link>
                <Link href={href('/stores')} className={`inline-flex min-h-12 items-center rounded border px-6 text-sm font-semibold transition-colors ${tone === 'dark' ? 'border-white text-white hover:bg-white/10' : 'border-navy text-navy hover:bg-surface-muted'}`}>
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

