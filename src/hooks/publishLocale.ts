import type { CollectionBeforeOperationHook, GlobalBeforeOperationHook } from 'payload'
import { isLocale } from '@/i18n/locales'

/** Payload preserves other locales' published values and pending drafts using a snapshot. */
export const publishOnlyRequestedLocale: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'update' && isLocale(req.locale)) {
    const options = args as unknown as Record<string, unknown>
    options.publishSpecificLocale = req.locale
    options.publishAllLocales = false
  }
  return args
}
export const publishOnlyRequestedGlobalLocale = publishOnlyRequestedLocale as unknown as GlobalBeforeOperationHook
