# B5 — Khắc phục sau tái kiểm toán (chờ review bản cố định)

Baseline HEAD: `2959f67a04e2c48c3384348b4bf4e7aa69fcacc4`, nhánh `phase-3-brand-design`. Checkpoint chuẩn bị integration, không phê duyệt migration thật. SHA chính xác được ghi tại bàn giao. Tài liệu này không cho phép migration, deploy hoặc sử dụng credentials thật.

## Phạm vi executor và SQL guard

Runner không import migration module hoặc khởi tạo Payload. Nó kiểm tra source bằng manifest SHA-256, trích SQL literal, tokenize để kiểm tra rồi giữ nguyên chuỗi trong plan bất biến. Lock, BEGIN, SQL, INSERT lịch sử và COMMIT dùng cùng một direct `pg.Client`. File bị đổi sau preflight không thay được SQL trong bộ nhớ; các lần kiểm tra lại có thể từ chối và rollback transaction hiện tại.

Logic và SQL của năm migration được giữ nguyên; source được chuẩn hóa LF theo .gitattributes và manifest chỉ đổi một hash bị ảnh hưởng EOL. Chúng chứa lần lượt 665, 11, 2, 2 và 4 statement. JavaScript transforms, interpolation, hooks và Local API không được hỗ trợ. Migration tương lai phải được review cả khả năng biểu diễn và fingerprint; không tự sinh lại manifest để vượt guard.

Guard là **grammar chặt theo đúng các dạng năm migration đang dùng**, đọc tới token cuối của từng statement; mọi dạng khác bị từ chối mặc định:

- `CREATE TABLE [IF NOT EXISTS] tên (cột, …)`: chỉ định nghĩa cột, không có gì sau dấu đóng ngoặc.
- `CREATE TYPE tên AS ENUM ('…', …)`.
- `CREATE [UNIQUE] INDEX [IF NOT EXISTS] tên ON bảng USING btree (cột, …)`: chỉ cột thường.
- `ALTER TABLE bảng ADD COLUMN cột`, hoặc `ALTER TABLE bảng ADD CONSTRAINT tên FOREIGN KEY (…) REFERENCES bảng (…) ON DELETE {CASCADE | SET NULL} ON UPDATE NO ACTION`; mỗi lệnh đúng một sub-command.
- Cột: tên, kiểu, rồi `DEFAULT`, `NOT NULL`, `PRIMARY KEY`. Kiểu là tên built-in trong danh sách cố định (có `varchar(N)`, `timestamp(N) [with time zone]`) hoặc một tên quoted đơn (enum dự án). `DEFAULT` chỉ nhận chuỗi, số thập phân không dấu (phần lẻ tùy chọn), `true`, `false`, `now()`. Numeric token phải được đọc trọn: không exponent/base prefix/underscore/trailing identifier, không .5 hoặc 1.; modifier phải nguyên, varchar 1..10485760, timestamp 0..6.
- Schema qualifier duy nhất là `public`.

Do đó các dạng sau đều **không** được hỗ trợ: DROP, ALTER TYPE, OWNER/SET SCHEMA/RENAME, nhiều sub-command, cast `::`, USING, CHECK/UNIQUE constraint, CTAS/AS TABLE, LIKE, inheritance, partitioning, TABLESPACE, WITH, expression/partial index, index không phải btree. Migration tương lai cần một trong các dạng này phải được review và mở rộng grammar có chủ đích.

Function call duy nhất là **`now()` không tham số, không qualified, trực tiếp trong DEFAULT**. `pg_catalog.now()` cũng bị từ chối vì các migration không dùng. Runner đặt search_path thành public; PostgreSQL tìm pg_catalog ngầm định trước public cho function không qualified. Đây là giả định phân giải tên cần xác nhận trên PostgreSQL thật; integrity/ownership của pg_catalog vẫn phải đáng tin cậy. Chuỗi có NUL bị từ chối vì wire protocol cắt query tại NUL.

**Không phải SQL/database sandbox và không phải parser đầy đủ của PostgreSQL.** DDL được chấp nhận vẫn có thể chạm đối tượng có sẵn: enum/kiểu quoted do người khác tạo, default operator class, event trigger, quyền trên schema. Cần kiểm soát database/schema/role, quyền tạo đối tượng, extension và nội dung migration. Guard không bảo vệ trước người sở hữu shell/credentials tùy ý.

