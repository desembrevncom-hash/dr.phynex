import { defineRouting } from 'next-intl/routing'

import { locales, routingDefaultLocale } from './locales'

export const routing = defineRouting({
  locales,
  // Korean is the first-visit default; never infer a locale from Accept-Language.
  defaultLocale: routingDefaultLocale,
  localePrefix: 'always',
  localeDetection: false,
})
