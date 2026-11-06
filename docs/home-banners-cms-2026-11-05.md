> **SUPERSEDED (05/11/2026, r3):** các số liệu về migration (tên `20261105_075648`, 140 cột, 280 câu lệnh, fingerprint `4160c7f9…`) và workflow duyệt trong tài liệu này đã được thay bởi `home-banners-approval-fix-2026-11-05.md`. Migration hiện hành: `20261105_085002_home_banners.ts` (142 cột, 282 câu lệnh). Giữ nguyên nội dung gốc bên dưới làm lịch sử.

# Quản trị 5 banner trang chủ trong Payload (05/11/2026)

- **Nhánh / worktree:** `home-banners-cms` tại `C:\Users\THAI\Websites\website-demo-home-banners`, tách từ commit trang chủ `29cd44fef2b4669c248e7bb1166382bb206f6ca8`.
- **Trạng thái Git:** chưa commit, chưa push, chưa deploy.
- **WIP:** checkout chính `website-demo` và WIP cũ không bị sửa. Dev server đang chạy trên database làm việc (:3010) không bị ảnh hưởng, vì code mới nằm ở worktree riêng.

## 1. Database và migration

| | Database làm việc `drphynex` | Database thử `drphynex_independent_review_test` |
|---|---|---|
| Vai trò | Dữ liệu thật trên máy (Local) | Database dùng một lần, có marker `drphynex-independent-review-disposable-v1`, do repo đã tạo sẵn cho test |
| Migration `20261105_075648_home_banners` | **Chưa chạy.** Kiểm tra bằng SELECT chỉ đọc: vẫn 5 migration (batch 1–5), 0 cột `banners_*`, 0 enum `enum_home_page_banners*` | Đã chạy, qua `payload.db.migrate()` sau `dropDatabase` (cơ chế có sẵn của bộ test tích hợp; script seed chỉ chạy sau khi kiểm tra marker) |
| Ghi dữ liệu | Không ghi. Chỉ có SELECT tên file media và GET khách (chỉ đọc) | Có: dữ liệu thử ở mục 1.3 |

### 1.1 Cách tạo migration

- `payload migrate:create home_banners`, chạy trong worktree với `DATABASE_URL` trỏ vào database thử.
- Không dùng auto-push (`push: false` vẫn giữ nguyên), không reset database làm việc, không sửa trực tiếp bảng.
- Migration chỉ **mở rộng**: 280 câu lệnh = 60 `CREATE TYPE` + 180 `ALTER TABLE` (140 `ADD COLUMN` + 40 `ADD CONSTRAINT … FOREIGN KEY`) + 40 `CREATE INDEX`. Phân bổ theo bảng ở mục 1.4.
- **Đính chính:** bản báo cáo trước ghi nhầm "180 cột, 20 khóa ngoại". Số đúng là **140 cột** và **40 khóa ngoại**; 180 là số câu `ALTER TABLE`.
- Không có DROP, UPDATE hay DELETE trong `up`; `DROP` chỉ có trong `down`.
- Cột mới đều có giá trị mặc định theo slot, nên bản ghi Home Page hiện có vẫn đọc được ngay.
- Kiểm tra trên database thử: một Home Page đã publish, chạy `down` rồi `up` lại, vẫn giữ nguyên headline và nhận mặc định của 5 slot.

### 1.2 Fingerprint và bước thực thi (cần người có thẩm quyền duyệt)

- File: `src/migrations/20261105_075648_home_banners.ts`, SHA-256 `4160c7f977db69efbd46d8d6424ba1bc5979a8c1b2db30135bd912fddf6c7338`.
- Đã thêm dòng fingerprint này vào `deploy/migrations.approved.json`. **Trạng thái: ĐỀ XUẤT, CHỜ REVIEW; chưa được duyệt.**
- Unit test của repo yêu cầu mọi file migration phải có trong manifest này. Điều đó chỉ giải thích vì sao dòng này đã có trong file; **không có nghĩa migration đã được duyệt**.
- Người review cần đọc toàn bộ SQL, tự tính lại SHA-256, rồi mới quyết định giữ hay bỏ dòng này. Nếu file migration thay đổi, fingerprint phải tính lại và review lại.
- Unit `sql-guard` xác nhận 280 câu lệnh của migration đều qua bộ lọc SQL của repo.

