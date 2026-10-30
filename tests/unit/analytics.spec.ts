import { describe, expect, it, vi } from 'vitest'

import type { BrowserEnv, ScriptElement } from '@/lib/analytics/adapters/types'
import { readTrackingConfig } from '@/lib/analytics/config'
import { parseConsent, serializeConsent } from '@/lib/analytics/consent'
import { eventForLink, pageInfo, safeText, sanitizedPath, type PageContext } from '@/lib/analytics/events'
import { createTracker } from '@/lib/analytics/tracker'

// Every vendor is a fake: scripts are recorded, never fetched; no event leaves the process.
const IDS = {
  NEXT_PUBLIC_TRACKING_ENABLED: 'true',
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST000000',
  NEXT_PUBLIC_META_PIXEL_ID: '000000000000000',
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'TESTPIXEL0000000000',
}

function fakeEnv() {
  const scripts: ScriptElement[] = []
  const win: Record<string, unknown> = {}
  const env: BrowserEnv = {
    win,
    doc: {
      createElement: () => ({ async: false, src: '', onerror: null }),
      head: { appendChild: (s: ScriptElement) => scripts.push(s) },
    },
  }
  return { env, win, scripts }
}

const page = (path: string): PageContext => ({
  key: path,
  path,
  location: `https://example.test${path}`,
  title: 'Title',
  ...pageInfo(path.split('?')[0]),
})

/** Vendor calls as plain arrays, from each fake queue. */
const calls = (win: Record<string, unknown>) => ({
  gtag: ((win.dataLayer as IArguments[] | undefined) ?? []).map((a) => Array.from(a)),
  fbq: ((win.fbq as { queue?: unknown[][] } | undefined)?.queue ?? []).map((a) => a),
  ttq: ((win.ttq as unknown[][] | undefined) ?? []).filter(Array.isArray),
})
const named = (list: unknown[][], ...head: unknown[]) =>
  list.filter((c) => head.every((h, i) => c[i] === h))

const setup = (env: Record<string, string | undefined> = IDS) => {
  const f = fakeEnv()
  const tracker = createTracker(readTrackingConfig(env), f.env)
  return { ...f, tracker: tracker! }
}

describe('configuration', () => {
  it('is off by default and without a valid ID', () => {
    expect(readTrackingConfig({}).enabled).toBe(false)
    expect(readTrackingConfig({ ...IDS, NEXT_PUBLIC_TRACKING_ENABLED: undefined }).enabled).toBe(false)
    expect(readTrackingConfig({ NEXT_PUBLIC_TRACKING_ENABLED: 'true' }).enabled).toBe(false)
    expect(readTrackingConfig({ NEXT_PUBLIC_TRACKING_ENABLED: 'true', NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'UA-1' }).enabled).toBe(false)
    expect(readTrackingConfig(IDS).enabled).toBe(true)
  })

  it('creates no tracker and loads no script when IDs are missing', () => {
    const { env, scripts } = fakeEnv()
    expect(createTracker(readTrackingConfig({ NEXT_PUBLIC_TRACKING_ENABLED: 'true' }), env)).toBeNull()
    expect(scripts).toHaveLength(0)
  })

  it('debug logging is development-only', () => {
    expect(readTrackingConfig({ ...IDS, NEXT_PUBLIC_TRACKING_DEBUG: 'true', NODE_ENV: 'production' }).debug).toBe(false)
    expect(readTrackingConfig({ ...IDS, NEXT_PUBLIC_TRACKING_DEBUG: 'true', NODE_ENV: 'development' }).debug).toBe(true)
  })
})

describe('consent cookie', () => {
  it('round-trips and treats anything else as no decision', () => {
    const cookie = serializeConsent({ analytics: true, marketing: false }, true).split(';')[0]
    expect(parseConsent(`other=1; ${cookie}`)).toEqual({ analytics: true, marketing: false })
    expect(parseConsent('drphynex_consent=yes')).toBeNull()
    expect(parseConsent('')).toBeNull()
    expect(serializeConsent({ analytics: false, marketing: false }, true)).toMatch(/SameSite=Lax; Secure$/)
  })
})

