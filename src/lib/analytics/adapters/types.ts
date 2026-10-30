import type { ConsentCategory } from '../consent'
import type { PageContext, TrackEvent } from '../events'

export type ScriptElement = { async: boolean; src: string; onerror: ((event: unknown) => void) | null }

/** The browser surface adapters touch; a fake implements it in tests (no network, no vendors). */
export type BrowserEnv = {
  win: Record<string, unknown>
  doc: { createElement(tag: 'script'): ScriptElement; head: { appendChild(node: ScriptElement): unknown } }
}

export type Platform = 'google' | 'meta' | 'tiktok'

export interface Adapter {
  readonly platform: Platform
  readonly category: ConsentCategory
  /** Injects the vendor script once. Safe to call repeatedly. */
  load(): void
  /** Consent withdrawn: tell the vendor and stop. The loaded script cannot be unloaded. */
  revoke(): void
  /** Re-grant after a withdrawal on an already loaded vendor. */
  grant(): void
  page(page: PageContext): void
  event(event: TrackEvent, page: PageContext | null): void
}

/** Appends an async script; a blocked or failed load is swallowed (site keeps working). */
export function injectScript(env: BrowserEnv, src: string, onError: () => void) {
  const script = env.doc.createElement('script')
  script.async = true
  script.src = src
  script.onerror = () => onError()
  env.doc.head.appendChild(script)
}
