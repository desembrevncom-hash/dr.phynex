> **SUPERSEDED (05/11/2026, r3):** các số liệu về migration (tên `20261105_075648`, 140 cột, 280 câu lệnh, fingerprint `4160c7f9…`) và workflow duyệt trong tài liệu này đã được thay bởi `home-banners-approval-fix-2026-11-05.md`. Migration hiện hành: `20261105_085002_home_banners.ts` (142 cột, 282 câu lệnh). Giữ nguyên nội dung gốc bên dưới làm lịch sử.

# Kế hoạch thực thi migration `20261105_075648_home_banners` trên `drphynex` (Local)

**Trạng thái: CHƯA THỰC THI.** Database làm việc `drphynex` giữ nguyên trạng: 5 migration, batch 1–5, không có cột hay enum banner. Tài liệu này là kế hoạch để review. Mỗi bước có ghi "cần duyệt" chỉ được làm khi chủ dự án cho phép rõ ràng.

- **Đích:** container `drphynex-postgres`, `127.0.0.1:5433`, database `drphynex` (khoảng 17 MB tại thời điểm lập kế hoạch).
- **Migration:** `src/migrations/20261105_075648_home_banners.ts`, SHA-256 `4160c7f977db69efbd46d8d6424ba1bc5979a8c1b2db30135bd912fddf6c7338`.
- **Nội dung:** chỉ mở rộng; 280 câu lệnh = 60 `CREATE TYPE` + 140 `ADD COLUMN` + 40 khóa ngoại + 40 index. Chi tiết: `home-banners-cms-2026-11-05.md` §1.4.
- **Mã đi kèm:** nhánh `home-banners-cms` (nền `29cd44fef2b4669c248e7bb1166382bb206f6ca8`), sau khi đã review và commit.

## 0. Điều kiện tiên quyết (cần duyệt)

Kiểm tra chỉ đọc ngày 05/11/2026 cho thấy `drphynex` **chưa đáp ứng** điều kiện của executor guarded (`scripts/migrate-guarded.ts`):

| Yêu cầu của executor | Hiện trạng | Việc cần làm (cần duyệt) |
|---|---|---|
| Review độc lập SQL + fingerprint | Fingerprint đã có trong `deploy/migrations.approved.json` dưới dạng **đề xuất** | Codex/chủ dự án review SQL và tự tính lại SHA-256. Chỉ giữ dòng fingerprint khi đã duyệt |
| Role migration không đặc quyền (không superuser, createdb, createrole, replication, bypassrls) | Role duy nhất là `drphynex` (superuser), nên executor sẽ từ chối | Chọn một phương án ở §0.1 |
| Marker `COMMENT ON DATABASE` trên đúng database | `drphynex` chưa có marker | Chủ dự án đặt marker, ví dụ `COMMENT ON DATABASE drphynex IS 'drphynex:local:v1'` (thay đổi metadata, cần duyệt) |
| File target (`MIGRATION_TARGETS_FILE`) | Chưa có | Tạo theo `deploy/migration-targets.example.json`. **Đặt ngoài repo**, vì `deploy/migration-targets.json` không bị Git bỏ qua |
| `stateFile` ngoài checkout | Chưa có | Ví dụ `C:\Users\THAI\Websites\drphynex-backups\state\drphynex-local-migration-state.json` |
| Backup manifest có bằng chứng phục hồi thử | Chưa có | §1–§2 |

### 0.1 Role migration: hai phương án, chủ dự án quyết định

**A. Role riêng `drphynex_migrator`** (`LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`), mật khẩu lưu trong trình quản lý mật khẩu. Quyền tối thiểu cho migration này:
- Là owner của 4 bảng `home_page`, `home_page_locales`, `_home_page_v`, `_home_page_v_locales` (`ALTER TABLE` và `CREATE INDEX` cần quyền owner).
- `CREATE` trên schema `public` (cho `CREATE TYPE`).
- `REFERENCES` trên `media` (cho khóa ngoại).
- `SELECT` và `INSERT` trên `payload_migrations` cùng sequence của nó.

