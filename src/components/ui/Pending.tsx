import { getTranslations } from 'next-intl/server'

import { getPreviewUser } from '@/lib/preview'

export type PendingKey =
  | 'headline'
  | 'intro'
  | 'lineDescription'
  | 'heroImage'
  | 'productImage'
  | 'moreImages'
  | 'shortDescription'
  | 'description'
  | 'claims'
  | 'keyIngredients'
  | 'howToUse'
  | 'cautions'
  | 'inci'
  | 'contactDetails'
  | 'partnershipIntro'
  | 'partnershipBody'
  | 'stores'
  | 'brandBody'
  | 'ingredientDescription'
  | 'legalBody'
  | 'articles'

/**
 * Marks content the brand still has to supply, in the page's language.
 * Rendered only in staff preview, never to visitors.
 */
export async function Pending({
  label,
  values,
  className = '',
}: {
  label: PendingKey
  values?: Record<string, string>
  className?: string
}) {
  if (!(await getPreviewUser())) return null
  const t = await getTranslations('pending')
  return (
    <span className={`inline-block rounded border border-dashed border-current px-2 py-1 text-sm font-normal opacity-80 ${className}`}>
      [{t('prefix')}: {t(label, values)}]
    </span>
  )
}
