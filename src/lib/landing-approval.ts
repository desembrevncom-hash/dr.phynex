import { createHash } from 'node:crypto'

import { landingStructure } from './landing'

export { readApprovals, type BannerApprovals as LandingApprovals } from './banner-revision'

/**
 * Revision of the SHARED landing structure (blocks, order, hide, tone, layout, images, rows).
 * Texts are not part of it. Approval of a language is tied to this revision, exactly like the home
 * banners (lib/banner-revision.ts): changing the structure invalidates every language's approval.
 */
export const landingRevision = (blocks: unknown) =>
  createHash('sha256').update(JSON.stringify(landingStructure(blocks))).digest('hex')

/** Revision of "no landing page": products that never had blocks are not affected by the rules. */
export const EMPTY_LANDING_REVISION = landingRevision([])