Kế hoạch thực thi chi tiết (điều kiện tiên quyết, backup, kiểm tra backup, lệnh guarded, tiêu chí trước/sau, khôi phục) nằm ở **[home-banners-migration-plan-2026-11-05.md](home-banners-migration-plan-2026-11-05.md)**. Tóm tắt các bước theo quy trình hiện có:

1. Dừng mọi server và test đang dùng `drphynex`. Không chạy song song với build/test.
2. Sao lưu: `bash scripts/backup-local.sh` (ghi ra `../drphynex-backups/<thời điểm>/`). Phục hồi thử bản dump sang một database tạm, rồi đối chiếu.
3. Chuẩn bị `deploy/migration-targets.json` theo `deploy/migration-targets.example.json`: target Local, `marker` do chủ dự án đặt bằng `COMMENT ON DATABASE`, `stateFile` nằm ngoài repo.
4. Chạy `npm run migrate` (tức `scripts/migrate-guarded.ts --local`) với `MIGRATION_TARGET`, `MIGRATION_DATABASE_URL` và `MIGRATION_BACKUP_MANIFEST`. Gõ câu xác nhận `migrate <target> <database>@<host>:<port>` khi script yêu cầu.
5. Kiểm tra: `npm run migrate:status`; mở Admin → Home Page; trang chủ khách vẫn như cũ (chưa có nội dung banner thì dùng nội dung có sẵn).
6. Nếu có lỗi: giữ backup hiện trạng; ưu tiên chạy lại code cũ (migration chỉ mở rộng nên code cũ vẫn chạy được). **Không dùng `down` làm phương án khôi phục mặc định**: `down` xóa toàn bộ cột banner và dữ liệu banner đã nhập. Khôi phục dữ liệu theo `docs/backup-and-restore.md` §5, vào database mới.

### 1.3 Dữ liệu thử còn lại (chỉ trên database thử, giữ nguyên làm bằng chứng)

- 1 tài khoản `banner-admin@test.local` (vai trò admin), mật khẩu ngẫu nhiên lưu trong scratchpad của phiên, không đưa vào chat hay repo.
- 6 Media ảnh tạo bằng script (gradient + chữ "TEST", không phải tài sản thương hiệu):
  - id 1–5 đã tick "Cleared for publication";
  - **id 6 (`test-sheet-private.png`) chưa phát hành.**
- File ảnh nằm ở `website-demo-home-banners/media/` (bị Git bỏ qua).
- Home Page có 16 bản version:
  - **KO:** đã publish (Forma B-overlay, Luma B-"ảnh đã có chữ", Balm A dùng id 5, Sheet A dùng id 6 riêng tư), sau đó có thêm một bản nháp KO chưa publish (tiêu đề `[TEST] KO 초안 — 미게시`);
  - **EN:** đã publish chữ cho Forma và Luma;
  - **VI:** chỉ có nháp, chưa duyệt (tiêu đề `[TEST] Banner VI (nháp)`, ảnh riêng VI id 4).
- Lần chạy test tích hợp tiếp theo sẽ tự xóa và dựng lại database thử này. Vì vậy **không chạy bộ test tích hợp** khi server :3020 còn đang dùng nó, và không chạy cho tới khi bằng chứng đã được review.

### 1.4 Phân bổ đối tượng database

Mỗi slot gồm 6 trường chọn (enum) và 2 ảnh dùng chung ở bảng chính; 2 ảnh riêng ngôn ngữ và 4 trường chữ ở bảng locale. Bảng version (`_home_page_v`, `_home_page_v_locales`) lặp lại đúng cấu trúc đó với tiền tố `version_`, vì Home Page bật drafts/versions.

