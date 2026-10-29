/** Keeps the brand name on one line ("Dr. PhynEX" must never break after "Dr."). */
export const keepBrandTogether = (text: string) => text.replace(/Dr\.\s+PhynEX/gi, (m) => m.replace(/\s+/, ' '))

/** Rich text counts as filled only when it has at least one visible character. */
export const hasRichText = (value: unknown) => /"text":"[^"\s]/.test(JSON.stringify(value ?? ''))
