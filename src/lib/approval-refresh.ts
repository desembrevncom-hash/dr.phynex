import type { ApprovalState } from '@/lib/approval-basis'

/**
 * Browser-safe, framework-free bookkeeping for the approval panel's refresh requests.
 *
 * Every request gets a generation number and is tied to the locale it was made for. Only the
 * LATEST request of the CURRENT locale may publish a result or end the waiting state: a slower,
 * older response (another locale, or an earlier request of the same locale) is ignored and cannot
 * switch off the waiting state of the newer request. Pure, so the ordering rules are unit tested.
 */
export type RefreshResult = { locale: string; state: ApprovalState | undefined }

export class ApprovalRefresher {
  private generation = 0
  private latest: { generation: number; locale: string } | null = null
  private controller: AbortController | null = null
  /** Result of the latest request, once it finished (undefined state = the read failed). */
  result: RefreshResult | null = null
  /** True from `begin` until the latest request finishes. */
  pending = false

  /** Starts a request for `locale`, cancelling the previous one. */
  begin(locale: string): { generation: number; signal: AbortSignal } {
    this.controller?.abort()
    this.controller = new AbortController()
    this.generation += 1
    this.latest = { generation: this.generation, locale }
    this.result = null
    this.pending = true
    return { generation: this.generation, signal: this.controller.signal }
  }

  /** Reports a finished request; returns whether it was still the latest one and was applied. */
  finish(generation: number, locale: string, state: ApprovalState | undefined): boolean {
    if (!this.latest || this.latest.generation !== generation || this.latest.locale !== locale) {
      return false
    }
    this.result = { locale, state }
    this.pending = false
    return true
  }

  /** Forgets everything (unmount). */
  cancel() {
    this.controller?.abort()
    this.latest = null
    this.result = null
    this.pending = false
  }
}

/**
 * The state the panel may act on for `locale`: the latest refresh result of this locale, else (no
 * refresh yet) the state the document was loaded with. Anything that belongs to another locale, or
 * a failed refresh, yields undefined, so the button is never enabled from old or foreign data.
 */
export function selectApprovalState(input: {
  locale: string
  loaded: ApprovalState | undefined
  refresher: Pick<ApprovalRefresher, 'result' | 'pending'>
}): ApprovalState | undefined {
  const { locale, loaded, refresher } = input
  if (refresher.pending) return undefined
  if (refresher.result) {
    return refresher.result.locale === locale && refresher.result.state?.locale === locale
      ? refresher.result.state
      : undefined
  }
  return loaded?.locale === locale ? loaded : undefined
}

/**
 * The approval request for the locale being edited: label, URL and basis all come from the same
 * state and locale. Returns null unless the state belongs to that locale.
 */
export function buildApprovalRequest(
  state: ApprovalState | undefined,
  locale: string,
  localeName: string,
) {
  if (!state || state.locale !== locale) return null
  return {
    label: `Duyệt cấu hình cho ${localeName}`,
    url: `/api/globals/home-page?locale=${locale}&draft=true&fallback-locale=none`,
    headers: { 'Content-Type': 'application/json', 'x-approval-basis': state.basis },
    body: JSON.stringify({ translationStatus: 'approved' }),
  }
}
