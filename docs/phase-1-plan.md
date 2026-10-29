# Dr.PhynEX: kế hoạch giai đoạn 1

Đây là đề xuất, chưa có mã nào được tạo. Yêu cầu và giả định nằm ở [PRODUCT.md](../PRODUCT.md).

## 1. Sitemap

Mỗi trang dưới đây có ở cả `/ko`, `/en`, `/vi`. Trong bảng ghi `/{l}` thay cho tiền tố ngôn ngữ.

| Trang | Đường dẫn | Nội dung chính |
|---|---|---|
| Trang chủ | `/{l}` | Giới thiệu thương hiệu, dòng sản phẩm nổi bật, thành phần/công nghệ chính, Journal mới, điểm bán |
| Thương hiệu | `/{l}/brand` | Câu chuyện, triết lý, nghiên cứu (theo hồ sơ thương hiệu) |
| Danh mục sản phẩm | `/{l}/products` | Lọc theo dòng sản phẩm / nhu cầu da / loại sản phẩm |
| Dòng sản phẩm | `/{l}/products/line/[slug]` | Giới thiệu dòng và danh sách sản phẩm |
| Chi tiết sản phẩm | `/{l}/products/[slug]` | Ảnh, công dụng có nguồn, thành phần chính, INCI, cách dùng, lưu ý, sản phẩm liên quan; lời kêu gọi tới Điểm bán và Liên hệ (không giá, không link mua) |
| Thành phần & công nghệ | `/{l}/ingredients` | Danh sách thành phần chính và công nghệ |
| Chi tiết thành phần/công nghệ | `/{l}/ingredients/[slug]` | Mô tả và các sản phẩm có chứa |
| Journal | `/{l}/journal` | Danh sách bài, lọc theo chủ đề |
| Bài Journal | `/{l}/journal/[slug]` | Bài viết, sản phẩm được nhắc tới |
| Điểm bán | `/{l}/stores` | Danh sách cửa hàng / nhà phân phối theo quốc gia và thành phố |
| Liên hệ | `/{l}/contact` | Thông tin liên hệ và form |
| Hợp tác B2B | `/{l}/partnership` | Lợi ích hợp tác (theo tài liệu) và form B2B |
| Pháp lý | `/{l}/privacy`, `/{l}/terms` | Chính sách (khách cung cấp nội dung) |
| Hệ thống | `/` → chuyển hướng, `/{l}/...` 404, `sitemap.xml`, `robots.txt` | |
| Quản trị | `/admin` | Payload Admin (không có tiền tố ngôn ngữ) |

Điểm bán là một trang danh sách có lọc. Bản đồ là tùy chọn: dịch vụ bản đồ có thể phát sinh phí, nên cần duyệt trước khi dùng.

## 2. Cấu trúc thư mục đề xuất

Dựa trên template chính thức của Payload 3 (Payload chạy bên trong ứng dụng Next.js).

```
website-demo/
├─ src/
│  ├─ app/
│  │  ├─ (frontend)/
│  │  │  └─ [locale]/
│  │  │     ├─ layout.tsx              # lang, font, header/footer, hreflang
│  │  │     ├─ page.tsx                # trang chủ
│  │  │     ├─ brand/  products/  ingredients/  journal/
│  │  │     ├─ stores/  contact/  partnership/  [legal]/
│  │  │     └─ not-found.tsx
│  │  ├─ (payload)/                    # /admin và /api do Payload sinh ra
│  │  ├─ sitemap.ts  robots.ts
│  ├─ collections/                     # Products, ProductLines, Ingredients, ...
│  ├─ globals/                         # SiteSettings, Header, Footer, HomePage, BrandPage
│  ├─ fields/                          # field dùng chung: seo, slug, translationStatus, claimSource
│  ├─ access/                          # quyền theo vai trò
│  ├─ hooks/                           # revalidate, kiểm tra trước khi xuất bản
│  ├─ i18n/                            # routing.ts, navigation.ts, request.ts (next-intl)
│  ├─ messages/                        # ko.json, en.json, vi.json (chỉ nhãn giao diện)
│  ├─ components/                      # ui/, sections/, product/, forms/
│  ├─ lib/                             # payload client, định dạng, kiểm tra form
│  ├─ styles/                          # Tailwind 4, token theo DESIGN.md
│  ├─ payload.config.ts             # local: lưu tệp trên đĩa; Vercel: storage-s3 (R2/S3)
│  └─ proxy.ts                         # next-intl (Next 16), bỏ qua /admin, /api, file tĩnh
├─ docker-compose.yml                  # PostgreSQL local
├─ .env.example                        # không có secret thật
├─ docs/
├─ PRODUCT.md  DESIGN.md  CLAUDE.md
```

