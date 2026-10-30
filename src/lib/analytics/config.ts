/**
 * Tracking configuration from public environment variables. Everything is OFF unless
 * NEXT_PUBLIC_TRACKING_ENABLED is exactly "true" AND at least one well-formed ID is set.
 * IDs are public identifiers, not secrets; server-side API tokens never belong here.
 */
export type TrackingConfig = {
  enabled: boolean
  ga4Id: string | null
  metaPixelId: string | null
  tiktokPixelId: string | null
  /** Development-only console logging of event names and sanitized parameters. */
  debug: boolean
}

const ga4Pattern = /^G-[A-Z0-9]{4,20}$/
const metaPattern = /^\d{10,20}$/
const tiktokPattern = /^[A-Z0-9]{15,30}$/

const valid = (value: string | undefined, pattern: RegExp) => {
  const v = value?.trim()
  return v && pattern.test(v) ? v : null
}

export function readTrackingConfig(env: Record<string, string | undefined>): TrackingConfig {
  const ga4Id = valid(env.NEXT_PUBLIC_GA4_MEASUREMENT_ID, ga4Pattern)
  const metaPixelId = valid(env.NEXT_PUBLIC_META_PIXEL_ID, metaPattern)
  const tiktokPixelId = valid(env.NEXT_PUBLIC_TIKTOK_PIXEL_ID, tiktokPattern)
  const anyId = Boolean(ga4Id || metaPixelId || tiktokPixelId)
  return {
    enabled: env.NEXT_PUBLIC_TRACKING_ENABLED === 'true' && anyId,
    ga4Id,
    metaPixelId,
    tiktokPixelId,
    debug: env.NODE_ENV === 'development' && env.NEXT_PUBLIC_TRACKING_DEBUG === 'true',
  }
}

/** Server components read this and pass it down as props (no reliance on client inlining). */
export const trackingConfig = () =>
  readTrackingConfig({
    NEXT_PUBLIC_TRACKING_ENABLED: process.env.NEXT_PUBLIC_TRACKING_ENABLED,
    NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
    NEXT_PUBLIC_TRACKING_DEBUG: process.env.NEXT_PUBLIC_TRACKING_DEBUG,
    NODE_ENV: process.env.NODE_ENV,
  })
