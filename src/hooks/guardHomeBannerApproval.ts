import { APIError, type GlobalBeforeChangeHook } from 'payload'

import { isEditorUser } from '@/access/roles'
import { isLocale, locales, type Locale } from '@/i18n/locales'
import { mergeShared, readApprovals, sharedRevision } from '@/lib/banner-revision'

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
    throw new APIError('Choose one valid locale (ko, en or vi).', 400, null, true)
  }
  // Caller check only. Without a user, the one trusted caller is an in-process Local API call that
  // explicitly bypasses access (seeds, scripts, jobs), the same exemption guardGlobalPublishing gives.
  // Anything else without a user (REST/GraphQL, or a Local API call that did not bypass access) fails
  // closed. Guests never get here anyway: the global's update access is staff-only, GraphQL is off.
  // A trusted system caller is NOT exempt from the rules below: it gets no approval of its own and no
  // early return, so revision, approval and publish checks are identical for it and for an editor.
  if (!req.user && (req.payloadAPI !== 'local' || overrideAccess !== true)) {
    throw new APIError('Sign in as staff to change the home page banners.', 403, null, true)
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
        'Save shared banner changes (images, visual type, CTA target, colours) as a draft, then approve every published language again before publishing.',
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
    approvals[locale] = after
  }

  if (!savingDraft && data._status === 'published') {
    if (approvals[locale] !== after) {
      throw new APIError(
        `The shared banner settings were changed or never approved for ${locale.toUpperCase()}. Save a draft with Approved (no other changes) before publishing.`,
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
          `Publishing ${locale.toUpperCase()} would change the shared banner settings that visitors see in ${missing
            .map((l) => l.toUpperCase())
            .join(', ')}. Approve those languages for the new settings first.`,
          409,
          null,
          true,
        )
      }
    }
  }

  data.bannerApprovals = approvals
  return data
}