| Bảng | Cột mới | Kiểu | Enum | Khóa ngoại → `media` | Index |
|---|---|---|---|---|---|
| `home_page` | 40 = 5 slot × 8 (`visual_type`, `image_position`, `text_display`, `cta_target`, `theme`, `text_tone` + `desktop_image_id`, `mobile_image_id`) | 30 enum + 10 integer | 30 (`enum_home_page_banners_<slot>_<field>`) | 10 | 10 |
| `home_page_locales` | 30 = 5 × 6 (`locale_desktop_image_id`, `locale_mobile_image_id`, `image_alt`, `title`, `tagline`, `cta_label`) | 10 integer + 20 varchar | 0 | 10 | 10 |
| `_home_page_v` | 40 (như `home_page`, tiền tố `version_`) | 30 enum + 10 integer | 30 (`enum__home_page_v_version_banners_<slot>_<field>`) | 10 | 10 |
| `_home_page_v_locales` | 30 (như `home_page_locales`, tiền tố `version_`) | 10 integer + 20 varchar | 0 | 10 | 10 |
| **Tổng** | **140** | 60 enum + 40 integer + 40 varchar | **60** | **40** | **40** |

- Khóa ngoại: `ON DELETE set null ON UPDATE no action`. Nếu một Media bị xóa, slot chỉ mất ảnh; dòng Home Page không bị xóa.
- Index: một index btree cho mỗi cột ảnh (40 cột integer).
- Không có cột `NOT NULL` nào. Các cột enum đều có `DEFAULT` theo slot (ví dụ Brand: `brandOptics`, đích `brand`, màu `brand`), nên bản ghi và version hiện có nhận mặc định ngay, không cần backfill.
- Không có `DROP`, `UPDATE`, `DELETE` hay `RENAME` trong `up`. Tên index dài được Payload rút gọn để vừa giới hạn 63 ký tự của Postgres.

## 2. Giao diện quản trị

- **URL Admin:** `/admin/globals/home-page` → tab **"Banner trang chủ"** (giao diện EN: "Homepage banners"; KO: "메인 배너"). Môi trường thử: http://127.0.0.1:3020/admin/globals/home-page (server dev từ worktree, database thử).
- Nội dung cũ của Home Page nằm ở tab "Nội dung trang". Đây là tab không đặt tên, nên cột dữ liệu cũ không đổi.
- Thêm nút **Xem trước** (Bản xem trước): mở `/preview?path=/<ngôn ngữ đang sửa>`, dùng route preview cho nhân viên đã có sẵn.
- **5 slot cố định** (tên field = định danh ổn định, không dùng mảng nên không thêm/xóa/đổi thứ tự được): `1 · Brand (Dr.PhynEX)`, `2 · MX-01 Forma`, `3 · MX-02 Luma`, `4 · RX Matrix Balm`, `5 · RX Matrix Sheet`.

Trường của mỗi slot:

| Trường | Theo ngôn ngữ | Ai sửa | Ghi chú |
|---|---|---|---|
| Loại visual (A/B/C) | dùng chung | editor/admin | A = chữ + packshot, B = ảnh banner toàn khung, C = visual Brand quang học |
| Ảnh desktop | dùng chung | editor/admin | Chọn từ Media hoặc tải lên theo quyền Media hiện có; ẩn khi chọn C |
| Ảnh mobile (< 768 px) | dùng chung | editor/admin | Bỏ trống thì dùng ảnh desktop |
| Ảnh desktop/mobile riêng cho ngôn ngữ | theo ngôn ngữ | editor/admin | Chỉ hiện khi chọn B (ảnh campaign có chữ theo từng ngôn ngữ) |
| Alt ảnh | theo ngôn ngữ | nhân viên | Bỏ trống thì dùng alt của Media |
| Vị trí ảnh | dùng chung | editor/admin | Chỉ B: điểm lấy nét của Media (focalX/Y) hoặc giữa/trên/dưới/trái/phải |
| Hiển thị chữ trên ảnh | dùng chung | editor/admin | Chỉ B: hiện tiêu đề và mô tả, hoặc "Ảnh đã có chữ" (chỉ hiện nút CTA) |
| Tiêu đề (tối đa 40) | theo ngôn ngữ | nhân viên | Bỏ trống thì slot dùng nội dung có sẵn của website |
| Tagline / mô tả ngắn (tối đa 160) | theo ngôn ngữ | nhân viên | |
| Nhãn CTA (tối đa 32) | theo ngôn ngữ | nhân viên | Bỏ trống thì dùng nhãn mặc định theo đích |
| Đích CTA | dùng chung | editor/admin | Chỉ trang nội bộ: Brand, Liên hệ, Hợp tác, Danh sách sản phẩm, 4 sản phẩm; tự thêm `/ko`, `/en`, `/vi` |
| Mẫu màu nền | dùng chung | editor/admin | 5 preset hiện có (Brand/Forma/Luma/Balm/Sheet) |
| Màu chữ trên ảnh | dùng chung | editor/admin | Chỉ B: chữ navy trên panel sáng, hoặc chữ trắng trên panel tối |

