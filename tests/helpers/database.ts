import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export const TEST_DATABASE = 'drphynex_independent_review_test'
export const TEST_MARKER = 'drphynex-independent-review-disposable-v1'

/** Verify the actual connected server and a marker outside the schema being dropped. */
export async function assertDisposableDatabase(payload: Payload) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const result = await db.execute(sql`SELECT current_database() AS name,
    shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = current_database()`)
  const row = result.rows[0] as { name?: string; marker?: string } | undefined
  if (row?.name !== TEST_DATABASE || row?.marker !== TEST_MARKER) {
    throw new Error('Refusing destructive setup: actual database identity / disposable marker mismatch')
  }
}
