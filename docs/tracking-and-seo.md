# Đo lường (GA4, Meta Pixel, TikTok Pixel) và SEO kỹ thuật

Cập nhật 30/10/2026. **Mọi tracking đang TẮT.** Mã đã sẵn sàng nhưng chưa có ID thật, chưa bật và chưa kiểm chứng trên tài khoản thật.

## 1. Kiến trúc đã chọn: tích hợp trực tiếp, không dùng GTM

| | Tích hợp trực tiếp (đã chọn) | Google Tag Manager |
|---|---|---|
| Consent | Kiểm soát trong mã: script chỉ được chèn sau khi khách đồng ý | Tag trong container có thể bỏ qua consent nếu cấu hình sai, mà repo không thấy được |
| Chống trùng | Một bộ điều phối duy nhất (`src/lib/analytics/tracker.ts`), có test | Dễ trùng nếu vừa cài tag trực tiếp vừa cài qua GTM |
| Kiểm thử | Unit test với SDK giả, chạy trong CI | Phải kiểm tra thủ công trong GTM Preview |
| Thay đổi | Cần sửa mã và deploy | Marketing tự sửa, không cần deploy |
| Bảo mật/CSP | Chỉ 3 domain cố định | GTM có thể tải script tùy ý |

Nếu sau này dùng GTM: **gỡ** các adapter trực tiếp tương ứng; không chạy song song.

## 2. Biến môi trường (đặt trên Vercel, không ghi vào Git)

| Biến | Ví dụ định dạng | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_TRACKING_ENABLED` | `true` | Thiếu hoặc khác `true` thì tắt toàn bộ |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` | GA4 → Admin → Data streams → Web → Measurement ID |
| `NEXT_PUBLIC_META_PIXEL_ID` | 15–16 chữ số | Meta Events Manager → Data sources → Pixel ID |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Chuỗi chữ hoa và số | TikTok Ads Manager → Tools → Events → Web events → Pixel ID |
| `NEXT_PUBLIC_TRACKING_DEBUG` | `true` | Chỉ hoạt động khi chạy dev |

ID sai định dạng thì nền tảng đó tự tắt. Biến `NEXT_PUBLIC_*` được gắn vào lúc build, nên đổi giá trị thì phải build lại. Dùng **ID riêng cho staging**, hoặc để tắt, để không lẫn số liệu.

**Cấu hình phía tài khoản (người dùng tự làm):**
- GA4 → Data streams → Enhanced measurement: **tắt** "Page changes based on browser history events". Site đã tự gửi page_view mỗi lần đổi trang; để bật sẽ bị đếm đôi.
- Meta: giữ tắt "Automatic advanced matching". Mã đã đặt `autoConfig=false` và không truyền dữ liệu khách.
- TikTok: giữ tắt "Automatic Advanced Matching" và "Automatic events". Mã không gọi `identify`.
- Google Ads: chưa tích hợp. Nếu cần, thêm vào adapter Google (`gtag('config', 'AW-…')`) và gắn conversion vào `generate_lead`.

## 3. Sự kiện

| Sự kiện nội bộ | Khi nào | GA4 | Meta | TikTok | Tham số | Consent | Chống trùng |
|---|---|---|---|---|---|---|---|
| page_view | Đổi trang (pathname + query bộ lọc) | `page_view` (gửi tay) | `PageView` | `ttq.page()` | locale, page_type, content_id | analytics / marketing | 1 lần mỗi lượt xem trang, mỗi nền tảng |
| view_product | Trang chi tiết sản phẩm | `view_item` | `ViewContent` | `ViewContent` | slug, tên sản phẩm | như trên | 1 lần mỗi lượt xem |
| view_article | Trang bài viết | `view_article` (tùy chỉnh) | `ViewArticle` (tùy chỉnh) | `ViewArticle` (tùy chỉnh) | slug | như trên | 1 lần mỗi lượt xem |
| click_contact | Bấm link tới /contact | `click_contact` | `ClickContact` (tùy chỉnh) | `ClickContact` (tùy chỉnh) | vị trí link | như trên | Mỗi lần bấm thật |
| click_consultation | Bấm link tới /partnership | `click_consultation` | `ClickConsultation` | `ClickConsultation` | vị trí link | như trên | Mỗi lần bấm thật |
| click_social | Bấm link mạng xã hội | `click_social` | `ClickSocial` | `ClickSocial` | mạng xã hội | như trên | Hiện site chưa có link mạng xã hội |
| generate_lead | **Sau khi server đã lưu** form liên hệ/hợp tác | `generate_lead` | `Lead` + `eventID` | `Lead` + `event_id` | tên form | như trên | Theo `leadId` do server cấp |
| language_change | Bấm bộ chuyển ngôn ngữ | `language_change` | — | — | from, to | analytics | — |

