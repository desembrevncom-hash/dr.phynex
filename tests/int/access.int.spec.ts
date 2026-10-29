import { randomBytes } from 'crypto'
import { getPayload, type Migration, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'
import type { User } from '@/payload-types'

// Runs against the *_test database (see vitest.setup.ts). The schema is rebuilt from migrations.
// Test accounts use random throwaway passwords generated per run; no product or brand data is seeded,
// only neutral fixtures ("Test product") that are deleted with the schema on the next run.

let payload: Payload
let admin: User
let editor: User
let translator: User

const password = () => randomBytes(16).toString('hex')
const guest = { overrideAccess: false, fallbackLocale: false } as const

const fixture = {
  name: 'Test product KO',
  slug: 'test-product',
  translationStatus: 'approved' as const,
  claims: [{ text: 'Test claim', sourceDocument: 'Test source ref' }],
  editorialNote: 'Internal: open question for the brand',
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Refusing to run outside the test database')
  payload = await getPayload({ config: await config })
  // Fresh schema from the committed migrations (passed in directly so Vite handles the TS).
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })

  // The very first account always becomes admin, whatever role was requested.
  admin = await payload.create({
    collection: 'users',
    data: { email: 'admin@test.local', password: password(), role: 'translator' },
    overrideAccess: true,
  })
  editor = await payload.create({
    collection: 'users',
    data: { email: 'editor@test.local', password: password(), role: 'editor' },
    user: admin,
    overrideAccess: false,
  })
  translator = await payload.create({
    collection: 'users',
    data: { email: 'translator@test.local', password: password(), role: 'translator' },
    user: admin,
    overrideAccess: false,
  })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('accounts', () => {
  it('first user is forced to admin; later roles are respected', () => {
    expect(admin.role).toBe('admin')
    expect(editor.role).toBe('editor')
    expect(translator.role).toBe('translator')
  })

  it('guests and non-admins cannot list accounts', async () => {
    await expect(payload.find({ collection: 'users', ...guest })).rejects.toThrow()
    const asEditor = await payload.find({ collection: 'users', overrideAccess: false, user: editor })
    expect(asEditor.docs.map((u) => u.email)).toEqual(['editor@test.local'])
  })

  it('non-admins cannot create accounts or raise their own role', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'x@test.local', password: password(), role: 'admin' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const updated = await payload.update({
      collection: 'users',
      id: translator.id,
      data: { role: 'admin' },
      user: translator,
      overrideAccess: false,
    })
    expect(updated.role).toBe('translator')
  })
})

