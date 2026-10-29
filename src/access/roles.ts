import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export const roles = ['admin', 'editor', 'translator'] as const
export type Role = (typeof roles)[number]

type MaybeUser = PayloadRequest['user']

const roleOf = (user: MaybeUser): Role | undefined => {
  const role = (user as { role?: unknown } | null | undefined)?.role
  return typeof role === 'string' && (roles as readonly string[]).includes(role)
    ? (role as Role)
    : undefined
}

export const hasRole = (user: MaybeUser, ...allowed: Role[]): boolean => {
  const role = roleOf(user)
  return role !== undefined && allowed.includes(role)
}

export const isStaffUser = (user: MaybeUser) => hasRole(user, 'admin', 'editor', 'translator')
export const isEditorUser = (user: MaybeUser) => hasRole(user, 'admin', 'editor')
export const isAdminUser = (user: MaybeUser) => hasRole(user, 'admin')

// Collection-level access
export const anyone: Access = () => true
export const nobody: Access = () => false
export const staff: Access = ({ req }) => isStaffUser(req.user)
export const editors: Access = ({ req }) => isEditorUser(req.user)
export const admins: Access = ({ req }) => isAdminUser(req.user)

// Field-level access
export const editorsField: FieldAccess = ({ req }) => isEditorUser(req.user)
export const staffField: FieldAccess = ({ req }) => isStaffUser(req.user)
export const adminsField: FieldAccess = ({ req }) => isAdminUser(req.user)

/**
 * Guests may only request a single locale with no fallback; otherwise
 * `?locale=all` or `?fallback-locale=ko` would expose unapproved translations.
 */
export const isSingleLocaleRequest = (req: PayloadRequest): boolean => {
  if (!req.locale || req.locale === 'all') return false
  const fallback = req.fallbackLocale as unknown
  if (Array.isArray(fallback)) return fallback.length === 0
  return !fallback || fallback === 'none' || fallback === 'false' || fallback === 'null'
}

/**
 * Public read rule for localized, versioned content:
 * staff see everything; guests only see published documents whose
 * translation in the requested locale is approved.
 */
export const publishedAndApproved: Access = ({ req }) => {
  if (isStaffUser(req.user)) return true
  if (!isSingleLocaleRequest(req)) return false

  const where: Where = {
    and: [{ _status: { equals: 'published' } }, { translationStatus: { equals: 'approved' } }],
  }
  return where
}
