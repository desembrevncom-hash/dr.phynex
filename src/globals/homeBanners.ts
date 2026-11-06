import type { Field, FieldAccess, GroupField } from 'payload'

import { editorsField } from '@/access/roles'

/**
 * Home Page → "Banner trang chủ": exactly five fixed slots, in slider order.
 * Slot identity is the field name (stable DB columns), never a position in an array, so
 * slides cannot be added, removed or reordered from the admin in this release.
 *
 * Localized: alt, title, tagline, CTA label and the optional per-language image override.
 * Shared by all languages (editors only, like the other structural Home Page fields):
 * visual type, images, image position, CTA target, colour presets.
 * No free-form CSS/HTML/JS: every visual choice is a preset.
 */

const L = (vi: string, ko: string, en: string) => ({ vi, ko, en })
const editorOnly: { create: FieldAccess; update: FieldAccess } = {
  create: editorsField,
  update: editorsField,
}

export const bannerSlots = [
  {
    name: 'brand',
    label: 'Banner 1 · Brand (Dr.PhynEX)',
    visual: 'brandOptics',
    theme: 'brand',
    cta: 'brand',
  },
  {
    name: 'forma',
    label: 'Banner 2 · MX-01 Forma',
    visual: 'packshot',
    theme: 'forma',
    cta: 'mx-01-forma',
  },
  { name: 'luma', label: 'Banner 3 · MX-02 Luma', visual: 'packshot', theme: 'luma', cta: 'mx-02-luma' },
  {
    name: 'balm',
    label: 'Banner 4 · RX Matrix Balm',
    visual: 'packshot',
    theme: 'balm',
    cta: 'rx-matrix-balm',
  },
  {
    name: 'sheet',
    label: 'Banner 5 · RX Matrix Sheet',
    visual: 'packshot',
    theme: 'sheet',
    cta: 'rx-matrix-sheet',
  },
] as const
export type BannerSlotName = (typeof bannerSlots)[number]['name']

export const visualTypes = ['packshot', 'fullBleed', 'brandOptics'] as const
export const bannerThemes = ['brand', 'forma', 'luma', 'balm', 'sheet'] as const
export const imagePositions = ['focal', 'center', 'top', 'bottom', 'left', 'right'] as const
/** Internal destinations only; the locale prefix is added when rendering. */
export const ctaTargets = {
  brand: '/brand',
  contact: '/contact',
  partnership: '/partnership',
  products: '/products',
  'mx-01-forma': '/products/mx-01-forma',
  'mx-02-luma': '/products/mx-02-luma',
  'rx-matrix-balm': '/products/rx-matrix-balm',
  'rx-matrix-sheet': '/products/rx-matrix-sheet',
} as const
export type CtaTarget = keyof typeof ctaTargets

type Sibling = { visualType?: string } | undefined
const hasImage = (_: unknown, s: Sibling) => s?.visualType !== 'brandOptics'
const isFullBleed = (_: unknown, s: Sibling) => s?.visualType === 'fullBleed'

