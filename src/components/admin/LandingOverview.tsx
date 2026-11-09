'use client'

import { useFormFields, useLocale } from '@payloadcms/ui'

import { blockIssues, blockTitles, landingActive, type LandingBlockType } from '@/lib/landing'

import { chosen, useProductProvides } from './landingProvides'

const locales = [
  ['ko', '한국어'],
  ['en', 'English'],
  ['vi', 'Tiếng Việt'],
] as const

/**
 * Top of the "Landing page" tab: whether the landing page is in use, which blocks still lack
 * content in the language being edited, and preview links per language (the preview shows the
 * last SAVED draft, so save first).
 */
export function LandingOverview() {
  const { code } = useLocale()
  const provides = useProductProvides()
  const slug = useFormFields(([fields]) => fields.slug?.value) as string | undefined
  // Rebuild each block's data from the flat form state ("landing.<i>.<field>").
  const blocks = useFormFields(([fields]) => {
    const out: Record<string, unknown>[] = []
    for (const [path, field] of Object.entries(fields)) {
      const m = /^landing\.(\d+)\.(.+)$/.exec(path)
      if (!m) continue
      const i = Number(m[1])
      out[i] ??= {}
      const parts = m[2].split('.')
      // "landing.<i>.items" holds the row count; the rows themselves come as "items.<n>.<field>".
      if (parts.length === 1 && !Array.isArray(out[i][parts[0]])) out[i][parts[0]] = field.value
      else if (parts.length === 3) {
        if (!Array.isArray(out[i][parts[0]])) out[i][parts[0]] = []
        const list = out[i][parts[0]] as Record<string, unknown>[]
        list[Number(parts[1])] ??= {}
        list[Number(parts[1])][parts[2]] = field.value
      }
    }
    return out.filter(Boolean)
  })
  const lang = String(code ?? '').toUpperCase()
  const active = landingActive(blocks)
  // Which languages approved the structure of the SAVED draft (server-computed on read).
  const approvalState = useFormFields(([fields]) => fields.landingApprovalState?.value) as Record<string, boolean> | null | undefined
  const pending = blocks
    .map((b, i) => ({ i, b, issues: blockIssues(b, provides, chosen) }))
    .filter(({ b, issues }) => b.hidden !== true && issues.required.length > 0)

  return (
    <div className="dx-lp-overview" role="region" aria-label="Tình trạng landing page">
      <p className="dx-lp-overview__state">
        {active
          ? `Landing page đang được dùng: ${blocks.filter((b) => b.hidden !== true).length} khối hiển thị.`
          : 'Chưa có khối nào đang hiện: trang sản phẩm vẫn dùng bố cục hiện tại.'}
      </p>
      {active ? (
        pending.length > 0 ? (
          <ul className="dx-lp-overview__list">
            {pending.map(({ i, b, issues }) => (
              <li key={i}>
                Khối {i + 1} · {blockTitles[b.blockType as LandingBlockType] ?? 'Khối'}: khách chưa thấy ({lang}), thiếu{' '}
                {issues.required.join(', ')}.
              </li>
            ))}
          </ul>
        ) : (
          <p className="dx-lp-overview__ok">Mọi khối đang hiện đều đủ nội dung bắt buộc ở {lang}.</p>
        )
      ) : null}
      {active && approvalState ? (
        <p className="dx-lp-overview__approval">
          Duyệt cấu trúc của bản đã lưu (dùng chung):{' '}
          {locales.map(([l], i) => {
            const ok = approvalState[l] === true
            return (
              <span key={l} className={ok ? 'dx-lp--ok dx-lp-badge' : 'dx-lp--missing dx-lp-badge'}>
                {i > 0 ? ' ' : ''}
                {l.toUpperCase()}: {ok ? 'đã duyệt' : 'cần duyệt'}
              </span>
            )
          })}
          <span className="dx-lp-overview__hint">
            {' '}
            Đổi khối, thứ tự, ẩn/hiện, ảnh hoặc nền sẽ xoá duyệt của mọi ngôn ngữ; muốn xuất bản, mọi ngôn ngữ đang công khai phải duyệt lại cấu trúc mới (lưu nháp với &ldquo;Đã duyệt&rdquo;, không kèm thay đổi khác).
          </span>
        </p>
      ) : null}
      {slug ? (
        <p className="dx-lp-overview__preview">
          Xem trước bản nháp đã lưu:{' '}
          {locales.map(([l, name], i) => (
            <span key={l}>
              {i > 0 ? ' · ' : ''}
              <a href={`/preview?path=${encodeURIComponent(`/${l}/products/${slug}`)}`} target="_blank" rel="noopener">
                {name}
              </a>
            </span>
          ))}
          <span className="dx-lp-overview__hint"> (lưu nháp trước khi mở; ảnh chưa công khai chỉ hiện trong xem trước)</span>
        </p>
      ) : null}
    </div>
  )
}