## Outcome, phase và chốt đối soát

State mới dùng `version: 2`, runId, SHA-256 plan và identity hash của target/host/port/database/role/marker. Step/phase/xid phải cùng có hoặc cùng vắng; xid là decimal uint64 dương. Trường lạ, JSON null, sai kiểu, version/identity không khớp đều bị từ chối. Chỉ ENOENT có nghĩa chưa có state.

Không hỗ trợ legacy không version: chưa có legacy thật cần chuyển đổi. Mọi record phải có version 2 và đúng target identity. Record không version, JSON null hoặc sai cấu trúc bị từ chối trước kết nối. Mọi record không COMPLETE, kể cả STATE_FAILED, chặn lượt chạy sau; chốt được đọc lại dưới advisory lock.

| Outcome / exit | Ý nghĩa |
| --- | --- |
| COMPLETE / 0 | Lượt chạy hoàn tất, history được kiểm tra, state được ghi. |
| FAILED / thường 6 | Lượt chạy thất bại trước COMMIT hoặc transaction COMMIT được xác nhận aborted. **Không có nghĩa mọi migration trước đó chưa áp dụng.** Lỗi preflight/status có exit riêng 2–7. |
| UNCERTAIN / 8 | Không đủ bằng chứng về kết quả hoặc cleanup. Không retry. |
| STATE_FAILED / 10 | **DB đã commit, ghi nhận trạng thái thất bại.** Không rollback/retry; đối soát bắt buộc. |

Các phase mô tả step cuối tới bước chuẩn bị COMMIT; chúng không nhất thiết là step gặp lỗi sau đó:

1. `commit-preparing`: lấy xid sau INSERT history; chuẩn bị lưu intent. Lỗi tại đây vẫn rollback transaction và đóng session; log nói COMMIT chưa gửi.
2. `commit-sent`: intent đã được fsync trước khi gọi COMMIT. **Trên disk chỉ có nghĩa có thể đã gửi**, vì không thể atomically gắn fsync với socket. Trong process có cờ riêng xác định lời gọi COMMIT đã bắt đầu. Crash tại khoảng này phải đối soát, không suy luận server đã nhận.
3. `committed`: đã nhận command tag COMMIT. Lỗi ghi phase này hoặc COMPLETE trả exit 10 và thông báo rõ DB đã commit, dù ghi marker lỗi cũng thất bại. Nếu marker cũ còn RUNNING/commit-sent, nó vẫn chặn restart.

Lỗi ghi intent trước COMMIT giữ transaction trong luồng rollback/close; không dùng câu “server từ chối COMMIT” khi chưa gửi. Sau khi bắt đầu gửi COMMIT, không gửi ROLLBACK để suy luận kết quả. Với ERROR/ROLLBACK tag từ server còn sống, chỉ xác nhận FAILED nếu `pg_xact_status(xid)` là aborted và history của đúng step vắng. Xid/history dùng cùng session đã xác minh identity, không reconnect. Mất kết nối, FATAL hoặc kiểm tra không chắc chắn là UNCERTAIN. Tag COMMIT là kết quả DB đã biết; lỗi lưu state là lỗi khác. Log exit 10 có đúng migration step và xid, không raw SQL/secret, kể cả khi không lưu được marker.

History phải là prefix đúng thứ tự, không trùng tên, batch không giảm. ID int4 phải là number nguyên dương, tăng nhưng **không cần liên tục**. Batch chấp nhận number nguyên dương an toàn hoặc chuỗi số nguyên dương canonical từ parser pg numeric; không ép null/boolean/NaN/Infinity/phân số thành giá trị hợp lệ.

State file phải có đường dẫn cố định ngoài checkout trên volume bền vững, dùng chung cho mọi executor của target, với quyền owner kiểm soát. Có fsync file nhưng không tuyên bố đã chứng minh durability khi mất điện hoặc sự cố volume. Record hỏng thường chặn chạy; các bảo đảm filesystem, directory entry và lưu trữ triển khai vẫn cần kiểm chứng. Không tự xóa chốt, đổi state path hoặc retry để vượt sự cố.

