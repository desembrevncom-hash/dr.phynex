import type { PageContext, TrackEvent } from '../events'
import { safeText } from '../events'
import { injectScript, type Adapter, type BrowserEnv } from './types'

type Gtag = (...args: unknown[]) => void

/**
 * Google Analytics 4 via gtag.js, loaded only after analytics consent (basic consent mode).
 * Consent Mode v2 defaults are set to denied before `config`, then updated from the visitor's
 * choice. Automatic page_view is off: the site sends exactly one page_view per route change.
 * In GA4 → Data streams → Enhanced measurement, turn OFF "Page changes based on browser
 * history events", or history navigations are counted twice.
 */
export function googleAdapter(env: BrowserEnv, measurementId: string, marketingGranted: () => boolean): Adapter {
  let loaded = false
  let failed = false
  const gtag: Gtag = (...args) => {
    if (failed) return
    ;(env.win.gtag as Gtag)(...args)
  }
  const consentState = (analytics: boolean) => {
    const ads = analytics && marketingGranted() ? 'granted' : 'denied'
    return {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: ads,
      ad_user_data: ads,
      ad_personalization: ads,
    }
  }

  return {
    platform: 'google',
    category: 'analytics',
    load() {
      if (loaded) return
      loaded = true
      const win = env.win as { dataLayer?: unknown[]; gtag?: Gtag }
      win.dataLayer = win.dataLayer ?? []
      // Same shape as Google's snippet: gtag pushes its `arguments` object.
      win.gtag =
        win.gtag ??
        function gtagShim() {
          // eslint-disable-next-line prefer-rest-params
          win.dataLayer!.push(arguments)
        }
      gtag('consent', 'default', consentState(false))
      gtag('js', new Date())
      gtag('config', measurementId, { send_page_view: false })
      gtag('consent', 'update', consentState(true))
      injectScript(env, `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, () => {
        failed = true
      })
    },
    revoke() {
      if (loaded) gtag('consent', 'update', consentState(false))
    },
    grant() {
      if (loaded) gtag('consent', 'update', consentState(true))
    },
    page(page: PageContext) {
      gtag('set', { page_location: page.location, page_title: safeText(page.title, 150) })
      gtag('event', 'page_view', {
        page_location: page.location,
        page_title: safeText(page.title, 150),
        language: page.locale ?? undefined,
        page_type: page.pageType,
        content_id: page.contentId ?? undefined,
      })
    },
    event(event: TrackEvent, page: PageContext | null) {
      const common = { page_type: page?.pageType, language: page?.locale ?? undefined }
      switch (event.name) {
        case 'view_product':
          gtag('event', 'view_item', {
            ...common,
            items: [{ item_id: event.contentId, item_name: safeText(event.contentName) }],
          })
          break
        case 'view_article':
          gtag('event', 'view_article', { ...common, content_id: event.contentId })
          break
        case 'click_contact':
        case 'click_consultation':
          gtag('event', event.name, { ...common, link_location: event.location })
          break
        case 'click_social':
          gtag('event', 'click_social', { ...common, link_location: event.location, social_network: event.network })
          break
        case 'generate_lead':
          gtag('event', 'generate_lead', { ...common, form_name: event.form })
          break
        case 'language_change':
          gtag('event', 'language_change', { ...common, language_from: event.from, language_to: event.to })
          break
      }
    },
  }
}
