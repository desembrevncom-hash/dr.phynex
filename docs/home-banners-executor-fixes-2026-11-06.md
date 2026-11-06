# Sửa findings review executor — anchor, role, cleanup state, diễn tập 3

Ngày 2026-11-06. Nguồn: commit `1e24f7eed538c76296dca85556b263be54c9f063` + các thay đổi chưa commit liệt kê trong manifest `docs/home-banners-executor-manifest-2026-11-06.md`. Không commit, không đổi `deploy/migrations.approved.json`, không ghi vào `drphynex` (kiểm tra cuối: 5 migration, 0 cột banner, một role `drphynex`). Bằng chứng cũ giữ nguyên; tài liệu `home-banners-migration-rehearsal-2026-11-06.md` được đánh dấu SUPERSEDED một phần (§5, §8).

## 1. Findings và kết quả

| # | Finding | Xử lý | Bằng chứng |
|---|---|---|---|
| 1 | Anchor tự mô tả, ID không có điểm tin cậy ngoài volume | `anchorId` kỳ vọng nằm trong catalog target (ngoài volume), so sánh mỗi lần đọc/ghi; thiếu, sai, bị thay → từ chối | 7 test (gồm regression bắt buộc) + drill D2–D5b |
| 2 | GRANT role superuser cho migrator; chỉ kiểm tra `current_user` | Rút phương án. Owner role NOSUPERUSER NOLOGIN, migrator hạn chế; guard kiểm tra mọi role đạt được | 5 unit test + 9 kiểm tra trên PostgreSQL thật (7 phép thử đảo + 2 mốc) |
| 3 | `close()` lỗi để lại file tạm; mô tả "durable" quá mức | Dọn tạm khi close/fsync/rename lỗi; lỗi sau rename có mã riêng; bỏ tuyên bố bền khi mất điện | 3 regression mới (close lỗi, close lỗi khi dọn, fsync thư mục sau rename) |
| 4 | Rehearsal 2 không tương đương kế hoạch | Đính chính (§5); diễn tập 3 trên topology thật | §6 |
| 5 | Kế hoạch thật thiếu media, tiến trình, phê duyệt | Cập nhật (§8) | §8 |

## 2. Anchor
- Catalog target (`MIGRATION_TARGETS_FILE`, file ngoài volume state) có trường bắt buộc `anchorId` (32 hex). Executor đọc ID này, không bao giờ đọc ID kỳ vọng từ volume, không tạo/sửa/chấp nhận ID mới. Thiếu ID → `ANCHOR_ID_UNCONFIGURED`.
- `readAnchor`: thiếu → `ANCHOR_MISSING`; hỏng/thừa khóa → `ANCHOR_CORRUPT`; sai target → `ANCHOR_WRONG_TARGET`; **cùng identity nhưng ID khác → `ANCHOR_ID_MISMATCH`**, kể cả khi `runStarted=false` và state đã mất. `runStarted=true` mà mất state → `STATE_LOST`.
- Regression bắt buộc: "anchor bị thay (cùng identity, ID khác, runStarted=false) + mất state" bị chặn cả đọc lẫn ghi, không ghi gì (`tests/unit/state-store.spec.ts`). Thêm ca thay anchor khi state còn.
- Công cụ `scripts/migration-anchor.ts` chỉ tạo anchor lần đầu: từ chối nếu thư mục chưa có, anchor đã tồn tại (tạo độc quyền), đã có file state, hoặc catalog đã có `anchorId`. Nó in ID để owner tự ghi vào catalog; nó không sửa catalog.
- **Quy trình thay anchor (thủ công, cần đối soát):** (1) dừng mọi executor; (2) đối soát `payload_migrations`, file state, schema và xid với bản backup theo `docs/b5-security-correction.md`, ghi biên bản; (3) chuyển file anchor và state cũ sang thư mục lưu trữ (không xóa); (4) owner xóa `anchorId` khỏi catalog, tạo anchor mới bằng công cụ, ghi ID mới vào catalog; (5) kiểm tra lại bằng chạy lặp (kết quả no-op). Executor và công cụ không tự làm bước nào để vượt lỗi.

