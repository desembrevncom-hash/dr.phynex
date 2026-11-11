'use client'

import { useFormFields, useLocale } from '@payloadcms/ui'

import { blockIssues, blockTitles, landingActive, type LandingBlockType } from '@/lib/landing'

import { useLandingRows } from './landing/useLandingRows'
import { chosen, useProductProvides } from './landingProvides'

const locales = [
  ['ko', '한국어'],
  ['en', 'English'],
  ['vi', 'Tiếng Việt'],
] as const
const statusLabels: Record<string, string> = { 'ai-draft': 'Bản nháp AI', 'in-review': 'Đang xem xét', approved: 'Đã duyệt' }

/**
 * Top of the "Landing page" tab: whether the landing page is in use, which blocks still lack
 * content in the language being edited, and preview links per language (the preview shows the
 * last SAVED draft, so save first).
 */
export function LandingOverview() {
  const { code } = useLocale()
  const provides = useProductProvides()
  const slug = useFormFields(([fields]) => fields.slug?.value) as string | undefined
  const blocks = useLandingRows()
  const lang = String(code ?? '').toUpperCase()
  const active = landingActive(blocks)
  // Which languages approved the structure of the SAVED draft (server-computed on read).
  const approvalState = useFormFields(([fields]) => fields.landingApprovalState?.value) as Record<string, boolean> | null | undefined
  // Content approval of the language being edited (the sidebar field, as currently selected).
  const status = useFormFields(([fields]) => fields.translationStatus?.value) as string | undefined
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
        <div className="dx-lp-overview__approval" role="group" aria-label="Hai loại duyệt">
          <p className="dx-lp-overview__approval-title">Hai loại duyệt, cả hai cần có trước khi xuất bản một ngôn ngữ:</p>
          <p className="dx-lp-overview__approval-row">
            <strong>1. Duyệt nội dung {lang}</strong> (trường &ldquo;Trạng thái duyệt&rdquo; ở cột phải, riêng từng ngôn ngữ):{' '}
            <span className={status === 'approved' ? 'dx-lp--ok dx-lp-badge' : 'dx-lp--missing dx-lp-badge'}>
              {statusLabels[String(status)] ?? 'Chưa đặt'}
            </span>
          </p>
          <p className="dx-lp-overview__approval-row">
            <strong>2. Duyệt cấu trúc landing</strong> (dùng chung cho KO/EN/VI, theo bản đã lưu):{' '}
            {locales.map(([l]) => {
              const ok = approvalState[l] === true
              return (
                <span key={l} className={ok ? 'dx-lp--ok dx-lp-badge' : 'dx-lp--missing dx-lp-badge'}>
                  {l.toUpperCase()}: {ok ? 'đã duyệt' : 'cần duyệt'}
                </span>
              )
            })}
          </p>
          <p className="dx-lp-overview__hint">
            {status === 'approved' && approvalState[code as string] !== true
              ? `${lang} đang ghi "Đã duyệt" nhưng chưa duyệt cấu trúc hiện tại (cấu trúc vừa đổi). Người duyệt lưu nháp ${lang} một lần nữa, giữ "Đã duyệt", không sửa gì khác.`
              : `Chọn "Đã duyệt" rồi lưu nháp (không kèm thay đổi khác) sẽ duyệt cả nội dung ${lang} lẫn cấu trúc hiện tại cho ${lang}.`}{' '}
            Đổi khối, thứ tự, ẩn/hiện, ảnh hoặc nền sẽ xoá duyệt cấu trúc của mọi ngôn ngữ; các ngôn ngữ đang công khai phải duyệt lại thì mới xuất bản được. Sửa chữ chỉ ảnh hưởng ngôn ngữ đó.
          </p>
        </div>
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
