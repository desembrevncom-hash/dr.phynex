/** Keeps the brand name on one line ("Dr. PhynEX" must never break after "Dr."). */
export const keepBrandTogether = (text: string) => text.replace(/Dr\.\s+PhynEX/gi, (m) => m.replace(/\s+/, ' '))
