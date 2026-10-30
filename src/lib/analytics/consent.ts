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
