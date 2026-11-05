// Shared by Payload localization and next-intl routing.
export const locales = ['ko', 'en', 'vi'] as const
export type Locale = (typeof locales)[number]

/** Source language of all content (CMS default locale). */
export const contentDefaultLocale: Locale = 'ko'

/** First-visit default, independent of browser language. */
export const routingDefaultLocale: Locale = 'ko'

export const localeLabels: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
}

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value)
