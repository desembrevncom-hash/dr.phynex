'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'

import type { Locale } from '@/i18n/locales'
import {
  initTracking,
  isExcludedPath,
  lastPageTitle,
  pageContext,
  saveConsent,
  storedConsent,
  subscribeConsent,
  trackEvent,
  trackPage,
} from '@/lib/analytics/client'
import type { TrackingConfig } from '@/lib/analytics/config'
import { eventForLink } from '@/lib/analytics/events'
import { browserTitleEnv, whenTitleReady } from '@/lib/analytics/title'

import { ConsentBanner } from './ConsentBanner'

export const OPEN_CONSENT_EVENT = 'drphynex:consent-settings'

/**
 * Rendered by PageShell only when tracking is enabled and the viewer is not in staff preview.
 * Sends one page_view per route change, the page's view_* event (from a [data-track-view]
 * marker rendered by the page), and click events from links; shows the consent choice.
 */
export function AnalyticsProvider({ config, locale, privacyHref }: { config: TrackingConfig; locale: Locale; privacyHref: string }) {
  const pathname = usePathname()
  const search = useSearchParams()?.toString() ?? ''
  // No stored choice → ask. The server snapshot never shows the banner (no cookie access there).
  const hasChoice = useSyncExternalStore(subscribeConsent, () => storedConsent() !== null, () => true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (isExcludedPath(pathname)) return
    if (!initTracking(config)) return
    // Wait for Next.js to apply this page's <title> before sending (see lib/analytics/title.ts).
    return whenTitleReady(
      (title) => {
        trackPage(pageContext(pathname, search ? `?${search}` : '', title))
        const marker = document.querySelector<HTMLElement>('[data-track-view]')
        const id = marker?.dataset.contentId
        if (id && marker?.dataset.trackView === 'view_product') {
          trackEvent({ name: 'view_product', contentId: id, contentName: marker.dataset.contentName })
        } else if (id && marker?.dataset.trackView === 'view_article') {
          trackEvent({ name: 'view_article', contentId: id })
        }
      },
      lastPageTitle(),
      browserTitleEnv(),
    )
  }, [config, pathname, search])

  useEffect(() => {
    if (!initTracking(config)) return
    const open = () => setSettingsOpen(true)
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]')
      if (!link) return
      const location = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'main'
      const event = eventForLink(
        { href: link.getAttribute('href') ?? '', hreflang: link.getAttribute('hreflang'), location },
        locale,
        window.location.origin,
      )
      if (event) trackEvent(event)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, open)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, open)
      document.removeEventListener('click', onClick)
    }
  }, [config, locale])

  if (hasChoice && !settingsOpen) return null
  return (
    <ConsentBanner
      initial={hasChoice ? storedConsent() : null}
      privacyHref={privacyHref}
      onDecide={(consent) => {
        saveConsent(consent)
        setSettingsOpen(false)
      }}
    />
  )
}
