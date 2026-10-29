import { randomBytes } from 'crypto'
import { getPayload, handleEndpoints, type Payload, type Migration } from 'payload'
import { beforeAll, afterAll, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import type { User } from '@/payload-types'
import config from '@/payload.config'
import { migrations } from '@/migrations'
import { assertDisposableDatabase } from '../helpers/database'
let payload: Payload
let editor: User, translator: User
let token: string | undefined
const guest = { locale: 'en' as const, fallbackLocale: false as const, overrideAccess: false }
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
  'base64',
)
async function media(name: string) {
  return payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: name, publicRelease: true },
    file: { data: png, mimetype: 'image/png', name: name + '.png', size: png.length },
  })
}
beforeAll(async () => {
  payload = await getPayload({ config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  const password = randomBytes(20).toString('hex')
  await payload.create({
    collection: 'users',
    data: { email: 'review-admin@test.local', password, role: 'admin' },
  })
  editor = await payload.create({
    collection: 'users',
    data: { email: 'review-editor@test.local', password, role: 'editor' },
  })
  translator = await payload.create({
    collection: 'users',
    data: { email: 'review-translator@test.local', password, role: 'translator' },
  })
  token = (
    await payload.login({
      collection: 'users',
      data: { email: 'review-translator@test.local', password },
    })
  ).token
})
afterAll(async () => {
  await payload?.destroy()
})
it('publishing KO does not publish a revised EN translation with inherited approval', async () => {
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'Approved EN',
      accent: 'navy',
      slug: 'approval-review',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'ko',
    data: { name: 'Approved KO', translationStatus: 'approved', _status: 'published' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
    overrideAccess: false,
    user: translator,
    data: { name: 'UNREVIEWED EN' },
  })
  const before = await payload.findByID({ collection: 'products', id: p.id, ...guest })
  expect(before.name).toBe('Approved EN')
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'ko',
    draft: true,
    overrideAccess: false,
    user: editor,
    data: { name: 'Revised KO' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'ko',
    draft: true,
    overrideAccess: false,
    user: editor,
    data: { translationStatus: 'approved' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'ko',
    overrideAccess: false,
    user: editor,
    data: { _status: 'published' },
  })
  const after = await payload.findByID({ collection: 'products', id: p.id, ...guest })
  expect(after.name).toBe('Approved EN')
  const draft = await payload.findByID({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
  })
  expect(draft.name).toBe('UNREVIEWED EN')
  expect(draft.translationStatus).not.toBe('approved')
})
it('rejects translator multipart binary replacement of a released media file', async () => {
  const original = await media('released-original')
  const form = new FormData()
  form.set('_payload', JSON.stringify({ alt: 'Changed' }))
  form.set('file', new Blob([png], { type: 'image/png' }), 'unreviewed-replacement.png')
  const response = await handleEndpoints({
    config,
    request: new Request('http://localhost:3000/api/media/' + original.id + '?locale=en', {
      method: 'PATCH',
      headers: { Authorization: 'JWT ' + token },
      body: form,
    }),
  })
  expect(response.status).toBe(403)
  const saved = await payload.findByID({ collection: 'media', id: original.id })
  expect(saved.filename).toBe(original.filename)
  expect(saved.publicRelease).toBe(true)
})
it('blocks translator image relations and shared structural fields server-side', async () => {
  const a = await media('structure-a'),
    b = await media('structure-b')
  const line = await payload.create({
    collection: 'product-lines',
    locale: 'en',
    data: {
      name: 'Line',
      slug: 'review-line',
      translationStatus: 'in-review',
      heroImage: a.id,
      appearance: 'light',
    },
  })
  const changed = await payload.update({
    collection: 'product-lines',
    id: line.id,
    locale: 'en',
    draft: true,
    overrideAccess: false,
    user: translator,
    data: { heroImage: b.id, appearance: 'dark', slug: 'changed-line', order: 999 },
  })
  expect(typeof changed.heroImage === 'object' ? changed.heroImage?.id : changed.heroImage).toBe(
    a.id,
  )
  expect(changed.appearance).toBe('light')
  expect(changed.slug).toBe('review-line')
  expect(changed.order).toBe(0)
  for (const collection of ['ingredients', 'technologies'] as const) {
    const doc = await payload.create({
      collection,
      locale: 'en',
      data: {
        name: 'Ingredient',
        slug: 'review-' + collection,
        translationStatus: 'in-review',
        image: a.id,
      },
    })
    const edited = await payload.update({
      collection,
      id: doc.id,
      locale: 'en',
      draft: true,
      overrideAccess: false,
      user: translator,
      data: { image: b.id, slug: 'changed-' + collection, order: 999 },
    })
    expect(typeof edited.image === 'object' ? edited.image?.id : edited.image).toBe(a.id)
    expect(edited.slug).toBe('review-' + collection)
    expect(edited.order).toBe(0)
  }
})

it('preserves a released binary when an editor attempts in-place replacement', async () => {
  const original = await media('editor-original')
  await expect(
    payload.update({
      collection: 'media',
      id: original.id,
      user: editor,
      overrideAccess: false,
      data: { alt: 'new' },
      file: { data: png, name: 'new-editor.png', mimetype: 'image/png', size: png.length },
    }),
  ).rejects.toThrow(/new unreleased/)
  const saved = await payload.findByID({ collection: 'media', id: original.id })
  expect(saved.filename).toBe(original.filename)
  expect(saved.publicRelease).toBe(true)
  const replacement = await payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: 'Replacement' },
    file: { data: png, name: 'replacement.png', mimetype: 'image/png', size: png.length },
  })
  expect(replacement.publicRelease).toBe(false)
})

it('preserves approved global EN when KO is published over a pending EN revision', async () => {
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'en',
    data: { headline: 'Approved global EN', translationStatus: 'approved', _status: 'published' },
  })
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'ko',
    data: { headline: 'Approved global KO', translationStatus: 'approved', _status: 'published' },
  })
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'en',
    draft: true,
    user: translator,
    overrideAccess: false,
    data: { headline: 'Unreviewed global EN' },
  })
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'ko',
    draft: true,
    user: editor,
    overrideAccess: false,
    data: { headline: 'Revised KO' },
  })
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'ko',
    draft: true,
    user: editor,
    overrideAccess: false,
    data: { translationStatus: 'approved' },
  })
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'ko',
    user: editor,
    overrideAccess: false,
    data: { _status: 'published' },
  })
  const en = await payload.findGlobal({ slug: 'home-page', ...guest })
  expect(en.headline).toBe('Approved global EN')
  const draft = await payload.findGlobal({ slug: 'home-page', locale: 'en', draft: true })
  expect(draft.headline).toBe('Unreviewed global EN')
  expect(draft.translationStatus).toBe('in-review')
})
