import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "landing_approvals" jsonb;
  ALTER TABLE "_products_v" ADD COLUMN "version_landing_approvals" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "landing_approvals";
  ALTER TABLE "_products_v" DROP COLUMN "version_landing_approvals";`)
}
