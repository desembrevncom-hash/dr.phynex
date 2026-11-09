import type { Block, Field } from 'payload'

import { editorsField, staffField } from '@/access/roles'

/**
 * Product landing page: one shared set of blocks for every product.
 *
 * - SHARED by all languages (stored once): which blocks exist, their order, "hide", the colour
 *   preset, image choices and layout options. Only editors may change this structure
 *   (hooks/guardLanding.ts); a structural change counts as a content change for approval.
 * - PER LANGUAGE (KO/EN/VI): every text in a block (titles, paragraphs, captions, CTA labels,
 *   FAQ, highlight cards). Translators edit these as drafts.
 * - Everything a product already has (name, pack size, main image, INCI, how to use, cautions,
 *   key ingredients) is READ from the existing product fields, so it is entered once.
 *
 * A block with missing content is hidden from visitors and marked in staff preview and in the
 * block header in Admin. A product without landing blocks keeps the existing page layout.
 */

const editorOnly = { create: editorsField, update: editorsField }

const hidden: Field = {
  name: 'hidden',
  type: 'checkbox',
  label: 'Ẩn khối này',
  defaultValue: false,
  access: editorOnly,
  admin: { description: 'Giữ nội dung nhưng không hiển thị (kể cả trong xem trước). Dùng chung cho mọi ngôn ngữ.' },
}
const tone = (defaultValue: 'light' | 'muted' | 'dark' | 'accent' = 'light'): Field => ({
  name: 'tone',
  type: 'select',
  label: 'Kiểu nền',
  defaultValue,
  access: editorOnly,
  options: [
    { label: 'Sáng (trắng)', value: 'light' },
    { label: 'Sáng xám', value: 'muted' },
    { label: 'Tối', value: 'dark' },
    { label: 'Màu nhấn của sản phẩm', value: 'accent' },
  ],
  admin: { description: 'Preset dùng chung cho mọi ngôn ngữ; màu nhấn lấy từ "Màu nhấn" của sản phẩm.' },
})
const image = (name: string, label: string, description: string): Field => ({
  name,
  type: 'upload',
  relationTo: 'media',
  label,
  access: editorOnly,
  admin: {
    description: `${description} Dùng chung cho mọi ngôn ngữ. Khách chỉ thấy ảnh đã tích "Đã duyệt cho phép công khai".`,
  },
})
const text = (name: string, label: string, maxLength: number, description?: string): Field => ({
  name,
  type: 'text',
  label,
  localized: true,
  maxLength,
  ...(description ? { admin: { description } } : {}),
})
const paragraph = (name: string, label: string, maxLength: number, description?: string): Field => ({
  name,
  type: 'textarea',
  label,
  localized: true,
  maxLength,
  ...(description ? { admin: { description } } : {}),
})

const label = (path: string) => ({ components: { Label: path } })
const blockLabel = '/components/admin/LandingBlockLabel#LandingBlockLabel'