describe('publishing and translation approval', () => {
  let productId: number

  it('editor can save a draft without claim sources, but cannot publish it', async () => {
    const draft = await payload.create({
      collection: 'products',
      locale: 'ko',
      draft: true,
      data: { name: 'Draft', slug: 'test-product', claims: [{ text: 'No source yet' } as never] },
      user: editor,
      overrideAccess: false,
    })
    productId = draft.id
    expect(draft._status).toBe('draft')

    await expect(
      payload.update({
        collection: 'products',
        id: productId,
        locale: 'ko',
        data: { _status: 'published', claims: [{ text: 'No source yet' } as never] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/sourceDocument|Source|claims/i)
  })

  it('guests never see drafts, even with draft=true', async () => {
    const res = await payload.find({ collection: 'products', locale: 'ko', ...guest, draft: true })
    expect(res.totalDocs).toBe(0)
  })

  it('editor publishes with a source; guests see only the approved locale', async () => {
    await payload.update({
      collection: 'products',
      id: productId,
      locale: 'ko',
      data: { ...fixture, _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    // English exists but is still in review.
    await payload.update({
      collection: 'products',
      id: productId,
      locale: 'en',
      data: { name: 'Test product EN', translationStatus: 'in-review', _status: 'published' },
      user: editor,
      overrideAccess: false,
    })

    const ko = await payload.find({ collection: 'products', locale: 'ko', ...guest })
    expect(ko.docs.map((d) => d.name)).toEqual(['Test product KO'])

    const en = await payload.find({ collection: 'products', locale: 'en', ...guest })
    expect(en.totalDocs).toBe(0)
    const vi = await payload.find({ collection: 'products', locale: 'vi', ...guest })
    expect(vi.totalDocs).toBe(0)
  })

  it('claim sources and the editorial note are hidden from guests', async () => {
    const ko = await payload.find({ collection: 'products', locale: 'ko', ...guest })
    const claim = ko.docs[0]?.claims?.[0] as Record<string, unknown>
    expect(claim.text).toBe('Test claim')
    expect(claim.sourceDocument).toBeUndefined()
    expect((ko.docs[0] as unknown as Record<string, unknown>).editorialNote).toBeUndefined()
    const asStaff = await payload.find({ collection: 'products', locale: 'ko', overrideAccess: false, user: translator })
    expect(asStaff.docs[0]?.editorialNote).toBe('Internal: open question for the brand')
  })

  it('guests cannot bypass approval with locale=all or a fallback locale', async () => {
    await expect(payload.find({ collection: 'products', locale: 'all', overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.find({ collection: 'products', locale: 'en', fallbackLocale: 'ko', overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'products', id: productId, locale: 'en', ...guest }),
    ).rejects.toThrow()
  })

  it('a newer draft does not leak to guests; the published version stays', async () => {
    await payload.update({
      collection: 'products',
      id: productId,
      locale: 'ko',
      draft: true,
      data: { name: 'Unpublished change' },
      user: editor,
      overrideAccess: false,
    })
    const published = await payload.find({ collection: 'products', locale: 'ko', ...guest })
    expect(published.docs.map((d) => d.name)).toEqual(['Test product KO'])
    // draft=true: the latest version is a draft, so guests get nothing rather than the draft.
    const asDraft = await payload.find({ collection: 'products', locale: 'ko', ...guest, draft: true })
    expect(asDraft.docs.map((d) => d.name)).not.toContain('Unpublished change')
    await expect(
      payload.findVersions({ collection: 'products', locale: 'ko', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('translator can edit drafts but cannot publish, approve or change structure', async () => {
    const saved = await payload.update({
      collection: 'products',
      id: productId,
      locale: 'vi',
      draft: true,
      data: { name: 'Bản nháp VI', translationStatus: 'in-review', slug: 'hijacked' },
      user: translator,
      overrideAccess: false,
    })
    expect(saved.name).toBe('Bản nháp VI')
    expect(saved.slug).toBe('test-product')

    await expect(
      payload.update({
        collection: 'products',
        id: productId,
        locale: 'vi',
        draft: true,
        data: { translationStatus: 'approved' },
        user: translator,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/approve/i)

    await expect(
      payload.update({
        collection: 'products',
        id: productId,
        locale: 'vi',
        data: { _status: 'published' },
        user: translator,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/publish/i)

    await expect(
      payload.create({
        collection: 'products',
        locale: 'ko',
        draft: true,
        data: { name: 'x', slug: 'x' },
        user: translator,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('guests cannot write content', async () => {
    await expect(
      payload.update({ collection: 'products', id: productId, locale: 'ko', data: { name: 'x' }, ...guest }),
    ).rejects.toThrow()
  })
})

describe('globals', () => {
  it('a global is hidden from guests until published and approved in that locale', async () => {
    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'en',
      draft: true,
      data: { headline: 'Draft headline', translationStatus: 'approved' },
      user: editor,
      overrideAccess: false,
    })
    const draftView = await payload.findGlobal({ slug: 'home-page', locale: 'en', ...guest })
    expect(draftView.headline ?? undefined).toBeUndefined()

    await payload.updateGlobal({
      slug: 'home-page',
      locale: 'en',
      data: { headline: 'Published headline', translationStatus: 'approved', _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    const en = await payload.findGlobal({ slug: 'home-page', locale: 'en', ...guest })
    expect(en.headline).toBe('Published headline')

    const ko = await payload.findGlobal({ slug: 'home-page', locale: 'ko', ...guest })
    expect(ko.headline ?? undefined).toBeUndefined()
  })
})

describe('form submissions and private files', () => {
  it('only admins can read submissions; nobody can create them through the API', async () => {
    const data = { name: 'T', email: 't@test.local', message: 'Hello', consent: true }
    await expect(payload.create({ collection: 'contact-submissions', data, ...guest })).rejects.toThrow()
    await expect(
      payload.create({ collection: 'contact-submissions', data, user: admin, overrideAccess: false }),
    ).rejects.toThrow()

    // Trusted server path (server action) uses the Local API with overrideAccess.
    await payload.create({ collection: 'contact-submissions', data, overrideAccess: true })

    await expect(payload.find({ collection: 'contact-submissions', ...guest })).rejects.toThrow()
    await expect(payload.find({ collection: 'partner-inquiries', ...guest })).rejects.toThrow()
    await expect(
      payload.find({ collection: 'contact-submissions', overrideAccess: false, user: editor }),
    ).rejects.toThrow()
    const asAdmin = await payload.find({ collection: 'contact-submissions', overrideAccess: false, user: admin })
    expect(asAdmin.totalDocs).toBe(1)
  })

  it('source documents are not readable by guests', async () => {
    await expect(payload.find({ collection: 'source-documents', ...guest })).rejects.toThrow()
  })

  it('media stays private until an editor clears it for publication', async () => {
    // 1×1 transparent PNG; deleted again below so ./media is left as it was.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const file = { data: png, mimetype: 'image/png', name: `test-${Date.now()}.png`, size: png.length }
    const image = await payload.create({
      collection: 'media',
      locale: 'ko',
      data: { alt: 'Test image' },
      file,
      overrideAccess: true,
    })
    try {
      expect(image.publicRelease).toBe(false)
      // A translator cannot clear an image for publication (field access drops the change).
      const byTranslator = await payload.update({
        collection: 'media',
        id: image.id,
        data: { publicRelease: true },
        user: translator,
        overrideAccess: false,
      })
      expect(byTranslator.publicRelease).toBe(false)

      const hidden = await payload.find({ collection: 'media', ...guest })
      expect(hidden.docs.map((d) => d.id)).not.toContain(image.id)
      await expect(payload.findByID({ collection: 'media', id: image.id, ...guest })).rejects.toThrow()

      await payload.update({ collection: 'media', id: image.id, data: { publicRelease: true }, user: editor, overrideAccess: false })
      const shown = await payload.find({ collection: 'media', ...guest })
      expect(shown.docs.map((d) => d.id)).toContain(image.id)
      expect((shown.docs[0] as unknown as Record<string, unknown>).reviewNote).toBeUndefined()
    } finally {
      await payload.delete({ collection: 'media', id: image.id, overrideAccess: true })
    }
  })
})
