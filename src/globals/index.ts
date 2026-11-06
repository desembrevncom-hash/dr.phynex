import { editorsField } from '@/access/roles'
import { contentGlobal } from '@/collections/factory'
import { seoField } from '@/fields/common'
import { isLocale } from '@/i18n/locales'

import { guardHomeBannerApproval } from '@/hooks/guardHomeBannerApproval'

import { bannerApprovalStatusField, bannerApprovalsField } from './bannerApprovalFields'
import { homeBannersField } from './homeBanners'

const editorOnly = { create: editorsField, update: editorsField }

export const SiteSettings = contentGlobal({
  slug: 'site-settings',
  admin: { group: 'Settings' },
  fields: [
    { name: 'logo', type: 'upload', relationTo: 'media', access: editorOnly },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email', access: editorOnly },
        { name: 'phone', type: 'text', access: editorOnly },
        { name: 'address', type: 'textarea', localized: true },
        { name: 'hours', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'social',
      type: 'array',
      access: editorOnly,
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
})

export const HomePage = contentGlobal({
  slug: 'home-page',
  admin: {
    group: 'Pages',
    // Opens the existing staff-only draft preview of the language being edited.
    preview: (_doc, { locale }) => `/preview?path=${encodeURIComponent('/' + (isLocale(locale) ? locale : 'ko'))}`,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          // Unnamed tab: existing columns are unchanged.
          label: { vi: 'Nội dung trang', ko: '페이지 내용', en: 'Page content' },
          fields: [
            { name: 'headline', type: 'text', localized: true },
            { name: 'intro', type: 'textarea', localized: true },
            { name: 'heroImage', type: 'upload', relationTo: 'media', access: editorOnly },
            { name: 'featuredProducts', type: 'relationship', relationTo: 'products', hasMany: true, access: editorOnly },
            { name: 'featuredIngredients', type: 'relationship', relationTo: 'ingredients', hasMany: true, access: editorOnly },
            seoField,
          ],
        },
        {
          label: { vi: 'Banner trang chủ', ko: '메인 배너', en: 'Homepage banners' },
          description: {
            vi: 'Đúng 5 slot theo thứ tự slider. Lưu nháp → xem trước → duyệt (Approved) → xuất bản từng ngôn ngữ. Ảnh và các lựa chọn dùng chung áp dụng cho mọi ngôn ngữ khi xuất bản.',
            ko: '슬라이더 순서대로 정확히 5개 슬롯. 임시 저장 → 미리보기 → 승인(Approved) → 언어별 게시. 공통 이미지와 설정은 게시 시 모든 언어에 적용됩니다.',
            en: 'Exactly 5 slots in slider order. Save draft → preview → Approved → publish each language. Shared images and settings apply to every language once published.',
          },
          fields: [homeBannersField],
        },
      ],
    },
    bannerApprovalsField,
    bannerApprovalStatusField,
  ],
  hooks: { beforeChange: [guardHomeBannerApproval] },
})

export const BrandPage = contentGlobal({
  slug: 'brand-page',
  admin: { group: 'Pages' },
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    seoField,
  ],
})

export const PartnershipPage = contentGlobal({
  slug: 'partnership-page',
  admin: { group: 'Pages' },
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    seoField,
  ],
})
