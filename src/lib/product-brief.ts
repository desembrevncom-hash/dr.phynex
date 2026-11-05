/** Facts supplied in the redesign brief, 2026-11-05. Never reads unpublished CMS content. */
export const productBriefs = [
  {
    slug: 'mx-01-forma',
    name: 'MX-01 FORMA',
    code: '01',
    family: 'MX',
    accent: 'cyan',
    pack: '8 mL × 5',
    price: 2000000,
    formula: 'Sodium DNA 1% + Panthenol 1%',
  },
  {
    slug: 'mx-02-luma',
    name: 'MX-02 LUMA',
    code: '02',
    family: 'MX',
    accent: 'pink',
    pack: '8 mL × 5',
    price: 2000000,
    formula: 'Niacinamide 2% · Sodium DNA 0.1% · Panthenol 0.1%',
  },
  {
    slug: 'rx-matrix-balm',
    name: 'RX MATRIX BALM',
    code: '03',
    family: 'RX',
    accent: 'red',
    pack: '50 g',
    price: 1200000,
    formula: 'Panthenol 5% · Sodium DNA 2% · Niacinamide 2%',
  },
  {
    slug: 'rx-matrix-sheet',
    name: 'RX MATRIX SHEET',
    code: '04',
    family: 'RX',
    accent: 'yellow',
    pack: '25 mL × 5',
    price: 600000,
    formula: 'Sodium DNA 0.05% · Allantoin · Beta-Glucan',
  },
] as const
export const productBrief = (slug: string) => productBriefs.find((p) => p.slug === slug)
/** Deployment configuration, off by default; no currency conversion or commerce behavior. */
export const showProductPrices = () => process.env.NEXT_PUBLIC_SHOW_PRODUCT_PRICES === 'true'
