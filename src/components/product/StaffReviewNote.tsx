import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/locales'
import { populatedList } from '@/lib/content'
import type { Media, Product } from '@/payload-types'

/**
 * Staff draft preview only (the page renders it only for a preview user; the editorial note is a
 * staff-only field the public API never returns). Says plainly whether the language being viewed
 * is approved, whether the viewed version is published, which images visitors would not see, and
 * shows the editor's source / open-question note, so a draft is never mistaken for approved copy.
 */
export async function StaffReviewNote({ product, locale }: { product: Product; locale: Locale }) {
  const t = await getTranslations('staffReview')
  const status = product.translationStatus ?? 'in-review'
  const privateImages = populatedList<Media>(product.images).filter((m) => !m.publicRelease).length
  const note = typeof product.editorialNote === 'string' ? product.editorialNote.trim() : ''
  const approved = status === 'approved'

  return (
    <aside aria-labelledby="staff-review-title" className="container-page pt-4">
      <div className={`rounded-lg border-2 border-dashed p-4 text-sm sm:p-5 ${approved ? 'border-line-strong' : 'border-danger'}`}>
        <h2 id="staff-review-title" className="font-bold text-navy">
          {t('title')}
        </h2>
        <ul className="mt-2 grid gap-1 text-ink">
          <li>
            <span className="text-ink-muted">{t('translation', { locale: locale.toUpperCase() })} </span>
            <strong className={approved ? 'text-success' : 'text-danger'}>{t(`status.${status}`)}</strong>
          </li>
          <li>
            <span className="text-ink-muted">{t('publication')} </span>
            <strong>{t(product._status === 'published' ? 'published' : 'draft')}</strong>
          </li>
          {privateImages > 0 ? <li>{t('privateImages', { count: privateImages })}</li> : null}
        </ul>
        {note ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-navy">{t('note')}</summary>
            <p className="mt-2 max-w-prose whitespace-pre-line text-ink-muted">{note}</p>
          </details>
        ) : null}
      </div>
    </aside>
  )
}