Không có Purchase, AddToCart hay Checkout. Bấm nút không bao giờ được tính là lead. Bot bị honeypot chặn vẫn thấy "thành công" nhưng không nhận `leadId`, nên không được tính lead.

**Đổi tên chuẩn của TikTok:** `SubmitForm` đã đổi thành `Lead`, và TikTok khuyến nghị dùng `Lead` cho Pixel mới ([TikTok](https://ads.tiktok.com/resources/help/article/how-to-adopt-tiktoks-updated-standard-events?lang=en), kiểm tra 30/10/2026).

**Meta Conversions API và TikTok Events API:** chưa triển khai. Nếu bật sau này, server gửi cùng `leadId` làm `event_id`/`eventID` để nền tảng khử trùng. Access token chỉ đặt ở biến môi trường phía server, không bao giờ để trong `NEXT_PUBLIC_*`.

## 4. Consent và quyền riêng tư

- Không có lựa chọn thì không tải gì. Banner có "Chấp nhận tất cả", "Từ chối tất cả" ngang hàng nhau, và "Tùy chọn" (Phân tích / Quảng cáo). Cookie `drphynex_consent` có hiệu lực 180 ngày.
- GA4 dùng Consent Mode v2 (basic): mặc định *denied* được đặt trước `config`, chỉ tải sau khi khách đồng ý phân tích. Tín hiệu quảng cáo của Google chỉ bật khi khách cũng đồng ý quảng cáo.
- Meta và TikTok chỉ tải sau khi khách đồng ý quảng cáo.
- **Rút consent** (nút "Cài đặt cookie" ở footer):
  - Gọi `fbq('consent','revoke')`, `ttq.revokeConsent()` và đặt GA về *denied*.
  - Ngừng gửi sự kiện.
  - Xóa các cookie `_ga*`, `_fbp`, `_fbc`, `_ttp`, `_gcl_*` ở mức có thể.
  - **Giới hạn:** script đã tải không gỡ được cho tới khi tải lại trang, và **dữ liệu đã gửi trước đó không được thu hồi**. Muốn xóa dữ liệu đó phải làm trong từng tài khoản (GA4 data deletion, yêu cầu tới Meta/TikTok).
- Không đo trên `/admin`, `/api`, `/preview`, và khi nhân viên đang xem preview.
- Không gửi email, số điện thoại, tên hay nội dung form. URL gửi đi chỉ giữ các tham số bộ lọc (`line`, `concern`, `topic`, `country`, `page`). Chữ có dạng email hoặc số điện thoại bị loại bỏ.
- Nội dung banner (ko/en/vi) là **bản nháp**, cần pháp lý duyệt cùng Chính sách bảo mật. Chính sách hiện chưa nhắc tới GA4, Meta, TikTok, nên phải bổ sung trước khi bật.

## 5. Bảo mật và hiệu năng

- Header đã đặt cho mọi route: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` cùng `frame-ancestors 'self'`, `Permissions-Policy`. Đã bỏ `X-Powered-By`.
- **Chưa đặt CSP cho script.** Next.js và trang admin của Payload cần nonce; phải làm và thử riêng trên staging. Khi làm, chỉ cho phép đúng các nguồn:
  - `script-src`: `https://www.googletagmanager.com`, `https://connect.facebook.net`, `https://analytics.tiktok.com`;
  - `connect-src`: `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://www.facebook.com`, `https://analytics.tiktok.com`;
  - `img-src`: `https://www.facebook.com`, `https://www.google-analytics.com`.

  Không dùng wildcard rộng hơn.
- Script được tải `async` sau khi khách đồng ý. Khi trình chặn quảng cáo chặn script, nền tảng đó tự ngừng và site vẫn chạy bình thường (có test).
- Ảnh hưởng tới Core Web Vitals chỉ đo được trên staging và production; số đo Local không đại diện.

## 6. SEO kỹ thuật đã thêm

- Open Graph và Twitter card trên mọi trang, lấy từ chính title, description và canonical của trang. Chỉ dùng ảnh đã được tích "Cleared for publication".
- JSON-LD:
  - Organization và WebSite trên mọi trang;
  - BreadcrumbList cho sản phẩm, bài viết, thành phần;
  - Product (không có giá, đánh giá hay nhà sản xuất);
  - Article (tác giả và ngày chỉ khi CMS có).
- Không có FAQ: Google đã ngừng hiển thị rich result FAQ.
- Sitemap chỉ liệt kê trang đã duyệt, kèm hreflang. Trang chủ, Liên hệ và Hợp tác luôn có mặt.
- Rich text: liên kết nội bộ trỏ đúng `/{locale}/…`; liên kết tới nội dung chưa công khai hiện thành chữ thường, không có link. Heading trong CMS bắt đầu từ h2, và trình soạn thảo chỉ cho h2–h4.
- noindex và `robots.txt` (chặn toàn bộ) **giữ nguyên**. Bỏ chặn là một quyết định riêng khi ra mắt.
