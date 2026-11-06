import { editorsField } from '@/access/roles'
import { contentGlobal } from '@/collections/factory'
import { seoField } from '@/fields/common'
import { isLocale } from '@/i18n/locales'

import { guardHomeBannerApproval, lockAndCaptureHomePage } from '@/hooks/guardHomeBannerApproval'

import { approvalStateField, bannerApprovalStatusField, bannerApprovalsField } from './bannerApprovalFields'
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
          description:
            'Đúng 5 banner theo thứ tự slider. Quy trình: lưu nháp → xem trước → bấm "Duyệt cấu hình cho [ngôn ngữ]" ở cột bên → xuất bản từng ngôn ngữ. Ảnh và các lựa chọn dùng chung áp dụng cho cả 3 ngôn ngữ khi xuất bản.',
          fields: [homeBannersField],
        },
      ],
    },
    bannerApprovalsField,
    bannerApprovalStatusField,
    approvalStateField,
  ],
  hooks: { beforeOperation: [lockAndCaptureHomePage], beforeChange: [guardHomeBannerApproval] },
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
