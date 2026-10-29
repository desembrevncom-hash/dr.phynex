import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { isStaffUser } from '@/access/roles'
import { getPayloadClient } from '@/lib/content-client'
import { safePreviewPath } from '@/lib/preview'

/**
 * Turns on draft preview for a signed-in staff member, then opens the page.
 * Not signed in: sends them to the admin login and back here afterwards.
 */
export async function GET(request: NextRequest) {
  const path = safePreviewPath(request.nextUrl.searchParams.get('path')) ?? '/ko'
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })

  if (!isStaffUser(user)) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/preview?path=${encodeURIComponent(path)}`)}`)
  }

  ;(await draftMode()).enable()
  redirect(path)
}
