import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const localeMiddleware = createMiddleware(routing)
export default function proxy(request: NextRequest) {
  // Also block historical optimized URLs before the image cache can answer.
  if (request.nextUrl.pathname === '/_next/image') {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'private, no-store' } })
  }
  if (/^\/api\/(media|source-documents)\/file\//.test(request.nextUrl.pathname)) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    return response
  }
  return localeMiddleware(request)
}
export const config = {
  matcher: ['/((?!(?:admin|api|preview)(?:/|$)|_next|_vercel|.*\\..*).*)', '/_next/image', '/api/media/file/:path*', '/api/source-documents/file/:path*'],
}
