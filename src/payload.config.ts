import { postgresAdapter } from '@payloadcms/db-postgres'
import { HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { ko } from '@payloadcms/translations/languages/ko'
import { vi } from '@payloadcms/translations/languages/vi'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Articles } from './collections/Articles'
import { Ingredients, Technologies } from './collections/Ingredients'
import { LegalPages } from './collections/LegalPages'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { SourceDocuments } from './collections/SourceDocuments'
import { Stores } from './collections/Stores'
import { ContactSubmissions, PartnerInquiries } from './collections/Submissions'
import { JournalTopics, ProductCategories, ProductLines, SkinConcerns } from './collections/Taxonomies'
import { Users } from './collections/Users'
import { emailAdapter } from './config/email'
import { objectStorage } from './config/storage'
import { BrandPage, HomePage, PartnershipPage, SiteSettings } from './globals'
import { contentDefaultLocale, localeLabels, locales } from './i18n/locales'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const secret = process.env.PAYLOAD_SECRET
if (!secret) throw new Error('PAYLOAD_SECRET is not set. Copy .env.example to .env.')

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  cors: [serverURL],
  csrf: [serverURL],
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Dr.PhynEX CMS' },
  },
  i18n: { supportedLanguages: { en, ko, vi }, fallbackLanguage: 'en' },
  localization: {
    locales: locales.map((code) => ({ code, label: localeLabels[code] })),
    defaultLocale: contentDefaultLocale,
    // Never fill a missing translation with another language on the public site.
    fallback: false,
  },
  collections: [
    ...[
      Products,
      ProductLines,
      ProductCategories,
      SkinConcerns,
      Ingredients,
      Technologies,
      Articles,
      JournalTopics,
      Stores,
      LegalPages,
      Media,
    ],
    SourceDocuments,
    ContactSubmissions,
    PartnerInquiries,
    Users,
  ],
  globals: [HomePage, BrandPage, PartnershipPage, SiteSettings],
  // Every page renders its own h1 (title/name); CMS text starts at h2.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((feature) => feature.key !== 'heading'),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    ],
  }),
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // The site and the admin use the REST/Local API only. Disabled routes answer 404.
  graphQL: { disable: true },
  email: emailAdapter(),
  db: postgresAdapter({
    // On Vercel use the provider's pooled connection string (see docs/deployment-plan.md).
    pool: { connectionString: process.env.DATABASE_URL || '', max: process.env.VERCEL ? 3 : 10 },
    // Schema changes go through migrations (npm run migrate:create / migrate), also locally.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [...objectStorage()],
})
