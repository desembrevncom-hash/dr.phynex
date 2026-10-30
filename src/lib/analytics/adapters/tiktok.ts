import type { TrackEvent } from '../events'
import { safeText } from '../events'
import { type Adapter, type BrowserEnv } from './types'

type Ttq = unknown[] & Record<string, unknown> & {
  methods: string[]
  setAndDefer: (target: Record<string, unknown>, method: string) => void
  load: (id: string, options?: Record<string, unknown>) => void
  _i?: Record<string, unknown[] & Record<string, unknown>>
  _t?: Record<string, number>
  _o?: Record<string, unknown>
}

const methods = [
  'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group',
  'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent',
]

/**
 * TikTok Pixel, loaded only after marketing consent, using the same queue as TikTok's base
 * code. `identify` is never called (no advanced matching from this code); keep "Automatic
 * Advanced Matching" off in TikTok Events Manager. Sent: page views (ttq.page), ViewContent on
 * product pages and Lead ("Lead" replaces "SubmitForm") with event_id = the server-issued lead
 * id for Events API dedup. Clicks, article views and language changes stay in GA4 only.
 */
export function tiktokAdapter(env: BrowserEnv, pixelId: string): Adapter {
  let loaded = false
  let failed = false
  const ttq = () => env.win.ttq as Record<string, (...args: unknown[]) => void>
  const call = (method: string, ...args: unknown[]) => {
    if (failed) return
    ttq()[method]?.(...args)
  }

  return {
    platform: 'tiktok',
    category: 'marketing',
    load() {
      if (loaded) return
      loaded = true
      const win = env.win as { TiktokAnalyticsObject?: string; ttq?: Ttq }
      win.TiktokAnalyticsObject = 'ttq'
      const q = (win.ttq = win.ttq ?? ([] as unknown as Ttq))
      if (!q.load) {
        q.methods = methods
        q.setAndDefer = (target, method) => {
          target[method] = (...args: unknown[]) => {
            ;(target as unknown as unknown[]).push([method, ...args])
          }
        }
        for (const m of methods) q.setAndDefer(q, m)
        q.load = (id: string, options?: Record<string, unknown>) => {
          const src = 'https://analytics.tiktok.com/i18n/pixel/events.js'
          q._i = q._i ?? {}
          q._i[id] = [] as unknown as unknown[] & Record<string, unknown>
          q._i[id]._u = src
          q._t = q._t ?? {}
          q._t[id] = Date.now()
          q._o = q._o ?? {}
          q._o[id] = options ?? {}
          const script = env.doc.createElement('script')
          script.async = true
          script.src = `${src}?sdkid=${encodeURIComponent(id)}&lib=ttq`
          script.onerror = () => {
            failed = true
          }
          env.doc.head.appendChild(script)
        }
      }
      call('holdConsent')
      q.load(pixelId)
      call('grantConsent')
    },
    revoke() {
      if (loaded) call('revokeConsent')
    },
    grant() {
      if (loaded) call('grantConsent')
    },
    page() {
      call('page')
    },
    event(event: TrackEvent) {
      switch (event.name) {
        case 'view_product':
          // content_type is top-level; each item in `contents` carries content_id / content_name.
          call('track', 'ViewContent', {
            content_type: 'product',
            contents: [{ content_id: event.contentId, content_name: safeText(event.contentName) }],
          })
          break
        case 'generate_lead':
          call('track', 'Lead', { content_name: event.form }, { event_id: event.leadId })
          break
        default:
          // view_article, click_*, language_change: analytics only, no advertising goal.
          break
      }
    },
  }
}
