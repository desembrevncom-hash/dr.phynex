# Dr.PhynEX: báo cáo giai đoạn 2 (nền tảng)

Ngày: 28/10/2026. Chỉ chạy Local, chưa triển khai công khai, chưa tạo tài khoản dịch vụ ngoài.

## 1. Phiên bản và tương thích

| Thành phần | Phiên bản khóa | Ghi chú |
|---|---|---|
| Node | 24.22.1 (máy) | Payload yêu cầu `^22.23.4 \|\| >=24.22.1` |
| Payload (+ db-postgres, next, ui, richtext-lexical, translations) | 3.92.1 | Template chính thức `blank` (create-payload-app 3.92.1) |
| Next.js | 16.4.3 | Template ghi 16.3.3, có lỗ hổng critical (GHSA-f87g-xv8r-7p7x, GHSA-h694-7cp9-m8p3); 16.4.3 nằm trong peer range `>=16.3.3 <17` của `@payloadcms/next` |
| next-intl | 4.14.9 | peer `next ^16` |
| Tailwind CSS | 4.3.3 | `@tailwindcss/postcss` |
| React | 19.2.6 | |
| sharp | 0.35.5 | Bản vá lỗ hổng librsvg |
| PostgreSQL (Docker) | 17.6-alpine | |

- `.npmrc`: `engine-strict=true`, `strict-peer-deps=true`, `save-exact=true`. Template gốc có `legacy-peer-deps=true` (bỏ qua lỗi peer), đã thay. Cài đặt không có lỗi engine/peer.
- `overrides.dompurify = 3.4.17`: bản vá (patch) cho lỗ hổng critical của `dompurify 3.4.8` do `monaco-editor` (trình soạn code trong admin) khóa cứng.
- `npm audit` còn 14 mục (6 low, 5 moderate, 3 high), không có critical. Chưa có bản sửa không phá vỡ:
  - `happy-dom` (qua `@lexical/headless` của Payload): sửa cần lên major 21.
  - `esbuild` cũ qua `drizzle-kit` (chỉ dùng cho CLI migration, lỗi ảnh hưởng dev server của esbuild).
  - `deepmerge` (qua `payload`): chưa có bản sửa.
  Theo dõi khi Payload phát hành bản mới; không dùng `npm audit fix --force`.
- npm 11 chặn install script của một số gói (`esbuild`, `unrs-resolver`, `@swc/core`, `@parcel/watcher`). Build, lint, test vẫn chạy được; chưa cấp quyền chạy script.

## 2. Đã làm

- Scaffold ở thư mục tạm rồi chép vào dự án với `cp -n` (không ghi đè). Giữ nguyên `.agents/`, `.claude/` (skills, `settings.local.json`), `.codex/`, `.impeccable/`, `CLAUDE.md`, `docs/`. Bỏ phần demo của template (`my-route`, trang mẫu, e2e Playwright, `seedUser` có mật khẩu cứng, Dockerfile, compose MongoDB). Thêm `.claude/launch.json` cho preview dev server.
- `docker-compose.yml`: project `drphynex`, container `drphynex-postgres`, named volume `drphynex_pgdata`, healthcheck `pg_isready`, cổng `127.0.0.1:5433`. Mật khẩu lấy từ `.env` (bắt buộc). Không đụng container Supabase đang có trên máy.
- `.env.example` chỉ có giá trị mẫu; `.env` (git-ignored) do script sinh mật khẩu và secret ngẫu nhiên.
- Payload: localization `ko` (mặc định, ngôn ngữ gốc) / `en` / `vi`, `fallback: false`; admin UI có tiếng Anh, Hàn, Việt. `push: false`, schema đi qua migration `src/migrations/20261028_101829_initial`.
- Mô hình dữ liệu theo kế hoạch §3: Products, ProductLines, ProductCategories, SkinConcerns, Ingredients, Technologies, Articles, JournalTopics, Stores, LegalPages, Media, SourceDocuments, ContactSubmissions, PartnerInquiries, Users; globals HomePage, BrandPage, PartnershipPage, SiteSettings.
- next-intl: `src/proxy.ts` (Next 16) bỏ qua `/admin`, `/api`, `_next` và đường dẫn có phần mở rộng. `/` chọn theo `Accept-Language`, không khớp thì `/en`.
- Trang nền tảng giao diện trung tính (token xám, font hệ thống hỗ trợ Hangul và dấu tiếng Việt): trang chủ, thương hiệu, sản phẩm (lọc dòng/nhu cầu da), dòng sản phẩm, chi tiết sản phẩm (không giá, CTA tới Điểm bán và Liên hệ), thành phần & công nghệ, Journal, điểm bán (lọc quốc gia), liên hệ, hợp tác B2B, privacy/terms, 404, `sitemap.xml`, `robots.txt`. Chỗ chưa có nội dung đã duyệt hiển thị thông báo “chưa xuất bản với bản dịch đã duyệt ở đủ ba ngôn ngữ”.
- Form Liên hệ và B2B: server action, kiểm tra dữ liệu phía server, honeypot, giới hạn tần suất, trạng thái lỗi/thành công có thông báo cho trình đọc màn hình, lưu vào CMS.

## 3. Kiểm soát quyền (server-side)

