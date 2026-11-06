# Home Banners — diễn tập migration (disposable) và kế hoạch chạy thật

> **SUPERSEDED một phần (2026-11-06):** bảng blocker (§1) và kế hoạch chạy thật (§5) được thay bằng `docs/home-banners-executor-fixes-2026-11-06.md`; phương án `GRANT drphynex` cho migrator đã bị rút, và rehearsal 2 dùng role NOSUPERUSER nên không tương đương phương án đó. Kết quả test:guard 12/12, backup và rehearsal 1–2 giữ nguyên làm lịch sử.


Ngày 2026-11-06. Nguồn: commit `1e24f7eed538c76296dca85556b263be54c9f063` (nhánh `home-banners-cms`) + 4 file chưa commit ở §3. Migration `20261105_085002_home_banners.ts` vẫn ở **proposed** (`deploy/migrations.proposed.json`); `deploy/migrations.approved.json` không đổi. Không có thao tác ghi, đổi role hay schema trên `drphynex` (kiểm tra cuối: 5 migration, 0 cột banner). Tất cả hạ tầng rehearsal nằm trong container disposable riêng.

## 1. Bảng blocker (đọc từ `docs/b5-*.md`, `scripts/migrate-guarded.ts`, `scripts/lib/migration-guard.ts`)

| Blocker | Cần gì | Loại | Trạng thái sau đợt này |
|---|---|---|---|
| Atomic state | Ghi state bằng temp + fsync + rename + fsync thư mục; trước đó dùng `open(p,'w')` (cắt file rồi ghi) | **Sửa mã** | Đã sửa: `scripts/lib/state-store.ts`, nối vào `migrate-guarded.ts`; 8 unit test. Hạn chế: fsync thư mục bị bỏ qua trên Windows (OS không hỗ trợ); chưa chứng minh độ bền khi mất điện. |
| Volume anchor | Thư mục state phải chứa anchor do owner tạo, gắn với identity target; mất volume/rỗng thì từ chối; state biến mất sau khi đã chạy thì từ chối ("latch lost") | **Sửa mã** (kiểm tra) + **cấu hình** (owner tạo anchor, volume bền) | Kiểm tra đã làm trong `state-store.ts`; công cụ tạo anchor `scripts/migration-anchor.ts` (không ghi đè). Volume thật vẫn do owner chọn. |
| Role | Role migrator không superuser/createdb/createrole/replication/bypassrls (executor kiểm tra) | **Cấu hình** | `drphynex` hiện chỉ có role `drphynex` là superuser và sở hữu mọi đối tượng; cần tạo `drphynex_migrator` (§5). |
| Marker | `COMMENT ON DATABASE` khớp catalog | **Cấu hình** | `drphynex` chưa có marker; cần đặt (§5). |
| Target | File catalog (`MIGRATION_TARGETS_FILE`): host trực tiếp, port, db, role, marker, `stateFile` ngoài checkout | **Cấu hình** | Đã lập cho 2 target rehearsal; target thật chưa tạo. |
| Backup | pg_dump -Fc, manifest khớp target/độ mới/SHA/kích thước, `pg_restore --list` bằng binary tuyệt đối, bằng chứng phục hồi gắn đúng artifact | **Cấu hình/quy trình** | Làm đủ trên bản sao; máy host không có `pg_restore`, dùng wrapper `.exe` chạy `pg_restore --list` trong container (chỉ cho rehearsal). Thật: cần client PostgreSQL được duyệt hoặc wrapper tương đương trỏ container thật. |
| Phục hồi | Phục hồi dump vào DB mới, so khớp trước khi quyết định chuyển kết nối | **Quy trình** | Đã diễn tập và so khớp 86/86 bảng. |
| Allowlist thực thi | Migration banner phải nằm trong `migrations.approved.json` mới chạy được | **Quyết định reviewer** | Chưa duyệt; rehearsal dùng bản `approved.json` thử riêng trong root sao chép. |

## 2. Kết quả thực tế

**test:guard (`node tests/guard/run-integration.mjs`)**, container/volume/network mới theo `setup-disposable.ps1` (image pin theo digest, loopback `127.0.0.1:55499`, DB `drphynex_migration_guard_test`): launcher exit 0, verdict `pass`, `results.json` hợp lệ: **12 passed, 0 failed, 0 skipped, 0 pending**, `reason: passed`, 0 lỗi unhandled; commit ghi nhận `1e24f7e`, working tree sạch. I1 dùng đủ 6 migration (gồm banner) qua allowlist test-only. Bằng chứng: `drphynex-b5-rehearsal/guard-run-1e24f7e/`. Lưu ý: bộ guard dùng adapter riêng của harness, nên **không bao phủ** phần ghi state mới trong `migrate-guarded.ts`; phần đó được kiểm bằng unit test và rehearsal.