## 3. Mô hình dữ liệu (Payload)

Ký hiệu: (L) là field localized, có giá trị riêng cho từng ngôn ngữ.

### Collections

| Collection | Field chính |
|---|---|
| **Products** | name (L), slug, sku, line → ProductLines, categories → ProductCategories, concerns → SkinConcerns, skinTypes, volume, images → Media, shortDescription (L), description (L), claims[] (L): `{ text, sourceDocument, sourceNote }`, keyIngredients → Ingredients, technologies → Technologies, inci (văn bản chuẩn, không dịch), howToUse (L), cautions (L), related → Products, seo (L), translationStatus (L), drafts |
| **ProductLines** | name (L), slug, description (L), heroImage, order |
| **ProductCategories** | name (L), slug (vd. cleanser, serum, cream) |
| **SkinConcerns** | name (L), slug |
| **Ingredients** | name (L), inciName, slug, summary (L), body (L), image, sources |
| **Technologies** | name (L), slug, summary (L), body (L), image, sources |
| **Articles** (Journal) | title (L), slug, topic → JournalTopics, cover, excerpt (L), body (L, rich text + block sản phẩm), author, publishedAt, relatedProducts, seo (L), translationStatus (L), drafts |
| **JournalTopics** | name (L), slug |
| **Stores** | name, type (cửa hàng / nhà phân phối / khác), country, city, address (L), phone, url, hours (L), lat/lng (tùy chọn), order |
| **Media** | ảnh/tệp, alt (L), caption (L), credit. Lưu trên object storage |
| **ContactSubmissions** | name, email, phone, topic, message, locale, consent, createdAt, status. Chỉ đọc trong admin |
| **PartnerInquiries** (B2B) | company, contactName, email, phone, country, businessType, channels, message, locale, consent, status |
| **Users** | email, role: `admin` / `editor` / `translator` |

### Globals

- **SiteSettings:** tên, logo, mạng xã hội, liên hệ (L).
- **Header / Footer:** menu (L).
- **HomePage:** các khối nội dung (L).
- **BrandPage:** khối nội dung (L).
- **PartnershipPage:** nội dung (L).
- **Legal:** chính sách, điều khoản (L).

### Quy tắc nội dung

- Mỗi `claims` của sản phẩm bắt buộc có `sourceDocument` (tệp hoặc tên tài liệu). Hook trước khi xuất bản chặn công dụng không có nguồn.
- Form chỉ ghi được từ API công khai có kiểm tra dữ liệu và chống spam (honeypot + giới hạn tần suất). Chỉ admin xem được bài gửi.

## 4. Quản lý nội dung ba ngôn ngữ

- **Payload localization:**
  - `locales: ['ko', 'en', 'vi']`;
  - `defaultLocale: 'ko'`, vì tiếng Hàn là ngôn ngữ gốc (đã xác nhận);
  - `fallback: false` cho nội dung công khai, để không lộ ngôn ngữ khác.
- **Trạng thái dịch:** field `translationStatus` (L) có 3 giá trị:
  - `ai-draft`: AI tạo;
  - `in-review`: đang duyệt;
  - `approved`: đã duyệt.

  Frontend chỉ hiển thị một ngôn ngữ khi tài liệu đã xuất bản **và** ngôn ngữ đó ở trạng thái `approved`. Nếu chưa, trang trả 404 cho ngôn ngữ đó và bộ chuyển ngôn ngữ ẩn lựa chọn đó. Cách này không phụ thuộc tính năng `localizeStatus` vốn còn thử nghiệm của Payload.
- **Nhãn giao diện** (nút, menu, thông báo lỗi form) nằm trong `messages/{ko,en,vi}.json` qua next-intl. Cũng phải được duyệt như nội dung.
- **URL:** phân đoạn tiếng Anh cố định, slug dùng chung giữa các ngôn ngữ [GIẢ ĐỊNH]. Nhờ vậy bộ chuyển ngôn ngữ chỉ cần đổi tiền tố, và tránh URL tiếng Hàn bị mã hóa phần trăm. Có thể chuyển sang slug theo từng ngôn ngữ sau, nhưng phải migration dữ liệu: Payload cảnh báo đổi `localized` làm mất dữ liệu field.
- **Vào `/`:** `proxy.ts` chọn ngôn ngữ theo `Accept-Language` của trình duyệt, nếu không khớp thì về `/en` (next-intl localeDetection, ngôn ngữ dự phòng là `en`). Ngôn ngữ dự phòng khi điều hướng (`en`) khác `defaultLocale` của CMS (`ko`), cần cấu hình riêng.
- **SEO:** `hreflang` cho ba ngôn ngữ, `x-default` trỏ `/en`; sitemap chỉ liệt kê bản đã duyệt.
- **Quy trình dịch:**
  1. Nhập bản tiếng Hàn từ tài liệu.
  2. AI tạo bản nháp các ngôn ngữ khác (`ai-draft`).
  3. Người duyệt sửa và chuyển `approved`.
  4. Xuất bản.

  Vai trò `translator` chỉ sửa được field văn bản và trạng thái dịch.

