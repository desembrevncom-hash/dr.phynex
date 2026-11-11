import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText as LexicalRichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import { createElement } from 'react'

import type { Locale } from '@/i18n/locales'
import { localizedPath } from '@/lib/seo'

/** Public route of a CMS document, by collection. Unknown collections are not linked. */
const routes: Record<string, (slug: string) => string> = {
  products: (slug) => `/products/${slug}`,
  'product-lines': (slug) => `/products/line/${slug}`,
  ingredients: (slug) => `/ingredients/${slug}`,
  technologies: (slug) => `/technologies/${slug}`,
  articles: (slug) => `/journal/${slug}`,
  'journal-topics': (slug) => `/journal?topic=${encodeURIComponent(slug)}`,
  'legal-pages': (slug) => `/${slug}`,
}

/** Collections an internal link can point at on the site (anything else is shown as text). */
export const linkableCollections = Object.keys(routes)

type LinkDoc = { relationTo?: string; value?: unknown }

/**
 * Same-site path for an internal link, or null. The linked document is only populated when the
 * reader may see it (guests: published + approved in this locale), so links to drafts are not
 * rendered as links and never point at a 404 or "#".
 */
export function internalHref(doc: LinkDoc | undefined, locale: Locale): string | null {
  const value = doc?.value
  const slug = value && typeof value === 'object' && 'slug' in value ? (value as { slug?: unknown }).slug : undefined
  const route = doc?.relationTo ? routes[doc.relationTo] : undefined
  return route && typeof slug === 'string' && slug ? localizedPath(locale, route(slug)) : null
}

type LinkFields = { linkType?: string; url?: string; newTab?: boolean; doc?: LinkDoc }

const converters =
  (locale: Locale): JSXConvertersFunction =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    // The page already has its own h1; headings inside CMS text start at h2.
    heading: ({ node, nodesToJSX }) => {
      const tag = (node as { tag?: string }).tag
      const level = tag && /^h[2-6]$/.test(tag) ? tag : 'h2'
      return createElement(level, null, nodesToJSX({ nodes: node.children }))
    },
    link: ({ node, nodesToJSX }) => {
      const fields = (node as { fields?: LinkFields }).fields ?? {}
      const children = nodesToJSX({ nodes: node.children })
      const href = fields.linkType === 'internal' ? internalHref(fields.doc, locale) : fields.url
      if (!href) return <>{children}</>
      const newTab = Boolean(fields.newTab)
      return (
        <a href={href} rel={newTab ? 'noopener noreferrer' : undefined} target={newTab ? '_blank' : undefined}>
          {children}
        </a>
      )
    },
  })

export function RichText({ data, className, locale }: { data: unknown; className?: string; locale: Locale }) {
  if (!data || typeof data !== 'object' || !('root' in data)) return null
  return (
    <LexicalRichText
      data={data as SerializedEditorState}
      converters={converters(locale)}
      className={`prose-basic ${className ?? ''}`}
    />
  )
}
