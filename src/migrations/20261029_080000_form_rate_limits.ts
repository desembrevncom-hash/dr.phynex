import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Shared counter for the contact/partnership form rate limit (src/lib/rate-limit.ts).
// Not a Payload collection: it is never shown in the admin or the API. Keys hold a salted hash
// of the visitor IP, never the IP itself; rows older than a day are deleted by the limiter.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "form_rate_limits" (
  	"key" varchar(128) PRIMARY KEY NOT NULL,
  	"window_start" timestamp(3) with time zone NOT NULL,
  	"hits" integer NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "form_rate_limits_window_start_idx" ON "form_rate_limits" USING btree ("window_start");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "form_rate_limits";`)
}
