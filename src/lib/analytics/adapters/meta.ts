import type { TrackEvent } from '../events'
import { safeText } from '../events'
import { injectScript, type Adapter, type BrowserEnv } from './types'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
}

/**
 * Meta Pixel, loaded only after marketing consent. Automatic event detection (autoConfig) is
 * switched off and no advanced matching data is passed to init. Only standard events tied to an
 * advertising goal are sent: PageView, ViewContent (product pages) and Lead. Lead carries
 * eventID = the server-issued lead id, ready for Conversions API dedup. Clicks, article views
 * and language changes stay in GA4 only.
 */
export function metaAdapter(env: BrowserEnv, pixelId: string): Adapter {
  let loaded = false
  let failed = false
  const fbq = (...args: unknown[]) => {
    if (failed) return
    ;(env.win.fbq as Fbq)(...args)
  }

  return {
    platform: 'meta',
    category: 'marketing',
    load() {
      if (loaded) return
      loaded = true
      const win = env.win as { fbq?: Fbq; _fbq?: Fbq }
      if (!win.fbq) {
        // Same queue shape as Meta's base code; fbevents.js drains it on load.
        const n = function (...args: unknown[]) {
          if (n.callMethod) n.callMethod(...args)
          else n.queue.push(args)
        } as Fbq
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        win.fbq = n
        win._fbq = win._fbq ?? n
      }
      fbq('consent', 'grant')
      fbq('set', 'autoConfig', false, pixelId)
      fbq('init', pixelId)
      injectScript(env, 'https://connect.facebook.net/en_US/fbevents.js', () => {
        failed = true
      })
    },
    revoke() {
      if (loaded) fbq('consent', 'revoke')
    },
    grant() {
      if (loaded) fbq('consent', 'grant')
    },
    page() {
      fbq('track', 'PageView')
    },
    event(event: TrackEvent) {
      switch (event.name) {
        case 'view_product':
          fbq('track', 'ViewContent', {
            content_ids: [event.contentId],
            content_type: 'product',
            content_name: safeText(event.contentName),
          })
          break
        case 'generate_lead':
          fbq('track', 'Lead', { content_name: event.form }, { eventID: event.leadId })
          break
        default:
          // view_article, click_*, language_change: analytics only, no advertising goal.
          break
      }
    },
  }
}
