/**
 * Read-only check: every ingredient linked to a product (CMS drafts) must appear in that product's
 * INCI list, and must be named on the pack front. Prints a table; writes nothing.
 * Run: npm run payload -- run scripts/acceptance/verify-ingredients.ts
 */
import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { products as packaging } from '../data/product-content'

const payload = await getPayload({ config })
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
/** Letters and digits only, for matching pack-front words like "E.G.F" or "NMN+NAD+". */
const key = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

const { docs } = await payload.find({ collection: 'products', locale: 'en', draft: true, overrideAccess: true, depth: 1, limit: 50 })
let problems = 0
for (const product of docs) {
  // Concentrations such as "(50,000ppm)" contain commas: drop them before splitting the list.
  const inci = (product.inci ?? '').replace(/\([^)]*\)/g, '').split(',').map(norm)
  const front = packaging.find((p) => p.slug === product.slug)?.sources.front ?? ''
  for (const ing of product.keyIngredients ?? []) {
    if (typeof ing !== 'object') continue
    const inciName = ing.inciName ?? ''
    const inInci = inci.includes(norm(inciName))
    const onFront = key(front).includes(key(ing.name)) || key(front).includes(key(inciName))
    if (!inInci || !onFront) problems++
    console.log(`${product.slug.padEnd(16)} ${ing.name.padEnd(30)} INCI "${inciName}" in list: ${inInci ? 'yes' : 'NO'} | named on front: ${onFront ? 'yes' : 'NO'}`)
  }
}
console.log(problems === 0 ? 'All links backed by INCI list and pack front.' : `${problems} link(s) need attention.`)
process.exit(0)