- Không có trường CSS/HTML/JS tự do. Giá trị ngoài preset bị Postgres từ chối, kể cả khi gọi API trực tiếp.
- Vì bản nháp bỏ qua bước validate của Payload, lỗi trả về là lỗi database (500), không phải thông báo validate. Không có dữ liệu nào được ghi.
- **Ảnh form:** `brand-assets/screenshots/home-banners-cms-2026-11-05/admin/` (01: tab và slot Brand loại C; 02, 03: slot Forma loại B với ảnh desktop/mobile, ảnh riêng ngôn ngữ, alt, vị trí, chữ, CTA, màu).

## 3. Nối với trang chủ

- `HomeSlider` nhận dữ liệu từ Home Page qua `findPublicGlobal`, như trước:
  - khách: bản đã publish **và** đã duyệt cho đúng ngôn ngữ đó;
  - preview nhân viên: bản nháp mới nhất, với quyền của chính tài khoản.
- `fallbackLocale` luôn tắt.
- Giữ nguyên layout, chiều cao, controls, autoplay, reduced-motion và các bản sửa trước. Nếu `HomeSlider` không nhận `background`, slider hiển thị đúng như trước.

Quy tắc chọn nội dung (`src/lib/home-banners.ts`, có unit test):

1. Không có Home Page được phép đọc cho ngôn ngữ này → cả 5 slide dùng nội dung có sẵn (như commit 29cd44f).
2. **Chữ:** một slot chỉ dùng chữ CMS khi **tiêu đề** của ngôn ngữ đó có nội dung. Nếu không, slot dùng chữ có sẵn của chính ngôn ngữ đó, không lấy từ ngôn ngữ khác.
3. **Ảnh:**
   - Ảnh banner đã chọn nhưng người xem không được phép thấy (ảnh chưa phát hành, khách chỉ nhận ID) → hiện visual trung tính (Brand: quang học; sản phẩm: ký hiệu MX/RX). **Không thay bằng ảnh sản phẩm.**
   - Ảnh gallery sản phẩm chỉ được dùng như trước, khi slot loại A **chưa chọn** ảnh banner.
4. Loại B "ảnh đã có chữ":
   - tiêu đề và mô tả vẫn có trong HTML cho trình đọc màn hình (`sr-only`), ảnh có `alt=""` để không bị đọc hai lần;
   - nút CTA luôn là HTML và chỉ hiện một lần.
5. Loại B dùng `<picture>`: nguồn riêng cho mobile (< 768 px) và desktop. Chữ đặt trên panel bán trong suốt; controls có nền riêng khi đang ở slide ảnh toàn khung.
6. Ảnh chưa phát hành chỉ tải trực tiếp trong phiên preview của nhân viên (`unoptimized`), giống `MediaImage`. Không có `preload`.

## 4. Kết quả kiểm tra