describe('consent gating', () => {
  it('denied: no script, no vendor global, nothing sent', () => {
    const { tracker, win, scripts } = setup()
    tracker.setConsent({ analytics: false, marketing: false })
    tracker.page(page('/en/products'))
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'l-1' })
    expect(scripts).toHaveLength(0)
    expect(win.gtag).toBeUndefined()
    expect(win.fbq).toBeUndefined()
    expect(win.ttq).toBeUndefined()
  })

  it('analytics only: GA4 loads with Consent Mode v2 defaults denied before config, ads still denied', () => {
    const { tracker, win, scripts } = setup()
    tracker.setConsent({ analytics: true, marketing: false })
    expect(scripts.map((s) => new URL(s.src).host)).toEqual(['www.googletagmanager.com'])
    const g = calls(win).gtag
    expect(g[0]).toEqual(['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }])
    expect(g.findIndex((c) => c[0] === 'config')).toBeGreaterThan(0)
    expect(named(g, 'config')[0][2]).toEqual({ send_page_view: false })
    expect(named(g, 'consent', 'update')[0][2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' })
    expect(win.fbq).toBeUndefined()
    expect(win.ttq).toBeUndefined()
  })

  it('accepted: each vendor initialises once, even when consent is set repeatedly', () => {
    const { tracker, win, scripts } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.setConsent({ analytics: true, marketing: true })
    expect(scripts).toHaveLength(3)
    expect(named(calls(win).fbq, 'init')).toHaveLength(1)
    expect(named(calls(win).fbq, 'set', 'autoConfig', false)).toHaveLength(1)
    expect(Object.keys((win.ttq as { _i: object })._i)).toEqual([IDS.NEXT_PUBLIC_TIKTOK_PIXEL_ID])
    expect(named(calls(win).ttq, 'identify')).toHaveLength(0)
  })

  it('withdrawn: vendors are told, nothing more is sent; re-grant on the same page does not resend page_view', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/vi/products'))
    tracker.setConsent({ analytics: false, marketing: false })
    expect(named(calls(win).fbq, 'consent', 'revoke')).toHaveLength(1)
    expect(named(calls(win).ttq, 'revokeConsent')).toHaveLength(1)
    expect(named(calls(win).gtag, 'consent', 'update').at(-1)?.[2]).toMatchObject({ analytics_storage: 'denied' })
    tracker.track({ name: 'click_contact', location: 'main' })
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'after-withdrawal' })
    expect(named(calls(win).fbq, 'track', 'Lead')).toHaveLength(0)
    expect(named(calls(win).gtag, 'event', 'click_contact')).toHaveLength(0)
    tracker.setConsent({ analytics: true, marketing: true })
    expect(named(calls(win).fbq, 'track', 'PageView')).toHaveLength(1)
    expect(named(calls(win).ttq, 'page')).toHaveLength(1)
  })

  it('consent given after landing sends the current page once', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: false, marketing: false })
    tracker.page(page('/ko'))
    tracker.setConsent({ analytics: true, marketing: true })
    expect(named(calls(win).gtag, 'event', 'page_view')).toHaveLength(1)
    expect(named(calls(win).fbq, 'track', 'PageView')).toHaveLength(1)
    expect(named(calls(win).ttq, 'page')).toHaveLength(1)
  })
})

