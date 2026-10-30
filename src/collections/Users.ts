import type { CollectionConfig, FieldHook } from 'payload'

import { admins, adminsField, isAdminUser, isStaffUser, roles } from '@/access/roles'
import { authCookies, SESSION_SECONDS } from '@/config/auth'

/** The very first account (created via /admin create-first-user) is always an admin. */
const firstUserIsAdmin: FieldHook = async ({ operation, req, value }) => {
  if (operation !== 'create') return value
  const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
  return totalDocs === 0 ? 'admin' : value
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', group: 'Settings', defaultColumns: ['email', 'name', 'role'] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: SESSION_SECONDS,
    // Secure over HTTPS (staging/production), plain on http://localhost; see src/config/auth.ts.
    cookies: authCookies({ serverURL: process.env.NEXT_PUBLIC_SERVER_URL, vercel: process.env.VERCEL }),
  },
  access: {
    admin: ({ req }) => isStaffUser(req.user),
    read: ({ req }) => {
      if (isAdminUser(req.user)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    create: admins,
    update: ({ req }) => {
      if (isAdminUser(req.user)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    delete: admins,
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: roles.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
      access: { create: adminsField, update: adminsField },
      hooks: { beforeChange: [firstUserIsAdmin] },
      admin: {
        position: 'sidebar',
        description: 'Admin: everything. Editor: content + publishing. Translator: text drafts only.',
      },
    },
  ],
}
