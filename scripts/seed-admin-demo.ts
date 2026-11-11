/**
 * Review-only seed for the Admin UX work. It fills the DISPOSABLE review database
 * (drphynex_independent_review_test, marker drphynex-independent-review-disposable-v1) with test
 * staff accounts, three generated test images and a Home Page in a few review states, so the Admin
 * screens can be compared before/after. It refuses to run against any other database.
 *
 * One-shot fixture: the three staff accounts get RANDOM passwords generated on each run. They are
 * written only to a file in the OS temp folder (outside the repository) for the screenshot script and
 * exist only in that disposable database; no real account or secret is involved. The banner texts
 * are marked "[MẪU]" and carry no product claims.
 *
 *   node_modules/.bin/tsx scripts/seed-admin-demo.ts
 */
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getPayload, type Migration } from 'payload'
import sharp from 'sharp'

import { migrations } from '@/migrations'
import { withContentLocaleGuard } from '@/lib/content-mutations'
import config from '@/payload.config'

import { assertDisposableDatabase } from '../tests/helpers/database'

const fixturePath = join(tmpdir(), 'drphynex-admin-ux-fixture.json')
const demoAccounts = Object.fromEntries(
  (['admin', 'editor', 'translator'] as const).map((role) => [
    role,
    { email: `ux-${role}@test.local`, password: randomBytes(18).toString('hex') },
  ]),
) as Record<'admin' | 'editor' | 'translator', { email: string; password: string }>

// Project writes go through the locale guard (publishSpecificLocale must equal the locale).
const payload = withContentLocaleGuard(await getPayload({ config: await config }))
try {
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })

  const admin = await payload.create({
    collection: 'users',
    data: { ...demoAccounts.admin, role: 'admin', name: 'Tài khoản thử Admin' },
    overrideAccess: true,
  })
  for (const role of ['editor', 'translator'] as const) {
    await payload.create({
      collection: 'users',
      data: { ...demoAccounts[role], role, name: `Tài khoản thử ${role}` },
      user: admin,
      overrideAccess: false,
    })
  }

  const image = async (name: string, color: string) => {
    const data = await sharp({ create: { width: 960, height: 540, channels: 3, background: color } })
      .png()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      locale: 'ko',
      data: { alt: `[MẪU] ${name}` },
      file: { data, mimetype: 'image/png', name: `${name}.png`, size: data.length },
      user: admin,
      overrideAccess: false,
    })
    return payload.update({
      collection: 'media',
      id: media.id,
      data: { publicRelease: true },
      user: admin,
      overrideAccess: false,
    })
  }
  const a = await image('mau-a', '#c9d6df')
  const b = await image('mau-b', '#e8cfd6')
  const c = await image('mau-c', '#cfe3e8')

  const save = (locale: 'ko' | 'en' | 'vi', data: Record<string, unknown>) =>
    payload.updateGlobal({ slug: 'home-page', locale, draft: true, data, overrideAccess: true })

  // Shared configuration (images, visual type, CTA, colours): set once, then each language's text.
  await save('ko', {
    banners: {
      brand: { visualType: 'brandOptics' },
      forma: { visualType: 'packshot', desktopImage: a.id },
      luma: { visualType: 'fullBleed', desktopImage: b.id, textDisplay: 'overlay' },
      balm: { visualType: 'packshot', desktopImage: c.id },
      sheet: { visualType: 'packshot' },
    },
  })
  const text = (lang: string) => ({
    banners: {
      brand: { title: `[MẪU] Brand ${lang}`, tagline: `Nội dung mẫu ${lang}`, ctaLabel: 'Xem thêm' },
      forma: { title: `[MẪU] Forma ${lang}`, tagline: `Nội dung mẫu ${lang}`, ctaLabel: 'Xem thêm' },
      luma: { title: `[MẪU] Luma ${lang}` },
    },
  })
  await save('ko', text('KO'))
  await save('en', text('EN'))
  await save('vi', text('VI'))
  writeFileSync(fixturePath, JSON.stringify(demoAccounts), { mode: 0o600 })
  // EN: approved for the current configuration (trusted system caller, like the migration seed).
  await save('en', { translationStatus: 'approved' })
  console.log('Seed finished: 3 staff accounts, 3 generated images, Home Page drafts (KO/VI in review, EN approved).')
} finally {
  await payload.destroy?.()
}
// The pg pool can keep the process alive after the work is done; exit explicitly (the work is committed).
process.exit(0)
