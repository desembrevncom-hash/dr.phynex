import { getTranslations } from 'next-intl/server'

/** Neutral placeholder shown when content is not yet published + approved in this locale. */
export async function EmptyState({ title }: { title?: string }) {
  const t = await getTranslations('empty')
  return (
    <section role="status" className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-8">
      <h2 className="text-lg font-semibold">{title ?? t('title')}</h2>
      <p className="mt-2 max-w-prose text-ink-muted">{t('body')}</p>
    </section>
  )
}
