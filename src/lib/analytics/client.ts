'use client'

import type { TrackingConfig } from './config'
import { cookieDeletionDomains, parseConsent, serializeConsent, vendorCookiesToClear, type Consent } from './consent'
import { pageInfo, sanitizedPath, type PageContext, type TrackEvent } from './events'
import { createTracker, type Tracker } from './tracker'
import type { BrowserEnv } from './adapters/types'

/** One tracker per tab, created on first use and reused across client navigations. */
let tracker: Tracker | null = null
let initialized = false
/** Title of the last page view, so the next navigation can wait for the new <title>. */
let lastTitle: string | null = null

export const lastPageTitle = () => lastTitle

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
  // Only cookies this page can read (not HttpOnly, same site) can be expired from here.
  const domains = cookieDeletionDomains(window.location.hostname)
  for (const name of vendorCookiesToClear(document.cookie, consent)) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain ? `; Domain=${domain}` : ''}`
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
  lastTitle = page.title
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
  lastTitle = null
}