- Đọc nội dung công khai (`src/access/roles.ts → publishedAndApproved`): khách chỉ nhận `_status = published` **và** `translationStatus = approved` ở ngôn ngữ được yêu cầu. Quy tắc nằm trong access của Payload nên áp dụng cho REST, GraphQL và Local API (frontend luôn gọi với `overrideAccess: false`).
- Khách gửi `locale=all`, `fallback-locale=...` hoặc không gửi `locale` thì bị từ chối (403), để không lộ bản dịch chưa duyệt.
- Khách không đọc được: tài khoản, bài gửi Liên hệ/B2B, tài liệu nguồn, lịch sử phiên bản, field nguồn của công dụng (`sourceDocument`, `sourceFile`, `sourceNote`).
- Bài gửi form: không ai tạo được qua API (kể cả admin); chỉ server action ghi sau khi kiểm tra. Chỉ admin đọc/sửa/xóa.
- Tài khoản đầu tiên luôn là `admin`; chỉ admin tạo tài khoản và đổi vai trò.
- Công dụng (claims): mỗi mục bắt buộc có `sourceDocument` khi xuất bản (bản nháp được phép thiếu). Đây là **quy tắc biên tập nội bộ**, ghi rõ trong admin là không phải chứng nhận tuân thủ pháp luật.

## 4. Kết quả kiểm tra thực tế

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Kết nối DB + migration | `npm run migrate`, `migrate:status` | Đạt |
| Dữ liệu còn sau restart | `docker compose down` (xóa container, giữ volume) rồi `db:up`; đếm bản ghi trước/sau | Đạt (users/products/submissions/migrations giữ nguyên); dev server tự kết nối lại |
| Kiểm thử quyền | `npm test`: 14 kiểm thử trên `drphynex_test` (vai trò, nháp/xuất bản, duyệt theo ngôn ngữ, `locale=all`, fallback, bản nháp mới không lộ, translator, global, form, tài liệu nguồn) | 14/14 đạt |
| REST/GraphQL khách | curl: `/api/users`, `/api/contact-submissions`, `/api/partner-inquiries`, `/api/source-documents`, `/api/products/versions`, POST submission, GraphQL `ContactSubmissions` | Đều 403/Forbidden |
| Redirect `/` | `Accept-Language` ko / vi / fr / en | `/ko`, `/vi`, `/en`, `/en` |
| Route | `/en /ko /vi`, các trang, `/admin` 200; đường dẫn lạ 404; `/de` → `/en/de` (404) | Đạt |
| Admin | Tạo tài khoản đầu tiên qua `/admin/create-first-user` (tài khoản QA tạm, mật khẩu ngẫu nhiên), đăng nhập, tạo và sửa bản nháp sản phẩm | Đạt; vai trò tự gán `admin`; khách 404 với bản nháp |
| Chuyển ngôn ngữ | Xuất bản thử ko+en `approved`, vi `in-review` | ko/en 200, vi 404; switcher giữ đúng trang, vi bị vô hiệu hóa; hreflang và sitemap chỉ có ko/en |
| Form Liên hệ | Gửi trống, email sai, hợp lệ | Lỗi từng field + thông báo tổng, giữ dữ liệu đã nhập; thành công lưu vào `contact_submissions` |
| Responsive | 390 / 768 / 1440 px, ảnh chụp thực tế | Không tràn ngang; sửa cột ảnh trống khi sản phẩm chưa có ảnh |
| Bàn phím | Tab đầu tiên tới “Chuyển đến nội dung”, Enter đưa focus vào `main`; viền focus hiện rõ | Đạt |
| Typecheck / lint / build | `npm run typecheck`, `npm run lint`, `npm run build`, `next start` thử | Đều sạch; bản build trả đúng redirect/route/403 |

Sau kiểm tra đã xóa tài khoản QA, sản phẩm thử và bài gửi thử khỏi database dev; `/admin` sẽ hiện màn hình tạo tài khoản đầu tiên.

## 5. Còn chờ / chưa làm

**Cần người dùng**
- Tạo tài khoản admin thật tại `/admin` (thông tin do bạn nhập; không có mật khẩu nào trong mã).
- Nhãn giao diện tiếng Hàn và tiếng Việt trong `src/messages/*.json` do AI soạn: cần người bản ngữ duyệt trước khi ra mắt.
- Tài liệu thương hiệu theo [phase-1-plan.md §5](phase-1-plan.md): logo, guideline, sản phẩm, ảnh, điểm bán, liên hệ, chính sách. Chưa có DESIGN.md (chờ brief).

**Giả định cần duyệt**
- Translator không được chuyển bản dịch sang `approved`; chỉ editor/admin duyệt.
- Khi chưa có bản dịch đã duyệt, trang chi tiết trả 404 và lựa chọn ngôn ngữ đó bị vô hiệu hóa (không ẩn hẳn, có chú thích cho trình đọc màn hình).
- Cookie `NEXT_LOCALE` của next-intl ghi nhớ ngôn ngữ đã chọn; lần sau vào `/` ưu tiên cookie trước `Accept-Language`.
- Ảnh trong Media đọc công khai (kể cả ảnh gắn với sản phẩm chưa xuất bản). Tài liệu nhạy cảm để ở SourceDocuments (chỉ nhân viên đọc).
- Mọi môi trường đang `noindex` và `robots.txt` chặn toàn bộ cho tới khi được duyệt ra mắt.

**Kỹ thuật còn lại**
- Thông báo email khi có bài gửi form: chưa có nhà cung cấp email (Payload đang ghi email ra console).
- Giới hạn tần suất form lưu trong bộ nhớ một tiến trình; trên Vercel cần chuyển sang kho dùng chung (Postgres/KV) trước khi ra mắt.
- Trang render động mỗi request; chưa có cache + revalidate hook khi xuất bản.
- Chưa có object storage (R2/S3) cho Vercel; Local lưu tệp ở `media/` và `private-uploads/` (git-ignored).
- Chưa có trình xem trước bản nháp (live preview) cho biên tập viên.
- Chưa có kiểm thử e2e trên trình duyệt tự động (đã kiểm tra thủ công bằng trình duyệt tích hợp); Playwright cần tải trình duyệt nên chưa cài.
- Scroll scenes của Taste Skill không dùng (theo CLAUDE.md).
