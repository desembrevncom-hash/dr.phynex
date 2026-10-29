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
        'Choose one valid locale (ko, en or vi); publishing all locales is disabled.',
        400,
        null,
        true,
      )
    }
    req.context.reviewSavingDraft = options.draft === true || options.draft === 'true'
    req.context.reviewApprovalIntent = (
      options.data as Record<string, unknown> | undefined
    )?.translationStatus
    req.fallbackLocale = false
    options.publishSpecificLocale = req.locale
    options.publishAllLocales = false
  }
  return args
}
export const publishOnlyRequestedGlobalLocale =
  publishOnlyRequestedLocale as unknown as GlobalBeforeOperationHook
