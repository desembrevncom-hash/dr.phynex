import { it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@/lib/content', () => ({ getPayloadClient: async () => { throw new Error('Database initialization unavailable') } }))
import { submitContact, submitPartnership } from '@/app/(frontend)/[locale]/actions'
import { pageNumber, journalSearch } from '@/lib/pagination'
it('returns translated form error state when Payload initialization fails, for both actions', async () => {
 const log=vi.spyOn(console,'error').mockImplementation(() => {})
 try {
  const form = new FormData()
  for (const [k,v] of Object.entries({name:'Test',email:'test@example.invalid',message:'Fixture',company:'Test company',contactName:'Test',country:'VN',businessType:'retailer',consent:'on'})) form.set(k,v)
  for (const action of [submitContact, submitPartnership]) {
   const result=await action({status:'idle'},form)
   expect(result).toMatchObject({status:'error',code:'server'})
   expect(result.values?.message).toBe('Fixture')
  }
 } finally { log.mockRestore() }
})
it('normalizes invalid pages and preserves validated topic/page query parameters', () => {
 for (const value of [undefined,'0','-1','NaN','1.5','99999999999999']) expect(pageNumber(value)).toBe(1)
 expect(pageNumber('2')).toBe(2)
 expect(journalSearch('skin',2)).toBe('?topic=skin&page=2')
 expect(journalSearch(undefined,1)).toBe('')
})

it('refuses a live database identity even if a test marker is supplied', async () => {
 const {assertDisposableDatabase, TEST_DATABASE, TEST_MARKER}=await import('../helpers/database')
 const fake=(name:string,marker:string)=>({db:{drizzle:{execute:async()=>({rows:[{name,marker}]})}}}) as unknown as import('payload').Payload
 await expect(assertDisposableDatabase(fake('drphynex', TEST_MARKER))).rejects.toThrow(/identity/)
 await expect(assertDisposableDatabase(fake(TEST_DATABASE, 'unmarked'))).rejects.toThrow(/identity/)
})