describe('page views and route changes', () => {
  it('one page_view per route; re-renders and Strict Mode duplicates are ignored', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/en/products'))
    tracker.page(page('/en/products'))
    tracker.page(page('/en/products?line=rx'))
    tracker.page(page('/en/journal'))
    const c = calls(win)
    expect(named(c.gtag, 'event', 'page_view')).toHaveLength(3)
    expect(named(c.fbq, 'track', 'PageView')).toHaveLength(3)
    expect(named(c.ttq, 'page')).toHaveLength(3)
    expect(named(c.gtag, 'event', 'page_view')[0][2]).toMatchObject({ page_type: 'product_list', page_language: 'en' })
  })

  it("never overrides GA4's automatic `language` (browser language); the site locale is page_language", () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/vi/products'))
    tracker.track({ name: 'view_product', contentId: 'x' })
    tracker.track({ name: 'language_change', from: 'vi', to: 'ko' })
    const events = named(calls(win).gtag, 'event')
    expect(events.length).toBeGreaterThanOrEqual(3)
    for (const e of events) {
      expect(e[2]).not.toHaveProperty('language')
      expect(e[2]).toMatchObject({ page_language: 'vi' })
    }
  })

  it('view_product once per visit, again on a later visit; maps to view_item / ViewContent', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    const view = { name: 'view_product', contentId: 'rx-matrix-balm', contentName: 'RX Matrix Balm' } as const
    tracker.page(page('/en/products/rx-matrix-balm'))
    tracker.track(view)
    tracker.track(view)
    tracker.page(page('/en/products'))
    tracker.page(page('/en/products/rx-matrix-balm'))
    tracker.track(view)
    const c = calls(win)
    expect(named(c.gtag, 'event', 'view_item')).toHaveLength(2)
    expect(named(c.gtag, 'event', 'view_item')[0][2]).toMatchObject({ items: [{ item_id: 'rx-matrix-balm' }] })
    expect(named(c.fbq, 'track', 'ViewContent')).toHaveLength(2)
    expect(named(c.ttq, 'track', 'ViewContent')).toHaveLength(2)
  })

  it('TikTok ViewContent: content_type at the top level, content_id / content_name inside contents', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: false, marketing: true })
    tracker.page(page('/en/products/rx-matrix-balm'))
    tracker.track({ name: 'view_product', contentId: 'rx-matrix-balm', contentName: 'RX Matrix Balm' })
    const [, , params] = named(calls(win).ttq, 'track', 'ViewContent')[0] as [string, string, Record<string, unknown>]
    expect(params).toEqual({
      content_type: 'product',
      contents: [{ content_id: 'rx-matrix-balm', content_name: 'RX Matrix Balm' }],
    })
    expect((params.contents as Record<string, unknown>[])[0]).not.toHaveProperty('content_type')
  })
})

describe('advertising platforms receive only goal events', () => {
  it('Meta and TikTok get PageView, ViewContent and Lead only; GA4 gets every internal event', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/en/journal/a'))
    tracker.track({ name: 'view_article', contentId: 'a' })
    tracker.track({ name: 'click_contact', location: 'main' })
    tracker.track({ name: 'click_consultation', location: 'main' })
    tracker.track({ name: 'click_social', network: 'instagram', location: 'footer' })
    tracker.track({ name: 'language_change', from: 'en', to: 'vi' })
    tracker.page(page('/en/products/x'))
    tracker.track({ name: 'view_product', contentId: 'x' })
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'l-9' })
    const c = calls(win)
    const metaNames = c.fbq.filter((a) => a[0] === 'track' || a[0] === 'trackCustom').map((a) => a[1])
    expect(new Set(metaNames)).toEqual(new Set(['PageView', 'ViewContent', 'Lead']))
    expect(named(c.fbq, 'trackCustom')).toHaveLength(0)
    const ttqNames = c.ttq.filter((a) => a[0] === 'track').map((a) => a[1])
    expect(new Set(ttqNames)).toEqual(new Set(['ViewContent', 'Lead']))
    expect(named(c.ttq, 'page')).toHaveLength(2)
    const gaNames = named(c.gtag, 'event').map((a) => a[1])
    for (const name of ['page_view', 'view_item', 'view_article', 'click_contact', 'click_consultation', 'click_social', 'generate_lead', 'language_change']) {
      expect(gaNames).toContain(name)
    }
  })
})