| Kiểm tra | Môi trường | Kết quả |
|---|---|---|
| `tsc --noEmit` (lượt cuối, trên nguồn hiện tại) | worktree | exit 0 |
| ESLint `--max-warnings=0` (page, components/home, lib/home-banners, globals, 2 file test mới; lượt cuối) | worktree | exit 0 |
| Prettier `--check` các file mới/sửa (lượt cuối) | worktree | đạt, sau khi định dạng lại `tests/unit/home-banners.spec.ts` (chỉ khoảng trắng; test vẫn 9/9). `src/globals/index.ts` không đưa vào kiểm tra vì chưa đạt Prettier từ commit gốc, nên không định dạng lại. `src/components/home/autoplay.ts` (không đổi) chỉ báo lệch do CRLF của worktree; blob trong commit đạt |
| Unit (lượt cuối) | worktree | 17 file, **559/559** (550 cũ + 9 mới). Chạy trên nguồn hiện tại, trừ việc `tests/unit/home-banners.spec.ts` được định dạng lại sau đó; file này đã chạy lại riêng 9/9 |
| Tích hợp toàn bộ (`vitest.config.mts`), lượt đầy đủ duy nhất | database thử | **74/75**: 1 lỗi ở test "schema drift" vì test còn so với snapshot migration cũ (`20261029_100000_storage_fields.json`) |
| Test drift sau khi trỏ sang snapshot mới, chạy riêng | database thử | `storage.int.spec.ts` **4/4** |
| `home-banners.int.spec.ts` | database thử | **7/7** (xem chi tiết bên dưới) |

Toàn bộ bộ tích hợp **chưa chạy lại** sau khi sửa test drift, vì lệnh đó sẽ xóa database thử mà server :3020 đang dùng. Không có lượt đầy đủ nào đạt 75/75.

Thứ tự thay đổi sau lượt tích hợp đầy đủ:
- thêm nút Xem trước (`src/globals/index.ts`; lượt tích hợp đã bắt đầu trước khi có thay đổi này);
- sửa CSS khoảng cách CTA ở slide "ảnh đã có chữ";
- định dạng lại `tests/unit/home-banners.spec.ts`.

Typecheck, ESLint, Prettier và unit ở bảng trên là lượt cuối, chạy trên nguồn hiện tại (ngoại lệ đã ghi ở dòng Unit) (hash ở `home-banners-manifest-2026-11-05.sha256`). Không có lượt tích hợp nào chạy trên đúng nguồn cuối.

`home-banners.int.spec.ts` kiểm tra:
- migration mở rộng, `down`/`up` giữ dữ liệu đã publish;
- nháp KO không hiện với khách cho tới khi duyệt và publish; nháp mới hơn không thay bản khách;
- ảnh chưa phát hành không có trong dữ liệu khách, còn preview thì có;
- ảnh khách không được thấy không bị thay bằng ảnh khác;
- chữ KO/EN/VI riêng; publish VI không đẩy nháp KO đang chờ ra ngoài; ảnh riêng VI;
- translator chỉ sửa được chữ theo ngôn ngữ, không sửa được ảnh, loại visual, đích CTA hay màu;
- giá trị ngoài preset bị từ chối.

### 4.1 Trình duyệt (database thử, server :3020)

- **Khách KO:**
  - Forma: ảnh B, mobile có `<source>` riêng, vị trí theo điểm lấy nét 70% 40%;
  - Luma: "ảnh đã có chữ" (tiêu đề `sr-only`, `alt=""`, chỉ nút "문의하기" → `/ko/contact`);
  - Balm: packshot loại A từ banner;
  - Sheet: ảnh riêng tư thay bằng ký hiệu RX.
