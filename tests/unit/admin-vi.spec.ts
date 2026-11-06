import { describe, expect, it } from 'vitest'

import { Articles } from '@/collections/Articles'
import { Ingredients, Technologies } from '@/collections/Ingredients'
import { LegalPages } from '@/collections/LegalPages'
import { Media } from '@/collections/Media'
import { Products } from '@/collections/Products'
import { SourceDocuments } from '@/collections/SourceDocuments'
import { Stores } from '@/collections/Stores'
import { ContactSubmissions, PartnerInquiries } from '@/collections/Submissions'
import {
  JournalTopics,
  ProductCategories,
  ProductLines,
  SkinConcerns,
} from '@/collections/Taxonomies'
import { Users } from '@/collections/Users'
import { localizeCollection, localizeGlobal } from '@/config/admin-vi'
import { BrandPage, HomePage, PartnershipPage, SiteSettings } from '@/globals'

// Admin is Vietnamese only: nothing an editor reads may stay English.
const collections = [
  Products, ProductLines, ProductCategories, SkinConcerns, Ingredients, Technologies, Articles,
  JournalTopics, Stores, LegalPages, Media, SourceDocuments, ContactSubmissions, PartnerInquiries, Users,
].map(localizeCollection)
const globals = [HomePage, BrandPage, PartnershipPage, SiteSettings].map(localizeGlobal)

// International terms that are correct as they are.
const international = new Set(['SEO', 'Email', 'Logo', 'MX-01 FORMA', 'MX-02 LUMA', 'RX MATRIX BALM', 'RX MATRIX SHEET'])
const englishWords =
  /(the|and|only|for|with|not|are|is|of|to|this|from|your|can|use|must|all|each|per|files?|image|save|draft|published?|internal|never|staff|shown|visitors?|ticked|admin|editor|translator|name|title|approved|review|other|store|light|dark|new|closed|progress)/i
const viewable = (s: string) => international.has(s) || !englishWords.test(s)

const texts: string[] = []
const pick = (v: unknown, where: string) => {
  if (typeof v === 'string') texts.push(`${where}: ${v}`)
  else if (v && typeof v === 'object' && 'vi' in v) texts.push(`${where}: ${(v as { vi: string }).vi}`)
}
const walk = (fields: any[], where: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const f of fields) {
    if (f.admin?.hidden || f.type === 'ui') continue
    const at = `${where}.${f.name ?? f.type}`
    if ('name' in f && f.name && f.label !== false) {
      if (f.label === undefined) texts.push(`${at}: <missing label>`)
      else pick(f.label, `${at}.label`)
    }
    pick(f.admin?.description, `${at}.description`)
    if (f.labels) { pick(f.labels.singular, `${at}.singular`); pick(f.labels.plural, `${at}.plural`) }
    if (Array.isArray(f.options)) for (const o of f.options) {
      if (typeof o === 'string') texts.push(`${at}.option: <untranslated ${o}>`)
      else if (typeof o.label === 'string' && o.label === o.value && !international.has(o.label)) texts.push(`${at}.option: <untranslated ${o.value}>`)
      else pick(o.label, `${at}.option`)
    }
    if (f.type === 'tabs') for (const t of f.tabs) { pick(t.label, `${at}.tab`); pick(t.description, `${at}.tabDesc`); walk(t.fields, at) }
    else if (Array.isArray(f.fields)) walk(f.fields, at)
  }
}
for (const c of collections) {
  pick(c.admin?.group, `${c.slug}.group`)
  pick(c.admin?.description, `${c.slug}.description`)
  pick(c.labels?.singular, `${c.slug}.singular`)
  walk(c.fields, c.slug)
}
for (const g of globals) {
  pick(g.label, `${g.slug}.label`)
  pick(g.admin?.group, `${g.slug}.group`)
  walk(g.fields, g.slug)
}

describe('Home Page approval help text', () => {
  const statusHelp = (fields: any[]) => fields.find((f) => f.name === 'translationStatus')?.admin?.description // eslint-disable-line @typescript-eslint/no-explicit-any
  it('points to the panel button on the Home Page, not to changing the dropdown', () => {
    const home = statusHelp(globals.find((g) => g.slug === 'home-page')!.fields)
    expect(home).toContain('Duyệt cấu hình cho [ngôn ngữ]')
    expect(home).not.toMatch(/đặt "Đã duyệt"/)
  })
  it('keeps the generic text (with the dropdown) where there is no panel', () => {
    expect(statusHelp(globals.find((g) => g.slug === 'brand-page')!.fields)).toMatch(/đặt "Đã duyệt"/)
    expect(statusHelp(collections.find((c) => c.slug === 'products')!.fields)).toMatch(/đặt "Đã duyệt"/)
  })
  it('changes no option, access or hook of the status field', () => {
    const home = globals.find((g) => g.slug === 'home-page')!.fields.find((f) => 'name' in f && f.name === 'translationStatus') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const brand = globals.find((g) => g.slug === 'brand-page')!.fields.find((f) => 'name' in f && f.name === 'translationStatus') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(home.options).toEqual(brand.options)
    expect(home.hooks).toBe(brand.hooks)
    expect(home.access).toBe(brand.access)
    expect(home.required).toBe(brand.required)
  })
})

describe('Admin text is Vietnamese', () => {
  it('help text does not quote an English UI label that no longer exists', () => {
    expect(texts.filter((t) => /Cleared for publication/.test(t))).toEqual([])
  })
  it('has no English label, description, option, tab or group', () => {
    const english = texts.filter((t) => !viewable(t.split(': ').slice(1).join(': ')))
    expect(english).toEqual([])
  })
  it('keeps field names and option values stable (no schema change)', () => {
    const role = Users.fields.find((f) => 'name' in f && f.name === 'role') as { options: { value: string }[] }
    const localized = collections.find((c) => c.slug === 'users')!.fields.find((f) => 'name' in f && f.name === 'role') as { options: { value: string }[] }
    expect(localized.options.map((o) => o.value)).toEqual(role.options.map((o) => o.value))
  })
})