export const landingBlocks: Block[] = [
  {
    slug: 'hero',
    dbName: 'lp_hero',
    labels: { singular: 'Hero sản phẩm', plural: 'Hero sản phẩm' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('tagline', 'Câu giới thiệu', 160, 'Một câu ngắn dưới tên sản phẩm. Chỉ dùng câu chữ đã được duyệt.'),
      paragraph('intro', 'Đoạn mở đầu', 400, 'Bỏ trống để dùng "Mô tả ngắn" của sản phẩm.'),
      image('image', 'Ảnh hero', 'Bỏ trống để dùng ảnh đầu tiên của sản phẩm.'),
      {
        name: 'showPack',
        type: 'checkbox',
        label: 'Hiện quy cách',
        defaultValue: true,
        access: editorOnly,
        admin: { description: 'Quy cách lấy từ trường "Dung tích" của sản phẩm.' },
      },
      text('ctaLabel', 'Nhãn nút tư vấn', 40, 'Bỏ trống để dùng "Yêu cầu tư vấn". Nút luôn mở form liên hệ với sản phẩm này.'),
      tone('muted'),
    ],
  },
  {
    slug: 'band',
    dbName: 'lp_band',
    labels: { singular: 'Dải ảnh lớn', plural: 'Dải ảnh lớn' },
    admin: label(blockLabel),
    fields: [
      hidden,
      image('image', 'Ảnh (máy tính)', 'Ảnh sản phẩm, texture hoặc ảnh campaign. Bắt buộc để khối hiển thị.'),
      image('mobileImage', 'Ảnh cho điện thoại (tuỳ chọn)', 'Bỏ trống để dùng ảnh máy tính.'),
      text('alt', 'Mô tả ảnh (alt)', 160, 'Cho trình đọc màn hình. Bỏ trống để dùng mô tả có sẵn của ảnh.'),
      text('caption', 'Chú thích hiển thị (tuỳ chọn)', 200),
      tone('dark'),
    ],
  },
  {
    slug: 'split',
    dbName: 'lp_split',
    labels: { singular: 'Ảnh + nội dung', plural: 'Ảnh + nội dung' },
    admin: label(blockLabel),
    fields: [
      hidden,
      image('image', 'Ảnh', 'Bắt buộc để khối hiển thị.'),
      {
        name: 'imageSide',
        type: 'select',
        label: 'Vị trí ảnh',
        defaultValue: 'left',
        access: editorOnly,
        options: [
          { label: 'Ảnh bên trái', value: 'left' },
          { label: 'Ảnh bên phải', value: 'right' },
        ],
        admin: { description: 'Trên điện thoại ảnh luôn nằm trên chữ.' },
      },
      text('heading', 'Tiêu đề', 120),
      paragraph('body', 'Đoạn mô tả', 1200),
      tone('light'),
    ],
  },
  {
    slug: 'points',
    dbName: 'lp_points',
    labels: { singular: 'Lưới điểm nổi bật', plural: 'Lưới điểm nổi bật' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('heading', 'Tiêu đề khối', 120),
      {
        name: 'items',
        type: 'array',
        label: 'Thẻ',
        labels: { singular: 'Thẻ', plural: 'Thẻ' },
        dbName: 'lp_points_items',
        maxRows: 6,
        admin: {
          description:
            'Chỉ nhập đặc điểm hoặc công dụng ĐÃ ĐƯỢC DUYỆT, có tài liệu nguồn. Thẻ thiếu tiêu đề ở ngôn ngữ đang xem sẽ bị ẩn.',
        },
        fields: [text('title', 'Tiêu đề thẻ', 80), paragraph('text', 'Mô tả ngắn', 300)],
      },
      tone('muted'),
    ],
  },
  {
    slug: 'ingredients',
    dbName: 'lp_ingr',
    labels: { singular: 'Thành phần nổi bật', plural: 'Thành phần nổi bật' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('heading', 'Tiêu đề khối', 120, 'Bỏ trống để dùng "Thành phần chính".'),
      {
        name: 'items',
        type: 'array',
        label: 'Thành phần',
        labels: { singular: 'Thành phần', plural: 'Thành phần' },
        dbName: 'lp_ingr_items',
        maxRows: 8,
        admin: {
          description:
            'Để trống danh sách để dùng "Thành phần chính" của sản phẩm. Thành phần thiếu tên ở ngôn ngữ đang xem sẽ bị ẩn.',
        },
        fields: [
          {
            name: 'ingredient',
            type: 'relationship',
            relationTo: 'ingredients',
            label: 'Liên kết thành phần (tuỳ chọn)',
            access: editorOnly,
            admin: { description: 'Nếu chọn, tên và mô tả trống sẽ lấy từ trang thành phần.' },
          },
          text('name', 'Tên hiển thị', 80),
          paragraph('text', 'Mô tả', 400),
          image('image', 'Ảnh (tuỳ chọn)', ''),
          {
            name: 'sourceNote',
            type: 'textarea',
            label: 'Ghi chú nguồn (nội bộ)',
            access: { read: staffField, create: staffField, update: staffField },
            admin: { description: 'Chỉ nhân sự thấy; không hiển thị trên website hay API công khai.' },
          },
        ],
      },
      tone('light'),
    ],
  },
  {
    slug: 'details',
    dbName: 'lp_details',
    labels: { singular: 'Chi tiết sản phẩm', plural: 'Chi tiết sản phẩm' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('heading', 'Tiêu đề khối', 120, 'Bỏ trống để dùng "Thông tin sản phẩm".'),
      ...(
        [
          ['showPack', 'Quy cách'],
          ['showInci', 'Bảng thành phần (INCI)'],
          ['showHowToUse', 'Cách dùng'],
          ['showCautions', 'Lưu ý'],
        ] as const
      ).map(
        ([name, what]): Field => ({
          name,
          type: 'checkbox',
          label: `Hiện ${what}`,
          defaultValue: true,
          access: editorOnly,
          admin: { description: `Nội dung lấy từ trường "${what}" có sẵn của sản phẩm.` },
        }),
      ),
      tone('light'),
    ],
  },
  {
    slug: 'faq',
    dbName: 'lp_faq',
    labels: { singular: 'Câu hỏi thường gặp', plural: 'Câu hỏi thường gặp' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('heading', 'Tiêu đề khối', 120, 'Bỏ trống để dùng "Câu hỏi thường gặp".'),
      {
        name: 'items',
        type: 'array',
        label: 'Câu hỏi',
        labels: { singular: 'Câu hỏi', plural: 'Câu hỏi' },
        dbName: 'lp_faq_items',
        maxRows: 12,
        admin: { description: 'Câu thiếu câu hỏi hoặc câu trả lời ở ngôn ngữ đang xem sẽ bị ẩn.' },
        fields: [text('question', 'Câu hỏi', 200), paragraph('answer', 'Câu trả lời', 1200)],
      },
      tone('light'),
    ],
  },
  {
    slug: 'cta',
    dbName: 'lp_cta',
    labels: { singular: 'CTA cuối trang', plural: 'CTA cuối trang' },
    admin: label(blockLabel),
    fields: [
      hidden,
      text('heading', 'Tiêu đề', 120, 'Bỏ trống để dùng "Mua qua tư vấn".'),
      paragraph('body', 'Đoạn mô tả', 300, 'Bỏ trống để dùng câu mặc định của website.'),
      text('ctaLabel', 'Nhãn nút', 40, 'Bỏ trống để dùng "Yêu cầu tư vấn". Nút luôn mở form liên hệ với sản phẩm này.'),
      tone('dark'),
    ],
  },
]

export const landingField: Field = {
  name: 'landing',
  type: 'blocks',
  label: 'Các khối landing page',
  labels: { singular: 'Khối', plural: 'Khối' },
  blocks: landingBlocks,
  maxRows: 20,
  admin: {
    initCollapsed: true,
    description:
      'Thứ tự, ẩn/hiện, ảnh và kiểu nền dùng chung cho KO/EN/VI; chữ trong từng khối nhập riêng theo ngôn ngữ đang chọn ở góc trên. Khối thiếu nội dung bị ẩn với khách và được đánh dấu ở tiêu đề khối. Chưa có khối nào thì trang sản phẩm giữ bố cục hiện tại.',
  },
}
