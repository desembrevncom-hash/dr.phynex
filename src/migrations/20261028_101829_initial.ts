import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum_products_skin_types" AS ENUM('dry', 'oily', 'combination', 'normal', 'sensitive');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_products_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__products_v_version_skin_types" AS ENUM('dry', 'oily', 'combination', 'normal', 'sensitive');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__products_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_product_lines_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_product_lines_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__product_lines_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__product_lines_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__product_lines_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_product_categories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_product_categories_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__product_categories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__product_categories_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__product_categories_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_skin_concerns_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_skin_concerns_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__skin_concerns_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__skin_concerns_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__skin_concerns_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_ingredients_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_ingredients_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__ingredients_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__ingredients_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__ingredients_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_technologies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_technologies_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__technologies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__technologies_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__technologies_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_articles_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__articles_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_journal_topics_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_journal_topics_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__journal_topics_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__journal_topics_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__journal_topics_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_stores_type" AS ENUM('store', 'distributor', 'other');
  CREATE TYPE "public"."enum_stores_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_stores_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__stores_v_version_type" AS ENUM('store', 'distributor', 'other');
  CREATE TYPE "public"."enum__stores_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stores_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__stores_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_legal_pages_slug" AS ENUM('privacy', 'terms');
  CREATE TYPE "public"."enum_legal_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_legal_pages_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__legal_pages_v_version_slug" AS ENUM('privacy', 'terms');
  CREATE TYPE "public"."enum__legal_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_pages_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__legal_pages_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_contact_submissions_topic" AS ENUM('product', 'store', 'other');
  CREATE TYPE "public"."enum_contact_submissions_status" AS ENUM('new', 'in-progress', 'closed');
  CREATE TYPE "public"."enum_contact_submissions_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum_partner_inquiries_business_type" AS ENUM('distributor', 'retailer', 'spa-clinic', 'online', 'other');
  CREATE TYPE "public"."enum_partner_inquiries_status" AS ENUM('new', 'in-progress', 'closed');
  CREATE TYPE "public"."enum_partner_inquiries_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'translator');
  CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_home_page_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__home_page_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_brand_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_brand_page_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__brand_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__brand_page_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__brand_page_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_partnership_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_partnership_page_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__partnership_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__partnership_page_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__partnership_page_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum_site_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_site_settings_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TYPE "public"."enum__site_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__site_settings_v_published_locale" AS ENUM('ko', 'en', 'vi');
  CREATE TYPE "public"."enum__site_settings_v_version_translation_status" AS ENUM('ai-draft', 'in-review', 'approved');
  CREATE TABLE "products_claims" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"source_document" varchar,
  	"source_file_id" integer,
  	"source_note" varchar
  );
  
  CREATE TABLE "products_skin_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_skin_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inci" varchar,
  	"line_id" integer,
  	"sku" varchar,
  	"volume" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_locales" (
  	"name" varchar,
  	"short_description" varchar,
  	"description" jsonb,
  	"how_to_use" jsonb,
  	"cautions" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_products_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"ingredients_id" integer,
  	"technologies_id" integer,
  	"product_categories_id" integer,
  	"skin_concerns_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "_products_v_version_claims" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"source_document" varchar,
  	"source_file_id" integer,
  	"source_note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_skin_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_skin_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_inci" varchar,
  	"version_line_id" integer,
  	"version_sku" varchar,
  	"version_volume" varchar,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__products_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_locales" (
  	"version_name" varchar,
  	"version_short_description" varchar,
  	"version_description" jsonb,
  	"version_how_to_use" jsonb,
  	"version_cautions" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__products_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"ingredients_id" integer,
  	"technologies_id" integer,
  	"product_categories_id" integer,
  	"skin_concerns_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "product_lines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_image_id" integer,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_product_lines_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "product_lines_locales" (
  	"name" varchar,
  	"description" varchar,
  	"translation_status" "enum_product_lines_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_product_lines_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_hero_image_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__product_lines_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__product_lines_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_product_lines_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"version_translation_status" "enum__product_lines_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "product_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_product_categories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "product_categories_locales" (
  	"name" varchar,
  	"translation_status" "enum_product_categories_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_product_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__product_categories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__product_categories_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_product_categories_v_locales" (
  	"version_name" varchar,
  	"version_translation_status" "enum__product_categories_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "skin_concerns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_skin_concerns_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "skin_concerns_locales" (
  	"name" varchar,
  	"translation_status" "enum_skin_concerns_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_skin_concerns_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__skin_concerns_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__skin_concerns_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_skin_concerns_v_locales" (
  	"version_name" varchar,
  	"version_translation_status" "enum__skin_concerns_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "ingredients_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"file_id" integer,
  	"note" varchar
  );
  
  CREATE TABLE "ingredients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inci_name" varchar,
  	"image_id" integer,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_ingredients_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ingredients_locales" (
  	"name" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_ingredients_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ingredients_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"file_id" integer,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ingredients_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_inci_name" varchar,
  	"version_image_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__ingredients_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__ingredients_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_ingredients_v_locales" (
  	"version_name" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__ingredients_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "technologies_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"file_id" integer,
  	"note" varchar
  );
  
  CREATE TABLE "technologies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_technologies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "technologies_locales" (
  	"name" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_technologies_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_technologies_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"file_id" integer,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_technologies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_image_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__technologies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__technologies_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_technologies_v_locales" (
  	"version_name" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__technologies_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cover_id" integer,
  	"topic_id" integer,
  	"author" varchar,
  	"published_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_articles_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_cover_id" integer,
  	"version_topic_id" integer,
  	"version_author" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__articles_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "journal_topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_journal_topics_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "journal_topics_locales" (
  	"name" varchar,
  	"translation_status" "enum_journal_topics_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_journal_topics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__journal_topics_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__journal_topics_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_journal_topics_v_locales" (
  	"version_name" varchar,
  	"version_translation_status" "enum__journal_topics_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "stores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_stores_type" DEFAULT 'store',
  	"country" varchar,
  	"phone" varchar,
  	"url" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_stores_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "stores_locales" (
  	"name" varchar,
  	"city" varchar,
  	"address" varchar,
  	"hours" varchar,
  	"translation_status" "enum_stores_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_stores_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_type" "enum__stores_v_version_type" DEFAULT 'store',
  	"version_country" varchar,
  	"version_phone" varchar,
  	"version_url" varchar,
  	"version_lat" numeric,
  	"version_lng" numeric,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__stores_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__stores_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_stores_v_locales" (
  	"version_name" varchar,
  	"version_city" varchar,
  	"version_address" varchar,
  	"version_hours" varchar,
  	"version_translation_status" "enum__stores_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "legal_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" "enum_legal_pages_slug",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_legal_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "legal_pages_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"translation_status" "enum_legal_pages_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_legal_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" "enum__legal_pages_v_version_slug",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__legal_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__legal_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_legal_pages_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_translation_status" "enum__legal_pages_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "source_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "contact_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"topic" "enum_contact_submissions_topic",
  	"message" varchar NOT NULL,
  	"status" "enum_contact_submissions_status" DEFAULT 'new',
  	"locale" "enum_contact_submissions_locale",
  	"consent" boolean DEFAULT false NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partner_inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"country" varchar NOT NULL,
  	"business_type" "enum_partner_inquiries_business_type" NOT NULL,
  	"channels" varchar,
  	"message" varchar NOT NULL,
  	"status" "enum_partner_inquiries_status" DEFAULT 'new',
  	"locale" "enum_partner_inquiries_locale",
  	"consent" boolean DEFAULT false NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"product_lines_id" integer,
  	"product_categories_id" integer,
  	"skin_concerns_id" integer,
  	"ingredients_id" integer,
  	"technologies_id" integer,
  	"articles_id" integer,
  	"journal_topics_id" integer,
  	"stores_id" integer,
  	"legal_pages_id" integer,
  	"media_id" integer,
  	"source_documents_id" integer,
  	"contact_submissions_id" integer,
  	"partner_inquiries_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_image_id" integer,
  	"_status" "enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_locales" (
  	"headline" varchar,
  	"intro" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_home_page_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"ingredients_id" integer
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_image_id" integer,
  	"version__status" "enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_page_v_locales" (
  	"version_headline" varchar,
  	"version_intro" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__home_page_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"ingredients_id" integer
  );
  
  CREATE TABLE "brand_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_brand_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "brand_page_locales" (
  	"title" varchar,
  	"intro" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_brand_page_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_brand_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__brand_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__brand_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_brand_page_v_locales" (
  	"version_title" varchar,
  	"version_intro" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__brand_page_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "partnership_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_partnership_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "partnership_page_locales" (
  	"title" varchar,
  	"intro" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_partnership_page_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_partnership_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__partnership_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__partnership_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_partnership_page_v_locales" (
  	"version_title" varchar,
  	"version_intro" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__partnership_page_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site_settings_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"_status" "enum_site_settings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"contact_address" varchar,
  	"contact_hours" varchar,
  	"translation_status" "enum_site_settings_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_logo_id" integer,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version__status" "enum__site_settings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__site_settings_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_site_settings_v_locales" (
  	"version_contact_address" varchar,
  	"version_contact_hours" varchar,
  	"version_translation_status" "enum__site_settings_v_version_translation_status" DEFAULT 'in-review',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products_claims" ADD CONSTRAINT "products_claims_source_file_id_source_documents_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_claims" ADD CONSTRAINT "products_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_skin_types" ADD CONSTRAINT "products_skin_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_line_id_product_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_lines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_ingredients_fk" FOREIGN KEY ("ingredients_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_technologies_fk" FOREIGN KEY ("technologies_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_skin_concerns_fk" FOREIGN KEY ("skin_concerns_id") REFERENCES "public"."skin_concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_claims" ADD CONSTRAINT "_products_v_version_claims_source_file_id_source_documents_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_claims" ADD CONSTRAINT "_products_v_version_claims_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_skin_types" ADD CONSTRAINT "_products_v_version_skin_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_line_id_product_lines_id_fk" FOREIGN KEY ("version_line_id") REFERENCES "public"."product_lines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_ingredients_fk" FOREIGN KEY ("ingredients_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_technologies_fk" FOREIGN KEY ("technologies_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_skin_concerns_fk" FOREIGN KEY ("skin_concerns_id") REFERENCES "public"."skin_concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_lines" ADD CONSTRAINT "product_lines_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_lines_locales" ADD CONSTRAINT "product_lines_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_product_lines_v" ADD CONSTRAINT "_product_lines_v_parent_id_product_lines_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_lines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_lines_v" ADD CONSTRAINT "_product_lines_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_lines_v_locales" ADD CONSTRAINT "_product_lines_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_product_lines_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_categories_locales" ADD CONSTRAINT "product_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_product_categories_v" ADD CONSTRAINT "_product_categories_v_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_categories_v_locales" ADD CONSTRAINT "_product_categories_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_product_categories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "skin_concerns_locales" ADD CONSTRAINT "skin_concerns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."skin_concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_skin_concerns_v" ADD CONSTRAINT "_skin_concerns_v_parent_id_skin_concerns_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."skin_concerns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_skin_concerns_v_locales" ADD CONSTRAINT "_skin_concerns_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_skin_concerns_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ingredients_sources" ADD CONSTRAINT "ingredients_sources_file_id_source_documents_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ingredients_sources" ADD CONSTRAINT "ingredients_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ingredients_locales" ADD CONSTRAINT "ingredients_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ingredients_v_version_sources" ADD CONSTRAINT "_ingredients_v_version_sources_file_id_source_documents_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ingredients_v_version_sources" ADD CONSTRAINT "_ingredients_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ingredients_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ingredients_v" ADD CONSTRAINT "_ingredients_v_parent_id_ingredients_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ingredients_v" ADD CONSTRAINT "_ingredients_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ingredients_v_locales" ADD CONSTRAINT "_ingredients_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ingredients_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "technologies_sources" ADD CONSTRAINT "technologies_sources_file_id_source_documents_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "technologies_sources" ADD CONSTRAINT "technologies_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "technologies" ADD CONSTRAINT "technologies_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "technologies_locales" ADD CONSTRAINT "technologies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_technologies_v_version_sources" ADD CONSTRAINT "_technologies_v_version_sources_file_id_source_documents_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_technologies_v_version_sources" ADD CONSTRAINT "_technologies_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_technologies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_technologies_v" ADD CONSTRAINT "_technologies_v_parent_id_technologies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."technologies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_technologies_v" ADD CONSTRAINT "_technologies_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_technologies_v_locales" ADD CONSTRAINT "_technologies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_technologies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_topic_id_journal_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."journal_topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_topic_id_journal_topics_id_fk" FOREIGN KEY ("version_topic_id") REFERENCES "public"."journal_topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "journal_topics_locales" ADD CONSTRAINT "journal_topics_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."journal_topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_journal_topics_v" ADD CONSTRAINT "_journal_topics_v_parent_id_journal_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."journal_topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_journal_topics_v_locales" ADD CONSTRAINT "_journal_topics_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_journal_topics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stores_locales" ADD CONSTRAINT "stores_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stores_v" ADD CONSTRAINT "_stores_v_parent_id_stores_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stores_v_locales" ADD CONSTRAINT "_stores_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stores_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_locales" ADD CONSTRAINT "legal_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legal_pages_v" ADD CONSTRAINT "_legal_pages_v_parent_id_legal_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_pages_v_locales" ADD CONSTRAINT "_legal_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legal_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_lines_fk" FOREIGN KEY ("product_lines_id") REFERENCES "public"."product_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_skin_concerns_fk" FOREIGN KEY ("skin_concerns_id") REFERENCES "public"."skin_concerns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ingredients_fk" FOREIGN KEY ("ingredients_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_technologies_fk" FOREIGN KEY ("technologies_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_journal_topics_fk" FOREIGN KEY ("journal_topics_id") REFERENCES "public"."journal_topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stores_fk" FOREIGN KEY ("stores_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_pages_fk" FOREIGN KEY ("legal_pages_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_documents_fk" FOREIGN KEY ("source_documents_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_submissions_fk" FOREIGN KEY ("contact_submissions_id") REFERENCES "public"."contact_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partner_inquiries_fk" FOREIGN KEY ("partner_inquiries_id") REFERENCES "public"."partner_inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_locales" ADD CONSTRAINT "home_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_ingredients_fk" FOREIGN KEY ("ingredients_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v" ADD CONSTRAINT "_home_page_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_locales" ADD CONSTRAINT "_home_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_ingredients_fk" FOREIGN KEY ("ingredients_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brand_page_locales" ADD CONSTRAINT "brand_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brand_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_brand_page_v_locales" ADD CONSTRAINT "_brand_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_brand_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partnership_page_locales" ADD CONSTRAINT "partnership_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."partnership_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_partnership_page_v_locales" ADD CONSTRAINT "_partnership_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_partnership_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social" ADD CONSTRAINT "site_settings_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_social" ADD CONSTRAINT "_site_settings_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_claims_order_idx" ON "products_claims" USING btree ("_order");
  CREATE INDEX "products_claims_parent_id_idx" ON "products_claims" USING btree ("_parent_id");
  CREATE INDEX "products_claims_locale_idx" ON "products_claims" USING btree ("_locale");
  CREATE INDEX "products_claims_source_file_idx" ON "products_claims" USING btree ("source_file_id");
  CREATE INDEX "products_skin_types_order_idx" ON "products_skin_types" USING btree ("order");
  CREATE INDEX "products_skin_types_parent_idx" ON "products_skin_types" USING btree ("parent_id");
  CREATE INDEX "products_line_idx" ON "products" USING btree ("line_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_translation_status_idx" ON "products_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_locales_parent_id_idx" ON "products_locales" USING btree ("_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_ingredients_id_idx" ON "products_rels" USING btree ("ingredients_id");
  CREATE INDEX "products_rels_technologies_id_idx" ON "products_rels" USING btree ("technologies_id");
  CREATE INDEX "products_rels_product_categories_id_idx" ON "products_rels" USING btree ("product_categories_id");
  CREATE INDEX "products_rels_skin_concerns_id_idx" ON "products_rels" USING btree ("skin_concerns_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "_products_v_version_claims_order_idx" ON "_products_v_version_claims" USING btree ("_order");
  CREATE INDEX "_products_v_version_claims_parent_id_idx" ON "_products_v_version_claims" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_claims_locale_idx" ON "_products_v_version_claims" USING btree ("_locale");
  CREATE INDEX "_products_v_version_claims_source_file_idx" ON "_products_v_version_claims" USING btree ("source_file_id");
  CREATE INDEX "_products_v_version_skin_types_order_idx" ON "_products_v_version_skin_types" USING btree ("order");
  CREATE INDEX "_products_v_version_skin_types_parent_idx" ON "_products_v_version_skin_types" USING btree ("parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_line_idx" ON "_products_v" USING btree ("version_line_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_version_version_translation_status_idx" ON "_products_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_locales_parent_id_idx" ON "_products_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_ingredients_id_idx" ON "_products_v_rels" USING btree ("ingredients_id");
  CREATE INDEX "_products_v_rels_technologies_id_idx" ON "_products_v_rels" USING btree ("technologies_id");
  CREATE INDEX "_products_v_rels_product_categories_id_idx" ON "_products_v_rels" USING btree ("product_categories_id");
  CREATE INDEX "_products_v_rels_skin_concerns_id_idx" ON "_products_v_rels" USING btree ("skin_concerns_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");
  CREATE INDEX "product_lines_hero_image_idx" ON "product_lines" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "product_lines_slug_idx" ON "product_lines" USING btree ("slug");
  CREATE INDEX "product_lines_updated_at_idx" ON "product_lines" USING btree ("updated_at");
  CREATE INDEX "product_lines_created_at_idx" ON "product_lines" USING btree ("created_at");
  CREATE INDEX "product_lines__status_idx" ON "product_lines" USING btree ("_status");
  CREATE INDEX "product_lines_translation_status_idx" ON "product_lines_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "product_lines_locales_locale_parent_id_unique" ON "product_lines_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "product_lines_locales_parent_id_idx" ON "product_lines_locales" USING btree ("_parent_id");
  CREATE INDEX "_product_lines_v_parent_idx" ON "_product_lines_v" USING btree ("parent_id");
  CREATE INDEX "_product_lines_v_version_version_hero_image_idx" ON "_product_lines_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_product_lines_v_version_version_slug_idx" ON "_product_lines_v" USING btree ("version_slug");
  CREATE INDEX "_product_lines_v_version_version_updated_at_idx" ON "_product_lines_v" USING btree ("version_updated_at");
  CREATE INDEX "_product_lines_v_version_version_created_at_idx" ON "_product_lines_v" USING btree ("version_created_at");
  CREATE INDEX "_product_lines_v_version_version__status_idx" ON "_product_lines_v" USING btree ("version__status");
  CREATE INDEX "_product_lines_v_created_at_idx" ON "_product_lines_v" USING btree ("created_at");
  CREATE INDEX "_product_lines_v_updated_at_idx" ON "_product_lines_v" USING btree ("updated_at");
  CREATE INDEX "_product_lines_v_snapshot_idx" ON "_product_lines_v" USING btree ("snapshot");
  CREATE INDEX "_product_lines_v_published_locale_idx" ON "_product_lines_v" USING btree ("published_locale");
  CREATE INDEX "_product_lines_v_latest_idx" ON "_product_lines_v" USING btree ("latest");
  CREATE INDEX "_product_lines_v_version_version_translation_status_idx" ON "_product_lines_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_product_lines_v_locales_locale_parent_id_unique" ON "_product_lines_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_product_lines_v_locales_parent_id_idx" ON "_product_lines_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "product_categories_slug_idx" ON "product_categories" USING btree ("slug");
  CREATE INDEX "product_categories_updated_at_idx" ON "product_categories" USING btree ("updated_at");
  CREATE INDEX "product_categories_created_at_idx" ON "product_categories" USING btree ("created_at");
  CREATE INDEX "product_categories__status_idx" ON "product_categories" USING btree ("_status");
  CREATE INDEX "product_categories_translation_status_idx" ON "product_categories_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "product_categories_locales_locale_parent_id_unique" ON "product_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "product_categories_locales_parent_id_idx" ON "product_categories_locales" USING btree ("_parent_id");
  CREATE INDEX "_product_categories_v_parent_idx" ON "_product_categories_v" USING btree ("parent_id");
  CREATE INDEX "_product_categories_v_version_version_slug_idx" ON "_product_categories_v" USING btree ("version_slug");
  CREATE INDEX "_product_categories_v_version_version_updated_at_idx" ON "_product_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_product_categories_v_version_version_created_at_idx" ON "_product_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_product_categories_v_version_version__status_idx" ON "_product_categories_v" USING btree ("version__status");
  CREATE INDEX "_product_categories_v_created_at_idx" ON "_product_categories_v" USING btree ("created_at");
  CREATE INDEX "_product_categories_v_updated_at_idx" ON "_product_categories_v" USING btree ("updated_at");
  CREATE INDEX "_product_categories_v_snapshot_idx" ON "_product_categories_v" USING btree ("snapshot");
  CREATE INDEX "_product_categories_v_published_locale_idx" ON "_product_categories_v" USING btree ("published_locale");
  CREATE INDEX "_product_categories_v_latest_idx" ON "_product_categories_v" USING btree ("latest");
  CREATE INDEX "_product_categories_v_version_version_translation_status_idx" ON "_product_categories_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_product_categories_v_locales_locale_parent_id_unique" ON "_product_categories_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_product_categories_v_locales_parent_id_idx" ON "_product_categories_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "skin_concerns_slug_idx" ON "skin_concerns" USING btree ("slug");
  CREATE INDEX "skin_concerns_updated_at_idx" ON "skin_concerns" USING btree ("updated_at");
  CREATE INDEX "skin_concerns_created_at_idx" ON "skin_concerns" USING btree ("created_at");
  CREATE INDEX "skin_concerns__status_idx" ON "skin_concerns" USING btree ("_status");
  CREATE INDEX "skin_concerns_translation_status_idx" ON "skin_concerns_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "skin_concerns_locales_locale_parent_id_unique" ON "skin_concerns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "skin_concerns_locales_parent_id_idx" ON "skin_concerns_locales" USING btree ("_parent_id");
  CREATE INDEX "_skin_concerns_v_parent_idx" ON "_skin_concerns_v" USING btree ("parent_id");
  CREATE INDEX "_skin_concerns_v_version_version_slug_idx" ON "_skin_concerns_v" USING btree ("version_slug");
  CREATE INDEX "_skin_concerns_v_version_version_updated_at_idx" ON "_skin_concerns_v" USING btree ("version_updated_at");
  CREATE INDEX "_skin_concerns_v_version_version_created_at_idx" ON "_skin_concerns_v" USING btree ("version_created_at");
  CREATE INDEX "_skin_concerns_v_version_version__status_idx" ON "_skin_concerns_v" USING btree ("version__status");
  CREATE INDEX "_skin_concerns_v_created_at_idx" ON "_skin_concerns_v" USING btree ("created_at");
  CREATE INDEX "_skin_concerns_v_updated_at_idx" ON "_skin_concerns_v" USING btree ("updated_at");
  CREATE INDEX "_skin_concerns_v_snapshot_idx" ON "_skin_concerns_v" USING btree ("snapshot");
  CREATE INDEX "_skin_concerns_v_published_locale_idx" ON "_skin_concerns_v" USING btree ("published_locale");
  CREATE INDEX "_skin_concerns_v_latest_idx" ON "_skin_concerns_v" USING btree ("latest");
  CREATE INDEX "_skin_concerns_v_version_version_translation_status_idx" ON "_skin_concerns_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_skin_concerns_v_locales_locale_parent_id_unique" ON "_skin_concerns_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_skin_concerns_v_locales_parent_id_idx" ON "_skin_concerns_v_locales" USING btree ("_parent_id");
  CREATE INDEX "ingredients_sources_order_idx" ON "ingredients_sources" USING btree ("_order");
  CREATE INDEX "ingredients_sources_parent_id_idx" ON "ingredients_sources" USING btree ("_parent_id");
  CREATE INDEX "ingredients_sources_file_idx" ON "ingredients_sources" USING btree ("file_id");
  CREATE INDEX "ingredients_image_idx" ON "ingredients" USING btree ("image_id");
  CREATE UNIQUE INDEX "ingredients_slug_idx" ON "ingredients" USING btree ("slug");
  CREATE INDEX "ingredients_updated_at_idx" ON "ingredients" USING btree ("updated_at");
  CREATE INDEX "ingredients_created_at_idx" ON "ingredients" USING btree ("created_at");
  CREATE INDEX "ingredients__status_idx" ON "ingredients" USING btree ("_status");
  CREATE INDEX "ingredients_translation_status_idx" ON "ingredients_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "ingredients_locales_locale_parent_id_unique" ON "ingredients_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ingredients_locales_parent_id_idx" ON "ingredients_locales" USING btree ("_parent_id");
  CREATE INDEX "_ingredients_v_version_sources_order_idx" ON "_ingredients_v_version_sources" USING btree ("_order");
  CREATE INDEX "_ingredients_v_version_sources_parent_id_idx" ON "_ingredients_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_ingredients_v_version_sources_file_idx" ON "_ingredients_v_version_sources" USING btree ("file_id");
  CREATE INDEX "_ingredients_v_parent_idx" ON "_ingredients_v" USING btree ("parent_id");
  CREATE INDEX "_ingredients_v_version_version_image_idx" ON "_ingredients_v" USING btree ("version_image_id");
  CREATE INDEX "_ingredients_v_version_version_slug_idx" ON "_ingredients_v" USING btree ("version_slug");
  CREATE INDEX "_ingredients_v_version_version_updated_at_idx" ON "_ingredients_v" USING btree ("version_updated_at");
  CREATE INDEX "_ingredients_v_version_version_created_at_idx" ON "_ingredients_v" USING btree ("version_created_at");
  CREATE INDEX "_ingredients_v_version_version__status_idx" ON "_ingredients_v" USING btree ("version__status");
  CREATE INDEX "_ingredients_v_created_at_idx" ON "_ingredients_v" USING btree ("created_at");
  CREATE INDEX "_ingredients_v_updated_at_idx" ON "_ingredients_v" USING btree ("updated_at");
  CREATE INDEX "_ingredients_v_snapshot_idx" ON "_ingredients_v" USING btree ("snapshot");
  CREATE INDEX "_ingredients_v_published_locale_idx" ON "_ingredients_v" USING btree ("published_locale");
  CREATE INDEX "_ingredients_v_latest_idx" ON "_ingredients_v" USING btree ("latest");
  CREATE INDEX "_ingredients_v_version_version_translation_status_idx" ON "_ingredients_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_ingredients_v_locales_locale_parent_id_unique" ON "_ingredients_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ingredients_v_locales_parent_id_idx" ON "_ingredients_v_locales" USING btree ("_parent_id");
  CREATE INDEX "technologies_sources_order_idx" ON "technologies_sources" USING btree ("_order");
  CREATE INDEX "technologies_sources_parent_id_idx" ON "technologies_sources" USING btree ("_parent_id");
  CREATE INDEX "technologies_sources_file_idx" ON "technologies_sources" USING btree ("file_id");
  CREATE INDEX "technologies_image_idx" ON "technologies" USING btree ("image_id");
  CREATE UNIQUE INDEX "technologies_slug_idx" ON "technologies" USING btree ("slug");
  CREATE INDEX "technologies_updated_at_idx" ON "technologies" USING btree ("updated_at");
  CREATE INDEX "technologies_created_at_idx" ON "technologies" USING btree ("created_at");
  CREATE INDEX "technologies__status_idx" ON "technologies" USING btree ("_status");
  CREATE INDEX "technologies_translation_status_idx" ON "technologies_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "technologies_locales_locale_parent_id_unique" ON "technologies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "technologies_locales_parent_id_idx" ON "technologies_locales" USING btree ("_parent_id");
  CREATE INDEX "_technologies_v_version_sources_order_idx" ON "_technologies_v_version_sources" USING btree ("_order");
  CREATE INDEX "_technologies_v_version_sources_parent_id_idx" ON "_technologies_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_technologies_v_version_sources_file_idx" ON "_technologies_v_version_sources" USING btree ("file_id");
  CREATE INDEX "_technologies_v_parent_idx" ON "_technologies_v" USING btree ("parent_id");
  CREATE INDEX "_technologies_v_version_version_image_idx" ON "_technologies_v" USING btree ("version_image_id");
  CREATE INDEX "_technologies_v_version_version_slug_idx" ON "_technologies_v" USING btree ("version_slug");
  CREATE INDEX "_technologies_v_version_version_updated_at_idx" ON "_technologies_v" USING btree ("version_updated_at");
  CREATE INDEX "_technologies_v_version_version_created_at_idx" ON "_technologies_v" USING btree ("version_created_at");
  CREATE INDEX "_technologies_v_version_version__status_idx" ON "_technologies_v" USING btree ("version__status");
  CREATE INDEX "_technologies_v_created_at_idx" ON "_technologies_v" USING btree ("created_at");
  CREATE INDEX "_technologies_v_updated_at_idx" ON "_technologies_v" USING btree ("updated_at");
  CREATE INDEX "_technologies_v_snapshot_idx" ON "_technologies_v" USING btree ("snapshot");
  CREATE INDEX "_technologies_v_published_locale_idx" ON "_technologies_v" USING btree ("published_locale");
  CREATE INDEX "_technologies_v_latest_idx" ON "_technologies_v" USING btree ("latest");
  CREATE INDEX "_technologies_v_version_version_translation_status_idx" ON "_technologies_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_technologies_v_locales_locale_parent_id_unique" ON "_technologies_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_technologies_v_locales_parent_id_idx" ON "_technologies_v_locales" USING btree ("_parent_id");
  CREATE INDEX "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX "articles_topic_idx" ON "articles" USING btree ("topic_id");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_translation_status_idx" ON "articles_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_locales_parent_id_idx" ON "articles_locales" USING btree ("_parent_id");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_products_id_idx" ON "articles_rels" USING btree ("products_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_cover_idx" ON "_articles_v" USING btree ("version_cover_id");
  CREATE INDEX "_articles_v_version_version_topic_idx" ON "_articles_v" USING btree ("version_topic_id");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_version_version_translation_status_idx" ON "_articles_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_locales_parent_id_idx" ON "_articles_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_products_id_idx" ON "_articles_v_rels" USING btree ("products_id");
  CREATE UNIQUE INDEX "journal_topics_slug_idx" ON "journal_topics" USING btree ("slug");
  CREATE INDEX "journal_topics_updated_at_idx" ON "journal_topics" USING btree ("updated_at");
  CREATE INDEX "journal_topics_created_at_idx" ON "journal_topics" USING btree ("created_at");
  CREATE INDEX "journal_topics__status_idx" ON "journal_topics" USING btree ("_status");
  CREATE INDEX "journal_topics_translation_status_idx" ON "journal_topics_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "journal_topics_locales_locale_parent_id_unique" ON "journal_topics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "journal_topics_locales_parent_id_idx" ON "journal_topics_locales" USING btree ("_parent_id");
  CREATE INDEX "_journal_topics_v_parent_idx" ON "_journal_topics_v" USING btree ("parent_id");
  CREATE INDEX "_journal_topics_v_version_version_slug_idx" ON "_journal_topics_v" USING btree ("version_slug");
  CREATE INDEX "_journal_topics_v_version_version_updated_at_idx" ON "_journal_topics_v" USING btree ("version_updated_at");
  CREATE INDEX "_journal_topics_v_version_version_created_at_idx" ON "_journal_topics_v" USING btree ("version_created_at");
  CREATE INDEX "_journal_topics_v_version_version__status_idx" ON "_journal_topics_v" USING btree ("version__status");
  CREATE INDEX "_journal_topics_v_created_at_idx" ON "_journal_topics_v" USING btree ("created_at");
  CREATE INDEX "_journal_topics_v_updated_at_idx" ON "_journal_topics_v" USING btree ("updated_at");
  CREATE INDEX "_journal_topics_v_snapshot_idx" ON "_journal_topics_v" USING btree ("snapshot");
  CREATE INDEX "_journal_topics_v_published_locale_idx" ON "_journal_topics_v" USING btree ("published_locale");
  CREATE INDEX "_journal_topics_v_latest_idx" ON "_journal_topics_v" USING btree ("latest");
  CREATE INDEX "_journal_topics_v_version_version_translation_status_idx" ON "_journal_topics_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_journal_topics_v_locales_locale_parent_id_unique" ON "_journal_topics_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_journal_topics_v_locales_parent_id_idx" ON "_journal_topics_v_locales" USING btree ("_parent_id");
  CREATE INDEX "stores_country_idx" ON "stores" USING btree ("country");
  CREATE INDEX "stores_updated_at_idx" ON "stores" USING btree ("updated_at");
  CREATE INDEX "stores_created_at_idx" ON "stores" USING btree ("created_at");
  CREATE INDEX "stores__status_idx" ON "stores" USING btree ("_status");
  CREATE INDEX "stores_translation_status_idx" ON "stores_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "stores_locales_locale_parent_id_unique" ON "stores_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stores_locales_parent_id_idx" ON "stores_locales" USING btree ("_parent_id");
  CREATE INDEX "_stores_v_parent_idx" ON "_stores_v" USING btree ("parent_id");
  CREATE INDEX "_stores_v_version_version_country_idx" ON "_stores_v" USING btree ("version_country");
  CREATE INDEX "_stores_v_version_version_updated_at_idx" ON "_stores_v" USING btree ("version_updated_at");
  CREATE INDEX "_stores_v_version_version_created_at_idx" ON "_stores_v" USING btree ("version_created_at");
  CREATE INDEX "_stores_v_version_version__status_idx" ON "_stores_v" USING btree ("version__status");
  CREATE INDEX "_stores_v_created_at_idx" ON "_stores_v" USING btree ("created_at");
  CREATE INDEX "_stores_v_updated_at_idx" ON "_stores_v" USING btree ("updated_at");
  CREATE INDEX "_stores_v_snapshot_idx" ON "_stores_v" USING btree ("snapshot");
  CREATE INDEX "_stores_v_published_locale_idx" ON "_stores_v" USING btree ("published_locale");
  CREATE INDEX "_stores_v_latest_idx" ON "_stores_v" USING btree ("latest");
  CREATE INDEX "_stores_v_version_version_translation_status_idx" ON "_stores_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_stores_v_locales_locale_parent_id_unique" ON "_stores_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_stores_v_locales_parent_id_idx" ON "_stores_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "legal_pages_slug_idx" ON "legal_pages" USING btree ("slug");
  CREATE INDEX "legal_pages_updated_at_idx" ON "legal_pages" USING btree ("updated_at");
  CREATE INDEX "legal_pages_created_at_idx" ON "legal_pages" USING btree ("created_at");
  CREATE INDEX "legal_pages__status_idx" ON "legal_pages" USING btree ("_status");
  CREATE INDEX "legal_pages_translation_status_idx" ON "legal_pages_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "legal_pages_locales_locale_parent_id_unique" ON "legal_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_pages_locales_parent_id_idx" ON "legal_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_legal_pages_v_parent_idx" ON "_legal_pages_v" USING btree ("parent_id");
  CREATE INDEX "_legal_pages_v_version_version_slug_idx" ON "_legal_pages_v" USING btree ("version_slug");
  CREATE INDEX "_legal_pages_v_version_version_updated_at_idx" ON "_legal_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_legal_pages_v_version_version_created_at_idx" ON "_legal_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_legal_pages_v_version_version__status_idx" ON "_legal_pages_v" USING btree ("version__status");
  CREATE INDEX "_legal_pages_v_created_at_idx" ON "_legal_pages_v" USING btree ("created_at");
  CREATE INDEX "_legal_pages_v_updated_at_idx" ON "_legal_pages_v" USING btree ("updated_at");
  CREATE INDEX "_legal_pages_v_snapshot_idx" ON "_legal_pages_v" USING btree ("snapshot");
  CREATE INDEX "_legal_pages_v_published_locale_idx" ON "_legal_pages_v" USING btree ("published_locale");
  CREATE INDEX "_legal_pages_v_latest_idx" ON "_legal_pages_v" USING btree ("latest");
  CREATE INDEX "_legal_pages_v_version_version_translation_status_idx" ON "_legal_pages_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_legal_pages_v_locales_locale_parent_id_unique" ON "_legal_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_legal_pages_v_locales_parent_id_idx" ON "_legal_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE INDEX "source_documents_updated_at_idx" ON "source_documents" USING btree ("updated_at");
  CREATE INDEX "source_documents_created_at_idx" ON "source_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "source_documents_filename_idx" ON "source_documents" USING btree ("filename");
  CREATE INDEX "contact_submissions_updated_at_idx" ON "contact_submissions" USING btree ("updated_at");
  CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" USING btree ("created_at");
  CREATE INDEX "partner_inquiries_updated_at_idx" ON "partner_inquiries" USING btree ("updated_at");
  CREATE INDEX "partner_inquiries_created_at_idx" ON "partner_inquiries" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_lines_id_idx" ON "payload_locked_documents_rels" USING btree ("product_lines_id");
  CREATE INDEX "payload_locked_documents_rels_product_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("product_categories_id");
  CREATE INDEX "payload_locked_documents_rels_skin_concerns_id_idx" ON "payload_locked_documents_rels" USING btree ("skin_concerns_id");
  CREATE INDEX "payload_locked_documents_rels_ingredients_id_idx" ON "payload_locked_documents_rels" USING btree ("ingredients_id");
  CREATE INDEX "payload_locked_documents_rels_technologies_id_idx" ON "payload_locked_documents_rels" USING btree ("technologies_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_journal_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("journal_topics_id");
  CREATE INDEX "payload_locked_documents_rels_stores_id_idx" ON "payload_locked_documents_rels" USING btree ("stores_id");
  CREATE INDEX "payload_locked_documents_rels_legal_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_source_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("source_documents_id");
  CREATE INDEX "payload_locked_documents_rels_contact_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_partner_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("partner_inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_hero_image_idx" ON "home_page" USING btree ("hero_image_id");
  CREATE INDEX "home_page__status_idx" ON "home_page" USING btree ("_status");
  CREATE INDEX "home_page_translation_status_idx" ON "home_page_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "home_page_locales_locale_parent_id_unique" ON "home_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_locales_parent_id_idx" ON "home_page_locales" USING btree ("_parent_id");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_products_id_idx" ON "home_page_rels" USING btree ("products_id");
  CREATE INDEX "home_page_rels_ingredients_id_idx" ON "home_page_rels" USING btree ("ingredients_id");
  CREATE INDEX "_home_page_v_version_version_hero_image_idx" ON "_home_page_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_snapshot_idx" ON "_home_page_v" USING btree ("snapshot");
  CREATE INDEX "_home_page_v_published_locale_idx" ON "_home_page_v" USING btree ("published_locale");
  CREATE INDEX "_home_page_v_latest_idx" ON "_home_page_v" USING btree ("latest");
  CREATE INDEX "_home_page_v_version_version_translation_status_idx" ON "_home_page_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_home_page_v_locales_locale_parent_id_unique" ON "_home_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_page_v_locales_parent_id_idx" ON "_home_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_rels_order_idx" ON "_home_page_v_rels" USING btree ("order");
  CREATE INDEX "_home_page_v_rels_parent_idx" ON "_home_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_home_page_v_rels_path_idx" ON "_home_page_v_rels" USING btree ("path");
  CREATE INDEX "_home_page_v_rels_products_id_idx" ON "_home_page_v_rels" USING btree ("products_id");
  CREATE INDEX "_home_page_v_rels_ingredients_id_idx" ON "_home_page_v_rels" USING btree ("ingredients_id");
  CREATE INDEX "brand_page__status_idx" ON "brand_page" USING btree ("_status");
  CREATE INDEX "brand_page_translation_status_idx" ON "brand_page_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "brand_page_locales_locale_parent_id_unique" ON "brand_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "brand_page_locales_parent_id_idx" ON "brand_page_locales" USING btree ("_parent_id");
  CREATE INDEX "_brand_page_v_version_version__status_idx" ON "_brand_page_v" USING btree ("version__status");
  CREATE INDEX "_brand_page_v_created_at_idx" ON "_brand_page_v" USING btree ("created_at");
  CREATE INDEX "_brand_page_v_updated_at_idx" ON "_brand_page_v" USING btree ("updated_at");
  CREATE INDEX "_brand_page_v_snapshot_idx" ON "_brand_page_v" USING btree ("snapshot");
  CREATE INDEX "_brand_page_v_published_locale_idx" ON "_brand_page_v" USING btree ("published_locale");
  CREATE INDEX "_brand_page_v_latest_idx" ON "_brand_page_v" USING btree ("latest");
  CREATE INDEX "_brand_page_v_version_version_translation_status_idx" ON "_brand_page_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_brand_page_v_locales_locale_parent_id_unique" ON "_brand_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_brand_page_v_locales_parent_id_idx" ON "_brand_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "partnership_page__status_idx" ON "partnership_page" USING btree ("_status");
  CREATE INDEX "partnership_page_translation_status_idx" ON "partnership_page_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "partnership_page_locales_locale_parent_id_unique" ON "partnership_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partnership_page_locales_parent_id_idx" ON "partnership_page_locales" USING btree ("_parent_id");
  CREATE INDEX "_partnership_page_v_version_version__status_idx" ON "_partnership_page_v" USING btree ("version__status");
  CREATE INDEX "_partnership_page_v_created_at_idx" ON "_partnership_page_v" USING btree ("created_at");
  CREATE INDEX "_partnership_page_v_updated_at_idx" ON "_partnership_page_v" USING btree ("updated_at");
  CREATE INDEX "_partnership_page_v_snapshot_idx" ON "_partnership_page_v" USING btree ("snapshot");
  CREATE INDEX "_partnership_page_v_published_locale_idx" ON "_partnership_page_v" USING btree ("published_locale");
  CREATE INDEX "_partnership_page_v_latest_idx" ON "_partnership_page_v" USING btree ("latest");
  CREATE INDEX "_partnership_page_v_version_version_translation_status_idx" ON "_partnership_page_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_partnership_page_v_locales_locale_parent_id_unique" ON "_partnership_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_partnership_page_v_locales_parent_id_idx" ON "_partnership_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_order_idx" ON "site_settings_social" USING btree ("_order");
  CREATE INDEX "site_settings_social_parent_id_idx" ON "site_settings_social" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings__status_idx" ON "site_settings" USING btree ("_status");
  CREATE INDEX "site_settings_translation_status_idx" ON "site_settings_locales" USING btree ("translation_status","_locale");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_social_order_idx" ON "_site_settings_v_version_social" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_social_parent_id_idx" ON "_site_settings_v_version_social" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version__status_idx" ON "_site_settings_v" USING btree ("version__status");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "_site_settings_v_snapshot_idx" ON "_site_settings_v" USING btree ("snapshot");
  CREATE INDEX "_site_settings_v_published_locale_idx" ON "_site_settings_v" USING btree ("published_locale");
  CREATE INDEX "_site_settings_v_latest_idx" ON "_site_settings_v" USING btree ("latest");
  CREATE INDEX "_site_settings_v_version_version_translation_status_idx" ON "_site_settings_v_locales" USING btree ("version_translation_status","_locale");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_settings_v_locales_parent_id_idx" ON "_site_settings_v_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_claims" CASCADE;
  DROP TABLE "products_skin_types" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_claims" CASCADE;
  DROP TABLE "_products_v_version_skin_types" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "product_lines" CASCADE;
  DROP TABLE "product_lines_locales" CASCADE;
  DROP TABLE "_product_lines_v" CASCADE;
  DROP TABLE "_product_lines_v_locales" CASCADE;
  DROP TABLE "product_categories" CASCADE;
  DROP TABLE "product_categories_locales" CASCADE;
  DROP TABLE "_product_categories_v" CASCADE;
  DROP TABLE "_product_categories_v_locales" CASCADE;
  DROP TABLE "skin_concerns" CASCADE;
  DROP TABLE "skin_concerns_locales" CASCADE;
  DROP TABLE "_skin_concerns_v" CASCADE;
  DROP TABLE "_skin_concerns_v_locales" CASCADE;
  DROP TABLE "ingredients_sources" CASCADE;
  DROP TABLE "ingredients" CASCADE;
  DROP TABLE "ingredients_locales" CASCADE;
  DROP TABLE "_ingredients_v_version_sources" CASCADE;
  DROP TABLE "_ingredients_v" CASCADE;
  DROP TABLE "_ingredients_v_locales" CASCADE;
  DROP TABLE "technologies_sources" CASCADE;
  DROP TABLE "technologies" CASCADE;
  DROP TABLE "technologies_locales" CASCADE;
  DROP TABLE "_technologies_v_version_sources" CASCADE;
  DROP TABLE "_technologies_v" CASCADE;
  DROP TABLE "_technologies_v_locales" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "journal_topics" CASCADE;
  DROP TABLE "journal_topics_locales" CASCADE;
  DROP TABLE "_journal_topics_v" CASCADE;
  DROP TABLE "_journal_topics_v_locales" CASCADE;
  DROP TABLE "stores" CASCADE;
  DROP TABLE "stores_locales" CASCADE;
  DROP TABLE "_stores_v" CASCADE;
  DROP TABLE "_stores_v_locales" CASCADE;
  DROP TABLE "legal_pages" CASCADE;
  DROP TABLE "legal_pages_locales" CASCADE;
  DROP TABLE "_legal_pages_v" CASCADE;
  DROP TABLE "_legal_pages_v_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "source_documents" CASCADE;
  DROP TABLE "contact_submissions" CASCADE;
  DROP TABLE "partner_inquiries" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_locales" CASCADE;
  DROP TABLE "_home_page_v_rels" CASCADE;
  DROP TABLE "brand_page" CASCADE;
  DROP TABLE "brand_page_locales" CASCADE;
  DROP TABLE "_brand_page_v" CASCADE;
  DROP TABLE "_brand_page_v_locales" CASCADE;
  DROP TABLE "partnership_page" CASCADE;
  DROP TABLE "partnership_page_locales" CASCADE;
  DROP TABLE "_partnership_page_v" CASCADE;
  DROP TABLE "_partnership_page_v_locales" CASCADE;
  DROP TABLE "site_settings_social" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_social" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_products_skin_types";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_products_translation_status";
  DROP TYPE "public"."enum__products_v_version_skin_types";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum__products_v_version_translation_status";
  DROP TYPE "public"."enum_product_lines_status";
  DROP TYPE "public"."enum_product_lines_translation_status";
  DROP TYPE "public"."enum__product_lines_v_version_status";
  DROP TYPE "public"."enum__product_lines_v_published_locale";
  DROP TYPE "public"."enum__product_lines_v_version_translation_status";
  DROP TYPE "public"."enum_product_categories_status";
  DROP TYPE "public"."enum_product_categories_translation_status";
  DROP TYPE "public"."enum__product_categories_v_version_status";
  DROP TYPE "public"."enum__product_categories_v_published_locale";
  DROP TYPE "public"."enum__product_categories_v_version_translation_status";
  DROP TYPE "public"."enum_skin_concerns_status";
  DROP TYPE "public"."enum_skin_concerns_translation_status";
  DROP TYPE "public"."enum__skin_concerns_v_version_status";
  DROP TYPE "public"."enum__skin_concerns_v_published_locale";
  DROP TYPE "public"."enum__skin_concerns_v_version_translation_status";
  DROP TYPE "public"."enum_ingredients_status";
  DROP TYPE "public"."enum_ingredients_translation_status";
  DROP TYPE "public"."enum__ingredients_v_version_status";
  DROP TYPE "public"."enum__ingredients_v_published_locale";
  DROP TYPE "public"."enum__ingredients_v_version_translation_status";
  DROP TYPE "public"."enum_technologies_status";
  DROP TYPE "public"."enum_technologies_translation_status";
  DROP TYPE "public"."enum__technologies_v_version_status";
  DROP TYPE "public"."enum__technologies_v_published_locale";
  DROP TYPE "public"."enum__technologies_v_version_translation_status";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum_articles_translation_status";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum__articles_v_version_translation_status";
  DROP TYPE "public"."enum_journal_topics_status";
  DROP TYPE "public"."enum_journal_topics_translation_status";
  DROP TYPE "public"."enum__journal_topics_v_version_status";
  DROP TYPE "public"."enum__journal_topics_v_published_locale";
  DROP TYPE "public"."enum__journal_topics_v_version_translation_status";
  DROP TYPE "public"."enum_stores_type";
  DROP TYPE "public"."enum_stores_status";
  DROP TYPE "public"."enum_stores_translation_status";
  DROP TYPE "public"."enum__stores_v_version_type";
  DROP TYPE "public"."enum__stores_v_version_status";
  DROP TYPE "public"."enum__stores_v_published_locale";
  DROP TYPE "public"."enum__stores_v_version_translation_status";
  DROP TYPE "public"."enum_legal_pages_slug";
  DROP TYPE "public"."enum_legal_pages_status";
  DROP TYPE "public"."enum_legal_pages_translation_status";
  DROP TYPE "public"."enum__legal_pages_v_version_slug";
  DROP TYPE "public"."enum__legal_pages_v_version_status";
  DROP TYPE "public"."enum__legal_pages_v_published_locale";
  DROP TYPE "public"."enum__legal_pages_v_version_translation_status";
  DROP TYPE "public"."enum_contact_submissions_topic";
  DROP TYPE "public"."enum_contact_submissions_status";
  DROP TYPE "public"."enum_contact_submissions_locale";
  DROP TYPE "public"."enum_partner_inquiries_business_type";
  DROP TYPE "public"."enum_partner_inquiries_status";
  DROP TYPE "public"."enum_partner_inquiries_locale";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum_home_page_translation_status";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum__home_page_v_published_locale";
  DROP TYPE "public"."enum__home_page_v_version_translation_status";
  DROP TYPE "public"."enum_brand_page_status";
  DROP TYPE "public"."enum_brand_page_translation_status";
  DROP TYPE "public"."enum__brand_page_v_version_status";
  DROP TYPE "public"."enum__brand_page_v_published_locale";
  DROP TYPE "public"."enum__brand_page_v_version_translation_status";
  DROP TYPE "public"."enum_partnership_page_status";
  DROP TYPE "public"."enum_partnership_page_translation_status";
  DROP TYPE "public"."enum__partnership_page_v_version_status";
  DROP TYPE "public"."enum__partnership_page_v_published_locale";
  DROP TYPE "public"."enum__partnership_page_v_version_translation_status";
  DROP TYPE "public"."enum_site_settings_status";
  DROP TYPE "public"."enum_site_settings_translation_status";
  DROP TYPE "public"."enum__site_settings_v_version_status";
  DROP TYPE "public"."enum__site_settings_v_published_locale";
  DROP TYPE "public"."enum__site_settings_v_version_translation_status";`)
}