const slotFields = (slot: (typeof bannerSlots)[number]): Field[] => [
  {
    name: 'visualType',
    label: L('Loại visual', '비주얼 유형', 'Visual type'),
    type: 'select',
    required: true,
    defaultValue: slot.visual,
    access: editorOnly,
    options: [
      {
        value: 'packshot',
        label: L(
          'A · Chữ + packshot sản phẩm',
          'A · 텍스트 + 제품 패키지 컷',
          'A · Text + product packshot',
        ),
      },
      {
        value: 'fullBleed',
        label: L(
          'B · Ảnh banner toàn khung',
          'B · 전체 배너 이미지',
          'B · Full-frame banner image',
        ),
      },
      {
        value: 'brandOptics',
        label: L(
          'C · Visual Brand quang học (có sẵn)',
          'C · 브랜드 광학 비주얼 (기본)',
          'C · Built-in Brand optical visual',
        ),
      },
    ],
    admin: {
      description: L(
        'A: ảnh sản phẩm riêng (nền trong/trắng) đặt cạnh chữ. B: ảnh campaign hoàn chỉnh phủ toàn khung, chữ và nút vẫn là HTML. C: không cần ảnh.',
        'A: 텍스트 옆에 배치되는 개별 제품 이미지. B: 전체를 채우는 캠페인 이미지(텍스트와 버튼은 HTML). C: 이미지 불필요.',
        'A: a separate product image placed beside the text. B: a finished campaign image filling the frame; text and button stay HTML. C: no image needed.',
      ),
    },
  },
  {
    name: 'desktopImage',
    label: L(
      'Ảnh desktop (dùng chung mọi ngôn ngữ)',
      '데스크톱 이미지 (모든 언어 공통)',
      'Desktop image (all languages)',
    ),
    type: 'upload',
    relationTo: 'media',
    access: editorOnly,
    admin: {
      condition: hasImage,
      description: L(
        'Chọn từ Media hoặc tải lên. Khách chỉ thấy ảnh đã tích "Đã duyệt cho phép công khai"; nếu chưa, khách thấy visual mặc định, không thay bằng ảnh khác.',
        'Media에서 선택하거나 업로드하세요. 방문자는 "Cleared for publication" 이미지만 볼 수 있으며, 아니면 기본 비주얼이 표시됩니다.',
        'Pick from Media or upload. Visitors only see images marked "Cleared for publication"; otherwise they see the default visual, never a substitute image.',
      ),
    },
  },
  {
    name: 'mobileImage',
    label: L('Ảnh mobile (tuỳ chọn)', '모바일 이미지 (선택)', 'Mobile image (optional)'),
    type: 'upload',
    relationTo: 'media',
    access: editorOnly,
    admin: {
      condition: hasImage,
      description: L(
        'Dùng dưới 768 px. Bỏ trống để dùng ảnh desktop.',
        '768px 미만에서 사용. 비워 두면 데스크톱 이미지를 사용합니다.',
        'Used below 768px. Leave empty to use the desktop image.',
      ),
    },
  },
  {
    name: 'localeDesktopImage',
    label: L(
      'Ảnh desktop riêng cho ngôn ngữ này (tuỳ chọn)',
      '이 언어 전용 데스크톱 이미지 (선택)',
      'Desktop image for this language only (optional)',
    ),
    type: 'upload',
    relationTo: 'media',
    localized: true,
    access: editorOnly,
    admin: {
      condition: isFullBleed,
      description: L(
        'Chỉ cần khi ảnh campaign có chữ theo ngôn ngữ. Bỏ trống để dùng ảnh chung.',
        '캠페인 이미지에 언어별 문구가 있을 때만 필요합니다. 비워 두면 공통 이미지를 사용합니다.',
        'Only needed when the campaign image contains language-specific text. Leave empty to use the shared image.',
      ),
    },
  },
  {
    name: 'localeMobileImage',
    label: L(
      'Ảnh mobile riêng cho ngôn ngữ này (tuỳ chọn)',
      '이 언어 전용 모바일 이미지 (선택)',
      'Mobile image for this language only (optional)',
    ),
    type: 'upload',
    relationTo: 'media',
    localized: true,
    access: editorOnly,
    admin: { condition: isFullBleed },
  },
  {
    name: 'imageAlt',
    label: L('Alt ảnh', '이미지 대체 텍스트', 'Image alt text'),
    type: 'text',
    localized: true,
    maxLength: 160,
    admin: {
      condition: hasImage,
      description: L(
        'Mô tả ngắn nội dung ảnh. Bỏ trống để dùng alt của Media. Khi chọn "Ảnh đã có chữ", ảnh được coi là trang trí và chữ HTML sẽ được đọc thay.',
        '이미지 내용을 짧게 설명하세요. 비워 두면 Media의 대체 텍스트를 사용합니다.',
        'Short description of the image. Empty uses the Media alt text. With "image already contains the text" the image is decorative and the HTML text is read instead.',
      ),
    },
  },
  {
    name: 'imagePosition',
    label: L('Vị trí ảnh khi cắt khung', '이미지 위치', 'Image position when cropped'),
    type: 'select',
    defaultValue: 'focal',
    access: editorOnly,
    options: [
      {
        value: 'focal',
        label: L('Theo điểm lấy nét của Media', 'Media 초점 사용', 'Use the Media focal point'),
      },
      { value: 'center', label: L('Giữa', '가운데', 'Center') },
      { value: 'top', label: L('Trên', '위', 'Top') },
      { value: 'bottom', label: L('Dưới', '아래', 'Bottom') },
      { value: 'left', label: L('Trái', '왼쪽', 'Left') },
      { value: 'right', label: L('Phải', '오른쪽', 'Right') },
    ],
    admin: { condition: isFullBleed },
  },
  {
    name: 'textDisplay',
    label: L(
      'Hiển thị chữ trên ảnh toàn khung',
      '전체 이미지 위 텍스트',
      'Text on the full-frame image',
    ),
    type: 'select',
    defaultValue: 'overlay',
    access: editorOnly,
    options: [
      {
        value: 'overlay',
        label: L(
          'Hiện tiêu đề và mô tả trên ảnh',
          '이미지 위에 제목과 설명 표시',
          'Show title and tagline over the image',
        ),
      },
      {
        value: 'imageHasText',
        label: L(
          'Ảnh đã có chữ: chỉ hiện nút CTA',
          '이미지에 문구 포함: CTA 버튼만 표시',
          'Image already contains the text: show only the CTA button',
        ),
      },
    ],
    admin: {
      condition: isFullBleed,
      description: L(
        'Tránh lặp chữ hai lần. Tiêu đề và mô tả vẫn có trong HTML cho trình đọc màn hình. Không vẽ nút CTA vào ảnh: nút luôn là HTML.',
        '문구가 두 번 보이지 않도록 하세요. 제목과 설명은 스크린 리더용 HTML로 유지됩니다. CTA 버튼은 이미지에 넣지 마세요.',
        'Avoids showing the text twice. Title and tagline stay in the HTML for screen readers. Do not draw a CTA button into the image: the button is always HTML.',
      ),
    },
  },
  {
    name: 'title',
    label: L('Tiêu đề', '제목', 'Title'),
    type: 'text',
    localized: true,
    maxLength: 40,
    admin: {
      description: L(
        'Bỏ trống để dùng nội dung mặc định của website cho slot này.',
        '비워 두면 이 슬롯의 기본 콘텐츠를 사용합니다.',
        'Leave empty to keep the site default content for this slot.',
      ),
    },
  },
  {
    name: 'tagline',
    label: L('Tagline / mô tả ngắn', '태그라인 / 짧은 설명', 'Tagline / short description'),
    type: 'textarea',
    localized: true,
    maxLength: 160,
  },
  {
    name: 'ctaLabel',
    label: L('Nhãn CTA', 'CTA 문구', 'CTA label'),
    type: 'text',
    localized: true,
    maxLength: 32,
  },
  {
    name: 'ctaTarget',
    label: L(
      'Đích CTA (trang nội bộ)',
      'CTA 이동 페이지 (내부)',
      'CTA destination (internal page)',
    ),
    type: 'select',
    required: true,
    defaultValue: slot.cta,
    access: editorOnly,
    options: [
      { value: 'brand', label: L('Trang Brand', '브랜드 페이지', 'Brand page') },
      { value: 'contact', label: L('Trang Liên hệ', '문의 페이지', 'Contact page') },
      { value: 'partnership', label: L('Trang Hợp tác', '파트너십 페이지', 'Partnership page') },
      { value: 'products', label: L('Danh sách sản phẩm', '제품 목록', 'Product list') },
      { value: 'mx-01-forma', label: 'MX-01 FORMA' },
      { value: 'mx-02-luma', label: 'MX-02 LUMA' },
      { value: 'rx-matrix-balm', label: 'RX MATRIX BALM' },
      { value: 'rx-matrix-sheet', label: 'RX MATRIX SHEET' },
    ],
    admin: {
      description: L(
        'Liên kết tự thêm đúng ngôn ngữ đang xem (/ko, /en, /vi).',
        '링크에는 현재 언어(/ko, /en, /vi)가 자동으로 붙습니다.',
        'The link automatically keeps the current language (/ko, /en, /vi).',
      ),
    },
  },
  {
    name: 'theme',
    label: L('Mẫu màu nền', '배경 색상 프리셋', 'Background colour preset'),
    type: 'select',
    required: true,
    defaultValue: slot.theme,
    access: editorOnly,
    options: [
      { value: 'brand', label: L('Xám xanh · Brand', '블루 그레이 · Brand', 'Blue grey · Brand') },
      {
        value: 'forma',
        label: L('Xanh ngọc nhạt · Forma', '라이트 시안 · Forma', 'Light cyan · Forma'),
      },
      { value: 'luma', label: L('Hồng nhạt · Luma', '라이트 핑크 · Luma', 'Light pink · Luma') },
      {
        value: 'balm',
        label: L('Xanh navy nhạt · Balm', '라이트 네이비 · Balm', 'Light navy · Balm'),
      },
      { value: 'sheet', label: L('Đỏ nhạt · Sheet', '라이트 레드 · Sheet', 'Light red · Sheet') },
    ],
  },
  {
    name: 'textTone',
    label: L('Màu chữ trên ảnh', '이미지 위 글자색', 'Text colour on the image'),
    type: 'select',
    defaultValue: 'dark',
    access: editorOnly,
    options: [
      {
        value: 'dark',
        label: L(
          'Chữ navy trên nền sáng',
          '밝은 패널 위 네이비 글자',
          'Navy text on a light panel',
        ),
      },
      {
        value: 'light',
        label: L('Chữ trắng trên nền tối', '어두운 패널 위 흰 글자', 'White text on a dark panel'),
      },
    ],
    admin: {
      condition: isFullBleed,
      description: L(
        'Chữ luôn nằm trên một lớp nền bán trong suốt để đủ tương phản trên mọi ảnh.',
        '글자는 항상 반투명 패널 위에 표시되어 대비를 유지합니다.',
        'Text always sits on a translucent panel so it keeps contrast on any image.',
      ),
    },
  },
]

