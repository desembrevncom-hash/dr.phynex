/**
 * Read-only check of the four packaged products in the CMS this process connects to.
 * Reports the database name (never the connection string), each product's draft and published
 * state per locale, the version history, and what a guest can actually read. Writes nothing.
 * Run: npm run payload -- run scripts/acceptance/check-products.ts
 */
import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { locales } from '../../src/i18n/locales'

const expected = ['rx-matrix-balm', 'rx-matrix-sheet', 'mx-01-forma', 'mx-02-luma']

const dbName = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').pathname.replace(/^\//, '') || '(unknown)'
  } catch {
    return '(unparseable)'
  }
})()
console.log(`Database: ${dbName}`)

const payload = await getPayload({ config })

const all = await payload.find({ collection: 'products', draft: true, overrideAccess: true, depth: 0, limit: 100, locale: 'ko' })
console.log(`Product documents (latest draft view): ${all.totalDocs}`)
const versions = await payload.findVersions({ collection: 'products', overrideAccess: true, limit: 0, depth: 0 })
console.log(`Product versions (all documents): ${versions.totalDocs}`)

for (const slug of expected) {
  const doc = all.docs.find((d) => d.slug === slug)
  if (!doc) {
    console.log(`\n${slug}: MISSING`)
    continue
  }
  const ownVersions = await payload.findVersions({
    collection: 'products',
    overrideAccess: true,
    depth: 0,
    limit: 0,
    where: { parent: { equals: doc.id } },
  })
  const publishedVersions = await payload.findVersions({
    collection: 'products',
    overrideAccess: true,
    depth: 0,
    limit: 0,
    where: { and: [{ parent: { equals: doc.id } }, { 'version._status': { equals: 'published' } }] },
  })
  console.log(`\n${slug} (id ${doc.id}): _status=${doc._status} | versions=${ownVersions.totalDocs} | published versions=${publishedVersions.totalDocs}`)
  for (const locale of locales) {
    const draft = await payload.findByID({ collection: 'products', id: doc.id, draft: true, overrideAccess: true, depth: 0, locale, fallbackLocale: false })
    const fields = ['name', 'shortDescription', 'description', 'inci', 'howToUse', 'cautions'] as const
    const filled = fields.filter((f) => {
      const v: unknown = draft[f]
      return v != null && v !== '' && !(typeof v === 'object' && Object.keys(v as object).length === 0)
    })
    console.log(`  ${locale}: translationStatus=${draft.translationStatus ?? '-'} | name="${draft.name ?? ''}" | filled: ${filled.join(', ') || 'none'}`)
  }
}

console.log('\nGuest-visible products (published + approved, no fallback):')
for (const locale of locales) {
  const pub = await payload.find({ collection: 'products', overrideAccess: false, draft: false, depth: 0, limit: 100, locale, fallbackLocale: false })
  console.log(`  ${locale}: ${pub.totalDocs}`)
}
process.exit(0)
