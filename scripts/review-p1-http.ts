import { withContentLocaleGuard } from '../src/lib/content-mutations'
import { config as loadEnv } from 'dotenv'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { getPayload } from 'payload'
import { assertDisposableDatabase } from '../tests/helpers/database'
loadEnv({ path: '.env.local', override: true })
async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = withContentLocaleGuard(await getPayload({ config }))
  await assertDisposableDatabase(payload)
  const origin = 'http://localhost:3015',
    suffix = randomUUID().slice(0, 8)
  let checks = 0
  const check = (value: unknown, label: string) => {
    assert.ok(value, label)
    checks++
    console.log('PASS ' + label)
  }
  const tokens: Record<string, string> = {}
  const request = (path: string, data: unknown, role = 'editor', method = 'POST') =>
    fetch(origin + '/api/' + path, {
      method,
      headers: { Authorization: 'JWT ' + tokens[role], 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  const read = async (path: string) => {
    const r = await fetch(origin + path)
    return { status: r.status, html: await r.text() }
  }
  try {
    await payload.create({
      collection: 'users',
      data: {
        email: 'p1-http-admin-' + suffix + '@test.local',
        password: randomBytes(24).toString('hex'),
        role: 'admin',
      },
    })
    for (const role of ['editor', 'translator'] as const) {
      const password = randomBytes(24).toString('hex'),
        email = 'p1-http-' + role + '-' + suffix + '@test.local'
      const user = await payload.create({ collection: 'users', data: { email, password, role } })
      assert.equal(user.role, role, 'HTTP fixture role must match the requested role')
      tokens[role] = (
        await payload.login({ collection: 'users', data: { email, password } })
      ).token!
    }
    const title = 'PUBLIC EN ' + suffix,
      metadata = 'PUBLIC META ' + suffix,
      ko = 'PUBLIC KO ' + suffix,
      privateText = 'PRIVATE DRAFT ' + suffix
    for (const [locale, label] of [
      ['en', title],
      ['ko', ko],
    ] as const) {
      await payload.updateGlobal({
        slug: 'brand-page',
        locale,
        draft: true,
        data: {
          title: label,
          intro: label,
          seo: { title: locale === 'en' ? metadata : label },
          translationStatus: 'in-review',
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
    for (const role of ['translator', 'editor']) {
      check(
        (
          await request(
            'globals/brand-page?locale=en&draft=true',
            { title: privateText, intro: privateText, seo: { title: privateText } },
            role,
          )
        ).status === 200,
        role + ' global EN draft saves',
      )
      for (const locale of ['all', 'invalid', '*'])
        check(
          (await request('globals/brand-page?locale=' + locale, { _status: 'published' }, role))
            .status === 400,
          role + ' global publish rejects ' + locale,
        )
      const en = await read('/en/brand'),
        other = await read('/ko/brand')
      check(
        en.status === 200 &&
          en.html.includes(title) &&
          en.html.includes(metadata) &&
          !en.html.includes(privateText),
        'public HTML/title/metadata preserve EN after ' + role + ' draft and rejected publish',
      )
      check(
        other.status === 200 && other.html.includes(ko) && !other.html.includes(privateText),
        'valid KO remains public after ' + role + ' EN draft',
      )
    }
    check(
      (await request('globals/brand-page?locale=en', { _status: 'published' })).status === 409,
      'single-locale publish requires draft reapproval',
    )
    check(
      (await request('globals/brand-page?locale=en&draft=true', { translationStatus: 'approved' }))
        .status === 200,
      'editor deliberately reapproves without content edits',
    )
    check(
      (await request('globals/brand-page?locale=en', { _status: 'published' })).status === 200,
      'approved locale can publish',
    )
    check(
      (await read('/en/brand')).html.includes(privateText),
      'new EN appears only after deliberate approval and publish',
    )
    // Use the complete fetched form, including its unchanged In review value.
    for (const kind of ['product', 'global'] as const) {
      const oldTitle = 'Form old ' + kind + ' ' + suffix,
        newTitle = 'Form new ' + kind + ' ' + suffix
      const oldMeta = 'Form old metadata ' + kind + ' ' + suffix,
        newMeta = 'Form new metadata ' + kind + ' ' + suffix
      let id = 0
      const slug = 'form-product-' + suffix
      if (kind === 'product') {
        const doc = await payload.create({
          collection: 'products',
          locale: 'en',
          data: {
            name: oldTitle,
            slug,
            accent: 'navy',
            seo: { title: oldMeta },
            translationStatus: 'approved',
            _status: 'published',
          },
        })
        id = doc.id
        await payload.update({
          collection: 'products',
          id,
          locale: 'ko',
          data: {
            name: 'Form KO ' + suffix,
            seo: { title: 'Form KO metadata ' + suffix },
            translationStatus: 'approved',
            _status: 'published',
          },
        })
      } else {
        await payload.updateGlobal({
          slug: 'brand-page',
          locale: 'en',
          draft: true,
          data: { title: oldTitle, seo: { title: oldMeta } },
        })
        await payload.updateGlobal({
          slug: 'brand-page',
          locale: 'en',
          draft: true,
          data: { translationStatus: 'approved' },
        })
        await payload.updateGlobal({
          slug: 'brand-page',
          locale: 'en',
          data: { _status: 'published' },
        })
      }
      const api = kind === 'product' ? 'products/' + id : 'globals/brand-page'
      const path = kind === 'product' ? '/products/' + slug : '/brand'
      const method = kind === 'product' ? 'PATCH' : 'POST'
      const draft = async () =>
        kind === 'product'
          ? payload.findByID({ collection: 'products', id, locale: 'en', draft: true, depth: 0 })
          : payload.findGlobal({ slug: 'brand-page', locale: 'en', draft: true, depth: 0 })
      const koBefore = await read('/ko' + path)
      if (kind === 'product')
        await payload.update({
          collection: 'products',
          id,
          locale: 'en',
          draft: true,
          data: { name: newTitle, seo: { title: newMeta } },
        })
      else
        await payload.updateGlobal({
          slug: 'brand-page',
          locale: 'en',
          draft: true,
          data: { title: newTitle, seo: { title: newMeta } },
        })
      const pending = await draft(),
        full = JSON.parse(JSON.stringify(pending))
      full._status = 'published'
      check(
        (await request(api + '?locale=en', full, 'editor', method)).status === 409,
        kind + ' full admin unreviewed Publish rejected',
      )
      const unchanged = await read('/en' + path)
      check(
        unchanged.status === 200 &&
          unchanged.html.includes(oldTitle) &&
          unchanged.html.includes(oldMeta) &&
          !unchanged.html.includes(newTitle) &&
          !unchanged.html.includes(newMeta),
        kind + ' previous HTML and metadata remain public after rejected Publish',
      )
      check(
        JSON.stringify(await draft()) === JSON.stringify(pending),
        kind + ' rejected Publish preserves complete pending draft',
      )
      check(
        (
          await request(
            api + '?locale=en&draft=true',
            { translationStatus: 'approved' },
            'editor',
            method,
          )
        ).status === 200,
        kind + ' separate approval accepted',
      )
      const approved = JSON.parse(JSON.stringify(await draft()))
      approved._status = 'published'
      check(
        (await request(api + '?locale=en', approved, 'editor', method)).status === 200,
        kind + ' full approved form publishes',
      )
      const current = await read('/en' + path)
      check(
        current.status === 200 && current.html.includes(newTitle) && current.html.includes(newMeta),
        kind + ' approved HTML and metadata now public',
      )
      const withdrawal = JSON.parse(JSON.stringify(await draft()))
      withdrawal._status = 'published'
      withdrawal.translationStatus = 'in-review'
      check(
        (await request(api + '?locale=en', withdrawal, 'translator', method)).status === 403,
        kind + ' translator cannot withdraw publication',
      )
      check(
        (await request(api + '?locale=en', withdrawal, 'editor', method)).status === 200,
        kind + ' actual Approved to In review withdrawal succeeds',
      )
      check(
        !(await read('/en' + path)).html.includes(newTitle),
        kind + ' intentional withdrawal removes public revision',
      )
      const koAfter = await read('/ko' + path)
      const titleTag = (html: string) => html.match(/<title>[^<]*<\/title>/)?.[0]
      check(
        koAfter.status === koBefore.status && titleTag(koAfter.html) === titleTag(koBefore.html),
        kind + ' KO remains available with unchanged metadata',
      )
    }
    const png = await sharp({
      create: { width: 40, height: 40, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      locale: 'en',
      data: { alt: 'P1 HTTP', publicRelease: true },
      file: {
        data: png,
        name: 'p1-http-' + suffix + '.png',
        mimetype: 'image/png',
        size: png.length,
      },
    })
    const path = '/api/media/file/' + media.filename
    const originalResponse = await fetch(origin + path),
      original = Buffer.from(await originalResponse.arrayBuffer())
    const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex')
    for (const role of ['translator', 'editor']) {
      check(
        (
          await request(
            'media/' +
              media.id +
              '?locale=en&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',
            {},
            role,
            'PATCH',
          )
        ).status === (role === 'translator' ? 403 : 409),
        role + ' HTTP crop rejected',
      )
      const saved = await payload.findByID({ collection: 'media', id: media.id })
      check(
        ['filename', 'filesize', 'width', 'height', 'publicRelease'].every(
          (k) => saved[k as keyof typeof saved] === media[k as keyof typeof media],
        ),
        role + ' rejected crop retains file metadata and release',
      )
      const r = await fetch(origin + path),
        bytes = Buffer.from(await r.arrayBuffer())
      check(
        r.status === 200 &&
          hash(bytes) === hash(original) &&
          r.headers.get('cache-control')?.includes('no-store'),
        role + ' original still public with identical checksum and no-store',
      )
    }
    check(
      (
        await request(
          'media/' + media.id + '?locale=en',
          { alt: 'Translated alt' },
          'translator',
          'PATCH',
        )
      ).status === 200,
      'translator alt text remains editable',
    )
    const p = await payload.create({
      collection: 'products',
      locale: 'en',
      data: {
        name: 'HTTP restore ' + suffix,
        accent: 'navy',
        slug: 'p1-restore-' + suffix,
        translationStatus: 'approved',
        _status: 'published',
      },
    })
    // The full-form tests intentionally withdrew Brand Page. Reapprove its reviewed
    // revision so the existing restore checks start with a valid public global.
    await payload.updateGlobal({
      slug: 'brand-page',
      locale: 'en',
      draft: true,
      data: { translationStatus: 'approved' },
    })
    await payload.updateGlobal({ slug: 'brand-page', locale: 'en', data: { _status: 'published' } })
    const restorePublicGlobal = await payload.findGlobal({
      slug: 'brand-page',
      locale: 'en',
      fallbackLocale: false,
      overrideAccess: false,
    })
    const versions = await payload.findVersions({
        collection: 'products',
        where: { parent: { equals: p.id } },
      }),
      globals = await payload.findGlobalVersions({ slug: 'brand-page' })
    for (const draft of [false, true]) {
      check(
        (
          await request(
            'products/versions/' + versions.docs[0].id + '?locale=en&draft=' + draft,
            {},
          )
        ).status === 409,
        'HTTP collection restore blocked draft=' + draft,
      )
      check(
        (
          await request(
            'globals/brand-page/versions/' + globals.docs[0].id + '?locale=en&draft=' + draft,
            {},
          )
        ).status === 409,
        'HTTP global restore blocked draft=' + draft,
      )
    }
    check(
      (await read('/en/brand')).html.includes(String(restorePublicGlobal.title)),
      'rejected restore preserves current public global',
    )
    check(
      (await read('/en/products/' + p.slug)).html.includes(p.name),
      'rejected restore preserves current public collection',
    )
    console.log('P1 HTTP checks passed: ' + checks)
  } finally {
    await payload.destroy()
  }
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error('P1 HTTP validation failed; no credentials or response bodies logged')
    process.exit(1)
  })