## Cấu hình, backup và rollback

`npm run migrate` và `migrate:guarded` dùng cùng executor; plain migrate thêm giới hạn target Local. Không nạp .env, tạo DB, seed, sinh types hoặc chạy down. Biến MIGRATION_* được truyền rõ từ process/CI; PAYLOAD_DROP_DATABASE, config override và TLS không an toàn bị chặn. Remote yêu cầu direct endpoint và verify-full; không tự đổi pooled URL.

Cần catalog target do owner duyệt, role hạn chế, marker và provider identity phù hợp. Production còn cần allow-production và human approval riêng. Marker clone/catalog tự viết không thay cho phê duyệt. Công cụ archive duy nhất chạy child có argv cố định, env allowlist, không shell, stdout/stderr bị bỏ và timeout; không chuyển tiếp raw secret/error.

Backup cần custom pg_dump archive, checksum/size/nguồn/độ mới khớp, absolute pg_restore binary được duyệt, listing thành công và rehearsal độc lập gắn với cùng artifact hash. Listing chỉ chứng minh archive đọc được, không chứng minh restore hoàn chỉnh. Rehearsal là bằng chứng từ workflow tin cậy, không phải attestation runner tự tạo. Giữ nguyên hướng dẫn backup/rollback trong tài liệu hiện có; không mặc định migration down là phục hồi. Khi lỗi: dừng, đối soát committed history/schema/xid và backup trước quyết định của owner.

CI cần concurrency theo database, một executor, persistent shared state, manual approval sau lỗi và một writable primary có provider fencing. SIGINT/SIGTERM/deadline đóng session; statement/lock/idle timeouts giới hạn công việc. Sau process death, backend có thể cần thời gian nhận ra disconnect/timeout; không hứa chấm dứt tức thì. Không tuyên bố chống split-brain bằng advisory lock hoặc sẵn sàng Neon/Vercel từ unit tests.

## Fixture integration — CHƯA THỰC THI

Mười hai ca opt-in I1–I12 được chuẩn bị; xem [ma trận, giới hạn, điểm dừng và phạm vi dọn](b5-integration-matrix.md). SELECT/pg_sleep đã được loại khỏi migration fixtures. Fixture lỗi dùng ALTER TABLE trên bảng không tồn tại. Fixture chờ dùng ALTER TABLE trên b5_gate, bị connection điều khiển riêng giữ ACCESS EXCLUSIVE lock. Trước mỗi poll, controller gọi pg_stat_clear_snapshot() để loại snapshot giữ trong transaction (theo PostgreSQL 17 §27.2.2); deadline quan sát vẫn 5s. Trước tiêm lỗi, test đợi pg_stat_activity xác nhận đúng DDL, database, role, application_name và pg_blocking_pids chứa controller. Không mở rộng SQL production để phục vụ test.

Trước DROP SCHEMA và terminate backend, test kiểm tra live name `drphynex_migration_guard_test`, marker `drphynex:migration-guard-test:disposable-v1`, role không privileged, server endpoint (chuẩn hóa inet host /32, /128; không nhận subnet); đối chiếu Docker inspect với container đang chạy, label `com.drphynex.migration-guard-test=disposable-v1`, port mapping chỉ loopback và đúng port URL. Psql read-only bên trong đúng container phải khớp database OID, role, marker và postmaster start time của connection URL. Không khớp hoặc thiếu quyền đọc thì fail closed, không cấp quyền hay provision tự động. Cần container bridge/IP tương thích cơ chế kiểm tra; chưa xác nhận các topology khác.

Khi được duyệt sau này: dùng container/volume/network và credentials test riêng, không mount dữ liệu/secret thật; role chỉ sở hữu database disposable. Container phải có psql/pg_dump/pg_restore phù hợp và auth test riêng. Mọi thao tác reset vẫn kiểm tra live identity, không chỉ tên biến môi trường. Hiện không chạy Docker/PostgreSQL, không tạo DB/role/container.

## Bằng chứng đợt sửa 01/11/2026