## 3. Role
- **Rút** phương án `GRANT drphynex TO migrator` (role `drphynex` là superuser bootstrap).
- Thiết kế: `drphynex_owner` NOSUPERUSER NOLOGIN (không createdb/createrole/replication/bypassrls) sở hữu mọi đối tượng schema `public` và database; `drphynex_migrator` LOGIN hạn chế, `GRANT drphynex_owner TO drphynex_migrator WITH INHERIT TRUE, SET FALSE` (không SET ROLE được sang owner).
- Guard (`checkIdentity`, thay đổi chỉ làm chặt thêm): ngoài cờ của chính role, truy vấn mọi role khác mà role hiện tại là thành viên trực tiếp/gián tiếp (`pg_has_role MEMBER/USAGE/SET`); từ chối nếu có role đặc quyền (superuser/createdb/createrole/replication/bypassrls) hoặc role `pg_*` dựng sẵn (trừ `pg_database_owner`). Câu trả lời thiếu cột hoặc sai kiểu → từ chối (fail closed). Cần PostgreSQL ≥ 16 (`SET` option).
- Trên PostgreSQL 17.6 thật (container diễn tập 3): cấu hình chọn → OK; A GRANT `drphynex` (phương án cũ), B `pg_read_server_files`, C `pg_execute_server_program`, D gián tiếp qua role trung gian, E đường chỉ-SET (INHERIT FALSE, SET TRUE) tới superuser, G owner bị cấp CREATEROLE → đều `REFUSED exit=3 (IDENTITY) Migration role can reach a privileged role`; F owner cấp SET TRUE (owner không đặc quyền) → OK (cho phép có chủ đích: chỉ role nguy hiểm bị chặn; cấu hình chọn vẫn dùng SET FALSE). Mỗi thay đổi được hoàn tác ngay; kiểm tra sau cùng OK.
- **Chuyển quyền sở hữu từ topology hiện tại, diễn tập trên bản sao** (container riêng có bootstrap superuser `drphynex`, giống thật): `REASSIGN OWNED BY drphynex` bị PostgreSQL từ chối ("required by the database system"), nên dùng `ALTER ... OWNER TO` sinh theo từng đối tượng, một transaction: 86 bảng + 88 enum (80 sequence, 470 index đi theo bảng) + database; sau đó 0 đối tượng `public` còn thuộc `drphynex`; không có ACL tường minh; dữ liệu 86/86 bảng giữ nguyên (số dòng + md5). Hệ quả: 60 enum do migration banner tạo sẽ thuộc migrator (sở hữu hỗn hợp; grammar guard không có đổi owner). Chưa áp dụng gì lên `drphynex` thật.

## 4. State store
- Ghi: tạo temp độc quyền (0600) → ghi → fsync → `close()` → rename → fsync thư mục. Lỗi ở bất kỳ bước trước rename (kể cả `close()` lỗi, và `close()` lỗi lần nữa khi dọn) → xóa temp, không rename, state cũ nguyên. Rename báo lỗi → xóa temp; state cũ được kỳ vọng còn (hành vi hệ thống file, không được kiểm chứng).
- **Rename đã thành công nhưng fsync thư mục lỗi:** state MỚI đã nằm tại chỗ, độ bền chưa xác nhận, nội dung cũ đã mất; lỗi mang mã `STATE_RENAMED_SYNC_FAILED` (`renamed: true`). Không được giả định "state cũ còn". Regression kiểm tra đúng điều này.
- Mô tả đổi: không tuyên bố bền khi mất điện. fsync thư mục bị bỏ qua trên Windows (không hỗ trợ). Chỉ tuyên bố: thay thế bằng một rename nên người đọc thấy bản cũ hoặc bản mới, và fsync file được yêu cầu.

