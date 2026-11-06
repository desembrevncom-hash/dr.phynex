import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import type { Locale } from '@/i18n/locales'
import { saveMarker } from '@/lib/approval-view'
import { readApprovals, sharedRevision, type BannerApprovals } from '@/lib/banner-revision'

/**
 * Server-computed "what the editor is looking at" for the Home Page, one locale.
 *
 * The basis is the SHA-256 of the canonical latest-draft content for that locale (every localized
 * field of the page in this locale, every shared field, the locale's review status). It does not
 * include timestamps, version ids, the approval map or other server-owned/virtual fields, so a save
 * that changes nothing keeps the same basis.
 *
 * The Admin reads it with the document (virtual field `approvalState`) and sends it back, unchanged,
 * with the approval request (`x-approval-basis`). guardHomeBannerApproval recomputes it from the
 * stored draft right before recording an approval and refuses on any difference, so an approval can
 * only ever cover the content the approving editor was shown. Reads here bypass access on purpose:
 * the basis must be identical for every role.
 */
const ignored = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  'globalType',
  'bannerApprovals',
  'bannerApprovalStatus',
  'approvalState',
])

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !ignored.has(k))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    )
  }
  return value === undefined ? null : value
}

export type ApprovalState = {
  /** Locale this state was read for (the panel refuses a state of another locale). */
  locale: Locale
  /** Opaque token the client sends back when approving. */
  basis: string
  /** Revision of the shared banner configuration this basis includes. */
  revision: string
  /** Which locales approved exactly this revision. */
  approved: Record<Locale, boolean>
  /** Review status of the requested locale. */
  status: string
  /**
   * Save marker (`bannerApprovals._save`, written on every Home Page write) of the stored draft this
   * state was computed from. The Admin compares it with the marker of the document its form shows
   * and refuses to approve when they differ, so a basis is never paired with content from another
   * save.
   */
  docSave: string | null
  /**
   * Basis of the document this state was delivered WITH (the one the Admin form is built from),
   * computed by attachShownBasis with exactly the same rules as `basis`. For drafts saved before
   * save markers existed, the Admin may only approve when this equals the stored `basis`.
   */
  shownBasis?: string
}

/**
 * Global afterRead hook of the Home Page. Runs after every field hook, on the final document that
 * the caller (the Admin document view among others) receives, and records that document's basis
 * next to the stored draft's basis. No extra read, no write.
 */
export const attachShownBasis = ({ doc }: { doc: Record<string, unknown> }) => {
  const state = doc?.approvalState
  if (state && typeof state === 'object' && !Array.isArray(state)) {
    doc.approvalState = { ...(state as ApprovalState), shownBasis: basisOfDocument(doc) }
  }
  return doc
}

/**
 * Serialises every Home Page write behind one transaction-scoped advisory lock (released at commit
 * or rollback). An approval takes it BEFORE it re-reads the stored draft and keeps it until its own
 * write is committed, so "check the basis" and "record the approval" are one atomic step: a
 * competing save either committed before the check (the basis no longer matches, 409) or waits and
 * is applied after the approval (it then resets the approval through the normal content rules).
 * Needs the request's transaction; without one the lock would release immediately, so refuse.
 */
export async function lockHomePageWrites(payload: Payload, req: PayloadRequest) {
  if (!req.transactionID) throw new Error('Home Page approval requires a database transaction')
  // Same lookup the Drizzle adapter uses for the request's transaction.
  const adapter = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<unknown> }
    sessions: Record<string, { db: { execute: (q: unknown) => Promise<unknown> } } | undefined>
  }
  const session = adapter.sessions[String(await req.transactionID)]
  if (!session) throw new Error('Home Page approval requires a database transaction')
  await session.db.execute(
    sql`select pg_advisory_xact_lock(hashtext('drphynex:home-page:writes'))`,
  )
}

export const basisOfDocument = (doc: Record<string, unknown> | null | undefined) =>
  createHash('sha256').update(JSON.stringify(canonical(doc ?? {}))).digest('hex')

/** Reads the current stored latest draft (published when there is no newer draft). */
export async function readApprovalState(
  payload: Payload,
  locale: Locale,
  req?: PayloadRequest,
): Promise<ApprovalState> {
  const doc = (await payload.findGlobal({
    slug: 'home-page',
    locale,
    draft: true,
    depth: 0,
    fallbackLocale: false,
    overrideAccess: true,
    // Without a request this is a fresh read of what is stored. With the caller's request it runs in
    // the caller's transaction (after lockHomePageWrites), on a copy so the flag does not leak.
    ...(req
      ? { req: { ...req, context: { ...req.context, skipApprovalState: true } } as PayloadRequest }
      : { context: { skipApprovalState: true } }),
  })) as unknown as Record<string, unknown>
  const revision = sharedRevision(doc.banners as never)
  const approvals: BannerApprovals = readApprovals(doc.bannerApprovals)
  return {
    locale,
    basis: basisOfDocument(doc),
    revision,
    approved: {
      ko: approvals.ko === revision,
      en: approvals.en === revision,
      vi: approvals.vi === revision,
    },
    status: typeof doc.translationStatus === 'string' ? doc.translationStatus : 'in-review',
    docSave: saveMarker(doc.bannerApprovals),
  }
}
