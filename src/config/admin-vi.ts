import type { CollectionConfig, Field, GlobalConfig } from 'payload'

import { restoreNotice } from './restore-notice'

/**
 * The Admin UI is Vietnamese only. Content locales (ko/en/vi) are unrelated and unchanged.
 *
 * Field/collection definitions keep their stable names, paths and option VALUES (no schema or
 * migration impact). This module only supplies Vietnamese presentation text for what the
 * definitions leave in English: default labels, group names, select option labels and help text.
 * tests/unit/admin-vi.spec.ts fails when a visible string is still English.
 */

/** Default label for fields declared without one (Payload would derive English from the name). */
export const fieldLabels: Record<string, string> = {
  name: 'Tên',
  title: 'Tiêu đề',
  slug: 'Đường dẫn (slug)',
  order: 'Thứ tự',
  seo: 'SEO',
  description: 'Mô tả',
  shortDescription: 'Mô tả ngắn',
  images: 'Hình ảnh',
  claims: 'Tuyên bố công dụng',
  text: 'Nội dung',
  sourceDocument: 'Tài liệu nguồn',
  sourceFile: 'Tệp nguồn',
  sourceNote: 'Ghi chú nguồn',
  keyIngredients: 'Thành phần chính',
  technologies: 'Công nghệ',
  inci: 'Danh sách INCI',
  inciName: 'Tên INCI',
  howToUse: 'Cách dùng',
  cautions: 'Lưu ý',
  line: 'Dòng sản phẩm',
  categories: 'Danh mục',
  concerns: 'Vấn đề da',
  skinTypes: 'Loại da',
  sku: 'Mã SKU',
  volume: 'Dung tích',
  accent: 'Màu nhấn',
  related: 'Sản phẩm liên quan',
  relatedProducts: 'Sản phẩm liên quan',
  summary: 'Tóm tắt',
  body: 'Nội dung chính',
  image: 'Hình ảnh',
  sources: 'Nguồn tham khảo',
  file: 'Tệp',
  note: 'Ghi chú',
  excerpt: 'Đoạn trích',
  cover: 'Ảnh bìa',
  topic: 'Chủ đề',
  author: 'Tác giả',
  publishedAt: 'Ngày đăng',
  heroImage: 'Ảnh đầu trang',
  appearance: 'Giao diện nhóm',
  type: 'Loại',
  country: 'Quốc gia',
  city: 'Thành phố',
  address: 'Địa chỉ',
  hours: 'Giờ mở cửa',
  phone: 'Điện thoại',
  url: 'Đường dẫn URL',
  lat: 'Vĩ độ',
  lng: 'Kinh độ',
  alt: 'Văn bản thay thế (alt)',
  caption: 'Chú thích',
  credit: 'Nguồn ảnh',
  reviewNote: 'Ghi chú kiểm duyệt (nội bộ)',
  email: 'Email',
  message: 'Nội dung tin nhắn',
  consent: 'Đồng ý xử lý dữ liệu',
  company: 'Công ty',
  contactName: 'Người liên hệ',
  businessType: 'Loại hình kinh doanh',
  channels: 'Kênh bán hàng',
  status: 'Trạng thái',
  role: 'Vai trò',
  headline: 'Tiêu đề chính',
  intro: 'Giới thiệu',
  featuredProducts: 'Sản phẩm nổi bật',
  featuredIngredients: 'Thành phần nổi bật',
  logo: 'Logo',
  contact: 'Liên hệ',
  social: 'Mạng xã hội',
  platform: 'Nền tảng',
  locale: 'Ngôn ngữ',
  ip: 'Địa chỉ IP',
  userAgent: 'Trình duyệt',
  source: 'Nguồn',
  page: 'Trang',
  referrer: 'Nguồn truy cập',
  translationStatus: 'Trạng thái duyệt',
}

export const groupLabels: Record<string, string> = {
  Catalog: 'Danh mục sản phẩm',
  Pages: 'Trang',
  Journal: 'Tạp chí',
  Assets: 'Tài nguyên',
  Stores: 'Cửa hàng',
  Inbox: 'Hộp thư',
  Settings: 'Cài đặt',
}

export const collectionLabels: Record<string, { singular: string; plural: string }> = {
  products: { singular: 'Sản phẩm', plural: 'Sản phẩm' },
  'product-lines': { singular: 'Dòng sản phẩm', plural: 'Dòng sản phẩm' },
  'product-categories': { singular: 'Danh mục sản phẩm', plural: 'Danh mục sản phẩm' },
  'skin-concerns': { singular: 'Vấn đề da', plural: 'Vấn đề da' },
  ingredients: { singular: 'Thành phần', plural: 'Thành phần' },
  technologies: { singular: 'Công nghệ', plural: 'Công nghệ' },
  articles: { singular: 'Bài viết tạp chí', plural: 'Bài viết tạp chí' },
  'journal-topics': { singular: 'Chủ đề tạp chí', plural: 'Chủ đề tạp chí' },
  stores: { singular: 'Điểm bán', plural: 'Điểm bán' },
  'legal-pages': { singular: 'Trang pháp lý', plural: 'Trang pháp lý' },
  media: { singular: 'Tệp media', plural: 'Thư viện media' },
  'source-documents': { singular: 'Tài liệu nguồn', plural: 'Tài liệu nguồn' },
  'contact-submissions': { singular: 'Tin nhắn liên hệ', plural: 'Tin nhắn liên hệ' },
  'partner-inquiries': { singular: 'Yêu cầu hợp tác B2B', plural: 'Yêu cầu hợp tác B2B' },
  users: { singular: 'Tài khoản nhân sự', plural: 'Tài khoản nhân sự' },
}

