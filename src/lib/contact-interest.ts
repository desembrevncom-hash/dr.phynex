// Shared by the contact page, the form and the server action (no server-only imports here).

/** Product slugs as used in URLs: lowercase letters, digits and dashes. */
export const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Reads `?product=` from the contact URL; anything that is not a plain slug is ignored. */
export const interestSlug = (value: string | undefined) =>
  value && value.length <= 80 && productSlugPattern.test(value) ? value : undefined

/** Contact link from a product page that carries the product of interest. */
export const contactHrefFor = (localizedContactPath: string, slug: string) =>
  `${localizedContactPath}?product=${encodeURIComponent(slug)}`

/**
 * Staff read submissions in the Vietnamese Admin, so the product line is written in Vietnamese
 * and placed before the visitor's own text, which is kept unchanged below it.
 */
export const interestMessage = (name: string, slug: string, message: string) =>
  `Sản phẩm quan tâm: ${name} (/products/${slug})\n\n${message}`

/** A repeat of the same message from the same email within this window is not stored again. */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000
export const duplicateWindowStart = (now = Date.now()) => new Date(now - DUPLICATE_WINDOW_MS)
