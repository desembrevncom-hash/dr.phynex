# Home Banners CMS — bàn giao r6 (build, chu trình Admin, tách đề xuất migration)

Ngày 2026-11-06. Nhánh `home-banners-cms`. Không push, merge, deploy; không chạy migration trên `drphynex` (xác minh sau kiểm tra: 5 migration, 0 cột banner).

## 1. Nguồn và bằng chứng
- Fingerprint nguồn (218 file `src tests scripts deploy` + package.json, package-lock.json, tsconfig.json, vitest*.mts, next.config.ts, eslint.config.mjs; trừ `importMap.js`): hash danh sách `af99eb1788475bc8252f4d248c72cdec9566a5d8726ba2284267a735e4e0c8f7`, trùng r5, trước và sau build + Admin r6.
- **Production build** trên nguồn đó: `next build --webpack`, exit 0, `.next` riêng của worktree, heap 2048 MiB, DB `drphynex_media500_feat_test`.
- **Chu trình Admin** (giao diện thật, tài khoản test cục bộ, DB thử có marker `drphynex_independent_review_test`, dev server :3020):
  1. Đổi ảnh chung MX-01, Lưu nháp → approval cả 3 locale bị xóa (revision `dcbae938`), khách giữ ảnh cũ và approval `6fe02773`.
  2. Duyệt KO riêng → chỉ KO có approval.
  3. Xuất bản KO bị chặn: "Publishing KO would change the shared banner settings that visitors see in EN…"; khách không đổi.
  4. Duyệt EN riêng (xem §3) rồi xuất bản EN → thành công; khách KO/EN thấy ảnh mới + approval `dcbae938`; tiêu đề KO công khai không lộ bản nháp; VI giữ slide mặc định.
  5. Preview nháp nhân viên (`/preview?path=…`) thấy bản nháp KO/VI; khách thì không.
- **Dạng bằng chứng:** log, JSON và HTML. **Không có ảnh chụp màn hình lưu trên đĩa** (công cụ trình duyệt tích hợp không ghi ảnh ra file). Thư mục `brand-assets/screenshots/home-banners-cms-2026-11-05-r6/` (git-ignored): `logs/{build.log,chain.log,fingerprint-*.list,admin-cycle-r6.md,commit-candidates.txt}`, `guest-{ko,en,vi}.html`. Hash danh sách: `a0558c812235fb3a45ce3bd7056da4ea5cc16f0ff2c8b8f86564644d035767e7`. Bản sao DB sau chu trình: `drphynex_banner_evidence_r6`. Bằng chứng Admin r2 không được dùng thay thế.
- Chưa kiểm tra: ảnh/packshot thật, S3/CDN, Admin production.

## 2. Báo cáo cũ giữ nguyên
Các báo cáo/manifest r1–r4 giữ nguyên (đánh dấu SUPERSEDED khi cần) để bảo toàn lịch sử bằng chứng. Phát biểu về vị trí của fingerprint migration trong chúng được thay bằng §4 dưới đây.

## 3. Hạn chế UX đã biết (chưa sửa trong commit này)
Khi một thay đổi dùng chung xóa approval của mọi locale, locale đang công khai (ví dụ EN) vẫn mang nhãn **Approved** cũ trong `Translation Status`, trong khi approval theo revision đã bị xóa (sidebar ghi "cần duyệt lại"). Form không có thay đổi nên nút "Lưu bản nháp" bị tắt. Cách duyệt lại hiện tại: **In review → Lưu → Approved → Lưu**. Ngoài ra: một lần bấm "Lưu bản nháp" bằng công cụ tự động không ăn; sau lần xuất bản bị chặn Payload hiện hộp thoại "Tài liệu đã được sửa đổi" và cần tải lại trang.

## 4. Migration: đề xuất tách khỏi quyền thực thi
- `scripts/lib/migration-plan.ts#buildPlan` bắt buộc danh sách file trong `src/migrations` **trùng đúng** `deploy/migrations.approved.json`; vì vậy một dòng trong file đó là quyền thực thi. File không phân biệt "đề xuất" với "đã duyệt".
- Thay đổi: `deploy/migrations.approved.json` **giữ nguyên 5 migration** (không đổi so với HEAD). Fingerprint của `20261105_085002_home_banners.ts` (SHA-256 `92e833a903647237ffa943f6ab23603db7dd72dafa3eac75a33234f685b215b7`, 282 câu lệnh) nằm ở file mới `deploy/migrations.proposed.json`, không file mã nào của executor đọc.
- Hệ quả có chủ đích: trong repo này `buildPlan` với allowlist thực thi sẽ từ chối ("Migration discovery differs from approval") cho đến khi reviewer chuyển mục đề xuất sang file approved. Executor không bị sửa.
- Test: `tests/helpers/migration-allowlist.ts` (allowlist chỉ-dùng-cho-test = approved + proposed); `sql-guard.spec.ts`, `migration-eol.spec.ts`, `migration-guard.int.spec.ts` dùng helper này; thêm 2 test mới: (a) approved không chứa migration và executor từ chối; (b) proposal khớp byte file và không dùng được như allowlist. Kiểm tra lại: unit 18 file, **567/567**; tsc, eslint (4 file test), prettier exit 0.
- **Chưa chạy:** `tests/guard/migration-guard.int.spec.ts` (bộ guard dùng môi trường tách biệt riêng); chỉ đổi nguồn allowlist, cần chạy lại bằng `npm run test:guard` khi có môi trường đó.
- Điều kiện thực thi migration thật vẫn chưa đủ: atomic state, volume anchor, superuser role, marker, target file, backup manifest.
