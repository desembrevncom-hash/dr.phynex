import sharp from 'sharp'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getPayload, handleEndpoints, type Payload, type Migration } from 'payload'
import { beforeAll, afterAll, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import config from '@/payload.config'
import { migrations } from '@/migrations'
import type { User } from '@/payload-types'
import { assertDisposableDatabase } from '../helpers/database'
let payload: Payload
let editor: User, translator: User
const tokens: Record<string, string> = {}
const guest = { locale: 'en' as const, fallbackLocale: false as const, overrideAccess: false }
async function rest(path: string, data: unknown, role = 'editor', method = 'PATCH') {
  return handleEndpoints({
    config,
    request: new Request('http://localhost:3015/api/' + path, {
      method,
      headers: { Authorization: 'JWT ' + tokens[role], 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  })
}
beforeAll(async () => {
  payload = await getPayload({ config })
  await assertDisposableDatabase(payload)
  await payload.db.dropDatabase({ adapter: payload.db as never })
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })
  const password = randomBytes(24).toString('hex')
  await payload.create({
    collection: 'users',
    data: { email: 'p1-admin@test.local', password, role: 'admin' },
  })
  for (const role of ['editor', 'translator'] as const) {
    const user = await payload.create({
      collection: 'users',
      data: { email: 'p1-' + role + '@test.local', password, role },
    })
    if (role === 'editor') editor = user
    else translator = user
    tokens[role] = (
      await payload.login({ collection: 'users', data: { email: user.email, password } })
    ).token!
  }
})
afterAll(async () => {
  await payload?.destroy()
})
it('rejects every Payload JSON image edit before sharp or disk writes, preserving the released file', async () => {
  const resolved = await config

  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#123456' } })
    .png()
    .toBuffer()
  const upload = payload.collections.media.config.upload
  if (!upload || typeof upload !== 'object') throw Error('Upload config missing')
  for (const role of ['translator', 'editor'])
    for (const [query, data] of [
      [
        '&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',
        {},
      ],
      ['&uploadEdits[widthInPixels]=10', {}],
      ['&uploadEdits[heightInPixels]=10', {}],
      ['multipart', {}],
      ['&uploadEdits[focalPoint][x]=20&uploadEdits[focalPoint][y]=30', {}],
      ['', { focalX: 20, focalY: 30 }],
    ] as const) {
      const original = await payload.create({
        collection: 'media',
        locale: 'en',
        data: { alt: 'Original', publicRelease: true },
        file: {
          data: png,
          mimetype: 'image/png',
          name: randomBytes(8).toString('hex') + '.png',
          size: png.length,
        },
      })
      const file = join(upload.staticDir!, original.filename!)
      const hash = async () =>
        createHash('sha256')
          .update(await readFile(file))
          .digest('hex')
      const before = await hash(),
        files = await readdir(upload.staticDir!)
      const spy = vi.spyOn(resolved, 'sharp')
      let response: Response
      if (query === 'multipart') {
        const form = new FormData()
        form.set('_payload', JSON.stringify({ alt: 'Changed' }))
        form.set('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'replacement.png')
        response = await handleEndpoints({
          config,
          request: new Request('http://localhost:3015/api/media/' + original.id + '?locale=en', {
            method: 'PATCH',
            headers: { Authorization: 'JWT ' + tokens[role] },
            body: form,
          }),
        })
      } else
        response = await rest(
          'media/' + original.id + '?locale=en' + query,
          { ...data, alt: 'Changed' },
          role,
        )
      const calls = spy.mock.calls.length
      spy.mockRestore()
      expect(response.status).toBe(role === 'translator' ? 403 : 409)
      expect(calls).toBe(0)
      expect(await hash()).toBe(before)
      expect(await readdir(upload.staticDir!)).toEqual(files)
      const saved = await payload.findByID({ collection: 'media', id: original.id })
      for (const key of ['filename', 'filesize', 'width', 'height', 'publicRelease'] as const)
        expect(saved[key]).toBe(original[key])
      const publicFile = await handleEndpoints({
        config,
        request: new Request('http://localhost:3015/api/media/file/' + original.filename),
      })
      expect(publicFile.status).toBe(200)
      expect(
        createHash('sha256')
          .update(Buffer.from(await publicFile.arrayBuffer()))
          .digest('hex'),
      ).toBe(before)
    }
})
it('allows translator alt-only edits without changing binary or release', async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } })
    .png()
    .toBuffer()
  const doc = await payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: 'Old', publicRelease: true },
    file: { data: png, mimetype: 'image/png', name: 'alt-only.png', size: png.length },
  })
  expect(
    (await rest('media/' + doc.id + '?locale=en', { alt: 'Translated alt' }, 'translator')).status,
  ).toBe(200)
  const saved = await payload.findByID({ collection: 'media', id: doc.id, locale: 'en' })
  expect(saved.alt).toBe('Translated alt')
  expect(saved.publicRelease).toBe(true)
  expect(saved.filename).toBe(doc.filename)
})
it('rejects all and invalid locale publish after EN draft, preserving public globals and collections', async () => {
  await payload.updateGlobal({
    slug: 'brand-page',
    locale: 'en',
    data: {
      title: 'OLD PUBLIC EN',
      seo: { title: 'OLD META EN' },
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  await payload.updateGlobal({
    slug: 'brand-page',
    locale: 'ko',
    data: { title: 'OLD PUBLIC KO', translationStatus: 'approved', _status: 'published' },
  })
  await payload.updateGlobal({
    slug: 'brand-page',
    locale: 'en',
    draft: true,
    user: translator,
    overrideAccess: false,
    data: { title: 'PRIVATE EN', seo: { title: 'PRIVATE META' } },
  })
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'OLD PRODUCT',
      slug: 'p1-locale',
      accent: 'navy',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  for (const locale of ['all', 'invalid', '*']) {
    expect(
      (
        await rest(
          'globals/brand-page?locale=' + locale,
          { _status: 'published' },
          'editor',
          'POST',
        )
      ).status,
    ).toBe(400)
    expect(
      (await rest('products/' + p.id + '?locale=' + locale, { _status: 'published' })).status,
    ).toBe(400)
    await expect(
      payload.updateGlobal({
        slug: 'brand-page',
        locale: locale as 'en',
        data: { _status: 'published' },
      }),
    ).rejects.toThrow(/locale/i)
    await expect(
      payload.update({
        collection: 'products',
        id: p.id,
        locale: locale as 'en',
        data: { _status: 'published' },
      }),
    ).rejects.toThrow(/locale/i)
  }
  const en = await payload.findGlobal({ slug: 'brand-page', ...guest }),
    ko = await payload.findGlobal({ slug: 'brand-page', ...guest, locale: 'ko' })
  expect(en.title).toBe('OLD PUBLIC EN')
  expect(en.seo?.title).toBe('OLD META EN')
  expect(ko.title).toBe('OLD PUBLIC KO')
  expect((await payload.findByID({ collection: 'products', id: p.id, ...guest })).name).toBe(
    'OLD PRODUCT',
  )
})
it('editor changes require separate intentional reapproval before publishing', async () => {
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'Reviewed',
      slug: 'p1-editor',
      accent: 'navy',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
    user: editor,
    overrideAccess: false,
    data: { name: 'Edited', translationStatus: 'approved' },
  })
  expect(
    (await payload.findByID({ collection: 'products', id: p.id, locale: 'en', draft: true }))
      .translationStatus,
  ).toBe('in-review')
  await expect(
    payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      user: editor,
      overrideAccess: false,
      data: { _status: 'published' },
    }),
  ).rejects.toThrow(/review/i)
  expect((await payload.findByID({ collection: 'products', id: p.id, ...guest })).name).toBe(
    'Reviewed',
  )
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
    user: editor,
    overrideAccess: false,
    data: { translationStatus: 'approved' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    user: editor,
    overrideAccess: false,
    data: { _status: 'published' },
  })
  expect((await payload.findByID({ collection: 'products', id: p.id, ...guest })).name).toBe(
    'Edited',
  )
})
it('blocks whole-document restore over REST and Local API including draft=true', async () => {
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'Restore original',
      slug: 'p1-restore',
      accent: 'navy',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  const versions = await payload.findVersions({
    collection: 'products',
    where: { parent: { equals: p.id } },
  })
  const globals = await payload.findGlobalVersions({ slug: 'brand-page' })
  for (const draft of [false, true]) {
    await expect(
      payload.restoreVersion({
        collection: 'products',
        id: versions.docs[0].id,
        locale: 'en',
        draft,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/restore/i)
    await expect(
      payload.restoreGlobalVersion({
        slug: 'brand-page',
        id: globals.docs[0].id,
        locale: 'en',
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/restore/i)
    expect(
      (
        await rest(
          'products/versions/' + versions.docs[0].id + '?locale=en&draft=' + draft,
          {},
          'editor',
          'POST',
        )
      ).status,
    ).toBe(409)
    expect(
      (
        await rest(
          'globals/brand-page/versions/' + globals.docs[0].id + '?locale=en&draft=' + draft,
          {},
          'editor',
          'POST',
        )
      ).status,
    ).toBe(409)
  }
  expect((await payload.findByID({ collection: 'products', id: p.id, ...guest })).name).toBe(
    'Restore original',
  )
})
it('blocks translator transformations on unreleased Media even with Local overrideAccess', async () => {
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: 'white' } })
    .png()
    .toBuffer()
  const m = await payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: 'Unreleased' },
    file: { data: png, name: 'unreleased-edit.png', mimetype: 'image/png', size: png.length },
  })
  for (const overrideAccess of [false, true]) {
    await expect(
      payload.update({
        collection: 'media',
        id: m.id,
        user: translator,
        overrideAccess,
        data: { focalX: 20, focalY: 30 },
      }),
    ).rejects.toThrow(/editors/i)
    await expect(
      payload.update({
        collection: 'media',
        id: m.id,
        user: translator,
        overrideAccess,
        data: {},
        file: { data: png, name: 'blocked.png', mimetype: 'image/png', size: png.length },
      }),
    ).rejects.toThrow(/editors/i)
  }
  expect(
    (
      await rest(
        'media/' +
          m.id +
          '?locale=en&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',
        {},
        'translator',
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await rest(
        'media/' +
          m.id +
          '?locale=en&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',
        {},
        'editor',
      )
    ).status,
  ).toBe(200)
  const saved = await payload.findByID({ collection: 'media', id: m.id })
  expect(saved.width).toBe(10)
  expect(saved.publicRelease).toBe(false)
})
it('editor global draft resets approval for SEO and requires separate reapproval', async () => {
  await payload.updateGlobal({
    slug: 'home-page',
    locale: 'en',
    data: {
      headline: 'Public headline',
      seo: { title: 'Public metadata' },
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  expect(
    (
      await rest(
        'globals/home-page?locale=en&draft=true',
        { seo: { title: 'Private metadata' }, translationStatus: 'approved' },
        'editor',
        'POST',
      )
    ).status,
  ).toBe(200)
  expect(
    (await payload.findGlobal({ slug: 'home-page', locale: 'en', draft: true })).translationStatus,
  ).toBe('in-review')
  expect(
    (await rest('globals/home-page?locale=en', { _status: 'published' }, 'editor', 'POST')).status,
  ).toBe(409)
  expect((await payload.findGlobal({ slug: 'home-page', ...guest })).seo?.title).toBe(
    'Public metadata',
  )
  expect(
    (
      await rest(
        'globals/home-page?locale=en&draft=true',
        { translationStatus: 'approved' },
        'editor',
        'POST',
      )
    ).status,
  ).toBe(200)
  expect(
    (await rest('globals/home-page?locale=en', { _status: 'published' }, 'editor', 'POST')).status,
  ).toBe(200)
  expect((await payload.findGlobal({ slug: 'home-page', ...guest })).seo?.title).toBe(
    'Private metadata',
  )
})
it('characterizes native global draft restore as a whole-snapshot main write, without the application guard', async () => {
  await payload.updateGlobal({
    slug: 'partnership-page',
    locale: 'en',
    data: { title: 'Historical EN', translationStatus: 'approved', _status: 'published' },
  })
  const historical = (
    await payload.findGlobalVersions({ slug: 'partnership-page', sort: 'createdAt', limit: 1 })
  ).docs[0]
  await payload.updateGlobal({
    slug: 'partnership-page',
    locale: 'en',
    draft: true,
    data: { title: 'Current public EN' },
  })
  await payload.updateGlobal({
    slug: 'partnership-page',
    locale: 'en',
    draft: true,
    data: { translationStatus: 'approved' },
  })
  await payload.updateGlobal({
    slug: 'partnership-page',
    locale: 'en',
    data: { _status: 'published' },
  })
  const global = payload.globals.config.find((g) => g.slug === 'partnership-page')!
  const hooks = global.hooks.beforeOperation
  // Test-only characterization of the dependency. Production never removes this guard.
  global.hooks.beforeOperation = hooks.filter((h) => h.name !== 'blockContentRestore')
  try {
    expect(
      (
        await rest(
          'globals/partnership-page/versions/' + historical.id + '?locale=en&draft=true',
          {},
          'editor',
          'POST',
        )
      ).status,
    ).toBe(200)
    const main = await payload.db.findGlobal({ slug: 'partnership-page' })
    expect(main?._status).toBe('draft')
    expect(main?.title.en).toBe('Historical EN')
    expect((await payload.findGlobal({ slug: 'partnership-page', ...guest })).title).not.toBe(
      'Current public EN',
    )
  } finally {
    global.hooks.beforeOperation = hooks
  }
})
it('rejects implicit live content edits and all-locale publication flags, preserving public content', async () => {
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'Safe public',
      slug: 'p1-implicit',
      accent: 'navy',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  await expect(
    payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      user: editor,
      data: { name: 'Implicit replacement' },
    }),
  ).rejects.toThrow(/draft/i)
  expect(
    (
      await rest(
        'globals/brand-page?locale=en',
        { title: 'Implicit global replacement' },
        'editor',
        'POST',
      )
    ).status,
  ).toBe(409)
  await expect(
    payload.update({
      collection: 'products',
      id: p.id,
      locale: 'en',
      publishAllLocales: true,
      data: { _status: 'published' },
    }),
  ).rejects.toThrow(/locale/i)
  await expect(
    payload.updateGlobal({
      slug: 'brand-page',
      locale: 'en',
      publishAllLocales: true,
      data: { _status: 'published' },
    }),
  ).rejects.toThrow(/locale/i)
  expect((await payload.findByID({ collection: 'products', id: p.id, ...guest })).name).toBe(
    'Safe public',
  )
})
it('prevents file identity swaps through privileged Local calls carrying a staff user', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'white' } })
    .png()
    .toBuffer()
  const m = await payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: 'Identity', publicRelease: true },
    file: { data: png, name: 'identity-protected.png', mimetype: 'image/png', size: png.length },
  })
  for (const user of [translator, editor]) {
    await expect(
      payload.update({
        collection: 'media',
        id: m.id,
        user,
        overrideAccess: true,
        data: {
          filename: 'replacement-identity.png',
          url: '/api/media/file/replacement-identity.png',
        },
      }),
    ).rejects.toThrow(/editors|new unreleased/i)
  }
  const saved = await payload.findByID({ collection: 'media', id: m.id })
  expect(saved.filename).toBe(m.filename)
  expect(saved.url).toBe(m.url)
  expect(saved.publicRelease).toBe(true)
})
it('allows deliberate approval withdrawal after publishing a previously pending draft', async () => {
  const p = await payload.create({
    collection: 'products',
    locale: 'en',
    data: {
      name: 'First public',
      slug: 'p1-withdrawal',
      accent: 'navy',
      translationStatus: 'approved',
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
    data: { name: 'Second reviewed' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    draft: true,
    data: { translationStatus: 'approved' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    data: { _status: 'published' },
  })
  await payload.update({
    collection: 'products',
    id: p.id,
    locale: 'en',
    data: { translationStatus: 'in-review', _status: 'published' },
  })
  await expect(payload.findByID({ collection: 'products', id: p.id, ...guest })).rejects.toThrow()
})

// Full form submissions retain translationStatus even when Publish is the only action.
for (const kind of ['product', 'global'] as const) {
  it(
    'keeps published content and draft when full admin ' + kind + ' Publish is unapproved',
    async () => {
      const field = kind === 'product' ? 'name' : 'title'
      let id = 0
      if (kind === 'product') {
        const p = await payload.create({
          collection: 'products',
          locale: 'en',
          data: {
            name: 'Form old EN',
            slug: 'full-form-regression',
            accent: 'navy',
            seo: { title: 'Form old metadata EN' },
            translationStatus: 'approved',
            _status: 'published',
          },
        })
        id = p.id
        await payload.update({
          collection: 'products',
          id,
          locale: 'ko',
          data: {
            name: 'Form old KO',
            seo: { title: 'Form old metadata KO' },
            translationStatus: 'approved',
            _status: 'published',
          },
        })
      } else {
        for (const locale of ['en', 'ko'] as const) {
          await payload.updateGlobal({
            slug: 'brand-page',
            locale,
            draft: true,
            data: {
              title: 'Form old ' + locale.toUpperCase(),
              seo: { title: 'Form old metadata ' + locale.toUpperCase() },
            },
          })
          await payload.updateGlobal({
            slug: 'brand-page',
            locale,
            draft: true,
            data: { translationStatus: 'approved' },
          })
          await payload.updateGlobal({ slug: 'brand-page', locale, data: { _status: 'published' } })
        }
      }
      const path = kind === 'product' ? 'products/' + id : 'globals/brand-page'
      const method = kind === 'product' ? 'PATCH' : 'POST'
      const read = async (locale: 'en' | 'ko', draft = false) =>
        kind === 'product'
          ? payload.findByID({
              collection: 'products',
              id,
              locale,
              draft,
              fallbackLocale: false,
              depth: 0,
              overrideAccess: true,
            })
          : payload.findGlobal({
              slug: 'brand-page',
              locale,
              draft,
              fallbackLocale: false,
              depth: 0,
              overrideAccess: true,
            })
      if (kind === 'product')
        await payload.update({
          collection: 'products',
          id,
          locale: 'en',
          draft: true,
          user: editor,
          overrideAccess: false,
          data: { name: 'Form private EN', seo: { title: 'Form private metadata EN' } },
        })
      else
        await payload.updateGlobal({
          slug: 'brand-page',
          locale: 'en',
          draft: true,
          user: editor,
          overrideAccess: false,
          data: { title: 'Form private EN', seo: { title: 'Form private metadata EN' } },
        })
      const old = await read('en'),
        other = await read('ko'),
        draft = await read('en', true)
      const full = JSON.parse(JSON.stringify(draft))
      full._status = 'published'
      expect(full.translationStatus).toBe('in-review')
      expect((await rest(path + '?locale=en', full, 'editor', method)).status).toBe(409)
      expect(await read('en')).toEqual(old)
      expect(await read('ko')).toEqual({ ...other, updatedAt: expect.any(String) })
      expect(await read('en', true)).toEqual(draft)
      expect(
        (
          await rest(
            path + '?locale=en&draft=true',
            { translationStatus: 'approved' },
            'editor',
            method,
          )
        ).status,
      ).toBe(200)
      const approved = JSON.parse(JSON.stringify(await read('en', true)))
      approved._status = 'published'
      expect((await rest(path + '?locale=en', approved, 'editor', method)).status).toBe(200)
      const published = (await read('en')) as unknown as Record<string, unknown>
      expect(published[field]).toBe('Form private EN')
      expect(published.seo).toMatchObject({ title: 'Form private metadata EN' })
      expect(await read('ko')).toEqual({ ...other, updatedAt: expect.any(String) })
      const withdraw = JSON.parse(JSON.stringify(await read('en', true)))
      withdraw.translationStatus = 'in-review'
      withdraw._status = 'published'
      expect((await rest(path + '?locale=en', withdraw, 'translator', method)).status).toBe(403)
      expect((await rest(path + '?locale=en', withdraw, 'editor', method)).status).toBe(200)
      if (kind === 'product')
        await expect(payload.findByID({ collection: 'products', id, ...guest })).rejects.toThrow()
      else
        expect((await payload.findGlobal({ slug: 'brand-page', ...guest })).title).not.toBe(
          'Form private EN',
        )
      expect(await read('ko')).toEqual({ ...other, updatedAt: expect.any(String) })
    },
  )
}
it('validates original Local mutation locale before publishSpecificLocale can replace it', async () => {
  const { getPayloadClient } = await import('@/lib/content-client')
  const guarded = await getPayloadClient()
  const p = await guarded.create({
    collection: 'products',
    locale: 'en',
    draft: true,
    data: { name: 'Local locale guard', slug: 'local-locale-guard', accent: 'navy' },
  })
  for (const locale of ['all', '*', 'invalid', 'en'] as const) {
    const publishSpecificLocale = locale === 'en' ? 'ko' : 'en'
    await expect(
      guarded.updateGlobal({
        slug: 'brand-page',
        locale: locale as 'en',
        publishSpecificLocale,
        user: editor,
        overrideAccess: false,
        data: { _status: 'published', translationStatus: 'approved' },
      }),
    ).rejects.toThrow(/locale/i)
    await expect(
      guarded.update({
        collection: 'products',
        id: p.id,
        locale: locale as 'en',
        publishSpecificLocale,
        data: { _status: 'published' },
      }),
    ).rejects.toThrow(/locale/i)
    await expect(
      guarded.create({
        collection: 'products',
        locale: locale as 'en',
        data: {
          name: 'Rejected locale',
          slug: 'rejected-local-locale',
          accent: 'navy',
          _status: 'published',
        },
        ...{ publishSpecificLocale },
      } as Parameters<typeof guarded.create>[0]),
    ).rejects.toThrow(/locale/i)
  }
})
