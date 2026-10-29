# Theo dõi lỗ hổng dependency

Cập nhật: 29/10/2026 (`npm audit`, Payload 3.92.1, Next.js 16.4.3). Không dùng `npm audit fix --force`: lệnh này đề xuất hạ Payload xuống `0.1.9`, làm hỏng toàn bộ dự án.

Hiện còn **15 mục: 4 low, 5 moderate, 6 high, 0 critical**. Nhiều mục chỉ là gói trung gian bị đánh dấu vì phụ thuộc vào một gói lỗi bên dưới. Bảng dưới gom theo **gói gốc thật sự có lỗ hổng**.

> Rà lại trong đợt fix independent-review ngày 29/10/2026: npm audit hiện trả 19 package (7 low, 5 moderate, 7 high, 0 critical), không phải 15; dependency không đổi trong đợt fix. Phân tích phiên bản/đường gọi và nguồn chính thức: [báo cáo remediation](independent-review-remediation.md). Các số liệu còn lại dưới đây là lịch sử.

## Đã xử lý

| Ngày | Gói | Việc |
|---|---|---|
| 28/10 | `next` 16.3.3 → 16.4.3 | Vá lỗ hổng critical (GHSA-f87g-xv8r-7p7x, GHSA-h694-7cp9-m8p3) |
| 28/10 | `sharp` → 0.35.5 | Vá lỗi librsvg |
| 28/10 | `dompurify` → 3.4.17 (`overrides`) | Vá lỗ hổng critical; `monaco-editor` khóa bản cũ |
| 29/10 | `vitest` 4.0.18 → 4.1.12 | Vá lỗ hổng critical GHSA-5xrq-8626-4rwp và 2 lỗ hổng moderate của `@vitest/mocker`. Nâng minor trong cùng major; cài với `strict-peer-deps`, 14/14 kiểm thử vẫn đạt |

## Còn lại

| Gói gốc (phiên bản) | Mức | Trực tiếp / gián tiếp | Lúc chạy / phát triển | Ảnh hưởng thực tế với dự án | Hướng xử lý |
|---|---|---|---|---|---|
| `graphql-scalars` 1.22.2 | high | Gián tiếp: `@payloadcms/next` → `@payloadcms/graphql` | **Lúc chạy** (endpoint `/api/graphql`) | ReDoS ở scalar `PhoneNumber` (GHSA-x8rm-f576-gq67). Payload chỉ import `DateTimeResolver` và `EmailAddressResolver` (đã kiểm tra trong `node_modules/@payloadcms/graphql/dist`), nên đoạn mã lỗi không được gọi. Ảnh hưởng: **thấp** | Chờ Payload nâng lên 2.0.1. Không override vì bản sửa khác major. Tùy chọn: tắt GraphQL (`graphQL.disable`) vì frontend chỉ dùng Local API; cần duyệt trước vì là thay đổi backend |
| `happy-dom` 20.14.6 | high | Gián tiếp: `@payloadcms/richtext-lexical` → `@lexical/headless`; đồng thời là peer tùy chọn của `vitest` | Lúc chạy, nhưng chỉ khi chuyển **HTML không tin cậy** sang Lexical phía server | SSRF và thực thi mã khi phân tích HTML không tin cậy (GHSA-834v-8h66-3h79, GHSA-c8p4-j97h-3vg8). Dự án không gọi `convertHTMLToLexical` hay nhập HTML từ người ngoài; nội dung chỉ do nhân viên soạn trong admin. Ảnh hưởng: **thấp** | Chờ Payload/Lexical nâng lên ≥ 21.0.4 (khác major). Không thêm tính năng nhập HTML hoặc Markdown từ nguồn ngoài trước khi vá |
| `deepmerge` 4.3.1 | low | Gián tiếp: `payload` | Lúc chạy | Prototype poisoning ở đối tượng trả về (GHSA-gcqx-w48m-w2h4). Payload dùng để gộp cấu hình nội bộ, không trực tiếp với dữ liệu khách. Ảnh hưởng: **thấp** | Chưa có bản sửa; theo dõi bản phát hành Payload |
| `esbuild` 0.18.20 | moderate | Gián tiếp: `@payloadcms/db-postgres` → `drizzle-kit` → `@esbuild-kit/*` | **Phát triển** (CLI `migrate:create`) | Lỗ hổng chỉ có ở dev server của esbuild (`esbuild serve`, GHSA-67mh-4wv8-2f99). `drizzle-kit` không mở server; không có trong bản build. Ảnh hưởng: **không đáng kể** | Chờ `drizzle-kit` bỏ `@esbuild-kit`. Không cần làm gì |

Các mục còn lại trong `npm audit` (`@payloadcms/db-postgres`, `drizzle`, `graphql`, `next`, `richtext-lexical`, `ui`, `payload`, `@lexical/headless`, `drizzle-kit`, `@esbuild-kit/*`) chỉ bị đánh dấu vì phụ thuộc vào bốn gói trên.

## Quy trình

1. Mỗi lần nâng Payload: chạy `npm audit`, cập nhật bảng này.
2. Chỉ nâng khi bản mới nằm trong peer range và cài được với `strict-peer-deps`.
3. Sau khi nâng, chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
4. Trước khi ra mắt công khai: rà lại mọi mục high và quyết định về GraphQL.