describe('leads', () => {
  it('one lead per server-issued id, with event ids for future server-side dedup', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/vi/contact'))
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'lead-1' })
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'lead-1' })
    tracker.track({ name: 'generate_lead', form: 'partnership', leadId: 'lead-2' })
    const c = calls(win)
    expect(named(c.gtag, 'event', 'generate_lead')).toHaveLength(2)
    expect(named(c.fbq, 'track', 'Lead')[0]).toEqual(['track', 'Lead', { content_name: 'contact' }, { eventID: 'lead-1' }])
    expect(named(c.ttq, 'track', 'Lead')[0]).toEqual(['track', 'Lead', { content_name: 'contact' }, { event_id: 'lead-1' }])
    expect(named(c.ttq, 'track', 'SubmitForm')).toHaveLength(0)
  })

  it('a click is never a lead', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page(page('/en'))
    tracker.track({ name: 'click_contact', location: 'header' })
    tracker.track({ name: 'click_consultation', location: 'main' })
    const c = calls(win)
    expect(named(c.fbq, 'track', 'Lead')).toHaveLength(0)
    expect(named(c.ttq, 'track', 'Lead')).toHaveLength(0)
    expect(named(c.gtag, 'event', 'generate_lead')).toHaveLength(0)
    expect(named(c.gtag, 'event', 'click_contact')).toHaveLength(1)
  })
})

describe('privacy of payloads', () => {
  it('drops personal data from text and URLs', () => {
    expect(safeText('Contact me at someone@example.com')).toBeUndefined()
    expect(safeText('Call +84 912 345 678')).toBeUndefined()
    expect(safeText('RX Matrix Balm')).toBe('RX Matrix Balm')
    expect(sanitizedPath('/en/contact', '?email=a%40b.com&name=Kim&line=rx')).toBe('/en/contact?line=rx')
    expect(sanitizedPath('/en/journal', '?topic=<script>')).toBe('/en/journal')
  })

  it('no vendor call ever contains an email, phone number or form text', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    tracker.page({ ...page('/en/contact'), title: 'Write to me@example.com' })
    tracker.track({ name: 'view_product', contentId: 'x', contentName: 'Ask 0912 345 678' })
    tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'id-1' })
    const serialized = JSON.stringify(calls(win))
    expect(serialized).not.toMatch(/@example\.com|0912 345 678/)
  })
})

describe('resilience', () => {
  it('a blocked vendor script stops that vendor without throwing', () => {
    const { tracker, scripts, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    for (const s of scripts) s.onerror?.(new Event('error'))
    expect(() => {
      tracker.page(page('/en'))
      tracker.track({ name: 'generate_lead', form: 'contact', leadId: 'after-block' })
    }).not.toThrow()
    expect(named(calls(win).fbq, 'track', 'Lead')).toHaveLength(0)
  })

  it('a vendor function that throws does not affect the others', () => {
    const { tracker, win } = setup()
    tracker.setConsent({ analytics: true, marketing: true })
    win.fbq = vi.fn(() => {
      throw new Error('sdk broken')
    })
    expect(() => tracker.page(page('/en/brand'))).not.toThrow()
    expect(named(calls(win).ttq, 'page')).toHaveLength(1)
    expect(named(calls(win).gtag, 'event', 'page_view')).toHaveLength(1)
  })
})

describe('link events', () => {
  const origin = 'https://example.test'
  it('maps contact, consultation, language and social links; ignores the rest', () => {
    expect(eventForLink({ href: '/vi/contact', location: 'header' }, 'vi', origin)).toEqual({ name: 'click_contact', location: 'header' })
    expect(eventForLink({ href: '/en/partnership', location: 'main' }, 'en', origin)).toEqual({ name: 'click_consultation', location: 'main' })
    expect(eventForLink({ href: '/ko/products', hreflang: 'ko', location: 'header' }, 'en', origin)).toEqual({ name: 'language_change', from: 'en', to: 'ko' })
    expect(eventForLink({ href: 'https://www.instagram.com/x', location: 'footer' }, 'en', origin)).toMatchObject({ name: 'click_social', network: 'instagram' })
    expect(eventForLink({ href: 'https://example.org/', location: 'main' }, 'en', origin)).toBeNull()
    expect(eventForLink({ href: '/en/products', location: 'main' }, 'en', origin)).toBeNull()
  })
})
