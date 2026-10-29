import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Locale handling for site pages only. Excluded: Payload admin and API,
  // Next internals, and any path with a file extension (sitemap.xml, robots.txt, media).
  matcher: ['/((?!(?:admin|api)(?:/|$)|_next|_vercel|.*\\..*).*)'],
}
