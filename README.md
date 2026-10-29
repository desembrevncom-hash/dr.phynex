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

Nạp nội dung chi tiết lấy từ bao bì (mô tả, công dụng, thành phần, INCI, cách dùng, lưu ý; chỉ bản nháp). Cần `brand-assets/packaging/*.pdf`; xem [docs/product-content.md](docs/product-content.md):

```bash
npm run payload -- run scripts/import-product-content.ts
```

## Tài sản thương hiệu

| Vị trí | Nội dung | Git |
|---|---|---|
| `public/brand/` | Tài sản công khai bản web mà build cần (hiện có `drphynex-logo-web.svg`) | **Có commit**: clone mới sẽ có logo |
| `brand-assets/` | File gốc (logo, bao bì), mockup, ảnh xem trước, đề xuất, ảnh chụp kiểm tra | Không commit (`.gitignore`) |
| `media/`, `private-uploads/` | Tệp tải lên CMS (local) | Không commit; trên Vercel sẽ chuyển sang R2/S3 |

Ảnh sản phẩm **không** nằm trong repo: biên tập viên tải lên CMS (Media). Script `scripts/import-preview-content.ts` đọc ảnh xem trước từ `brand-assets/preview-images/`; một clone mới không có thư mục này cần được cung cấp lại, nếu không script sẽ báo thiếu tệp.

## Dữ liệu nằm ở đâu, và sao lưu

**Commit mã không có nghĩa là đã sao lưu database.** Nội dung soạn trong CMS, trạng thái duyệt và file tải lên không nằm trong Git.

| Loại | Vị trí | Trong Git? |
|---|---|---|
| Mã nguồn, migration, kiểm thử, tài liệu, logo web | repo | Có |
| Dữ liệu nạp mẫu (`scripts/data/*.ts`: chữ chép từ bao bì, bản dịch nháp) | repo | Có, nhưng chỉ là đầu vào, không phải bản đang sửa trong CMS |
| Nội dung CMS (sản phẩm, bản dịch, ghi chú biên tập, trạng thái duyệt, form gửi về, tài khoản) | PostgreSQL trong Docker, volume `drphynex_pgdata` | Không |
| Ảnh Media | `media/` | Không |
| Tài liệu nguồn (PDF bao bì đã tải vào CMS) | `private-uploads/source-documents/` | Không |
| File gốc thương hiệu, bản chép chữ, ảnh xem trước, ảnh chụp kiểm tra | `brand-assets/` | Không |
| Secret | `.env` | Không |

Sao lưu Local (chạy khi Postgres đang bật):

```bash
docker exec drphynex-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backup-drphynex.dump
```

Kèm theo đó, sao chép các thư mục `media/`, `private-uploads/` và `brand-assets/` ra nơi lưu trữ an toàn. Không commit file dump.

Hoặc chạy script làm cả hai việc, ghi vào `../drphynex-backups/<thời điểm>/` kèm checksum từng file:

```bash
bash scripts/backup-local.sh
```

File dump chứa cả tài khoản (mã băm mật khẩu) và dữ liệu form, nên cần lưu ở nơi an toàn. Cách phục hồi xem file `RESTORE.md` trong thư mục sao lưu.

Các script nạp (`scripts/import-*.ts`) chạy lại được nhiều lần một cách an toàn:
- không tạo trùng (khớp theo slug hoặc tên file);
- chỉ điền vào trường đang trống, nên không ghi đè nội dung đã sửa trong CMS;
- bỏ qua tài liệu đã xuất bản hoặc có ngôn ngữ đã approved;
- không đổi trạng thái xuất bản.

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
