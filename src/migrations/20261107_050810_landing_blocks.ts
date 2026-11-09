import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lp_hero_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_band_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_split_image_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_lp_split_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_points_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_ingr_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_details_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_faq_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum_lp_cta_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_hero_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_band_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_split_v_image_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__lp_split_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_points_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_ingr_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_details_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_faq_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TYPE "public"."enum__lp_cta_v_tone" AS ENUM('light', 'muted', 'dark', 'accent');
  CREATE TABLE "lp_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"show_pack" boolean DEFAULT true,
  	"tone" "enum_lp_hero_tone" DEFAULT 'muted',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_hero_locales" (
  	"tagline" varchar,
  	"intro" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"tone" "enum_lp_band_tone" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_band_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_split" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"image_side" "enum_lp_split_image_side" DEFAULT 'left',
  	"tone" "enum_lp_split_tone" DEFAULT 'light',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_split_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_points_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "lp_points_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum_lp_points_tone" DEFAULT 'muted',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_points_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_ingr_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ingredient_id" integer,
  	"image_id" integer,
  	"source_note" varchar
  );
  
  CREATE TABLE "lp_ingr_items_locales" (
  	"name" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_ingr" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum_lp_ingr_tone" DEFAULT 'light',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_ingr_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"show_pack" boolean DEFAULT true,
  	"show_inci" boolean DEFAULT true,
  	"show_how_to_use" boolean DEFAULT true,
  	"show_cautions" boolean DEFAULT true,
  	"tone" "enum_lp_details_tone" DEFAULT 'light',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_details_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "lp_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum_lp_faq_tone" DEFAULT 'light',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "lp_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum_lp_cta_tone" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "lp_cta_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_lp_hero_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"show_pack" boolean DEFAULT true,
  	"tone" "enum__lp_hero_v_tone" DEFAULT 'muted',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_hero_v_locales" (
  	"tagline" varchar,
  	"intro" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_band_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"tone" "enum__lp_band_v_tone" DEFAULT 'dark',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_band_v_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_split_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"image_id" integer,
  	"image_side" "enum__lp_split_v_image_side" DEFAULT 'left',
  	"tone" "enum__lp_split_v_tone" DEFAULT 'light',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_split_v_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_points_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_lp_points_items_v_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_points_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum__lp_points_v_tone" DEFAULT 'muted',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_points_v_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_ingr_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ingredient_id" integer,
  	"image_id" integer,
  	"source_note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_lp_ingr_items_v_locales" (
  	"name" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_ingr_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum__lp_ingr_v_tone" DEFAULT 'light',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_ingr_v_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_details_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"show_pack" boolean DEFAULT true,
  	"show_inci" boolean DEFAULT true,
  	"show_how_to_use" boolean DEFAULT true,
  	"show_cautions" boolean DEFAULT true,
  	"tone" "enum__lp_details_v_tone" DEFAULT 'light',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_details_v_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_faq_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_lp_faq_items_v_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_faq_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum__lp_faq_v_tone" DEFAULT 'light',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_faq_v_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lp_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"tone" "enum__lp_cta_v_tone" DEFAULT 'dark',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_lp_cta_v_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "lp_hero" ADD CONSTRAINT "lp_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_hero" ADD CONSTRAINT "lp_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_hero_locales" ADD CONSTRAINT "lp_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_band" ADD CONSTRAINT "lp_band_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_band" ADD CONSTRAINT "lp_band_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_band" ADD CONSTRAINT "lp_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_band_locales" ADD CONSTRAINT "lp_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_split" ADD CONSTRAINT "lp_split_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_split" ADD CONSTRAINT "lp_split_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_split_locales" ADD CONSTRAINT "lp_split_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_points_items" ADD CONSTRAINT "lp_points_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_points_items_locales" ADD CONSTRAINT "lp_points_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_points_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_points" ADD CONSTRAINT "lp_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_points_locales" ADD CONSTRAINT "lp_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_ingr_items" ADD CONSTRAINT "lp_ingr_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_ingr_items" ADD CONSTRAINT "lp_ingr_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lp_ingr_items" ADD CONSTRAINT "lp_ingr_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_ingr"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_ingr_items_locales" ADD CONSTRAINT "lp_ingr_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_ingr_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_ingr" ADD CONSTRAINT "lp_ingr_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_ingr_locales" ADD CONSTRAINT "lp_ingr_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_ingr"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_details" ADD CONSTRAINT "lp_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_details_locales" ADD CONSTRAINT "lp_details_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_faq_items" ADD CONSTRAINT "lp_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_faq_items_locales" ADD CONSTRAINT "lp_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_faq" ADD CONSTRAINT "lp_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_faq_locales" ADD CONSTRAINT "lp_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_cta" ADD CONSTRAINT "lp_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lp_cta_locales" ADD CONSTRAINT "lp_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lp_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_hero_v" ADD CONSTRAINT "_lp_hero_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_hero_v" ADD CONSTRAINT "_lp_hero_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_hero_v_locales" ADD CONSTRAINT "_lp_hero_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_band_v" ADD CONSTRAINT "_lp_band_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_band_v" ADD CONSTRAINT "_lp_band_v_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_band_v" ADD CONSTRAINT "_lp_band_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_band_v_locales" ADD CONSTRAINT "_lp_band_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_band_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_split_v" ADD CONSTRAINT "_lp_split_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_split_v" ADD CONSTRAINT "_lp_split_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_split_v_locales" ADD CONSTRAINT "_lp_split_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_split_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_points_items_v" ADD CONSTRAINT "_lp_points_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_points_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_points_items_v_locales" ADD CONSTRAINT "_lp_points_items_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_points_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_points_v" ADD CONSTRAINT "_lp_points_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_points_v_locales" ADD CONSTRAINT "_lp_points_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_points_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_ingr_items_v" ADD CONSTRAINT "_lp_ingr_items_v_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_ingr_items_v" ADD CONSTRAINT "_lp_ingr_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_lp_ingr_items_v" ADD CONSTRAINT "_lp_ingr_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_ingr_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_ingr_items_v_locales" ADD CONSTRAINT "_lp_ingr_items_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_ingr_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_ingr_v" ADD CONSTRAINT "_lp_ingr_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_ingr_v_locales" ADD CONSTRAINT "_lp_ingr_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_ingr_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_details_v" ADD CONSTRAINT "_lp_details_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_details_v_locales" ADD CONSTRAINT "_lp_details_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_details_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_faq_items_v" ADD CONSTRAINT "_lp_faq_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_faq_items_v_locales" ADD CONSTRAINT "_lp_faq_items_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_faq_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_faq_v" ADD CONSTRAINT "_lp_faq_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_faq_v_locales" ADD CONSTRAINT "_lp_faq_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_cta_v" ADD CONSTRAINT "_lp_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lp_cta_v_locales" ADD CONSTRAINT "_lp_cta_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lp_cta_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "lp_hero_order_idx" ON "lp_hero" USING btree ("_order");
  CREATE INDEX "lp_hero_parent_id_idx" ON "lp_hero" USING btree ("_parent_id");
  CREATE INDEX "lp_hero_path_idx" ON "lp_hero" USING btree ("_path");
  CREATE INDEX "lp_hero_image_idx" ON "lp_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "lp_hero_locales_locale_parent_id_unique" ON "lp_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_hero_locales_parent_id_idx" ON "lp_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_band_order_idx" ON "lp_band" USING btree ("_order");
  CREATE INDEX "lp_band_parent_id_idx" ON "lp_band" USING btree ("_parent_id");
  CREATE INDEX "lp_band_path_idx" ON "lp_band" USING btree ("_path");
  CREATE INDEX "lp_band_image_idx" ON "lp_band" USING btree ("image_id");
  CREATE INDEX "lp_band_mobile_image_idx" ON "lp_band" USING btree ("mobile_image_id");
  CREATE UNIQUE INDEX "lp_band_locales_locale_parent_id_unique" ON "lp_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_band_locales_parent_id_idx" ON "lp_band_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_split_order_idx" ON "lp_split" USING btree ("_order");
  CREATE INDEX "lp_split_parent_id_idx" ON "lp_split" USING btree ("_parent_id");
  CREATE INDEX "lp_split_path_idx" ON "lp_split" USING btree ("_path");
  CREATE INDEX "lp_split_image_idx" ON "lp_split" USING btree ("image_id");
  CREATE UNIQUE INDEX "lp_split_locales_locale_parent_id_unique" ON "lp_split_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_split_locales_parent_id_idx" ON "lp_split_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_points_items_order_idx" ON "lp_points_items" USING btree ("_order");
  CREATE INDEX "lp_points_items_parent_id_idx" ON "lp_points_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "lp_points_items_locales_locale_parent_id_unique" ON "lp_points_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_points_items_locales_parent_id_idx" ON "lp_points_items_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_points_order_idx" ON "lp_points" USING btree ("_order");
  CREATE INDEX "lp_points_parent_id_idx" ON "lp_points" USING btree ("_parent_id");
  CREATE INDEX "lp_points_path_idx" ON "lp_points" USING btree ("_path");
  CREATE UNIQUE INDEX "lp_points_locales_locale_parent_id_unique" ON "lp_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_points_locales_parent_id_idx" ON "lp_points_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_ingr_items_order_idx" ON "lp_ingr_items" USING btree ("_order");
  CREATE INDEX "lp_ingr_items_parent_id_idx" ON "lp_ingr_items" USING btree ("_parent_id");
  CREATE INDEX "lp_ingr_items_ingredient_idx" ON "lp_ingr_items" USING btree ("ingredient_id");
  CREATE INDEX "lp_ingr_items_image_idx" ON "lp_ingr_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "lp_ingr_items_locales_locale_parent_id_unique" ON "lp_ingr_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_ingr_items_locales_parent_id_idx" ON "lp_ingr_items_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_ingr_order_idx" ON "lp_ingr" USING btree ("_order");
  CREATE INDEX "lp_ingr_parent_id_idx" ON "lp_ingr" USING btree ("_parent_id");
  CREATE INDEX "lp_ingr_path_idx" ON "lp_ingr" USING btree ("_path");
  CREATE UNIQUE INDEX "lp_ingr_locales_locale_parent_id_unique" ON "lp_ingr_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_ingr_locales_parent_id_idx" ON "lp_ingr_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_details_order_idx" ON "lp_details" USING btree ("_order");
  CREATE INDEX "lp_details_parent_id_idx" ON "lp_details" USING btree ("_parent_id");
  CREATE INDEX "lp_details_path_idx" ON "lp_details" USING btree ("_path");
  CREATE UNIQUE INDEX "lp_details_locales_locale_parent_id_unique" ON "lp_details_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_details_locales_parent_id_idx" ON "lp_details_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_faq_items_order_idx" ON "lp_faq_items" USING btree ("_order");
  CREATE INDEX "lp_faq_items_parent_id_idx" ON "lp_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "lp_faq_items_locales_locale_parent_id_unique" ON "lp_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_faq_items_locales_parent_id_idx" ON "lp_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_faq_order_idx" ON "lp_faq" USING btree ("_order");
  CREATE INDEX "lp_faq_parent_id_idx" ON "lp_faq" USING btree ("_parent_id");
  CREATE INDEX "lp_faq_path_idx" ON "lp_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "lp_faq_locales_locale_parent_id_unique" ON "lp_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_faq_locales_parent_id_idx" ON "lp_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "lp_cta_order_idx" ON "lp_cta" USING btree ("_order");
  CREATE INDEX "lp_cta_parent_id_idx" ON "lp_cta" USING btree ("_parent_id");
  CREATE INDEX "lp_cta_path_idx" ON "lp_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "lp_cta_locales_locale_parent_id_unique" ON "lp_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "lp_cta_locales_parent_id_idx" ON "lp_cta_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_hero_v_order_idx" ON "_lp_hero_v" USING btree ("_order");
  CREATE INDEX "_lp_hero_v_parent_id_idx" ON "_lp_hero_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_hero_v_path_idx" ON "_lp_hero_v" USING btree ("_path");
  CREATE INDEX "_lp_hero_v_image_idx" ON "_lp_hero_v" USING btree ("image_id");
  CREATE UNIQUE INDEX "_lp_hero_v_locales_locale_parent_id_unique" ON "_lp_hero_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_hero_v_locales_parent_id_idx" ON "_lp_hero_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_band_v_order_idx" ON "_lp_band_v" USING btree ("_order");
  CREATE INDEX "_lp_band_v_parent_id_idx" ON "_lp_band_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_band_v_path_idx" ON "_lp_band_v" USING btree ("_path");
  CREATE INDEX "_lp_band_v_image_idx" ON "_lp_band_v" USING btree ("image_id");
  CREATE INDEX "_lp_band_v_mobile_image_idx" ON "_lp_band_v" USING btree ("mobile_image_id");
  CREATE UNIQUE INDEX "_lp_band_v_locales_locale_parent_id_unique" ON "_lp_band_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_band_v_locales_parent_id_idx" ON "_lp_band_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_split_v_order_idx" ON "_lp_split_v" USING btree ("_order");
  CREATE INDEX "_lp_split_v_parent_id_idx" ON "_lp_split_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_split_v_path_idx" ON "_lp_split_v" USING btree ("_path");
  CREATE INDEX "_lp_split_v_image_idx" ON "_lp_split_v" USING btree ("image_id");
  CREATE UNIQUE INDEX "_lp_split_v_locales_locale_parent_id_unique" ON "_lp_split_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_split_v_locales_parent_id_idx" ON "_lp_split_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_points_items_v_order_idx" ON "_lp_points_items_v" USING btree ("_order");
  CREATE INDEX "_lp_points_items_v_parent_id_idx" ON "_lp_points_items_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_lp_points_items_v_locales_locale_parent_id_unique" ON "_lp_points_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_points_items_v_locales_parent_id_idx" ON "_lp_points_items_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_points_v_order_idx" ON "_lp_points_v" USING btree ("_order");
  CREATE INDEX "_lp_points_v_parent_id_idx" ON "_lp_points_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_points_v_path_idx" ON "_lp_points_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_lp_points_v_locales_locale_parent_id_unique" ON "_lp_points_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_points_v_locales_parent_id_idx" ON "_lp_points_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_ingr_items_v_order_idx" ON "_lp_ingr_items_v" USING btree ("_order");
  CREATE INDEX "_lp_ingr_items_v_parent_id_idx" ON "_lp_ingr_items_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_ingr_items_v_ingredient_idx" ON "_lp_ingr_items_v" USING btree ("ingredient_id");
  CREATE INDEX "_lp_ingr_items_v_image_idx" ON "_lp_ingr_items_v" USING btree ("image_id");
  CREATE UNIQUE INDEX "_lp_ingr_items_v_locales_locale_parent_id_unique" ON "_lp_ingr_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_ingr_items_v_locales_parent_id_idx" ON "_lp_ingr_items_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_ingr_v_order_idx" ON "_lp_ingr_v" USING btree ("_order");
  CREATE INDEX "_lp_ingr_v_parent_id_idx" ON "_lp_ingr_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_ingr_v_path_idx" ON "_lp_ingr_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_lp_ingr_v_locales_locale_parent_id_unique" ON "_lp_ingr_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_ingr_v_locales_parent_id_idx" ON "_lp_ingr_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_details_v_order_idx" ON "_lp_details_v" USING btree ("_order");
  CREATE INDEX "_lp_details_v_parent_id_idx" ON "_lp_details_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_details_v_path_idx" ON "_lp_details_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_lp_details_v_locales_locale_parent_id_unique" ON "_lp_details_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_details_v_locales_parent_id_idx" ON "_lp_details_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_faq_items_v_order_idx" ON "_lp_faq_items_v" USING btree ("_order");
  CREATE INDEX "_lp_faq_items_v_parent_id_idx" ON "_lp_faq_items_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_lp_faq_items_v_locales_locale_parent_id_unique" ON "_lp_faq_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_faq_items_v_locales_parent_id_idx" ON "_lp_faq_items_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_faq_v_order_idx" ON "_lp_faq_v" USING btree ("_order");
  CREATE INDEX "_lp_faq_v_parent_id_idx" ON "_lp_faq_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_faq_v_path_idx" ON "_lp_faq_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_lp_faq_v_locales_locale_parent_id_unique" ON "_lp_faq_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_faq_v_locales_parent_id_idx" ON "_lp_faq_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_lp_cta_v_order_idx" ON "_lp_cta_v" USING btree ("_order");
  CREATE INDEX "_lp_cta_v_parent_id_idx" ON "_lp_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_lp_cta_v_path_idx" ON "_lp_cta_v" USING btree ("_path");
  CREATE UNIQUE INDEX "_lp_cta_v_locales_locale_parent_id_unique" ON "_lp_cta_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_lp_cta_v_locales_parent_id_idx" ON "_lp_cta_v_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "lp_hero" CASCADE;
  DROP TABLE "lp_hero_locales" CASCADE;
  DROP TABLE "lp_band" CASCADE;
  DROP TABLE "lp_band_locales" CASCADE;
  DROP TABLE "lp_split" CASCADE;
  DROP TABLE "lp_split_locales" CASCADE;
  DROP TABLE "lp_points_items" CASCADE;
  DROP TABLE "lp_points_items_locales" CASCADE;
  DROP TABLE "lp_points" CASCADE;
  DROP TABLE "lp_points_locales" CASCADE;
  DROP TABLE "lp_ingr_items" CASCADE;
  DROP TABLE "lp_ingr_items_locales" CASCADE;
  DROP TABLE "lp_ingr" CASCADE;
  DROP TABLE "lp_ingr_locales" CASCADE;
  DROP TABLE "lp_details" CASCADE;
  DROP TABLE "lp_details_locales" CASCADE;
  DROP TABLE "lp_faq_items" CASCADE;
  DROP TABLE "lp_faq_items_locales" CASCADE;
  DROP TABLE "lp_faq" CASCADE;
  DROP TABLE "lp_faq_locales" CASCADE;
  DROP TABLE "lp_cta" CASCADE;
  DROP TABLE "lp_cta_locales" CASCADE;
  DROP TABLE "_lp_hero_v" CASCADE;
  DROP TABLE "_lp_hero_v_locales" CASCADE;
  DROP TABLE "_lp_band_v" CASCADE;
  DROP TABLE "_lp_band_v_locales" CASCADE;
  DROP TABLE "_lp_split_v" CASCADE;
  DROP TABLE "_lp_split_v_locales" CASCADE;
  DROP TABLE "_lp_points_items_v" CASCADE;
  DROP TABLE "_lp_points_items_v_locales" CASCADE;
  DROP TABLE "_lp_points_v" CASCADE;
  DROP TABLE "_lp_points_v_locales" CASCADE;
  DROP TABLE "_lp_ingr_items_v" CASCADE;
  DROP TABLE "_lp_ingr_items_v_locales" CASCADE;
  DROP TABLE "_lp_ingr_v" CASCADE;
  DROP TABLE "_lp_ingr_v_locales" CASCADE;
  DROP TABLE "_lp_details_v" CASCADE;
  DROP TABLE "_lp_details_v_locales" CASCADE;
  DROP TABLE "_lp_faq_items_v" CASCADE;
  DROP TABLE "_lp_faq_items_v_locales" CASCADE;
  DROP TABLE "_lp_faq_v" CASCADE;
  DROP TABLE "_lp_faq_v_locales" CASCADE;
  DROP TABLE "_lp_cta_v" CASCADE;
  DROP TABLE "_lp_cta_v_locales" CASCADE;
  DROP TYPE "public"."enum_lp_hero_tone";
  DROP TYPE "public"."enum_lp_band_tone";
  DROP TYPE "public"."enum_lp_split_image_side";
  DROP TYPE "public"."enum_lp_split_tone";
  DROP TYPE "public"."enum_lp_points_tone";
  DROP TYPE "public"."enum_lp_ingr_tone";
  DROP TYPE "public"."enum_lp_details_tone";
  DROP TYPE "public"."enum_lp_faq_tone";
  DROP TYPE "public"."enum_lp_cta_tone";
  DROP TYPE "public"."enum__lp_hero_v_tone";
  DROP TYPE "public"."enum__lp_band_v_tone";
  DROP TYPE "public"."enum__lp_split_v_image_side";
  DROP TYPE "public"."enum__lp_split_v_tone";
  DROP TYPE "public"."enum__lp_points_v_tone";
  DROP TYPE "public"."enum__lp_ingr_v_tone";
  DROP TYPE "public"."enum__lp_details_v_tone";
  DROP TYPE "public"."enum__lp_faq_v_tone";
  DROP TYPE "public"."enum__lp_cta_v_tone";`)
}
