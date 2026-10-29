import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_accent" AS ENUM('navy', 'rx-red', 'mx-cyan', 'mx-pink');
  CREATE TYPE "public"."enum__products_v_version_accent" AS ENUM('navy', 'rx-red', 'mx-cyan', 'mx-pink');
  CREATE TYPE "public"."enum_product_lines_appearance" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum__product_lines_v_version_appearance" AS ENUM('light', 'dark');
  ALTER TABLE "products" ADD COLUMN "accent" "enum_products_accent" DEFAULT 'navy';
  ALTER TABLE "_products_v" ADD COLUMN "version_accent" "enum__products_v_version_accent" DEFAULT 'navy';
  ALTER TABLE "product_lines" ADD COLUMN "appearance" "enum_product_lines_appearance" DEFAULT 'light';
  ALTER TABLE "_product_lines_v" ADD COLUMN "version_appearance" "enum__product_lines_v_version_appearance" DEFAULT 'light';
  ALTER TABLE "media" ADD COLUMN "public_release" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "review_note" varchar;
  CREATE INDEX "media_public_release_idx" ON "media" USING btree ("public_release");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_public_release_idx";
  ALTER TABLE "products" DROP COLUMN "accent";
  ALTER TABLE "_products_v" DROP COLUMN "version_accent";
  ALTER TABLE "product_lines" DROP COLUMN "appearance";
  ALTER TABLE "_product_lines_v" DROP COLUMN "version_appearance";
  ALTER TABLE "media" DROP COLUMN "public_release";
  ALTER TABLE "media" DROP COLUMN "review_note";
  DROP TYPE "public"."enum_products_accent";
  DROP TYPE "public"."enum__products_v_version_accent";
  DROP TYPE "public"."enum_product_lines_appearance";
  DROP TYPE "public"."enum__product_lines_v_version_appearance";`)
}