- **Khách EN:** chữ CMS ở Forma/Luma, chữ có sẵn ở các slot khác, CTA giữ `/en`.
- **Khách VI:** cả 5 slide có sẵn, vì VI chưa duyệt.
- **Preview nhân viên KO:** thấy tiêu đề nháp chưa publish và ảnh riêng tư (HTTP 200 với phiên đăng nhập).
- **Preview VI:** thấy nháp VI và ảnh riêng VI. Cùng lúc đó khách vẫn nhận bản đã publish.
- **Ảnh độc lập với gallery sản phẩm:** đã kiểm tra bằng test tích hợp và unit (ảnh sản phẩm truyền vào không thay ảnh banner đã chọn). Môi trường thử không có sản phẩm nên trên trình duyệt chưa thấy cảnh này.
- **Audit bounding box** (Chrome headless, 9 độ rộng 320–1440 × KO/EN/VI × 5 slide = 135 trường hợp):
  - lần đầu 18 lỗi, đều ở slide Luma B-"ảnh đã có chữ" KO/EN;
  - tiêu đề `sr-only` bị đo nhầm là "tràn" (lỗi của phép đo, đã sửa script);
  - **lỗi thật:** ở 768–1023 px, nút CTA chạm mép trên controls (khoảng cách 0 px), do panel bị bỏ padding. Đã sửa CSS, giữ 20 px phía dưới;
  - chạy lại đúng 90 trường hợp KO/EN bị ảnh hưởng: 0 lỗi, khoảng cách chữ/CTA → controls nhỏ nhất 20 px. 45 trường hợp VI của lần đầu không có lỗi;
  - artwork Brand ở tablet: không tràn, không bị cắt.
- **Autoplay A–E** (chuột/focus thật, trên trang có slide ảnh toàn khung): 5/5 đạt; chuyển 1 slide mỗi 6 s, một timer duy nhất.
- **Ảnh:** `brand-assets/screenshots/home-banners-cms-2026-11-05/site/` (khách 1440 và 800; preview nhân viên với tiêu đề nháp và ảnh riêng tư).

### 4.2 Quyền truy cập (khách, không cookie, server :3020)

- **HTML/RSC khách** KO/EN/VI: không có `test-sheet-private`, không có tiêu đề nháp. Ảnh chỉ trỏ tới file đã phát hành, không có link preload ảnh.
- **API Home Page khách** (`depth` 1 và 2, `draft=true`, `select`): chỉ trả bản đã publish. Ảnh riêng tư xuất hiện dưới dạng **ID số (6)**; không có filename, alt, URL hay kích thước. `locale=all` và `fallback-locale` → 403. `/versions` → 403.
- **Thử dùng ID 6 với tư cách khách:**
  - `/api/media/6` (cả `depth=0`, `draft=true`) → 404;
  - `where[id][equals]=6` → 0 bản ghi;
  - `where[id][in]=1..6` → chỉ trả 1–5;
  - `/api/media/count?where[id][equals]=6` → 0; `/api/media/count` → 5 (không đếm file riêng tư);
  - `where[filename][like]=private` → 0;
  - `/api/media/versions/6` → 404.
- **File:** `/api/media/file/test-sheet-private.png` (kể cả `?download=true`) → 403 `private, no-store`; `/_next/image?url=...` → 410.
- **Kết luận:** ID chỉ cho biết có một bản ghi Media được gắn vào slot. Khách không dùng ID đó để lấy được metadata, filename, URL hay file.
- Muốn ẩn luôn cả ID khỏi API khách thì cần thêm hook `afterRead` cho các trường ảnh của banner. Chưa làm trong đợt này.
- **Ngoài phạm vi:** `/api/media?where[alt][like]=…` không kèm `locale` trả 500 với thông báo chung (có `locale=ko` thì 200). Collection Media không bị sửa trong đợt này. Chưa so được với server :3010 (không phản hồi lúc thử).

### 4.3 Publish và cache

- **Đã kiểm tra trên database thử:**
  - chuỗi lưu nháp → duyệt → publish từng ngôn ngữ qua Local API, với đúng hook của dự án (test tích hợp và seed);
  - khách thấy bản mới ngay ở request tiếp theo, vì trang đọc CMS mỗi request, không có cache lâu dài.
- **Chưa kiểm tra:** bấm "Xuất bản" trong Admin bằng giao diện; build production hay CDN/ISR; S3/R2. Không publish nội dung thật.

## 5. Hướng dẫn ngắn cho người quản trị

