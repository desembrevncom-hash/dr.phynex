import { APIError, type Payload } from 'payload'
import { isLocale } from '@/i18n/locales'

type MutationOptions = {
  collection?: string
  slug?: string
  locale?: unknown
  publishSpecificLocale?: unknown
  publishAllLocales?: unknown
  req?: { locale?: unknown }
}
const clients = new WeakMap<Payload, Payload>()

/** Application Local API boundary. Raw getPayload() is intentionally not patched. */
export function withContentLocaleGuard(payload: Payload): Payload {
  const existing = clients.get(payload)
  if (existing) return existing
  const guarded = new Proxy(payload, {
    get(target, key) {
      const value = Reflect.get(target, key)
      if (key !== 'create' && key !== 'update' && key !== 'updateGlobal') return value
      return async (options: MutationOptions) => {
        const entity =
          key === 'updateGlobal'
            ? target.globals.config.find((global) => global.slug === options.slug)
            : target.collections[options.collection as keyof typeof target.collections]?.config
        if (!entity?.versions) return value.call(target, options)
        // Validate the original caller's options before Payload can replace req.locale.
        const locale = options.locale ?? options.req?.locale
        if (
          !isLocale(locale) ||
          (options.publishSpecificLocale != null && options.publishSpecificLocale !== locale) ||
          (options.publishAllLocales != null && options.publishAllLocales !== false)
        ) {
          throw new APIError(
            'Thao tác nội dung cần đúng một ngôn ngữ hợp lệ khớp với publishSpecificLocale; không cho dùng tất cả ngôn ngữ.',
            400,
            null,
            true,
          )
        }
        return value.call(target, { ...options, locale, fallbackLocale: false })
      }
    },
  })
  clients.set(payload, guarded)
  return guarded
}
