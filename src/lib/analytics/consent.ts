/**
 * Visitor consent, stored in one first-party cookie. No choice stored = nothing granted.
 * analytics → Google Analytics; marketing → Meta Pixel, TikTok Pixel and Google ad signals.
 */
export type Consent = { analytics: boolean; marketing: boolean }
export type ConsentCategory = keyof Consent

export const CONSENT_COOKIE = 'drphynex_consent'
const MAX_AGE_DAYS = 180

export const noConsent: Consent = { analytics: false, marketing: false }

/** Cookie value format: "v1.a1.m0". Anything else is treated as "no decision". */
export function parseConsent(cookieHeader: string | undefined | null): Consent | null {
  const match = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
  const value = match?.slice(CONSENT_COOKIE.length + 1)
  const parsed = value && /^v1\.a([01])\.m([01])$/.exec(value)
  return parsed ? { analytics: parsed[1] === '1', marketing: parsed[2] === '1' } : null
}

export function serializeConsent(consent: Consent, secure: boolean): string {
  const value = `v1.a${consent.analytics ? 1 : 0}.m${consent.marketing ? 1 : 0}`
  const attrs = [`Path=/`, `Max-Age=${MAX_AGE_DAYS * 24 * 60 * 60}`, 'SameSite=Lax', ...(secure ? ['Secure'] : [])]
  return `${CONSENT_COOKIE}=${value}; ${attrs.join('; ')}`
}

/**
 * Best-effort removal of cookies the vendors set on this site after consent is withdrawn.
 * Data already sent to Google, Meta or TikTok is not recalled by this; see docs/tracking-and-seo.md.
 */
export const vendorCookiePatterns: Record<ConsentCategory, RegExp[]> = {
  analytics: [/^_ga$/, /^_ga_/, /^_gid$/],
  marketing: [/^_fbp$/, /^_fbc$/, /^_ttp$/, /^_tt_enable_cookie$/, /^ttcsid/, /^_gcl_/],
}

/** Names of readable vendor cookies whose category is not (or no longer) consented. */
export function vendorCookiesToClear(cookieHeader: string, consent: Consent): string[] {
  const names = cookieHeader
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
  return names.filter((name) =>
    (Object.keys(vendorCookiePatterns) as ConsentCategory[]).some(
      (category) => !consent[category] && vendorCookiePatterns[category].some((p) => p.test(name)),
    ),
  )
}

/**
 * Public suffixes under which this site may run (registries + hosting platforms). Cookies can
 * never be set on these, so no deletion is attempted there. Extend when a new domain is used.
 * Source: Public Suffix List (publicsuffix.org), entries relevant to KR / VN / hosting.
 */
const multiLabelPublicSuffixes = new Set([
  'co.kr', 'or.kr', 'ne.kr', 'go.kr', 'ac.kr', 're.kr', 'pe.kr', 'kr',
  'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn', 'biz.vn', 'info.vn', 'name.vn', 'pro.vn', 'vn',
  'co.uk', 'org.uk', 'com.au', 'co.jp', 'com.sg', 'com.cn',
  'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'github.io',
])

const isIpAddress = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')

/**
 * Cookie scopes to expire on consent withdrawal: `null` = host-only cookie, then every parent
 * domain down to (but excluding) the public suffix. Vendor cookies such as _ga and _fbp are set
 * on the registrable domain (e.g. ".drphynex.com.vn"), which a two-label guess would miss.
 * localhost and IP addresses only have host-only cookies.
 */
export function cookieDeletionDomains(hostname: string): (string | null)[] {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || isIpAddress(host) || multiLabelPublicSuffixes.has(host)) return [null]
  const labels = host.split('.')
  const domains: (string | null)[] = [null]
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.')
    const parent = labels.slice(i + 1).join('.')
    // Stop before reaching a public suffix: `candidate` is the registrable domain when its
    // parent is a public suffix (or a single-label TLD).
    domains.push(`.${candidate}`)
    if (multiLabelPublicSuffixes.has(parent) || !parent.includes('.')) break
  }
  return domains
}
