import { isLocale, type Locale } from '@/i18n/locales'

/**
 * Internal event taxonomy. Parameters are typed so form fields (name, email, phone, message)
 * cannot be passed; every string is sanitized again before it reaches a vendor.
 */
export type LinkLocation = 'header' | 'main' | 'footer'
export type LeadForm = 'contact' | 'partnership'

export type TrackEvent =
  | { name: 'view_product'; contentId: string; contentName?: string }
  | { name: 'view_article'; contentId: string }
  | { name: 'click_contact'; location: LinkLocation }
  | { name: 'click_consultation'; location: LinkLocation }
  | { name: 'click_social'; network: string; location: LinkLocation }
  | { name: 'generate_lead'; form: LeadForm; leadId: string }
  | { name: 'language_change'; from: Locale; to: Locale }

export type PageType =
  | 'home'
  | 'product_list'
  | 'product_line'
  | 'product'
  | 'ingredient_list'
  | 'ingredient'
  | 'technology'
  | 'journal'
  | 'article'
  | 'brand'
  | 'stores'
  | 'contact'
  | 'partnership'
  | 'legal'
  | 'other'

export type PageContext = {
  /** Dedup key for one page view: path + allowed query. */
  key: string
  /** Same-site path without any query parameters that are not on the allow-list. */
  path: string
  /** Absolute URL built from `path` (never the raw location). */
  location: string
  title: string
  locale: Locale | null
  pageType: PageType
  /** Slug of the product / article / ingredient shown, if any. */
  contentId: string | null
}

/** Query parameters that are site filters (never personal data). Everything else is dropped. */
const allowedQuery = ['line', 'concern', 'topic', 'country', 'page'] as const

export function sanitizedPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const key of allowedQuery) {
    const value = params.get(key)
    if (value && /^[a-z0-9-]{1,40}$/i.test(value)) kept.set(key, value)
  }
  const qs = kept.toString()
  return `${pathname}${qs ? `?${qs}` : ''}`
}

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function pageInfo(pathname: string): { locale: Locale | null; pageType: PageType; contentId: string | null } {
  const [, first, section, second, third] = pathname.split('/')
  const locale = isLocale(first) ? first : null
  const id = (value?: string) => (value && slug.test(value) ? value : null)
  if (!locale) return { locale, pageType: 'other', contentId: null }
  if (!section) return { locale, pageType: 'home', contentId: null }
  switch (section) {
    case 'products':
      if (!second) return { locale, pageType: 'product_list', contentId: null }
      if (second === 'line') return { locale, pageType: 'product_line', contentId: id(third) }
      return { locale, pageType: 'product', contentId: id(second) }
    case 'ingredients':
      return second ? { locale, pageType: 'ingredient', contentId: id(second) } : { locale, pageType: 'ingredient_list', contentId: null }
    case 'technologies':
      return { locale, pageType: 'technology', contentId: id(second) }
    case 'journal':
      return second ? { locale, pageType: 'article', contentId: id(second) } : { locale, pageType: 'journal', contentId: null }
    case 'brand':
    case 'stores':
    case 'contact':
    case 'partnership':
      return { locale, pageType: section, contentId: null }
    case 'privacy':
    case 'terms':
      return { locale, pageType: 'legal', contentId: section }
    default:
      return { locale, pageType: 'other', contentId: null }
  }
}

const emailLike = /[^\s@]+@[^\s@]+\.[^\s@]+/
const phoneLike = /\+?\d[\d\s().-]{7,}\d/

/** Short, non-identifying text only; anything that looks like an email or phone is dropped. */
export function safeText(value: string | null | undefined, max = 100): string | undefined {
  const v = value?.replace(/\s+/g, ' ').trim()
  if (!v || emailLike.test(v) || phoneLike.test(v)) return undefined
  return v.slice(0, max)
}

/** Known social networks, matched by host, for click_social. */
const socialHosts: Record<string, string> = {
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'x.com': 'x',
  'twitter.com': 'x',
  'zalo.me': 'zalo',
  'pf.kakao.com': 'kakao',
  'linkedin.com': 'linkedin',
}

export function socialNetwork(host: string): string | null {
  const h = host.toLowerCase().replace(/^www\./, '')
  for (const [domain, network] of Object.entries(socialHosts)) {
    if (h === domain || h.endsWith(`.${domain}`)) return network
  }
  return null
}

/** Maps a clicked link to an internal event, or null. Pure: used by the click listener and tests. */
export function eventForLink(
  link: { href: string; hreflang?: string | null; location: LinkLocation },
  currentLocale: Locale | null,
  origin: string,
): TrackEvent | null {
  let url: URL
  try {
    url = new URL(link.href, origin)
  } catch {
    return null
  }
  if (url.origin !== origin) {
    const network = socialNetwork(url.host)
    return network ? { name: 'click_social', network, location: link.location } : null
  }
  const [, first, section] = url.pathname.split('/')
  if (link.hreflang && isLocale(link.hreflang) && currentLocale && link.hreflang !== currentLocale) {
    return { name: 'language_change', from: currentLocale, to: link.hreflang }
  }
  if (!isLocale(first)) return null
  if (section === 'contact') return { name: 'click_contact', location: link.location }
  if (section === 'partnership') return { name: 'click_consultation', location: link.location }
  return null
}