/**
 * Section order matters for the database, not only for the screen: Payload names indexes by the
 * order in which fields are declared, so the relative order of the four upload fields must stay
 * desktopImage, mobileImage, localeDesktopImage, localeMobileImage (tests/int/storage.int.spec.ts
 * fails on any schema drift; this release adds no migration). Hence: language text first (no
 * uploads), then the shared section, then the per-language image overrides.
 */
/** Per language: text (edited for the language chosen in the locale switcher). */
const localeTextNames = ['title', 'tagline', 'ctaLabel', 'imageAlt'] as const
/** Per language: image overrides, only for full-frame banners. */
const localeImageNames = ['localeDesktopImage', 'localeMobileImage'] as const
/** Shared by all languages (editors only). Order follows what an editor decides first. */
const sharedFieldNames = [
  'visualType',
  'desktopImage',
  'mobileImage',
  'imagePosition',
  'textDisplay',
  'ctaTarget',
  'theme',
  'textTone',
] as const

const byName = (fields: Field[], names: readonly string[]) =>
  names.map((n) => fields.find((f) => 'name' in f && f.name === n)).filter((f): f is Field => !!f)

/**
 * UI-only layout: each slot is an accordion row (collapsible) holding the same named group as
 * before, so stored field names, paths and columns are unchanged (banners.<slot>.<field>). Inside,
 * fields are grouped by who they apply to: this language only, or all three languages.
 */
