import { randomUUID } from 'node:crypto'

import { APIError, type GlobalBeforeChangeHook, type GlobalBeforeOperationHook } from 'payload'

import { isEditorUser } from '@/access/roles'
import { isLocale, locales, type Locale } from '@/i18n/locales'
import { lockHomePageWrites, readApprovalState } from '@/lib/approval-basis'
import { mergeShared, readApprovals, sharedRevision } from '@/lib/banner-revision'

/**
 * Home Page beforeOperation hook that takes the write lock, update operation only.
 *
 * It is not literally the first beforeOperation hook: contentGlobal runs blockGlobalRestore and
 * publishOnlyRequestedGlobalLocale before it. Those only inspect the operation and request (restore
 * refusal, locale checks) and never read the database, so the lock is still taken before the read
 * of the latest version that the guards decide on.
 *
 * Payload's update lifecycle (globals/operations/update.js) is: initTransaction → beforeOperation
 * hooks → access → getLatestGlobalVersion (the decisive read) → afterRead (originalDoc) →
 * beforeValidate → beforeChange hooks (guardGlobalPublishing, guardHomeBannerApproval) → write →
 * commit/rollback. beforeOperation therefore runs INSIDE the transaction and BEFORE every read the
 * guards decide on, so the lock taken here (see lockHomePageWrites) is held before the stored draft
 * is read and until the write commits or rolls back. Every Home Page write path (Admin, REST,
 * Local API, publish, approval) goes through this one operation, so they all take the same lock.
 * guardHomeBannerApproval refuses to run without it (fail closed).
 *
 * It also carries the approval proof of the Admin button (`x-approval-basis`, lib/approval-basis.ts)
 * into the request context. Local API callers pass `context: { approvalBasis }` themselves.
 */
export const lockAndCaptureHomePage: GlobalBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'update') return args
  const header = req.headers?.get?.('x-approval-basis')
  if (typeof header === 'string' && /^[a-f0-9]{64}$/.test(header)) req.context.approvalBasis = header
  await lockHomePageWrites(req.payload, req)
  req.context.homePageLockTx = String(await req.transactionID)
  // Test seam (Local API `context` only, a REST client cannot set it): runs while the lock is held,
  // before anything is read, so a test can start the competing writer at an exact point.
  const seam = req.context.afterHomePageLock
  if (typeof seam === 'function') await (seam as () => Promise<void>)()
  return args
}

/**
 * Home Page only. Runs after guardGlobalPublishing (localized review rules), on the server for
 * every supported write path (Admin, REST, Local API without overrideAccess-specific bypasses).
 *
 * - `bannerApprovals` is server-owned: whatever the client sends is replaced here.
 * - A change to any shared banner field (see lib/banner-revision.ts) must be saved as a draft,
 *   clears the approval of EVERY locale and sends the edited locale back to In review.
 * - An approval is recorded only by an editor, in a draft save with Approved and no content
 *   change (localized or shared): it pins the shared revision that locale approved.
 * - Publishing a locale requires that locale to have approved the current shared revision; if the
 *   shared revision would change what is already public, every locale guests can currently see
 *   must have approved the new revision too (Payload publishes non-localized fields from the draft).
 * - A refused request writes nothing, so the published version stays exactly as it was.
 */
