import { getPreviewUser } from '@/lib/preview'

/**
 * Marks content the brand still has to supply. Rendered only in staff preview, never to
 * visitors, and always in Vietnamese because it is an internal note for the reviewer.
 */
export async function Pending({ label, className = '' }: { label: string; className?: string }) {
  if (!(await getPreviewUser())) return null
  return (
    <span
      lang="vi"
      className={`inline-block rounded border border-dashed border-current px-2 py-1 text-sm font-normal opacity-80 ${className}`}
    >
      [CHỜ CUNG CẤP: {label}]
    </span>
  )
}
