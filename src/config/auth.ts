/**
 * Flags for Payload's `payload-token` session cookie (HttpOnly is always set by Payload).
 *
 * Secure is decided from configuration, not from request headers: behind Vercel (or any TLS
 * proxy) the app itself sees plain HTTP and an `x-forwarded-proto` header that a client could
 * forge. The site's configured origin (NEXT_PUBLIC_SERVER_URL) and the VERCEL flag (always HTTPS)
 * are trusted; local development on http://localhost keeps a non-Secure cookie so login works.
 */
export const isHttpsOrigin = (url: string | undefined) => {
  try {
    return new URL(url ?? '').protocol === 'https:'
  } catch {
    return false
  }
}

export function authCookies(env: { serverURL?: string; vercel?: string } = {}) {
  return {
    secure: isHttpsOrigin(env.serverURL) || Boolean(env.vercel),
    // Lax: sent on top-level navigation back to the admin, never on cross-site subrequests.
    sameSite: 'Lax' as const,
  }
}

/** Session lifetime in seconds (Payload default, stated explicitly). */
export const SESSION_SECONDS = 2 * 60 * 60