export const guardHomeBannerApproval: GlobalBeforeChangeHook = async ({
  data,
  originalDoc,
  overrideAccess,
  req,
}) => {
  const locale = req.locale
  if (!isLocale(locale)) {
    throw new APIError('Hãy chọn đúng một ngôn ngữ hợp lệ (ko, en hoặc vi).', 400, null, true)
  }
  // Caller check only. Without a user, the one trusted caller is an in-process Local API call that
  // explicitly bypasses access (seeds, scripts, jobs), the same exemption guardGlobalPublishing gives.
  // Anything else without a user (REST/GraphQL, or a Local API call that did not bypass access) fails
  // closed. Guests never get here anyway: the global's update access is staff-only, GraphQL is off.
  // A trusted system caller is NOT exempt from the rules below: it gets no approval of its own and no
  // early return, so revision, approval and publish checks are identical for it and for an editor.
  if (!req.user && (req.payloadAPI !== 'local' || overrideAccess !== true)) {
    throw new APIError('Hãy đăng nhập bằng tài khoản nhân sự để thay đổi banner trang chủ.', 403, null, true)
  }
  // The lock was taken in lockAndCaptureHomePage BEFORE originalDoc was read, so originalDoc,
  // the stored approvals and the approval check below all describe the same committed state.
  // Fail closed if a write path reached the guard without it.
  if (!req.transactionID || req.context.homePageLockTx !== String(await req.transactionID)) {
    throw new Error('Home Page write reached the approval guard without the write lock')
  }
  const editor = !req.user || isEditorUser(req.user)
  const savingDraft = req.context.reviewSavingDraft === true
  const previous = (originalDoc ?? {}) as Record<string, unknown>

  const before = sharedRevision(previous.banners as never)
  // Shared fields are editor-only (field access); a translator's values are dropped later anyway,
  // so they must not count as a change here.
  const after = editor
    ? sharedRevision(mergeShared(previous.banners as never, data.banners as never))
    : before
  const sharedChanged = after !== before

  const approvals = readApprovals(previous.bannerApprovals)
  if (sharedChanged) {
    if (!savingDraft) {
      throw new APIError(
        'Hãy lưu thay đổi cấu hình dùng chung (ảnh, loại visual, đích CTA, màu) dưới dạng bản nháp, rồi duyệt lại mọi ngôn ngữ đang xuất bản trước khi xuất bản.',
        409,
        null,
        true,
      )
    }
    for (const l of locales) delete approvals[l]
    data.translationStatus = 'in-review'
  }

  const status = data.translationStatus ?? previous.translationStatus
  if (status !== 'approved') {
    delete approvals[locale]
  } else if (savingDraft && editor && !sharedChanged && data.translationStatus === 'approved') {
    // The separate approval save: no content change got through guardGlobalPublishing (it
    // would have reset the status to In review), and no shared change happened.
    // A NEW approval by a signed-in user must prove it covers exactly the stored draft the user was
    // shown: the Admin sends the server-computed basis it read with the document, and it is compared
    // with the draft stored right now (lib/approval-basis.ts). Re-saving an already approved
    // revision records nothing new and needs no proof. A trusted system caller has no user.
    if (approvals[locale] !== after && req.user) {
      const sent = req.context.approvalBasis
      if (typeof sent !== 'string' || sent === '') {
        throw new APIError(
          'Hãy duyệt bằng nút "Duyệt cấu hình" trên màn hình banner: nút này gửi kèm phiên bản bạn đang xem để hệ thống kiểm tra. Không thể duyệt bằng cách đổi trạng thái rồi lưu.',
          409,
          null,
          true,
        )
      }
      const current = await readApprovalState(req.payload, locale, req)
      if (sent !== current.basis) {
        throw new APIError(
          'Nội dung đã thay đổi kể từ lúc bạn mở trang (có người khác vừa lưu). Hãy tải lại để xem bản mới nhất rồi duyệt lại; chưa có gì được duyệt.',
          409,
          null,
          true,
        )
      }
      // Test seam (Local API `context` only, a REST client cannot set it): lets a test run a
      // competing save exactly between the check and the write.
      const seam = req.context.afterApprovalCheck
      if (typeof seam === 'function') await (seam as () => Promise<void>)()
    }
    approvals[locale] = after
  }

  if (!savingDraft && data._status === 'published') {
    if (approvals[locale] !== after) {
      throw new APIError(
        `Cấu hình banner dùng chung đã thay đổi hoặc chưa được duyệt cho ${locale.toUpperCase()}. Hãy duyệt bằng nút "Duyệt cấu hình" (không kèm thay đổi khác) trước khi xuất bản.`,
        409,
        null,
        true,
      )
    }
    const published = (await req.payload.db.findGlobal({
      slug: 'home-page',
      locale: 'all',
      req,
    })) as Record<string, unknown> | null
    if (published && sharedRevision(published.banners as never) !== after) {
      const status = (published.translationStatus ?? {}) as Partial<Record<Locale, string>>
      const missing = locales.filter(
        (l) => l !== locale && status[l] === 'approved' && approvals[l] !== after,
      )
      if (missing.length) {
        throw new APIError(
          `Xuất bản ${locale.toUpperCase()} sẽ thay đổi cấu hình banner dùng chung mà khách đang thấy ở ${missing
            .map((l) => l.toUpperCase())
            .join(', ')}. Hãy duyệt các ngôn ngữ đó cho cấu hình mới trước.`,
          409,
          null,
          true,
        )
      }
    }
  }

  // `_save` marks THIS write inside the stored document (no schema change: the field is JSON). It
  // lets the Admin pair an approval basis with the exact save its form shows; the updatedAt of a
  // global does not move on draft saves. readApprovals() ignores it.
  data.bannerApprovals = { ...approvals, _save: randomUUID() }
  return data
}