- Lượt sửa trước (qualified now/btree, CTAS, lỗi log/fsync, batch sai, marker COMPLETE thiếu cấu trúc): 261/261 unit test PASS, 9 file. Đã chạy lại xác nhận con số này trước khi sửa tiếp.
- Lượt rà soát sau đó tái hiện bằng test trong bộ nhớ rằng guard vẫn chấp nhận DROP TABLE/TYPE/INDEX, ALTER TYPE, OWNER TO, SET SCHEMA, RENAME, DROP COLUMN, nhiều sub-command, USING và cast tới kiểu `attacker.t`, kiểu cột qualified, TABLESPACE, WITHOUT OIDS và NUL trong chuỗi. Các dạng này đều ngoài phạm vi năm migration. Đã thay kiểm tra theo từ khóa bằng grammar chặt nêu trên.
- Sau sửa: **315/315 unit test PASS, 9 file** (256 test thuộc guard, state, archive), tuần tự một worker, heap 2048 MiB; không nạp env file. Mô phỏng chứng minh mọi statement của fixture qua được grammar production và executor tới đúng DDL cần tiêm lỗi; không chứng minh lock/timing thật của PostgreSQL.
- TypeScript noEmit (incremental=false) PASS; ESLint phạm vi `scripts`, `tests`, `src/config` với max-warnings=0 PASS; git diff --check PASS; năm migration và manifest giữ nguyên fingerprint. Không chạy build trong đợt này.
- Kết quả build cũ chỉ là lịch sử của snapshot cũ, không chứng minh runtime mới. Warning build cũ không có diagnostic cụ thể trong log; không tuyên bố vô hại.
- Integration, migration, restore, thao tác CMS/account, kết nối PostgreSQL/cloud: **NOT EXECUTED**. Không commit/push/deploy, thay dependency, migration nguồn, manifest đã duyệt hoặc hai tài liệu WIP.

Sẵn sàng bàn giao source để review lại; chỉ sau review mới quyết định lưu mốc. Integration cô lập đã được chuẩn bị về mã nhưng còn cần phê duyệt và credentials/môi trường đúng cơ chế kiểm tra. Migration nghiệp vụ chưa đủ bằng chứng và chưa được phép chạy. Atomic state replacement và volume anchor do owner tạo vẫn chưa được triển khai, là điều kiện chặn migration thật; xem ma trận. Ma trận bổ sung cần có: lỗi trước/sau COMMIT và fsync; deferred constraint; mất acknowledgement; crash/restart từng phase; history bất thường; backup/rehearsal thật; TLS/role/xid diagnostics/failover/state volume trên Neon hoặc môi trường triển khai thật.


## Chuẩn bị checkpoint 02/11/2026

- L1–L5: trước sửa, 19 regression thất bại trên ba file; sau sửa các regression đã qua. Kiểm tra cuối: TypeScript noEmit incremental=false PASS; ESLint max-warnings=0 PASS; 339/339 unit test PASS trên 10 file; git diff --check PASS. Chạy tuần tự, một worker, heap 2048 MiB, không nạp env file.
- Chuẩn EOL cố định bằng src/migrations/*.ts và *.js text eol=lf; không normalize hash tùy ý lúc chạy. Chỉ storage_fields.ts đổi hash trong manifest: fb47380b36560b953a0a6fbd1a748947bff2f1f76c2874026d45284a7ac1a92b → 3abc824b97c994fc05d9b0ed2a67c7875bca804abad3aaa054ec637e50b5beac. Bốn mục còn lại giữ nguyên. index.ts chỉ đổi EOL, không có trong manifest.
- Đã so sánh nội dung trước/sau khi bỏ khác biệt EOL; gọi up() thật với mock sql/db cho cả năm file cho SQL giống hệt, không có tham số. Unit còn xác nhận plan bằng source CRLF không vượt manifest LF.
- I1–I12 chỉ là code đã chuẩn bị. Các ca test-only không tạo đường bypass trong CLI. Bail=1, retry=0, một worker. Không chạy integration hoặc Docker, không kết nối PostgreSQL/Neon, không migration/build/deploy.
- Đây là tự kiểm tra bản sửa, không phải kiểm toán độc lập. Nếu các kiểm tra cuối đạt, chỉ commit checkpoint với nhãn “B5 prepared for isolated integration — not approved for real migration”, rồi dừng sửa để review đúng SHA.
