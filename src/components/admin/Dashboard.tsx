import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'

import { localeLabels, locales, type Locale } from '@/i18n/locales'
import { readApprovalState, type ApprovalState } from '@/lib/approval-basis'

/**
 * Admin start page (Vietnamese). Everything shown is read from the CMS with the signed-in user's
 * own permissions: shortcuts only for what that role may open, banner status from the stored Home
 * Page draft. Nothing here is a placeholder figure; what is not wired shows an empty state.
 */
const roleName: Record<string, string> = {
  admin: 'Quản trị viên',
  editor: 'Biên tập viên',
  translator: 'Biên dịch viên',
}
const reviewName: Record<string, string> = {
  'ai-draft': 'Bản nháp AI',
  'in-review': 'Đang xem xét',
  approved: 'Đã duyệt',
}

const allowed = (permission: unknown) =>
  permission === true || (permission as { permission?: boolean } | undefined)?.permission === true

const shortcuts = [
  { href: '/admin/globals/home-page', label: 'Banner trang chủ', note: '5 banner, duyệt từng ngôn ngữ', kind: 'globals', slug: 'home-page' },
  { href: '/admin/collections/products', label: 'Sản phẩm', note: 'Nội dung và thành phần', kind: 'collections', slug: 'products' },
  { href: '/admin/collections/media', label: 'Thư viện media', note: 'Ảnh và quyền công khai', kind: 'collections', slug: 'media' },
  { href: '/admin/collections/articles', label: 'Bài viết tạp chí', note: 'Soạn và duyệt bài', kind: 'collections', slug: 'articles' },
  { href: '/admin/collections/stores', label: 'Điểm bán', note: 'Cửa hàng và nhà phân phối', kind: 'collections', slug: 'stores' },
  { href: '/admin/collections/contact-submissions', label: 'Tin nhắn liên hệ', note: 'Chỉ quản trị viên', kind: 'collections', slug: 'contact-submissions' },
  { href: '/admin/collections/partner-inquiries', label: 'Yêu cầu hợp tác B2B', note: 'Chỉ quản trị viên', kind: 'collections', slug: 'partner-inquiries' },
] as const

export async function Dashboard({ initPageResult, payload }: AdminViewServerProps) {
  const { req, permissions } = initPageResult
  const user = req.user as { email?: string; name?: string | null; role?: string } | null
  const open = shortcuts.filter((s) =>
    allowed(
      (permissions as unknown as Record<string, Record<string, { read?: unknown }>>)?.[s.kind]?.[s.slug]
        ?.read,
    ),
  )

  let banner: Record<Locale, ApprovalState> | null = null
  if (open.some((s) => s.slug === 'home-page')) {
    try {
      const states = await Promise.all(locales.map((l) => readApprovalState(payload, l)))
      banner = Object.fromEntries(locales.map((l, i) => [l, states[i]])) as Record<Locale, ApprovalState>
    } catch {
      banner = null
    }
  }

  return (
    <Gutter>
      <div className="dx-dash">
        <header className="dx-dash__head">
          <h1>Bảng điều khiển</h1>
          <p>
            Xin chào <strong>{user?.name || user?.email}</strong>
            {user?.role ? ` · ${roleName[user.role] ?? user.role}` : ''}
          </p>
        </header>

        <section aria-labelledby="dx-dash-banner">
          <h2 id="dx-dash-banner">Tình trạng banner trang chủ</h2>
          {banner ? (
            <table className="dx-dash__table">
              <caption className="dx-dash__sr">Trạng thái duyệt của trang chủ theo từng ngôn ngữ</caption>
              <thead>
                <tr>
                  <th scope="col">Ngôn ngữ</th>
                  <th scope="col">Trạng thái duyệt của trang</th>
                  <th scope="col">Cấu hình banner dùng chung</th>
                  <th scope="col">
                    <span className="dx-dash__sr">Mở</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {locales.map((l) => (
                  <tr key={l}>
                    <th scope="row">{localeLabels[l]}</th>
                    <td>{reviewName[banner![l].status] ?? banner![l].status}</td>
                    <td>{banner![l].approved[l] ? 'Đã duyệt cấu hình hiện tại' : 'Chưa duyệt / cần duyệt lại'}</td>
                    <td>
                      <Link href={`/admin/globals/home-page?locale=${l}`}>
                        Mở <span className="dx-dash__sr">trang chủ ngôn ngữ {localeLabels[l]}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dx-dash__empty">
              {open.some((s) => s.slug === 'home-page')
                ? 'Chưa đọc được trạng thái banner. Hãy tải lại trang.'
                : 'Tài khoản của bạn không có quyền xem banner trang chủ.'}
            </p>
          )}
        </section>

        <section aria-labelledby="dx-dash-todo">
          <h2 id="dx-dash-todo">Việc cần duyệt toàn website</h2>
          <p className="dx-dash__empty">
            Danh sách tổng hợp các mục đang chờ duyệt chưa được kết nối. Hãy mở từng mục trong lối
            tắt bên dưới hoặc menu bên trái để xem trạng thái duyệt theo ngôn ngữ.
          </p>
        </section>

        <section aria-labelledby="dx-dash-links">
          <h2 id="dx-dash-links">Lối tắt</h2>
          {open.length ? (
            <ul className="dx-dash__cards">
              {open.map((s) => (
                <li key={s.href}>
                  <Link href={s.href}>
                    <strong>{s.label}</strong>
                    <span>{s.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dx-dash__empty">Tài khoản của bạn chưa được cấp quyền truy cập mục nào.</p>
          )}
        </section>
      </div>
    </Gutter>
  )
}