**Backup từ dữ liệu hiện hữu**: `pg_dump -Fc` của `drphynex` (chỉ đọc, qua `docker exec`), 451,983 byte, SHA-256 `f90e7e8394b41a26e288d53db78a2ddda641a5dcea0384a68354b0f1535e585d`, `pg_restore --list` đọc được (1179 dòng). Nguồn lúc dump: 5 migration, 86 bảng, batch 5.

**Rehearsal 1** (DB `drphynex_rehearsal`, owner = migrator, marker `drphynex:rehearsal:disposable-v1`): phục hồi dump, 86/86 bảng khớp số dòng và md5. Backup của chính target (473,767 byte), phục hồi kiểm chứng vào DB phụ, 86/86 khớp; manifest hợp lệ. Guarded executor `--local`: **exit 0, COMPLETE**, step `20261105_085002_home_banners`, xid 3103. Sau chạy: lịch sử 6 migration (banner = batch 6); **142 cột, 60 enum, 40 FK, 40 index**, 2 cột `*_banner_approvals` jsonb; trong 86 bảng chỉ `payload_migrations` đổi (5→6 dòng), 85 bảng còn lại giống hệt ở các cột cũ. Anchor `runStarted: true`, không còn file tạm.
Bài thử: chạy lặp = no-op exit 0 (state không đổi); mất file state → exit 2; mất anchor → exit 2; chạy executor từ checkout chính (allowlist chưa có banner) → exit 2. Thông báo của executor cố ý chung chung, nên log không phân biệt lý do từ chối; lý do "allowlist" được chứng minh riêng bằng unit test.

**Rehearsal 2** (DB `drphynex_rehearsal2`, topology thật: bảng thuộc role `drphynex`, migrator là role hạn chế `GRANT drphynex TO … WITH INHERIT TRUE`, marker `drphynex:rehearsal2:disposable-v1`): cùng quy trình, phục hồi giữ nguyên owner, 86/86 khớp, **exit 0, COMPLETE**, xid 5853, cùng plan digest `db266a6dcf4ca6a7be0feaea56441bc092a241545aea76c15250365562aacee9`, 142 cột banner. Quan sát: 60 enum mới thuộc migrator, 88 enum cũ vẫn thuộc `drphynex` (sở hữu hỗn hợp; app dùng role superuser nên không ảnh hưởng, grammar guard không hỗ trợ đổi owner).

**Kiểm tra mã**: unit 19 file, **575/575**; tsc, ESLint, Prettier exit 0.

## 3. Thay đổi mã (chưa commit, trên nhánh `home-banners-cms`)
- `scripts/lib/state-store.ts` (mới): ghi nguyên tử + anchor. SHA-256 `1d263cd409bda7614b6988a130db8ea0641e3bec6bdee60cb0fd714541f1fbf7`.
- `scripts/migration-anchor.ts` (mới): công cụ owner tạo anchor. `f3741f948391e2b66644bc51cab4e1a3c0bc4313d7eb315881928642653a6c3e`.
- `scripts/migrate-guarded.ts`: readState/writeState dùng store. `a6e74a911e7353c4b222bafd5d8338831100d53b9359de779ee77cf9df5ea84c`.
- `tests/unit/state-store.spec.ts` (mới, 8 test). `c72c25cc6b91bacd98beb42699d7da98b4b7ae6f1baf03faffcb95e7198f3efc`.
Không đổi SQL guard, lõi executor (`migration-guard.ts`), allowlist, migration hay điều kiện kiểm tra. Hệ quả cần biết: mọi target phải có anchor trước lần chạy đầu, kể cả các target đã chạy trước đây (đây là chủ đích).

## 4. Hạ tầng rehearsal (ngoài Git, `C:\Users\THAI\Websites\drphynex-b5-rehearsal\`)
Container `drphynex-b5-test-pg-15011863` (đang chạy), volume `drphynex-b5-test-data-15011863`, network `drphynex-b5-test-net-15011863`; database `drphynex_migration_guard_test`, `drphynex_rehearsal`, `drphynex_rehearsal_verify`, `drphynex_rehearsal2`, `drphynex_rehearsal2_verify`; role `drphynex_rehearsal_migrator`, `drphynex_rehearsal2_migrator`, `drphynex`(NOLOGIN, cục bộ). Thư mục chứa dump, manifest, hash, log, state, URL cục bộ của DB thử (quyền 0600). Chưa dọn dẹp; việc xóa cần owner đồng ý. Không đụng `drphynex-postgres`, `drphynex_pgdata`, các DB bằng chứng Admin.

## 5. Kế hoạch chạy thật (chỉ thực hiện sau quyết định của owner)