export const globalLabels: Record<string, string> = {
  'home-page': 'Trang chủ',
  'brand-page': 'Trang Thương hiệu',
  'partnership-page': 'Trang Hợp tác',
  'site-settings': 'Cài đặt website',
}

/** Exact English text found in definitions → Vietnamese (labels, options, help text, tab names). */
export const texts: Record<string, string> = {
  'Overview': 'Tổng quan',
  'Claims': 'Tuyên bố công dụng',
  'Claim': 'Tuyên bố công dụng',
  'Ingredients & use': 'Thành phần & cách dùng',
  'Classification': 'Phân loại',
  'SEO': 'SEO',
  'Editorial note (internal)': 'Ghi chú biên tập (nội bộ)',
  'Cleared for publication': 'Đã duyệt cho phép công khai',
  'Navy': 'Xanh navy',
  'RX red': 'Đỏ RX',
  'MX cyan (FORMA)': 'Xanh ngọc MX (FORMA)',
  'MX pink (LUMA)': 'Hồng MX (LUMA)',
  'Store': 'Cửa hàng',
  'Distributor': 'Nhà phân phối',
  'Other': 'Khác',
  'Light (white and navy)': 'Sáng (trắng và navy)',
  'Dark (charcoal band)': 'Tối (dải than chì)',
  'AI draft': 'Bản nháp AI',
  'In review': 'Đang xem xét',
  'Approved': 'Đã duyệt',
  'Admin': 'Quản trị viên',
  'Editor': 'Biên tập viên',
  'Translator': 'Biên dịch viên',
  'new': 'Mới',
  'in-progress': 'Đang xử lý',
  'closed': 'Đã đóng',
  'dry': 'Da khô',
  'oily': 'Da dầu',
  'combination': 'Da hỗn hợp',
  'normal': 'Da thường',
  'sensitive': 'Da nhạy cảm',
  'product': 'Sản phẩm',
  'store': 'Cửa hàng',
  'other': 'Khác',
  'distributor': 'Nhà phân phối',
  'retailer': 'Nhà bán lẻ',
  'spa-clinic': 'Spa / phòng khám',
  'online': 'Bán online',
  'privacy': 'Chính sách bảo mật',
  'terms': 'Điều khoản sử dụng',
  'Internal references backing this description. Not shown publicly.':
    'Nguồn tham khảo nội bộ cho phần mô tả này. Không hiển thị công khai.',
  'Standard INCI name (not translated).': 'Tên INCI chuẩn (không dịch).',
  'Visitors can only view or list this file when ticked.':
    'Khách chỉ xem hoặc liệt kê được tệp này khi đã tích chọn.',
  'Name/reference of the brand document this claim comes from (required to publish).':
    'Tên/mã tham chiếu tài liệu thương hiệu mà tuyên bố công dụng này lấy từ đó (bắt buộc để xuất bản).',
  'Full INCI list as provided by the brand (not translated).':
    'Danh sách INCI đầy đủ do thương hiệu cung cấp (không dịch).',
  'e.g. "50 mL"': 'Ví dụ: "50 mL"',
  'Accent colour taken from the product packaging.': 'Màu nhấn lấy từ bao bì sản phẩm.',
  'Internal reference files (e.g. product dossiers). Staff only, never served publicly.':
    'Tệp tham chiếu nội bộ (ví dụ hồ sơ sản phẩm). Chỉ nhân sự xem, không bao giờ công khai.',
  'ISO 3166-1 alpha-2 code, e.g. KR, VN, US.': 'Mã quốc gia ISO 3166-1 alpha-2, ví dụ KR, VN, US.',
  'Section style on the site, matching the line packaging.':
    'Kiểu hiển thị khu vực trên website, khớp với bao bì của dòng.',
  'Admin: everything. Editor: content + publishing. Translator: text drafts only.':
    'Quản trị viên: toàn quyền. Biên tập viên: nội dung và xuất bản. Biên dịch viên: chỉ soạn bản nháp văn bản.',
  'Lowercase letters, numbers and hyphens. Shared by all languages.':
    'Chữ thường, số và dấu gạch ngang. Dùng chung cho mọi ngôn ngữ.',
  'Introduction only: no prices or purchase links. Calls to action point to Stores and Contact.':
    'Chỉ giới thiệu: không giá bán, không liên kết mua hàng. Nút kêu gọi hành động dẫn tới Cửa hàng và Liên hệ.',
  'Internal editorial rule: every claim must cite a brand-provided source before publishing. This is an editorial check only, not a certification of legal or regulatory compliance.':
    'Quy tắc biên tập nội bộ: mỗi tuyên bố công dụng phải dẫn nguồn do thương hiệu cung cấp trước khi xuất bản. Đây chỉ là bước kiểm tra biên tập, không phải chứng nhận tuân thủ pháp lý hay quy định.',
  'Internal: source of the image and how it was checked against the packaging artwork.':
    'Nội bộ: nguồn của ảnh và cách đã đối chiếu với thiết kế bao bì.',
  'Per language. Content changes reset approval, including editor changes. Save the draft first, review it, set Approved in a separate save without content edits, then publish this language.':
    'Theo từng ngôn ngữ. Mọi thay đổi nội dung (kể cả của biên tập viên) đều đặt lại việc duyệt. Hãy lưu nháp, xem lại, đặt "Đã duyệt" ở một lần lưu riêng không sửa nội dung, rồi mới xuất bản ngôn ngữ này.',
}