1. Admin → **Pages → Home Page** → tab **Banner trang chủ**. Chọn ngôn ngữ ở góc phải ("Ngôn ngữ").
2. Chọn slot (1–5) và **Loại visual**. Ảnh: chọn từ Media hoặc tải lên ở "Ảnh desktop"; thêm "Ảnh mobile" nếu cần.
3. Muốn khách thấy ảnh mới thì mở Media đó và tick **Cleared for publication**. Chưa tick thì chỉ nhân viên thấy trong preview.
4. Điền tiêu đề, tagline, nhãn CTA cho ngôn ngữ đang chọn. Chọn đích CTA và mẫu màu.
5. **Lưu bản nháp** → bấm nút **Xem trước** (biểu tượng mở tab) để xem trang chủ bằng bản nháp.
6. Đặt **Translation Status = Approved** rồi lưu một lần riêng, không kèm thay đổi nội dung (chỉ editor/admin).
7. **Xuất bản** ngôn ngữ đó. Lặp lại cho KO, EN, VI. Ảnh và các lựa chọn dùng chung sẽ áp dụng cho mọi ngôn ngữ khi xuất bản.

## 6. File thay đổi (so với 29cd44f)

- **Mới:**
  - `src/globals/homeBanners.ts`, `src/lib/home-banners.ts`, `src/components/home/BannerPicture.tsx`
  - `src/migrations/20261105_075648_home_banners.ts` và `.json` (snapshot)
  - `tests/unit/home-banners.spec.ts`, `tests/int/home-banners.int.spec.ts`
  - tài liệu này; kế hoạch thực thi `docs/home-banners-migration-plan-2026-11-05.md`; manifest `docs/home-banners-manifest-2026-11-05.md` và `.sha256`
- **Sửa:**
  - `src/globals/index.ts`: tab, nút xem trước
  - `src/app/(frontend)/[locale]/page.tsx`
  - `src/components/home/HomeSlider.tsx`: thêm `background`/`tone`/`copyHidden`/`titleLang`
  - `src/app/(frontend)/globals.css`: thêm khối CSS loại B
  - `src/migrations/index.ts`, `src/payload-types.ts` (sinh tự động)
  - `deploy/migrations.approved.json`: fingerprint chờ duyệt
  - `tests/unit/sql-guard.spec.ts`: danh sách migration đã ghim
  - `tests/int/storage.int.spec.ts`: drift so với snapshot mới

## 7. Giới hạn và chưa xác minh

- `src/app/(payload)/admin/importMap.js` bị dev server tự sinh lại (chỉ đổi thứ tự dòng, không liên quan banner). File đã được khôi phục về bản commit và **không nằm trong manifest**. Nếu server :3020 biên dịch lại thì file có thể lại hiện là "đã sửa"; khi đó khôi phục bằng `git checkout -- "src/app/(payload)/admin/importMap.js"`.

- Migration **chưa chạy** trên `drphynex`; database làm việc giữ nguyên trạng. Cần review độc lập, duyệt fingerprint, rồi thực thi theo kế hoạch riêng.
- `drphynex` hiện **chưa đáp ứng điều kiện của executor guarded**: role duy nhất `drphynex` là superuser, database chưa có marker, chưa có `deploy/migration-targets.json`. Xem điều kiện tiên quyết trong kế hoạch thực thi.
- Chưa thử với ảnh thật của thương hiệu hoặc packshot thật. Mọi ảnh trong bài thử là ảnh tạo bằng script.
- Chưa chạy lại toàn bộ bộ tích hợp sau khi sửa test drift.
- Chưa có build production cho nhánh này.
- Chưa đo trên thiết bị cảm ứng thật; chưa dùng trình đọc màn hình.
- Lỗi chữ trên ảnh B dùng Postgres để chặn (500). Nếu cần thông báo thân thiện cho API, cần thêm validate riêng.
- Nhãn "Translation Status" có sẵn vẫn hiện tiếng Anh trong Admin (ngoài phạm vi).