**Target:** database `drphynex`, `127.0.0.1:5433` (container `drphynex-postgres`, volume `drphynex_pgdata`), PostgreSQL 17.6. Môi trường `local`, endpoint trực tiếp.

**Điều kiện (mỗi mục đổi role/schema trên `drphynex` cần duyệt riêng):**
1. Duyệt đưa mục đề xuất (`92e833a9…15b7`, 282 câu lệnh) từ `deploy/migrations.proposed.json` sang `deploy/migrations.approved.json` bằng một commit riêng, và commit 4 file mã ở §3 trước đó. Chạy từ checkout sạch tại đúng commit.
2. Cửa sổ bảo trì: dừng app (Next, :3000) trong lúc backup → migrate → kiểm tra.
3. Role: tạo `drphynex_migrator` (NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS), `GRANT drphynex TO drphynex_migrator WITH INHERIT TRUE`; mật khẩu lưu ngoài Git.
4. Marker: `COMMENT ON DATABASE drphynex IS '<marker đã duyệt>'`.
5. Anchor: thư mục state ngoài checkout, ví dụ `C:\Users\THAI\Websites\drphynex-migration-state\`; chạy `node node_modules/tsx/dist/cli.mjs scripts/migration-anchor.ts <targets.json> <target>`.
6. Catalog `deploy/migration-targets.json` (không commit): `environment: local`, `host 127.0.0.1`, `port 5433`, `database drphynex`, `role drphynex_migrator`, `marker` như trên, `stateFile` trong thư mục anchor.
7. Backup mới (≤24 giờ) ngay trước khi chạy: `docker exec drphynex-postgres pg_dump -U drphynex -d drphynex -Fc` → thư mục `drphynex-backups\banners-<thời gian>\drphynex.dump`; ghi SHA-256/kích thước; `pg_restore --list` đạt; phục hồi vào DB phụ trong container disposable và so khớp số dòng + md5 86 bảng (script `table-hash.sql`); lập manifest (target/host/database đúng `drphynex`, `rehearsal.evidence` trỏ đúng artifact); sao chép 215 file media nếu muốn bảo toàn như đợt 29/10.
8. `MIGRATION_PG_RESTORE`: đường dẫn tuyệt đối tới client PostgreSQL được duyệt hoặc wrapper trỏ container `drphynex-postgres` (chỉ `--list`).

**Lệnh thực thi** (PowerShell/Git Bash, không có `DATABASE_URL` trong môi trường, không nạp `.env`):
`MIGRATION_TARGET`, `MIGRATION_DATABASE_URL` (URL migrator riêng, khác URL runtime), `MIGRATION_BACKUP_MANIFEST`, `MIGRATION_TARGETS_FILE`, `MIGRATION_PG_RESTORE`, `MIGRATION_CONFIRM="migrate <target> drphynex@127.0.0.1:5433"`, sau đó
`node node_modules/tsx/dist/cli.mjs scripts/migrate-guarded.ts --local` (tương đương `npm run migrate`).

**Kiểm tra sau chạy:** executor exit 0 và state `COMPLETE`; `payload_migrations` có 6 dòng, banner batch 6; 142 cột / 60 enum / 40 FK / 40 index (`verify-after.sh`); 85 bảng còn lại giống hệt ở các cột cũ, chỉ `payload_migrations` đổi; chạy lặp là no-op; khởi động app, kiểm tra trang chủ công khai KO/EN/VI và Admin (chỉ đọc), rồi chạy lại một chu trình Admin trên bản nháp trước khi dùng thật.

**Phục hồi:** nếu exit khác 0 (FAILED, UNCERTAIN, STATE_FAILED): dừng, không retry, không xóa state; đối soát lịch sử/schema/xid theo `docs/b5-security-correction.md`; phục hồi dump đã kiểm chứng vào **database mới** (`drphynex_restore_<thời gian>`), so khớp hash, rồi owner quyết định chuyển kết nối. Không ghi đè `drphynex`, không migrate down. Cột banner chỉ thêm mới nên có thể rollback mã mà giữ schema.

## 6. Chưa kiểm chứng / giới hạn
- Chưa chạy trên `drphynex`; chưa có migrator, marker, anchor, catalog, manifest thật.
- Độ bền khi mất điện, fsync thư mục trên Windows, volume do owner cấp: chưa chứng minh. Bộ guard integration chưa bao phủ adapter state mới.
- Rehearsal dùng container khác với container thật (cùng image/phiên bản 17.6) và wrapper `pg_restore` riêng; dữ liệu là bản sao tại 02:13 UTC ngày 2026-11-06, không gồm thay đổi sau đó.
- Media/file upload không nằm trong dump (215 file phải sao lưu riêng như đợt 29/10).
