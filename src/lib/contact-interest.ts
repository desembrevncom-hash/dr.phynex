// Shared by the contact page, the form and the server action (no server-only imports here).

/** Product slugs as used in URLs: lowercase letters, digits and dashes. */
export const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Single rule for the product of interest, used by the contact page (`?product=`) and the server
 * action (form field): a plain slug of at most 80 characters, anything else is ignored. */
export const INTEREST_SLUG_MAX = 80
/** Reads `?product=` from the contact URL; anything that is not a plain slug is ignored. */
export const interestSlug = (value: string | undefined) =>
  value && value.length <= INTEREST_SLUG_MAX && productSlugPattern.test(value) ? value : undefined

/** Query string that carries the product of interest (contact links, language switcher). */
export const interestSearch = (slug: string) => `?product=${encodeURIComponent(slug)}`

/** Contact link from a product page that carries the product of interest. */
export const contactHrefFor = (localizedContactPath: string, slug: string) =>
  `${localizedContactPath}${interestSearch(slug)}`

/**
 * Staff read submissions in the Vietnamese Admin, so the product line is written in Vietnamese
 * and placed before the visitor's own text, which is kept unchanged below it.
 */
export const interestMessage = (name: string, slug: string, message: string) =>
  `Sản phẩm quan tâm: ${name} (/products/${slug})\n\n${message}`

/** A repeat with every field identical (name, email, phone, topic, language, message) within this window
 * is not stored again. Sequential repeats only: two requests racing at the same instant can both
 * be stored (closing that needs a database constraint, i.e. a schema change). */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000
export const duplicateWindowStart = (now = Date.now()) => new Date(now - DUPLICATE_WINDOW_MS)
