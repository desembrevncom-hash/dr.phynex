'use client'

import type { TrackingConfig } from './config'
import { parseConsent, serializeConsent, vendorCookiePatterns, type Consent } from './consent'
import { pageInfo, sanitizedPath, type PageContext, type TrackEvent } from './events'
import { createTracker, type Tracker } from './tracker'
import type { BrowserEnv } from './adapters/types'

/** One tracker per tab, created on first use and reused across client navigations. */
let tracker: Tracker | null = null
let initialized = false

/** Admin, API and preview routes never carry tracking, whatever renders there. */
export const isExcludedPath = (pathname: string) => /^\/(admin|api|preview)(\/|$)/.test(pathname)

export function initTracking(config: TrackingConfig): Tracker | null {
  if (initialized) return tracker
  initialized = true
  if (typeof window === 'undefined' || isExcludedPath(window.location.pathname)) return null
  const env: BrowserEnv = { win: window as unknown as Record<string, unknown>, doc: document as unknown as BrowserEnv['doc'] }
  const debug = config.debug
    ? (message: string, data?: unknown) => console.debug('[tracking]', message, data ?? '')
    : undefined
  tracker = createTracker(config, env, debug)
  tracker?.setConsent(storedConsent() ?? { analytics: false, marketing: false })
  return tracker
}

export const storedConsent = (): Consent | null =>
  typeof document === 'undefined' ? null : parseConsent(document.cookie)

export const CONSENT_CHANGED_EVENT = 'drphynex:consent-changed'

/** For useSyncExternalStore: re-read the consent cookie when this tab saves a choice. */
export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
}

export function saveConsent(consent: Consent) {
  document.cookie = serializeConsent(consent, window.location.protocol === 'https:')
  for (const [category, patterns] of Object.entries(vendorCookiePatterns)) {
    if (consent[category as keyof Consent]) continue
    for (const name of document.cookie.split(';').map((c) => c.split('=')[0].trim())) {
      if (patterns.some((p) => p.test(name))) {
        // Vendor cookies may be set on the registrable domain; clear both forms.
        const host = window.location.hostname
        document.cookie = `${name}=; Path=/; Max-Age=0`
        document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${host.split('.').slice(-2).join('.')}`
      }
    }
  }
  tracker?.setConsent(consent)
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT))
}

export function pageContext(pathname: string, search: string, title: string): PageContext {
  const path = sanitizedPath(pathname, search)
  return { key: path, path, location: `${window.location.origin}${path}`, title, ...pageInfo(pathname) }
}

export function trackPage(page: PageContext) {
  tracker?.page(page)
}

/** Safe to call anywhere: a no-op when tracking is off, not consented or not initialized. */
export function trackEvent(event: TrackEvent) {
  tracker?.track(event)
}

/** Test hook only. */
export function resetTrackingForTests() {
  tracker = null
  initialized = false
}
