# Dr.PhynEX website

Next.js 16 + Payload CMS 3 + PostgreSQL, ba ngôn ngữ `/ko`, `/en`, `/vi`. Tài liệu: [PRODUCT.md](PRODUCT.md), [docs/phase-1-plan.md](docs/phase-1-plan.md), [docs/phase-2-report.md](docs/phase-2-report.md), [docs/phase-3-status.md](docs/phase-3-status.md), [docs/dependency-audit.md](docs/dependency-audit.md).

## Yêu cầu

- Node `^22.23.4 || >=24.22.1` (đã kiểm tra với 24.22.1), npm 11
- Docker Desktop (đang chạy)

PowerShell chặn `npm.ps1` thì dùng `npm.cmd` thay cho `npm`.

## Chạy Local lần đầu

```bash
npm ci
```

```bash
cp .env.example .env
```

Sửa `.env`: đặt `POSTGRES_PASSWORD` (và cùng giá trị trong `DATABASE_URL`) và một `PAYLOAD_SECRET` ngẫu nhiên dài. Tạo secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
npm run db:up
```

```bash
npm run migrate
```

```bash
npm run dev
```

Mở http://localhost:3000/admin, tạo **tài khoản đầu tiên** (luôn được gán vai trò `admin`). Website: http://localhost:3000 (tự chuyển theo ngôn ngữ trình duyệt, mặc định `/en`).

## Xem trước bản nháp (preview)

Nội dung nháp và ảnh chưa được phép công bố chỉ hiện với nhân viên đã đăng nhập:

1. Đăng nhập tại http://localhost:3000/admin.
2. Mở http://localhost:3000/preview?path=/vi (hoặc `/ko`, `/en`, hay một đường dẫn trang bất kỳ). Một thanh màu navy ở đầu trang báo đang ở chế độ xem trước.
3. Bấm "Thoát xem trước" để quay về giao diện khách.

Nạp lại nội dung xem trước của 4 sản phẩm (chỉ ở bản nháp, ảnh lấy từ `brand-assets/preview-images/`):

```bash
npm run payload -- run scripts/import-preview-content.ts
```

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server cổng 3000 |
| `npm run db:up` / `npm run db:down` | Bật / dừng Postgres (container `drphynex-postgres`, volume `drphynex_pgdata`, cổng `127.0.0.1:5433`) |
| `npm run migrate` | Chạy migration (`src/migrations`) |
| `npm run migrate:create -- <tên>` | Tạo migration sau khi đổi collection/field (`push` đã tắt) |
| `npm run generate:types` | Cập nhật `src/payload-types.ts` |
| `npm run generate:importmap` | Cập nhật import map của admin khi thêm component tùy chỉnh |
| `npm run typecheck` / `npm run lint` | Kiểm tra kiểu và lint |
| `npm test` | Kiểm thử tích hợp quyền truy cập trên database riêng `drphynex_test` |
| `npm run build` / `npm start` | Build và chạy bản production local |

`npm test` cần database `drphynex_test` trong cùng container (tạo một lần):

```bash
docker exec drphynex-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE drphynex_test"'
```

Kiểm thử xóa và dựng lại schema của `drphynex_test` mỗi lần chạy; không đụng tới database dev.

## Vai trò

| Vai trò | Quyền |
|---|---|
| `admin` | Tất cả, kể cả tài khoản, hộp thư Liên hệ/B2B, xóa tài liệu nguồn |
| `editor` | Tạo/sửa/xóa/xuất bản nội dung, duyệt bản dịch (`approved`) |
| `translator` | Sửa field văn bản ở bản nháp, đặt `ai-draft`/`in-review`; không xuất bản, không duyệt, không đổi slug/quan hệ |

Khách chỉ thấy tài liệu **đã xuất bản và có `translationStatus = approved` ở đúng ngôn ngữ**. API công khai phải gửi `?locale=ko|en|vi`; `locale=all` và `fallback-locale` bị từ chối.
