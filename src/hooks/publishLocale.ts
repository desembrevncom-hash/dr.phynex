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
    if (
      (rawLocale != null && !isLocale(rawLocale)) ||
      !isLocale(req.locale) ||
      (options.publishSpecificLocale != null && options.publishSpecificLocale !== req.locale) ||
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
    // report every edit after a save as "modified by another user".
    if (!savingDraft) options.publishSpecificLocale = req.locale
    options.publishAllLocales = false
  }
  return args
}
export const publishOnlyRequestedGlobalLocale =
  publishOnlyRequestedLocale as unknown as GlobalBeforeOperationHook