## 5. Tài liệu cần cung cấp

**Nhận diện**
- [ ] Logo gốc dạng vector (SVG/AI/EPS): bản màu, đen, trắng; quy định vùng an toàn
- [ ] Brand guideline (nếu có): màu, font, cách dùng logo, giọng văn
- [ ] Favicon / biểu tượng (nếu có sẵn)

**Hồ sơ thương hiệu**
- [ ] Câu chuyện, triết lý, định vị, đối tượng khách hàng
- [ ] Thông tin công ty: tên pháp lý, quốc gia, năm thành lập, nhà sản xuất/phòng nghiên cứu, chỉ khi được phép công bố
- [ ] Chứng nhận, kiểm nghiệm, giải thưởng kèm bản chứng minh (chỉ những gì được công bố)
- [ ] Ngôn ngữ gốc của tài liệu; bản dịch có sẵn (nếu có)

**Sản phẩm**, mỗi sản phẩm cần:
- [ ] Tên chính thức (ko/en/vi nếu có), mã SKU, dòng sản phẩm, loại, dung tích
- [ ] Công dụng **đã được phép công bố** (kèm tài liệu nguồn; tại Việt Nam nên đối chiếu phiếu công bố mỹ phẩm)
- [ ] Thành phần chính và bảng INCI đầy đủ
- [ ] Cách dùng, lưu ý, loại da/vấn đề da phù hợp
- [ ] Ảnh bao bì nền trơn (độ phân giải cao, PNG/TIFF), ảnh texture, ảnh lifestyle; quyền sử dụng ảnh
- [ ] Sản phẩm nào có bán ở điểm bán nào (nếu muốn liên kết sản phẩm với điểm bán)

**Thành phần & công nghệ**
- [ ] Mô tả các thành phần chính và công nghệ độc quyền, kèm nguồn/nghiên cứu

**Journal**
- [ ] Bài viết có sẵn hoặc danh sách chủ đề; tác giả/biên tập

**Điểm bán**
- [ ] Danh sách cửa hàng, nhà phân phối: tên, địa chỉ, giờ mở cửa, điện thoại, website

**Liên hệ & B2B**
- [ ] Email, điện thoại, địa chỉ, mạng xã hội
- [ ] Người/email nhận yêu cầu liên hệ và B2B
- [ ] Nội dung chương trình hợp tác: đối tượng, điều kiện, lợi ích (chỉ những gì được công bố)
- [ ] Chính sách bảo mật và điều khoản (hoặc xác nhận để soạn bản nháp cho pháp lý duyệt)

**Kỹ thuật**
- [ ] Tên miền; tài khoản Vercel; lựa chọn Postgres có quản lý và R2 hay S3; nhà cung cấp email gửi thông báo form (đều cần duyệt chi phí trước)

## 6. Bước triển khai tiếp theo (giai đoạn 2)

1. **Điều kiện trước:** nâng Node lên `>=24.22.1` hoặc `22.23.4+` (người dùng tự cài, hoặc cho phép tôi hướng dẫn).
2. **Khung dự án:**
   - Tạo dự án từ template chính thức Payload 3 (Next 16, Postgres), thêm next-intl và Tailwind 4.
   - Chạy Postgres bằng `docker-compose`.
   - Thêm `.env.example`.
3. **Dữ liệu:**
   - Tạo collections/globals theo §3, có localization và quyền theo vai trò.
   - Seed chỉ có tài khoản admin local; không seed sản phẩm giả.
4. **Thiết kế:**
   - Khi có logo/brand guideline: chạy UI/UX Pro Max để đề xuất hệ thống thiết kế, Taste Skill để chọn hướng (không dùng scenes).
   - Viết DESIGN.md và **chờ duyệt màu nhận diện**.
5. **Trang đại diện:** dựng trang chi tiết sản phẩm hoặc trang chủ với một sản phẩm thật từ tài liệu, kiểm tra ở 390 / 768 / 1440 px, rồi mới nhân rộng.