Ứng dụng vẫn kết nối bằng `drphynex`. Superuser đọc/ghi được bảng do role khác sở hữu, nên runtime không đổi. Bộ quyền này **phải diễn tập trên bản phục hồi** (§2) trước khi áp dụng thật.

**B. Không dùng executor guarded**, chạy `payload migrate` bằng superuser. **Không đề xuất**: đi ngược quy trình đã ghi trong `docs/deployment-plan.md` (migration có kiểm soát, backup và phục hồi thử trước). Chỉ dùng nếu chủ dự án quyết định rõ và ghi nhận ngoại lệ.

Trước khi chạy: dừng mọi tiến trình đang ghi vào `drphynex` (dev server :3010, phiên Admin, script). Không chạy song song với build/test. Kiểm tra:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'drphynex' AND pid <> pg_backend_pid();
```

Kết quả mong đợi: 0, hoặc chỉ còn phiên của người thực thi.

## 1. Backup database và file

Chạy từ checkout chính `C:\Users\THAI\Websites\website-demo`, Git Bash:

```bash
bash scripts/backup-local.sh
```

Script ghi vào `../drphynex-backups/<YYYY-MM-DD_HHMM>/`:
- `drphynex-db.dump` (`pg_dump -Fc` của `drphynex`, vì `POSTGRES_DB=drphynex` trong container);
- `media/` (khoảng 296 KB);
- `private-uploads/` (khoảng 29 MB);
- `brand-assets/`;
- `files.sha256`;
- tự kiểm tra bằng `pg_restore --list`.

Migration không sửa file, nhưng vẫn sao lưu file để điểm khôi phục của database và upload khớp nhau.

Ghi thêm "ảnh chụp trước" (chỉ đọc) vào `before.json` trong cùng thư mục:

```sql
SELECT name, batch FROM payload_migrations ORDER BY id;
SELECT 'home_page' t, count(*) FROM home_page UNION ALL
SELECT 'home_page_locales', count(*) FROM home_page_locales UNION ALL
SELECT '_home_page_v', count(*) FROM _home_page_v UNION ALL
SELECT '_home_page_v_locales', count(*) FROM _home_page_v_locales;
SELECT md5(string_agg(to_jsonb(h)::text, '|' ORDER BY id)) FROM home_page h;
SELECT md5(string_agg(to_jsonb(l)::text, '|' ORDER BY id)) FROM home_page_locales l;
SELECT md5(string_agg(to_jsonb(v)::text, '|' ORDER BY id)) FROM _home_page_v v;
SELECT md5(string_agg(to_jsonb(vl)::text, '|' ORDER BY id)) FROM _home_page_v_locales vl;
SELECT count(*) FROM information_schema.columns WHERE table_name IN ('home_page','home_page_locales','_home_page_v','_home_page_v_locales');
```

Thêm số dòng của mọi bảng nghiệp vụ (`products`, `media`, `users`…) để đối chiếu sau.

## 2. Kiểm tra backup và diễn tập (bắt buộc trước khi chạy thật)

1. Kiểm tra file: `cd ../drphynex-backups/<ts> && sha256sum -c files.sha256`. Tính SHA-256 và số byte của `drphynex-db.dump`.
2. Phục hồi vào **database mới, riêng** (không bao giờ ghi đè `drphynex`), ví dụ `drphynex_restore_check_<ts>`. Đặt marker riêng như `drphynex-local-restore-check-<ts>`.
3. So số dòng và các md5 ở §1 giữa bản phục hồi và `drphynex`: phải trùng.
4. **Diễn tập migration trên bản phục hồi**, dùng cùng executor với một target riêng, ví dụ `local-rehearsal` (database `drphynex_restore_check_<ts>`, marker riêng, role theo §0.1).
5. Áp dụng tiêu chí "sau migration" (§4) lên bản phục hồi. Chạy ứng dụng nhánh mới trỏ vào bản phục hồi: trang khách KO/EN/VI giữ nguyên như trước (chưa nhập banner thì dùng nội dung có sẵn), tab "Banner trang chủ" hiện trong Admin.
6. Lưu log diễn tập làm bằng chứng (`rehearsal.log`).
7. Viết backup manifest `backup-manifest.json` trong thư mục backup:

```json
{
  "version": 1,
  "target": "local",
  "host": "127.0.0.1",
  "database": "drphynex",
  "createdAt": "<thời điểm tạo dump, ISO 8601>",
  "method": "pg_dump",
  "reference": "C:/Users/THAI/Websites/drphynex-backups/<ts>",
  "artifact": { "path": "drphynex-db.dump", "sha256": "<sha256 của dump>", "bytes": <số byte> },
  "rehearsal": { "artifactSha256": "<cùng sha256>", "verifiedAt": "<thời điểm diễn tập xong>", "evidence": "rehearsal.log" }
}
```

Executor sẽ kiểm tra lại SHA-256, số byte, header `PGDMP`, tuổi backup (`backupMaxAgeHours`) và bằng chứng diễn tập. Nếu backup quá hạn thì phải làm lại §1–§2.

## 3. Lệnh thực thi (guarded, cần duyệt)

PowerShell, tại checkout có mã đã review. Chỉ đặt biến trong phiên; chuỗi kết nối và mật khẩu lấy từ trình quản lý mật khẩu, không ghi vào file hay chat:

```powershell
$env:MIGRATION_TARGETS_FILE   = 'C:\Users\THAI\Websites\drphynex-backups\state\migration-targets.local.json'
$env:MIGRATION_TARGET         = 'local'
$env:MIGRATION_DATABASE_URL   = '<chuỗi kết nối của role migration tới 127.0.0.1:5433/drphynex>'
$env:MIGRATION_BACKUP_MANIFEST = 'C:\Users\THAI\Websites\drphynex-backups\<ts>\backup-manifest.json'
npm.cmd run migrate
```

`npm run migrate` gọi `tsx scripts/migrate-guarded.ts --local`. Khi được hỏi, gõ đúng câu xác nhận:

```
migrate local drphynex@127.0.0.1:5433
```

Executor tự kiểm tra:
- danh sách migration khớp `deploy/migrations.approved.json`;
- lịch sử đã chạy là tiền tố đúng thứ tự;
- danh tính database, role và marker;
- backup manifest.

Sau đó executor áp dụng **chỉ** migration còn thiếu (`20261105_075648_home_banners`), có khóa và trong transaction, rồi ghi file trạng thái.

**Dừng ngay, không thử lại** nếu kết quả là `UNCERTAIN` hoặc bất kỳ lỗi nào về danh tính, backup hay lịch sử. Đọc file trạng thái và log, đối chiếu §4 trước khi làm gì tiếp.

## 4. Tiêu chí chấp nhận

**Trước khi chạy** (tất cả phải đúng):
- `payload_migrations`: đúng 5 dòng, batch 1–5, dòng cuối `20261029_100000_storage_fields`.
- 0 cột `banners_%` trong 4 bảng Home Page; 0 kiểu `enum_home_page_banners%` hoặc `enum__home_page_v_version_banners%`.
- Backup và diễn tập ở §1–§2 đạt; không còn phiên ghi khác.

**Sau khi chạy:**

```sql
SELECT name, batch FROM payload_migrations ORDER BY id;          -- 6 dòng, cuối: 20261105_075648_home_banners, batch 6
SELECT table_name, count(*) FROM information_schema.columns
 WHERE table_name IN ('home_page','home_page_locales','_home_page_v','_home_page_v_locales')
   AND (column_name LIKE 'banners\_%' OR column_name LIKE 'version\_banners\_%')
 GROUP BY 1;                                                       -- 40 / 30 / 40 / 30
