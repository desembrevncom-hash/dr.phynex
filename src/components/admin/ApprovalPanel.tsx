'use client'

import {
  toast,
  useAuth,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormModified,
  useFormProcessing,
  useLocale,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import type { ApprovalState } from '@/lib/approval-basis'
import {
  ApprovalRefresher,
  buildApprovalRequest,
  selectApprovalState,
} from '@/lib/approval-refresh'
import { approvalView, saveMarker } from '@/lib/approval-view'

const localeName = { ko: 'tiếng Hàn', en: 'tiếng Anh', vi: 'tiếng Việt' } as const
type Code = keyof typeof localeName
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Sidebar panel of Home Page → "Banner trang chủ".
 *
 * The scope of an approval is real, not per banner: it covers the whole Home Page content of ONE
 * language plus the shared banner configuration (images, visual type, CTA target, colours) of all
 * five slots. The button approves exactly the draft that is stored and that this page is showing:
 * it is enabled only for a clean (saved) form, never saves, never publishes, never touches another
 * language, and sends the server-computed `basis` so the server refuses if anything changed since
 * this page loaded (409). Server rules are authoritative; the disabled states here only explain.
 */
export function ApprovalPanel({ path }: { path: string }) {
  const { value } = useField<ApprovalState | undefined>({ path })
  const modified = useFormModified()
  const processing = useFormProcessing()
  const { user } = useAuth()
  const { code } = useLocale()
  const router = useRouter()
  const { lastUpdateTime, data: shownDoc } = useDocumentInfo()
  const { submit } = useForm()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const [updating, setUpdating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{
    locale: string
    kind: 'ok' | 'error'
    text: string
  } | null>(null)
  // Refresh bookkeeping (generation + locale per request; see lib/approval-refresh.ts).
  const [refresher] = useState(() => new ApprovalRefresher())
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const locale = (code in localeName ? code : 'vi') as Code
  const currentLocale = useRef(locale)
  useEffect(() => {
    currentLocale.current = locale
  }, [locale])

  // The form keeps the value it was loaded with; after a save the stored draft (and its basis) is
  // new, so the state is read again. The result is only used for the locale it was requested for
  // and only while it is the latest request.
  const refresh = useCallback(
    (forLocale: string) => {
      const { generation, signal } = refresher.begin(forLocale)
      rerender()
      fetch(`/api/globals/home-page?locale=${forLocale}&draft=true&depth=0&fallback-locale=none`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      })
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as { approvalState?: ApprovalState }).approvalState
            : undefined,
        )
        .catch(() => undefined)
        .then((state) => {
          if (refresher.finish(generation, forLocale, state)) rerender()
        })
    },
    [refresher],
  )
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    refresh(locale)
  }, [lastUpdateTime, locale, refresh])
  useEffect(() => () => refresher.cancel(), [refresher])

  const role = (user as { role?: string } | null)?.role
  const canApprove = role === 'admin' || role === 'editor'
  const loaded = value && typeof value === 'object' ? value : undefined
  const state = selectApprovalState({ locale, loaded, refresher })
  const approvedHere = !!state?.approved?.[locale]

  // The basis is only used while it belongs to this locale AND the save the form is showing.
  const view = approvalView({
    state,
    shownSave: saveMarker((shownDoc as { bannerApprovals?: unknown } | undefined)?.bannerApprovals),
    // The basis of the document this form was loaded with (same locale only).
    loadedShownBasis: loaded?.locale === locale ? loaded.shownBasis : undefined,
    canApprove,
    modified,
    busy: processing || busy || updating || refresher.pending,
    localeApproved: approvedHere,
    localeName: localeName[locale],
  })
  const blocked = view.reason
  const request = buildApprovalRequest(state, locale, localeName[locale])
  const shownMessage = message && message.locale === locale ? message : null

  /**
   * Old draft without a save marker: save the form exactly like "Lưu bản nháp" does (same request,
   * draft only, never approves or publishes). The saved document then carries a marker and the
   * panel re-reads the state, so form and basis come from that one successful save. A failed save
   * changes nothing and the button stays locked.
   */
  async function updateDraft() {
    if (!view.legacy || updating) return
    setUpdating(true)
    try {
      await submit({
        action: `${api}/globals/home-page?locale=${locale}&depth=0&fallback-locale=null&draft=true`,
        method: 'POST',
        overrides: { _status: 'draft' },
        skipValidation: true,
      })
    } finally {
      setUpdating(false)
    }
  }

  async function approve() {
    if (blocked || !request) return
    const sentLocale = locale
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        credentials: 'include',
        headers: request.headers,
        body: request.body,
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          errors?: { message?: string }[]
        } | null
        setMessage({
          locale: sentLocale,
          kind: 'error',
          text:
            body?.errors?.[0]?.message ??
            (response.status === 409
              ? 'Nội dung đã thay đổi. Hãy tải lại trang rồi duyệt lại.'
              : 'Không duyệt được. Hãy thử lại.'),
        })
        return
      }
      setMessage({
        locale: sentLocale,
        kind: 'ok',
        text: `Đã duyệt cấu hình cho ${localeName[sentLocale]}. Chưa xuất bản.`,
      })
      toast.success(`Đã duyệt cấu hình cho ${localeName[sentLocale]}.`)
      // The user may have switched language meanwhile: refresh the language now on screen.
      refresh(currentLocale.current)
      router.refresh()
    } catch {
      setMessage({
        locale: sentLocale,
        kind: 'error',
        text: 'Mất kết nối khi duyệt. Hãy kiểm tra mạng rồi thử lại.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dx-approval" aria-labelledby="dx-approval-title">
      <h3 id="dx-approval-title" className="dx-approval__title">
        Duyệt cấu hình banner
      </h3>
      <p className="dx-approval__scope">
        Việc duyệt áp dụng cho <strong>cả trang chủ ở một ngôn ngữ</strong> và cho{' '}
        <strong>cấu hình dùng chung của 5 banner</strong> (ảnh, loại visual, đích CTA, màu). Không có
        duyệt riêng từng banner. Đổi cấu hình dùng chung sẽ yêu cầu duyệt lại mọi ngôn ngữ.
      </p>
      <ul className="dx-approval__list">
        {(Object.keys(localeName) as Code[]).map((l) => (
          <li key={l} data-current={l === locale ? 'true' : undefined}>
            <span>
              {capital(localeName[l])}
              {l === locale ? ' (đang soạn)' : ''}
            </span>
            <span className={state?.approved?.[l] ? 'dx-pill dx-pill--ok' : 'dx-pill'}>
              {state
                ? state.approved[l]
                  ? 'Đã duyệt cấu hình hiện tại'
                  : 'Chưa duyệt / cần duyệt lại'
                : '—'}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="dx-approval__button"
        onClick={approve}
        disabled={!!blocked}
        aria-describedby="dx-approval-hint"
      >
        {request?.label ?? `Duyệt cấu hình cho ${localeName[locale]}`}
      </button>
      <p id="dx-approval-hint" className="dx-approval__hint">
        {blocked ?? 'Duyệt đúng bản nháp đã lưu. Không tự lưu, không xuất bản.'}
      </p>
      {!state && !refresher.pending ? (
        <button type="button" className="dx-approval__reload" onClick={() => refresh(locale)}>
          Thử đọc lại trạng thái
        </button>
      ) : null}
      {view.legacy && canApprove ? (
        <button
          type="button"
          className="dx-approval__reload"
          onClick={updateDraft}
          disabled={updating || processing}
        >
          Cập nhật bản nháp để tiếp tục duyệt
        </button>
      ) : null}
      {view.stale ? (
        <button type="button" className="dx-approval__reload" onClick={() => window.location.reload()}>
          Tải bản mới nhất
        </button>
      ) : null}
      <div role="status" aria-live="polite" className="dx-approval__message" data-kind={shownMessage?.kind}>
        {shownMessage?.text}
      </div>
    </section>
  )
}
