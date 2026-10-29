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
const tokens: Record<string,string> = {}
const guest = { locale:'en' as const, fallbackLocale:false as const, overrideAccess:false }
async function rest(path:string, data:unknown, role='editor', method='PATCH') {
 return handleEndpoints({config,request:new Request('http://localhost:3015/api/'+path,{method,headers:{Authorization:'JWT '+tokens[role],'Content-Type':'application/json'},body:JSON.stringify(data)})})
}
beforeAll(async()=>{
 payload=await getPayload({config}); await assertDisposableDatabase(payload)
 await payload.db.dropDatabase({adapter:payload.db as never})
 await payload.db.migrate({migrations:migrations as unknown as Migration[]})
 const password=randomBytes(24).toString('hex')
 await payload.create({collection:'users',data:{email:'p1-admin@test.local',password,role:'admin'}})
 for(const role of ['editor','translator'] as const){
  const user=await payload.create({collection:'users',data:{email:'p1-'+role+'@test.local',password,role}})
  if(role==='editor')editor=user;else translator=user
  tokens[role]=(await payload.login({collection:'users',data:{email:user.email,password}})).token!
 }
})
afterAll(async()=>{await payload?.destroy()})
it('rejects every Payload JSON image edit before sharp or disk writes, preserving the released file',async()=>{
 const resolved=await config
 const sharp=resolved.sharp!
 const png=await sharp({create:{width:40,height:40,channels:3,background:'#123456'}}).png().toBuffer()
 const upload=payload.collections.media.config.upload
 if(!upload || typeof upload!=='object')throw Error('Upload config missing')
 for(const role of ['translator','editor'])for(const [query,data] of [
  ['&uploadEdits[crop][x]=0&uploadEdits[crop][y]=0&uploadEdits[widthInPixels]=10&uploadEdits[heightInPixels]=10',{}],
  ['&uploadEdits[widthInPixels]=10',{}],
  ['&uploadEdits[focalPoint][x]=20&uploadEdits[focalPoint][y]=30',{}],
  ['',{focalX:20,focalY:30}],
 ] as const){
  const original=await payload.create({collection:'media',locale:'en',data:{alt:'Original',publicRelease:true},file:{data:png,mimetype:'image/png',name:randomBytes(8).toString('hex')+'.png',size:png.length}})
  const file=join(upload.staticDir!,original.filename!)
  const hash=async()=>createHash('sha256').update(await readFile(file)).digest('hex')
  const before=await hash(),files=await readdir(upload.staticDir!)
  const spy=vi.spyOn(resolved,'sharp')
  const response=await rest('media/'+original.id+'?locale=en'+query,{...data,alt:'Changed'},role)
  const calls=spy.mock.calls.length;spy.mockRestore()
  expect(response.status).toBe(role==='translator'?403:409)
  expect(calls).toBe(0)
  expect(await hash()).toBe(before);expect(await readdir(upload.staticDir!)).toEqual(files)
  const saved=await payload.findByID({collection:'media',id:original.id})
  for(const key of ['filename','filesize','width','height','publicRelease'] as const)expect(saved[key]).toBe(original[key])
  const publicFile=await handleEndpoints({config,request:new Request('http://localhost:3015/api/media/file/'+original.filename)})
  expect(publicFile.status).toBe(200)
  expect(createHash('sha256').update(Buffer.from(await publicFile.arrayBuffer())).digest('hex')).toBe(before)
 }
})
it('allows translator alt-only edits without changing binary or release',async()=>{
 const resolved=await config
 const png=await resolved.sharp!({create:{width:10,height:10,channels:3,background:'white'}}).png().toBuffer()
 const doc=await payload.create({collection:'media',locale:'en',data:{alt:'Old',publicRelease:true},file:{data:png,mimetype:'image/png',name:'alt-only.png',size:png.length}})
 expect((await rest('media/'+doc.id+'?locale=en',{alt:'Translated alt'},'translator')).status).toBe(200)
 const saved=await payload.findByID({collection:'media',id:doc.id,locale:'en'})
 expect(saved.alt).toBe('Translated alt');expect(saved.publicRelease).toBe(true);expect(saved.filename).toBe(doc.filename)
})
it('rejects all and invalid locale publish after EN draft, preserving public globals and collections',async()=>{
 await payload.updateGlobal({slug:'brand-page',locale:'en',data:{title:'OLD PUBLIC EN',seo:{title:'OLD META EN'},translationStatus:'approved',_status:'published'}})
 await payload.updateGlobal({slug:'brand-page',locale:'ko',data:{title:'OLD PUBLIC KO',translationStatus:'approved',_status:'published'}})
 await payload.updateGlobal({slug:'brand-page',locale:'en',draft:true,user:translator,overrideAccess:false,data:{title:'PRIVATE EN',seo:{title:'PRIVATE META'}}})
 const p=await payload.create({collection:'products',locale:'en',data:{name:'OLD PRODUCT',slug:'p1-locale',accent:'navy',translationStatus:'approved',_status:'published'}})
 for(const locale of ['all','invalid','*']){
  expect((await rest('globals/brand-page?locale='+locale,{_status:'published'},'editor','POST')).status).toBe(400)
  expect((await rest('products/'+p.id+'?locale='+locale,{_status:'published'})).status).toBe(400)
  await expect(payload.updateGlobal({slug:'brand-page',locale:locale as 'en',data:{_status:'published'}})).rejects.toThrow(/locale/i)
  await expect(payload.update({collection:'products',id:p.id,locale:locale as 'en',data:{_status:'published'}})).rejects.toThrow(/locale/i)
 }
 const en=await payload.findGlobal({slug:'brand-page',...guest}),ko=await payload.findGlobal({slug:'brand-page',...guest,locale:'ko'})
 expect(en.title).toBe('OLD PUBLIC EN');expect(en.seo?.title).toBe('OLD META EN');expect(ko.title).toBe('OLD PUBLIC KO')
 expect((await payload.findByID({collection:'products',id:p.id,...guest})).name).toBe('OLD PRODUCT')
})
it('editor changes require separate intentional reapproval before publishing',async()=>{
 const p=await payload.create({collection:'products',locale:'en',data:{name:'Reviewed',slug:'p1-editor',accent:'navy',translationStatus:'approved',_status:'published'}})
 await payload.update({collection:'products',id:p.id,locale:'en',draft:true,user:editor,overrideAccess:false,data:{name:'Edited',translationStatus:'approved'}})
 expect((await payload.findByID({collection:'products',id:p.id,locale:'en',draft:true})).translationStatus).toBe('in-review')
 await expect(payload.update({collection:'products',id:p.id,locale:'en',user:editor,overrideAccess:false,data:{_status:'published'}})).rejects.toThrow(/review/i)
 expect((await payload.findByID({collection:'products',id:p.id,...guest})).name).toBe('Reviewed')
 await payload.update({collection:'products',id:p.id,locale:'en',draft:true,user:editor,overrideAccess:false,data:{translationStatus:'approved'}})
 await payload.update({collection:'products',id:p.id,locale:'en',user:editor,overrideAccess:false,data:{_status:'published'}})
 expect((await payload.findByID({collection:'products',id:p.id,...guest})).name).toBe('Edited')
})
it('blocks whole-document restore over REST and Local API including draft=true',async()=>{
 const p=await payload.create({collection:'products',locale:'en',data:{name:'Restore original',slug:'p1-restore',accent:'navy',translationStatus:'approved',_status:'published'}})
 const versions=await payload.findVersions({collection:'products',where:{parent:{equals:p.id}}})
 const globals=await payload.findGlobalVersions({slug:'brand-page'})
 for(const draft of [false,true]){
  await expect(payload.restoreVersion({collection:'products',id:versions.docs[0].id,draft,user:editor,overrideAccess:false})).rejects.toThrow(/restore/i)
  await expect(payload.restoreGlobalVersion({slug:'brand-page',id:globals.docs[0].id,draft,user:editor,overrideAccess:false})).rejects.toThrow(/restore/i)
  expect((await rest('products/versions/'+versions.docs[0].id+'?locale=en&draft='+draft,{},'editor','POST')).status).toBe(409)
  expect((await rest('globals/brand-page/versions/'+globals.docs[0].id+'?locale=en&draft='+draft,{},'editor','POST')).status).toBe(409)
 }
 expect((await payload.findByID({collection:'products',id:p.id,...guest})).name).toBe('Restore original')
})
