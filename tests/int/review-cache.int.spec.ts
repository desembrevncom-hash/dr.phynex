import { getPayload, handleEndpoints, type Payload, type Migration } from 'payload'
import { beforeAll, afterAll, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
vi.mock('next-intl/middleware', () => ({ default: () => () => new Response(null) }))
vi.mock('@/lib/preview', () => ({ getPreviewUser: async () => null }))
import config from '@/payload.config'
import { migrations } from '@/migrations'
import { findPublicBySlug, approvedLocalesFor } from '@/lib/content'
import proxy from '@/proxy'
import { assertDisposableDatabase } from '../helpers/database'
let payload: Payload
beforeAll(async () => {
 payload=await getPayload({config});await assertDisposableDatabase(payload)
 await payload.db.dropDatabase({adapter:payload.db as never});await payload.db.migrate({migrations:migrations as unknown as Migration[]})
})
afterAll(async () => { await payload?.destroy() })
it('checks committed publication and approval on the next public read', async () => {
 const p=await payload.create({collection:'products',locale:'en',data:{name:'Cache review',accent:'navy',slug:'cache-review',translationStatus:'approved',_status:'published'}})
 expect((await findPublicBySlug('products','cache-review','en'))?.name).toBe('Cache review')
 expect(await approvedLocalesFor('products','cache-review')).toContain('en')
 await payload.update({collection:'products',id:p.id,locale:'en',data:{translationStatus:'in-review',_status:'published'}})
 expect(await findPublicBySlug('products','cache-review','en')).toBeNull()
 expect(await approvedLocalesFor('products','cache-review')).not.toContain('en')
 await payload.update({collection:'products',id:p.id,locale:'en',data:{translationStatus:'approved',_status:'published'}})
 expect(await findPublicBySlug('products','cache-review','en')).not.toBeNull()
 await payload.update({collection:'products',id:p.id,locale:'en',data:{_status:'draft'}})
 expect(await findPublicBySlug('products','cache-review','en')).toBeNull()
})
it('serves released originals no-store, denies revoked originals and all historical optimizer URLs', async () => {
 const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=','base64')
 const m=await payload.create({collection:'media',locale:'en',data:{alt:'Cache fixture',publicRelease:true},file:{data,mimetype:'image/png',name:'cache-fixture.png',size:data.length}})
 const path='/api/media/file/'+m.filename
 const read=() => handleEndpoints({config,request:new Request('http://localhost:3000'+path)})
 const before=await read();expect(before.status).toBe(200);expect(before.headers.get('cache-control')).toContain('no-store');await before.body?.cancel()
 const optimized=new NextRequest('http://localhost:3000/_next/image?url='+encodeURIComponent(path)+'&w=640&q=75')
 expect((await proxy(optimized)).status).toBe(410)
 await payload.update({collection:'media',id:m.id,locale:'en',data:{publicRelease:false}})
 expect((await read()).status).toBe(403)
 expect((await proxy(optimized)).status).toBe(410)
})