export const homeBannersField: GroupField = {
  name: 'banners',
  type: 'group',
  label: false,
  fields: bannerSlots.map((slot, index): Field => {
    const fields = slotFields(slot)
    return {
      type: 'collapsible',
      label: slot.label,
      admin: {
        initCollapsed: index > 0,
        components: { Label: { path: '/components/admin/SlotLabel#SlotLabel', clientProps: { slot: slot.name, title: slot.label } } },
      },
      fields: [
        {
          name: slot.name,
          type: 'group',
          label: false,
          fields: [
            {
              type: 'collapsible',
              label: 'Nội dung theo ngôn ngữ đang chọn',
              admin: {
                description:
                  'Chỉ áp dụng cho ngôn ngữ đang chọn ở bộ chuyển ngôn ngữ phía trên (Hàn / Anh / Việt). Mỗi ngôn ngữ có bản riêng.',
              },
              fields: byName(fields, localeTextNames),
            },
            {
              type: 'collapsible',
              label: 'Cấu hình dùng chung cho cả 3 ngôn ngữ',
              admin: {
                description:
                  'Chỉ biên tập viên và quản trị viên sửa được. Thay đổi ở đây áp dụng cho cả Hàn, Anh và Việt và yêu cầu duyệt lại mọi ngôn ngữ.',
              },
              fields: byName(fields, sharedFieldNames),
            },
            {
              type: 'collapsible',
              label: 'Ảnh riêng cho ngôn ngữ đang chọn (tuỳ chọn)',
              admin: {
                initCollapsed: true,
                condition: (_data, siblingData) => siblingData?.visualType === 'fullBleed',
                description:
                  'Chỉ dùng khi ảnh banner toàn khung có chữ khác nhau theo ngôn ngữ. Mỗi ngôn ngữ có ảnh riêng; bỏ trống để dùng ảnh chung ở trên.',
              },
              fields: byName(fields, localeImageNames),
            },
          ],
        },
      ],
    }
  }),
}