SELECT count(*) FROM pg_type WHERE typname LIKE 'enum_home_page_banners%' OR typname LIKE 'enum__home_page_v_version_banners%';   -- 60
SELECT count(*) FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text IN ('home_page','home_page_locales','_home_page_v','_home_page_v_locales') AND conname LIKE '%banners%';   -- 40
```

- Số dòng 4 bảng Home Page và các bảng nghiệp vụ: **bằng** `before.json`.
- md5 dữ liệu cũ (chỉ tính các cột đã có trước migration) bằng `before.json`. Tính lại bằng cách loại các cột mới khỏi `to_jsonb`, ví dụ `to_jsonb(h) - ARRAY[...các cột banners_...]`.
- Giá trị mặc định của các slot đúng (ví dụ `banners_brand_visual_type = 'brandOptics'`, `banners_sheet_cta_target = 'rx-matrix-sheet'`).
- Ứng dụng (nhánh mới): `/ko`, `/en`, `/vi` khách trả 200 và hiển thị như trước (chưa nhập banner); Admin mở được tab "Banner trang chủ"; log server không có lỗi SQL.
- Mã cũ (`29cd44f`) chạy trên schema mới vẫn trả 200 (kiểm tra tương thích ngược).

## 5. Phương án khôi phục

Thứ tự ưu tiên: giữ schema, xử lý bằng mã → phục hồi vào database mới → (cuối cùng, có điều kiện) `down`.

1. **Lỗi do mã mới:** chạy lại mã cũ (`29cd44f` hoặc nhánh làm việc trước đó). Migration chỉ mở rộng, cột mới có mặc định và cho phép null, nên mã cũ bỏ qua chúng. **Giữ nguyên schema và dữ liệu banner.**
2. **Migration thất bại:** executor chạy trong transaction; khi `FAILED` có bằng chứng rollback thì database giữ nguyên như §4 "trước". Kiểm tra lại, sửa, review lại rồi mới chạy lại. Với `UNCERTAIN`: không chạy lại; đối chiếu `payload_migrations` và schema theo §4.
3. **Dữ liệu sai hoặc hỏng:**
   - giữ trạng thái hiện tại (backup thêm một lần);
   - phục hồi dump của §1 vào **database mới** (ví dụ `drphynex_restore_<ts>`), kiểm tra nội dung, file và cấu hình;
   - chỉ chuyển `DATABASE_URL` sang database đó khi đã được duyệt. **Không ghi đè `drphynex`.** Làm theo `docs/backup-and-restore.md` §5;
   - file upload phục hồi từ `media/` và `private-uploads/` của cùng bản backup, kiểm bằng `files.sha256`.
4. **Không dùng `down` làm phương án mặc định.** `down` xóa 140 cột và 60 kiểu enum, kéo theo **mất toàn bộ nội dung banner đã nhập** (chữ KO/EN/VI, liên kết ảnh, lịch sử version của các trường đó), dù Media vẫn còn.
   - Chỉ cân nhắc khi chưa ai nhập nội dung banner và có duyệt riêng.
   - Kể cả khi đó, vẫn phải backup trước và xuất dữ liệu banner hiện có ra file (ví dụ `COPY (SELECT id, <các cột banners_*> FROM home_page) TO STDOUT WITH CSV HEADER`, làm tương tự cho 3 bảng còn lại) để có thể nhập lại.

## 6. Sau khi migration đạt

- Lưu `after.json` (các truy vấn §4) cạnh `before.json`, cùng log executor và file trạng thái.
- Chạy ứng dụng nhánh mới với `drphynex`, kiểm tra như §4, rồi mới nhập nội dung banner theo hướng dẫn trong `home-banners-cms-2026-11-05.md` §5.
- Không publish nội dung chỉ để thử. Thử nghiệm dùng database riêng như đã làm với `drphynex_independent_review_test`.