// Longer English descriptions that are built by concatenation in the definitions.
const startsWith: Array<[string, string]> = [
  [
    'Files stay private until',
    'Tệp luôn riêng tư cho đến khi tích "Đã duyệt cho phép công khai". Chỉ tích với ảnh thương hiệu đã đồng ý dùng công khai; tài liệu nội bộ hãy đưa vào Tài liệu nguồn.',
  ],
  [
    'Staff only, never shown on the site',
    'Chỉ nhân sự xem, không bao giờ hiển thị trên website hay API công khai: nguồn gốc của bản ngôn ngữ này (chép từ bao bì, dịch, AI đề xuất) và các câu hỏi còn mở.',
  ],
]

const vi = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (texts[value]) return texts[value]
  const hit = startsWith.find(([prefix]) => value.startsWith(prefix))
  return hit ? hit[1] : value
}

const localizeTexts = (admin: Record<string, unknown> | undefined) => {
  if (!admin) return admin
  const next = { ...admin }
  if (typeof next.description === 'string') {
    next.description = vi(next.description)
    // Content collections append the restore notice to the original text.
    if (typeof next.description === 'string' && next.description.endsWith(restoreNotice)) {
      const head = (next.description as string).slice(0, -restoreNotice.length).trim()
      next.description = `${vi(head)} ${restoreNotice}`.trim()
    }
  }
  return next
}

type AnyField = Field & Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const localizeOptions = (options: unknown) =>
  Array.isArray(options)
    ? options.map((option) =>
        typeof option === 'string'
          ? { label: (vi(option) as string) ?? option, value: option }
          : typeof option?.label === 'string'
            ? { ...option, label: vi(option.label) }
            : option,
      )
    : options

export function localizeFields(fields: Field[]): Field[] {
  return fields.map((original) => {
    const field = { ...original } as AnyField
    if ('name' in field && field.name && (field.label === undefined || field.label === null)) {
      const label = fieldLabels[field.name as string]
      if (label) field.label = label
    } else if (typeof field.label === 'string') {
      field.label = vi(field.label)
    }
    if (field.admin) field.admin = localizeTexts(field.admin)
    if (field.labels && typeof field.labels.singular === 'string') {
      field.labels = { singular: vi(field.labels.singular), plural: vi(field.labels.plural) }
    }
    if ('options' in field) field.options = localizeOptions(field.options)
    if (field.type === 'tabs') {
      field.tabs = field.tabs.map((tab: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        ...tab,
        label: typeof tab.label === 'string' ? vi(tab.label) : tab.label,
        description: typeof tab.description === 'string' ? vi(tab.description) : tab.description,
        fields: localizeFields(tab.fields),
      }))
    } else if (Array.isArray(field.fields)) {
      field.fields = localizeFields(field.fields)
    }
    return field as Field
  })
}

export function localizeCollection(collection: CollectionConfig): CollectionConfig {
  const labels = collectionLabels[collection.slug]
  const group = collection.admin?.group
  return {
    ...collection,
    labels: labels ?? collection.labels,
    admin: {
      ...(localizeTexts(collection.admin as Record<string, unknown>) as CollectionConfig['admin']),
      ...(typeof group === 'string' ? { group: groupLabels[group] ?? group } : {}),
    },
    fields: localizeFields(collection.fields),
  }
}

export function localizeGlobal(global: GlobalConfig): GlobalConfig {
  const group = global.admin?.group
  return {
    ...global,
    label: globalLabels[global.slug] ?? global.label,
    admin: {
      ...(localizeTexts(global.admin as Record<string, unknown>) as GlobalConfig['admin']),
      ...(typeof group === 'string' ? { group: groupLabels[group] ?? group } : {}),
    },
    fields: localizeFields(global.fields),
  }
}
