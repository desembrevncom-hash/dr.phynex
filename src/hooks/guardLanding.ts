import { isDeepStrictEqual } from 'node:util'
import { APIError, type CollectionBeforeChangeHook, type FieldHook } from 'payload'

import { isEditorUser } from '@/access/roles'
import { isLocale, locales, type Locale } from '@/i18n/locales'
import { landingStructure } from '@/lib/landing'
import { EMPTY_LANDING_REVISION, landingRevision, readApprovals } from '@/lib/landing-approval'

/**
 * The landing page STRUCTURE (blocks, order, hide, tone, layout, images) is shared by every
 * language, so only editors may change it. Translators can still edit the texts of the language
 * they are working on. Approval: any change inside the landing blocks counts as a content change
 * for the language being saved (guardPublishing), so it goes back to "In review".
 */
export const guardLanding: CollectionBeforeChangeHook = ({ data, originalDoc, req, operation }) => {
  if (!data || !('landing' in data)) return data
  const before = operation === 'create' ? [] : (originalDoc as Record<string, unknown> | undefined)?.landing
  if (req.user && !isEditorUser(req.user) && !isDeepStrictEqual(landingStructure(before), landingStructure(data.landing))) {
    throw new APIError(
      'Chỉ biên tập viên hoặc quản trị viên mới được thêm, xoá, sắp xếp, ẩn khối hay đổi ảnh/kiểu nền của landing page (dùng chung cho mọi ngôn ngữ). Bạn vẫn có thể sửa chữ trong các khối.',
      403,
      null,
      true,
    )
  }
  return data
}

/**
 * Approval of the SHARED landing structure, same rules as the home banners
 * (hooks/guardHomeBannerApproval.ts). Runs after guardPublishing and guardLanding.
 *
 * - `landingApprovals` ({ ko?, en?, vi? } → structure revision) is server-owned: client values
 *   are replaced here. Non-localized, so it travels with the structure Payload publishes.
 * - A structure change (add/remove/reorder blocks or rows, hide, image, tone, layout) must be a
 *   draft and clears the approval of EVERY language; the edited language goes back to In review.
 * - A text-only change goes through guardPublishing: only that language returns to In review and
 *   loses its approval.
 * - An approval is recorded by an editor in a draft save with Approved and no other change; it
 *   pins the structure revision that language approved.
 * - Publishing a language needs its own approval of the current structure; if the structure would
 *   change what guests already see, every language that is public now must have approved the new
 *   structure too. Languages never published only need their own approval at their first publish.
 * - Products that never had landing blocks (neither in the draft nor in the published version)
 *   are not affected. A refused request writes nothing: the public version stays as it was.
 */
export const guardLandingApproval: CollectionBeforeChangeHook = async ({ data, originalDoc, req, operation }) => {
  if (!data) return data
  const locale = req.locale
  if (!isLocale(locale)) throw new APIError('Hãy chọn đúng một ngôn ngữ hợp lệ (ko, en hoặc vi).', 400, null, true)
  const previous = (operation === 'create' ? {} : (originalDoc ?? {})) as Record<string, unknown>
  const editor = !req.user || isEditorUser(req.user)
  const savingDraft = req.context.reviewSavingDraft === true

  const before = landingRevision(previous.landing)
  // Translators cannot change the structure (guardLanding refuses it), so only editors move it.
  const after = editor && 'landing' in data ? landingRevision(data.landing) : before
  const approvals = readApprovals(previous.landingApprovals)

  // Published state (main document, all languages) — decides which languages guests see now.
  const published =
    operation === 'create' || previous.id == null
      ? null
      : ((await req.payload.db.findOne({ collection: 'products', where: { id: { equals: previous.id } }, locale: 'all', req })) as Record<string, unknown> | null)
  const publishedRevision = published ? landingRevision(published.landing) : EMPTY_LANDING_REVISION
  if (before === EMPTY_LANDING_REVISION && after === EMPTY_LANDING_REVISION && publishedRevision === EMPTY_LANDING_REVISION) {
    data.landingApprovals = approvals
    return data
  }

  const structureChanged = after !== before
  if (structureChanged) {
    if (!savingDraft) {
      throw new APIError(
        'Hãy lưu thay đổi cấu trúc landing page (khối, thứ tự, ẩn/hiện, ảnh, kiểu nền) dưới dạng bản nháp, rồi duyệt lại mọi ngôn ngữ đang xuất bản trước khi xuất bản.',
        409,
        null,
        true,
      )
    }
    for (const l of locales) delete approvals[l]
    data.translationStatus = 'in-review'
  }

  const status = data.translationStatus ?? previous.translationStatus
  if (status !== 'approved') delete approvals[locale]
  else if (savingDraft && editor && !structureChanged && data.translationStatus === 'approved') approvals[locale] = after

  if (!savingDraft && data._status === 'published') {
    if (approvals[locale] !== after) {
      throw new APIError(
        `Cấu trúc landing page chưa được duyệt cho ${locale.toUpperCase()}. Hãy lưu nháp với trạng thái "Đã duyệt" (không kèm thay đổi khác) rồi mới xuất bản.`,
        409,
        null,
        true,
      )
    }
    if (published && published._status === 'published' && publishedRevision !== after) {
      const statuses = (published.translationStatus ?? {}) as Partial<Record<Locale, string>>
      const missing = locales.filter((l) => l !== locale && statuses[l] === 'approved' && approvals[l] !== after)
      if (missing.length) {
        throw new APIError(
          `Xuất bản ${locale.toUpperCase()} sẽ thay đổi cấu trúc landing page mà khách đang thấy ở ${missing
            .map((l) => l.toUpperCase())
            .join(', ')}. Hãy duyệt các ngôn ngữ đó cho cấu trúc mới trước; bản công khai hiện tại được giữ nguyên.`,
          409,
          null,
          true,
        )
      }
    }
  }

  data.landingApprovals = approvals
  return data
}

/** afterRead of the virtual `landingApprovalState`: per language, approved for THIS structure? */
export const landingApprovalStateHook: FieldHook = ({ data }) => {
  const revision = landingRevision(data?.landing)
  const approvals = readApprovals(data?.landingApprovals)
  return Object.fromEntries(locales.map((l) => [l, approvals[l] === revision]))
}
