'use client'

import { OPEN_CONSENT_EVENT } from './AnalyticsProvider'

/** Footer control to review or withdraw consent at any time. */
export function ConsentSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="inline-flex min-h-10 items-center text-ink-muted hover:text-navy"
    >
      {label}
    </button>
  )
}
