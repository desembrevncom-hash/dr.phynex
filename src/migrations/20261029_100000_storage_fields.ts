import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
    ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
    ALTER TABLE "source_documents" ADD COLUMN "prefix" varchar DEFAULT 'source-documents';
    ALTER TABLE "source_documents" ADD COLUMN "_objectkey" varchar;`)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN "prefix", DROP COLUMN "_objectkey";
    ALTER TABLE "source_documents" DROP COLUMN "prefix", DROP COLUMN "_objectkey";`)
}
