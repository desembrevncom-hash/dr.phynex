import type { TrackingConfig } from './config'
import { noConsent, type Consent } from './consent'
import type { PageContext, TrackEvent } from './events'
import { googleAdapter } from './adapters/google'
import { metaAdapter } from './adapters/meta'
import { tiktokAdapter } from './adapters/tiktok'
import type { Adapter, BrowserEnv, Platform } from './adapters/types'

type Debug = (message: string, data?: unknown) => void

/**
 * Central dispatcher. One instance per browser tab. Rules:
 * - a vendor script loads only when its consent category is granted, never before;
 * - one page_view per page visit per vendor (re-renders, Strict Mode and consent changes on
 *   the same page do not resend it; a vendor that loads later gets the current page once);
 * - view_* events once per page visit, generate_lead once per server-issued lead id;
 * - a failing or blocked vendor never throws into the page.
 */
export class Tracker {
  private consent: Consent = noConsent
  private active = new Set<Platform>()
  private everLoaded = new Set<Platform>()
  private current: PageContext | null = null
  private visit = 0
  private sentPage = new Map<Platform, number>()
  private seen = new Set<string>()

  constructor(
    private readonly adapters: Adapter[],
    private readonly debug?: Debug,
  ) {}

  setConsent(consent: Consent) {
    const marketingChanged = consent.marketing !== this.consent.marketing
    this.consent = consent
    for (const adapter of this.adapters) {
      const allowed = consent[adapter.category]
      if (allowed && this.active.has(adapter.platform) && adapter.platform === 'google' && marketingChanged) {
        // GA stays on; its Consent Mode ad signals follow the marketing choice.
        this.safe(adapter, () => adapter.grant())
      } else if (allowed && !this.active.has(adapter.platform)) {
        this.safe(adapter, () => (this.everLoaded.has(adapter.platform) ? adapter.grant() : adapter.load()))
        this.everLoaded.add(adapter.platform)
        this.active.add(adapter.platform)
        this.sendPage(adapter)
      } else if (!allowed && this.active.has(adapter.platform)) {
        this.safe(adapter, () => adapter.revoke())
        this.active.delete(adapter.platform)
      }
    }
  }

  getConsent() {
    return this.consent
  }

  page(page: PageContext) {
    if (this.current?.key === page.key) return
    this.current = page
    this.visit += 1
    this.debug?.('page_view', { path: page.path, pageType: page.pageType })
    for (const adapter of this.adapters) if (this.active.has(adapter.platform)) this.sendPage(adapter)
  }

  track(event: TrackEvent) {
    const dedupe =
      event.name === 'generate_lead'
        ? `lead:${event.leadId}`
        : event.name === 'view_product' || event.name === 'view_article'
          ? `${event.name}:${this.visit}:${event.contentId}`
          : null
    if (dedupe) {
      if (this.seen.has(dedupe)) return
      this.seen.add(dedupe)
    }
    this.debug?.(event.name, event)
    for (const adapter of this.adapters) {
      if (this.active.has(adapter.platform)) this.safe(adapter, () => adapter.event(event, this.current))
    }
  }

  private sendPage(adapter: Adapter) {
    if (!this.current || this.sentPage.get(adapter.platform) === this.visit) return
    this.sentPage.set(adapter.platform, this.visit)
    const page = this.current
    this.safe(adapter, () => adapter.page(page))
  }

  private safe(adapter: Adapter, fn: () => void) {
    try {
      fn()
    } catch (error) {
      this.debug?.(`${adapter.platform} failed`, error instanceof Error ? error.message : 'error')
    }
  }
}

export function createTracker(config: TrackingConfig, env: BrowserEnv, debug?: Debug): Tracker | null {
  if (!config.enabled) return null
  let tracker: Tracker | null = null
  const marketing = () => tracker?.getConsent().marketing ?? false
  const adapters: Adapter[] = [
    ...(config.ga4Id ? [googleAdapter(env, config.ga4Id, marketing)] : []),
    ...(config.metaPixelId ? [metaAdapter(env, config.metaPixelId)] : []),
    ...(config.tiktokPixelId ? [tiktokAdapter(env, config.tiktokPixelId)] : []),
  ]
  if (adapters.length === 0) return null
  tracker = new Tracker(adapters, debug)
  return tracker
}
