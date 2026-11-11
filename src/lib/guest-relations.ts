import 'server-only'

import type { CollectionSlug } from 'payload'

import type { Locale } from '@/i18n/locales'
import type { Product } from '@/payload-types'
import { linkableCollections } from '@/components/ui/RichText'

import { findPublic } from './content'

type Id = number | string
type Ref = Id | { id: Id } | null | undefined

const idOf = (v: unknown): Id | null =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: Id }).id : typeof v === 'number' || typeof v === 'string' ? v : null

/** Relationship fields of a product that the product page and its landing blocks show. */
const relations = [
  ['line', 'product-lines'],
  ['categories', 'product-categories'],
  ['keyIngredients', 'ingredients'],
  ['technologies', 'technologies'],
  ['concerns', 'skin-concerns'],
  ['related', 'products'],
] as const satisfies readonly (readonly [keyof Product, CollectionSlug])[]

type LandingBlock = NonNullable<Product['landing']>[number]
type IngredientItem = { ingredient?: Ref } & Record<string, unknown>

/** Rich text fields of the product shown on the page; their internal links point at CMS documents. */
const richTextFields = ['howToUse', 'cautions'] as const
type LexNode = {
  type?: string
  fields?: { linkType?: string; doc?: { relationTo?: string; value?: unknown } } & Record<string, unknown>
  children?: LexNode[]
} & Record<string, unknown>
type Link = { relationTo: string; value: unknown }
const internalLink = (node: LexNode): Link | null => {
  const doc = node.fields?.linkType === 'internal' ? node.fields.doc : undefined
  return doc && typeof doc.relationTo === 'string' ? (doc as Link) : null
}
const eachNode = (node: LexNode | undefined, fn: (n: LexNode) => void) => {
  if (!node || typeof node !== 'object') return
  fn(node)
  for (const child of node.children ?? []) eachNode(child, fn)
}
const mapNodes = (node: LexNode, fn: (n: LexNode) => LexNode): LexNode => {
  const next = fn(node)
  return next.children ? { ...next, children: next.children.map((c) => mapNodes(c, fn)) } : next
}
const rootOf = (value: unknown) =>
  value && typeof value === 'object' && 'root' in value ? (value as { root: LexNode }).root : undefined

/**
 * "Xem như khách": the staff member's draft read of the product, with every related document
 * (product line, product types, key ingredients, technologies, concerns, related products and the
 * ingredients picked in landing blocks, documents linked from "how to use" and "cautions") read
 * again with the visitor query of the public page: no user, published only, approved for this
 * locale, no fallback. One depth level less than the
 * product read (depth 2), so the documents come back exactly as they are populated on the public
 * page. A document the visitor cannot read stays a bare id, as the public API returns it, so the
 * page hides its name, image and link the same way. Staff view does not use this.
 */
export async function withVisitorRelations(product: Product, locale: Locale): Promise<Product> {
  const wanted = new Map<CollectionSlug, Set<Id>>()
  const want = (collection: CollectionSlug, v: unknown) => {
    const id = idOf(v)
    if (id === null) return
    if (!wanted.has(collection)) wanted.set(collection, new Set())
    wanted.get(collection)!.add(id)
  }
  for (const [field, collection] of relations) {
    const value = product[field] as unknown
    for (const v of Array.isArray(value) ? value : [value]) want(collection, v)
  }
  for (const block of product.landing ?? []) {
    if (block.blockType === 'ingredients') for (const item of (block.items ?? []) as IngredientItem[]) want('ingredients', item.ingredient)
  }
  // Internal links in rich text: only to collections the site links to; others never become links.
  for (const field of richTextFields) {
    eachNode(rootOf(product[field]), (n) => {
      const link = internalLink(n)
      if (link && linkableCollections.includes(link.relationTo)) want(link.relationTo as CollectionSlug, link.value)
    })
  }

  const visible = new Map<CollectionSlug, Map<Id, unknown>>()
  await Promise.all(
    [...wanted].map(async ([collection, ids]) => {
      const { docs } = await findPublic(collection, locale, {
        publicOnly: true,
        depth: 1,
        limit: ids.size,
        where: { id: { in: [...ids] } },
      })
      visible.set(collection, new Map(docs.map((d) => [(d as { id: Id }).id, d])))
    }),
  )
  const asVisitor = (collection: CollectionSlug, v: unknown) => {
    const id = idOf(v)
    return id === null ? v : (visible.get(collection)?.get(id) ?? id)
  }

  const next: Record<string, unknown> = { ...product }
  for (const [field, collection] of relations) {
    const value = product[field] as unknown
    next[field] = Array.isArray(value) ? value.map((v) => asVisitor(collection, v)) : value == null ? value : asVisitor(collection, value)
  }
  if (product.landing) {
    next.landing = product.landing.map((block): LandingBlock =>
      block.blockType === 'ingredients'
        ? ({
            ...block,
            items: ((block.items ?? []) as IngredientItem[]).map((item) => ({ ...item, ingredient: asVisitor('ingredients', item.ingredient) })),
          } as LandingBlock)
        : block,
    )
  }
  // Rich text: the text is kept; a link whose target the visitor cannot read in this language keeps
  // only the target id, so the page renders the words without a link (as on the public page).
  for (const field of richTextFields) {
    const value = product[field] as unknown
    const root = rootOf(value)
    if (!root) continue
    next[field] = {
      ...(value as object),
      root: mapNodes(root, (n) => {
        const link = internalLink(n)
        if (!link) return n
        const target = linkableCollections.includes(link.relationTo) ? asVisitor(link.relationTo as CollectionSlug, link.value) : idOf(link.value)
        return { ...n, fields: { ...n.fields, doc: { ...link, value: target } } }
      }),
    }
  }
  return next as unknown as Product
}
