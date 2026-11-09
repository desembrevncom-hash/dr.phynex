import {
  APIError,
  type CollectionBeforeOperationHook,
  type GlobalBeforeOperationHook,
} from 'payload'
import { isLocale } from '@/i18n/locales'

/** Never let Payload sanitize an invalid REST locale into the default language. */
export const publishOnlyRequestedLocale: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (operation === 'create' || operation === 'update') {
    const options = args as unknown as Record<string, unknown>
    const rawLocale = req.searchParams?.get('locale') ?? req.query?.locale
    // REST: compare with the locale written on the request itself. For globals Payload has already
    // replaced req.locale with publishSpecificLocale before any hook runs, so a "?locale=vi" request
    // asking to publish KO would otherwise go through. Local API callers are checked by
    // lib/content-mutations.ts before Payload is called.
    const restLocaleMismatch =
      req.payloadAPI === 'REST' && options.publishSpecificLocale != null && options.publishSpecificLocale !== rawLocale
    if (
      (rawLocale != null && !isLocale(rawLocale)) ||
      !isLocale(req.locale) ||
      (options.publishSpecificLocale != null && options.publishSpecificLocale !== req.locale) ||
      restLocaleMismatch ||
      options.publishAllLocales === true ||
      options.publishAllLocales === 'true'
    ) {
      throw new APIError(
        'Hãy chọn đúng một ngôn ngữ hợp lệ (ko, en hoặc vi); không cho xuất bản tất cả ngôn ngữ cùng lúc.',
        400,
        null,
        true,
      )
    }
    const savingDraft = options.draft === true || options.draft === 'true'
    req.context.reviewSavingDraft = savingDraft
    req.context.reviewApprovalIntent = (
      options.data as Record<string, unknown> | undefined
    )?.translationStatus
    req.fallbackLocale = false
    // Publishing only ever applies to the requested language. A draft save publishes nothing, so
    // it does not use Payload's single-locale publish path: that path also stores a "snapshot"
    // version as the latest draft carrying the document's OLD updatedAt, which made the Admin
    // report every edit after a save as "modified by another user". A publishSpecificLocale sent
    // with a draft (already checked above to match the request) is therefore dropped as well.
    if (savingDraft) delete options.publishSpecificLocale
    else options.publishSpecificLocale = req.locale
    options.publishAllLocales = false
  }
  return args
}
export const publishOnlyRequestedGlobalLocale =
  publishOnlyRequestedLocale as unknown as GlobalBeforeOperationHook