## 5. Đính chính rehearsal 2 và báo cáo trước
Trong rehearsal 2, role `drphynex` được tạo cục bộ là **NOSUPERUSER**, trong khi `drphynex` thật là superuser. Vì vậy nó **không** chứng minh phương án GRANT superuser của kế hoạch cũ; phương án đó đã bị rút (§3). Kết quả rehearsal 1–2 vẫn đúng với phạm vi của chúng (executor chạy được trên bản sao) nhưng kế hoạch chạy thật và bảng blocker cũ được thay bằng tài liệu này.

## 6. Diễn tập 3 và bằng chứng
Môi trường riêng: container `drphynex-b5-r3-pg` (image pin digest, bootstrap superuser `drphynex`, loopback `127.0.0.1:55498`, network/volume riêng), DB `drphynex_rehearsal3` (marker `drphynex:rehearsal3:disposable-v1`). Không dùng `drphynex`, DB bằng chứng Admin, hay container diễn tập trước. Thư mục bằng chứng: `C:\Users\THAI\Websites\drphynex-b5-rehearsal\rehearsal3\`.

Fingerprint (235 file: nguồn/config/test trong Git + allowlist thử của root sao chép + công cụ restore + `table-hash.sql` + catalog): trước chuỗi `7ac295a6269bfd9a9d167355b5da7f77b6b163707a98809c1d3709c1ebd1fbc2`, sau chuỗi **giống hệt**. Lượt test:guard chạy trước đó có fingerprint riêng (234 file, `9432f1f6…8700`, trước = sau); khác bản trên ở đúng 3 dòng bản sao root được làm mới ngay sau lượt đó.

| Lệnh / bước | Kết quả |
|---|---|
| `node tests/guard/run-integration.mjs` (container guard hiện có, nguồn đã đổi `migration-guard.ts`) | exit 0, verdict pass: **12/12, 0 skip, 0 unhandled**; `run-context.json` liệt kê working tree không sạch |
| `vitest run --config vitest.unit.config.mts` | exit 0, 20 file, **586/586** |
| `tsc --noEmit --incremental false`; ESLint `--max-warnings=0` (scripts + 4 spec); Prettier `--check` | exit 0 |
| Phục hồi dump gốc (giữ owner) vào DB r3 | 86/86 bảng khớp số dòng + md5 |
| Chuyển owner (§3) | transaction commit; dữ liệu 86/86 không đổi |
| Backup chính DB đích (458,616 byte) + phục hồi kiểm chứng vào DB phụ | 86/86 khớp; công cụ restore `--list` exit 0 |
| Anchor mới + `anchorId` vào catalog; công cụ từ chối tạo lần 2 và khi catalog đã có ID | đúng |
| Guarded executor `--local` (allowlist thử trong root sao chép; mã trùng worktree theo `cmp`) | **exit 0, COMPLETE**, step `home_banners`, xid 3408, `runStarted: true` |
| Sau chạy | 6 migration (banner batch 6); 142 cột / 60 enum / 40 FK / 40 index; 85 bảng giữ nguyên ở cột cũ, chỉ `payload_migrations` đổi (5→6 dòng); bảng cũ thuộc `drphynex_owner` ×86 |

Phép thử từ chối — mỗi dòng có **mã nguyên nhân do executor in ra** (adapter in mã hằng số; không dựa vào exit 2), lịch sử DB và hash state/anchor không đổi sau mọi drill:

| Drill | Điều kiện | Exit | Nguyên nhân được in |
|---|---|---|---|
| D1 | chạy lặp | 0 | (no-op; state không đổi) |
| D2 | mất file state, anchor còn | 2 | `STATE_LOST` |
| D3 | mất anchor | 2 | `ANCHOR_MISSING` |
| D4 | anchor bị thay (cùng identity, ID khác, runStarted=false) + mất state | 2 | `ANCHOR_ID_MISMATCH` |
| D4b | như D4 nhưng state còn | 2 | `ANCHOR_ID_MISMATCH` |
| D5 | catalog thiếu `anchorId` | 2 | `ANCHOR_ID_UNCONFIGURED` |
| D5b | catalog kỳ vọng ID khác volume | 2 | `ANCHOR_ID_MISMATCH` |
| D6 | chạy từ checkout chính (allowlist chưa có banner) | 2 | `plan refusal: Migration discovery differs from approval` |
| D7 | migrator thuộc role superuser | 3 | exit IDENTITY; `check-identity` in `Migration role can reach a privileged role` |
| D8 | sau khi hoàn tác tất cả | 0 | (no-op) |

Giới hạn bằng chứng: D7 phân biệt qua exit code 3 cộng lệnh `check-identity` gọi đúng `checkIdentity` trên cùng DB, vì lõi executor cố ý chỉ log thông báo chung cho lỗi identity; tôi không đổi log của lõi. Lỗi do GuardError khác (marker, backup, host) không được drill lại ở đợt này.

## 7. Thay đổi mã (chưa commit)
`scripts/lib/state-store.ts` (mới), `scripts/migration-anchor.ts` (mới), `scripts/migrate-guarded.ts` (nối store + in mã nguyên nhân hằng số cho state-store/plan), `scripts/lib/migration-guard.ts` (chỉ `checkIdentity`: thêm kiểm tra role đạt được), `tests/unit/state-store.spec.ts` (mới, 14 test), `tests/unit/migration-identity.spec.ts` (mới, 5 test), `tests/unit/migration-guard.spec.ts` (mock thêm cột `risky_roles`). Không đổi SQL guard, allowlist, migration, approved.json. SHA-256 từng file: manifest.

## 8. Kế hoạch chạy thật (cập nhật)
**Target:** `drphynex` tại `127.0.0.1:5433` (container `drphynex-postgres`, volume `drphynex_pgdata`, PostgreSQL 17.6).

**Phê duyệt còn cần (owner), mỗi mục độc lập:**
1. **Role/ownership:** tạo `drphynex_owner`, `drphynex_migrator`, `GRANT … WITH INHERIT TRUE, SET FALSE`; chạy script `ALTER … OWNER TO` sinh từ catalog thật (xem lại từng câu lệnh trước), gồm cả `ALTER DATABASE … OWNER`. Không dùng `REASSIGN OWNED`.
2. **Marker:** `COMMENT ON DATABASE drphynex IS '<marker đã duyệt>'`.
3. **Catalog + anchor:** thư mục state ngoài checkout; owner chạy công cụ anchor, ghi `anchorId` vào catalog (không commit catalog).
4. **Fingerprint migration:** chuyển mục đề xuất (`92e833a9…15b7`, 282 câu lệnh) sang `migrations.approved.json` trong commit riêng; commit trước đó phần sửa executor ở §7.
5. **Cửa sổ bảo trì** và công cụ `pg_restore` tuyệt đối được duyệt (client PostgreSQL thật, hoặc wrapper trỏ container thật chỉ chạy `--list`).

**Backup bắt buộc (DB + toàn bộ upload, có manifest):**
- DB: `docker exec drphynex-postgres pg_dump -U drphynex -d drphynex -Fc`; ghi SHA-256/kích thước; `pg_restore --list` đạt.
- File: `media` (hiện 4 file, 296K), `private-uploads` (4 file, 29M), `brand-assets` (662 file, 90M) — dùng `scripts/backup-local.sh` (kèm `files.sha256`), rồi chạy `sha256sum -c`; đối chiếu số file và số dòng bảng `media` (4). Lưu cả DB lẫn file vào cùng một thư mục `drphynex-backups\banners-<thời gian>` và lập manifest tổng (các artifact, hash, thời điểm, nguồn). Nếu cấu hình storage đổi sang S3, bổ sung bản sao bucket (chưa áp dụng).
- **Phục hồi thử đúng artifact:** phục hồi chính file dump đó vào DB phụ trong container disposable, so khớp số dòng + md5 86 bảng (`table-hash.sql`), và chạy công cụ restore `--list` trên đúng artifact; manifest executor ghi hash artifact đó. Manifest không quá 24 giờ khi chạy.

**Tiến trình dùng DB và cách tạm dừng (kiểm kê hôm nay, chỉ đọc):**
- Kết nối DB duy nhất đang mở: 1 kết nối idle từ `172.19.0.1` (host) của dev server Next `npm run dev` trong `website-demo` (cổng 3000, pid 26440; khởi động từ khung Preview). Admin Payload và API chạy trong chính server này; không có worker/cron DB riêng.
- Cách dừng: dừng server (nút Stop của Preview hoặc kết thúc `npm run dev`); nếu có `next start` production thì dừng tương tự. Sau đó kiểm `pg_stat_activity` cho `datname='drphynex'` còn 0 kết nối client (ngoài phiên backup/migrate). Các công cụ khác (test, seed, backup script) chỉ chạy khi gọi tay — xác nhận không có tiến trình nào đang chạy. Không có tác vụ lập lịch chạm DB được tìm thấy (có tác vụ Windows tên chứa "backup" thuộc hệ thống khác, chưa xác minh liên quan).
- Khôi phục: sau khi kiểm tra xong, khởi động lại server rồi mới mở lại.

**Lệnh thực thi** (checkout sạch tại commit đã duyệt, không `DATABASE_URL`, không `.env`): đặt `MIGRATION_TARGET`, `MIGRATION_DATABASE_URL` (URL migrator riêng), `MIGRATION_BACKUP_MANIFEST`, `MIGRATION_TARGETS_FILE`, `MIGRATION_PG_RESTORE`, `MIGRATION_CONFIRM="migrate <target> drphynex@127.0.0.1:5433"`; chạy `node node_modules/tsx/dist/cli.mjs scripts/migrate-guarded.ts --local`.

**Kiểm tra sau chạy:** exit 0 + state `COMPLETE`; `payload_migrations` 6 dòng; 142 cột / 60 enum / 40 FK / 40 index; 85 bảng giữ nguyên ở cột cũ; chạy lặp no-op; role migrator không đặc quyền (`check-identity`); khởi động server, kiểm tra trang chủ KO/EN/VI và Admin (chỉ đọc), rồi một chu trình Admin trên nháp.

**Phục hồi nếu lỗi:** exit ≠ 0 (FAILED, UNCERTAIN, STATE_FAILED): dừng, không retry, không xóa state/anchor; đối soát theo `docs/b5-security-correction.md`; phục hồi đúng artifact đã kiểm chứng vào **database mới** (`drphynex_restore_<thời gian>`) rồi so khớp, owner quyết định chuyển kết nối; khôi phục file từ bản sao nếu cần. Không ghi đè `drphynex`, không migrate down. Cột banner chỉ thêm mới nên có thể rollback mã giữ schema; rollback ownership = phục hồi từ dump hoặc script đảo `ALTER … OWNER TO drphynex`.

## 9. Chưa kiểm chứng
Chưa chạy gì trên `drphynex`. Chưa kiểm tra độ bền khi mất điện và fsync thư mục trên Windows. Container diễn tập khác container thật (cùng image/phiên bản). Dữ liệu diễn tập là bản chụp 02:13 UTC ngày 2026-11-06. Bộ guard integration dùng adapter riêng và không bao phủ `migrate-guarded.ts` (được bao phủ bằng drill ở §6). Các tuyên bố về hành vi rename khi lỗi là hành vi hệ thống file, không được kiểm chứng.
