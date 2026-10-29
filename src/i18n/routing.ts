import { defineRouting } from 'next-intl/routing'

import { locales, routingDefaultLocale } from './locales'

export const routing = defineRouting({
  locales,
  // Used when Accept-Language matches none of the locales. The CMS source locale is `ko`.
  defaultLocale: routingDefaultLocale,
  localePrefix: 'always',
  localeDetection: true,
})
