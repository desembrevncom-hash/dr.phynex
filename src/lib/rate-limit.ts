import 'server-only'

import { createHash } from 'crypto'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { MAX_PER_WINDOW, rateLimited as memoryRateLimited, WINDOW_MS } from './forms'

const WINDOW_SECONDS = WINDOW_MS / 1000

/** Salted hash so the table never stores a visitor's IP address. */
export const rateLimitKey = (form: string, ip: string) =>
  `${form}:${createHash('sha256')
    .update(`${process.env.PAYLOAD_SECRET ?? ''}:${ip}`)
    .digest('hex')
    .slice(0, 40)}`

/**
 * Fixed-window limit shared by every server instance (one row per form + visitor in Postgres,
 * updated atomically). If the table is unreachable the per-instance memory limit is used, so a
 * database hiccup never blocks a genuine visitor.
 */
export async function sharedRateLimited(payload: Payload, key: string): Promise<boolean> {
  try {
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const result = await db.execute(sql`
      INSERT INTO "form_rate_limits" ("key", "window_start", "hits") VALUES (${key}, now(), 1)
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "form_rate_limits"."window_start" <= now() - make_interval(secs => ${WINDOW_SECONDS})
          THEN 1 ELSE "form_rate_limits"."hits" + 1 END,
        "window_start" = CASE WHEN "form_rate_limits"."window_start" <= now() - make_interval(secs => ${WINDOW_SECONDS})
          THEN now() ELSE "form_rate_limits"."window_start" END
      RETURNING "hits"`)
    const hits = Number((result.rows[0] as { hits?: number } | undefined)?.hits ?? 0)
    if (Math.random() < 0.01) {
      await db.execute(sql`DELETE FROM "form_rate_limits" WHERE "window_start" < now() - interval '1 day'`)
    }
    return hits > MAX_PER_WINDOW
  } catch (error) {
    payload.logger.error({ err: error, msg: '[rate-limit] shared store unavailable, using per-instance limit' })
    return memoryRateLimited(key)
  }
}

/**
 * Visitor IP as set by the hosting platform. On Vercel `x-real-ip` is written by the edge and
 * cannot be supplied by the client. Behind another proxy, review this before going live.
 */
export function clientIp(headers: Headers) {
  return (
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}
