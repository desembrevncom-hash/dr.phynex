# Sửa P1 review r3 — ngoại lệ hệ thống không còn tự cấp approval

Ngày 2026-11-06. Không commit, merge hay chạy migration trên `drphynex`. Không sửa Media, SQL guard, điều kiện executor.

## 1. Thay đổi
- `src/hooks/guardHomeBannerApproval.ts`: nhánh "không có `req.user`" chỉ còn **xác thực caller** (Local API trong tiến trình + `overrideAccess === true`, nếu không → 403). Đã bỏ việc tự cấp approval và `return` sớm. Caller hệ thống đi qua cùng logic revision / approval / publish như editor:
  - đổi nội dung dùng chung phải là bản nháp (publish kèm đổi → 409), xóa approval mọi locale, ép In review;
  - sửa + Approved trong cùng request không được tính là duyệt;
  - approval chỉ ghi ở lần lưu nháp riêng, không đổi nội dung;
  - publish cần approval riêng của locale đó và, nếu đổi nội dung công khai, approval mới của mọi locale đang công khai.
- `tests/int/home-banners-approval.int.spec.ts`: thêm nhóm "system caller without a user", chạy 2 lần (truyền `overrideAccess: true` rõ ràng / để mặc định Local API). Phủ: đổi ảnh + Approved; đổi visualType + Approved; đổi CTA + Approved; publish thẳng kèm đổi; publish ngay sau đổi khi chưa duyệt; KO duyệt nhưng EN rồi VI (đang công khai) chưa duyệt → từ chối; duyệt đủ bằng các lần lưu riêng rồi publish thành công; mọi lần bị từ chối giữ nguyên bản công khai (so sánh trạng thái công khai trước/sau); `bannerApprovals` do client gửi bị bỏ qua. Các regression editor và chống giả mạo cũ giữ nguyên.
- Seed của hai test cũ được chỉnh theo workflow (lưu nội dung → duyệt riêng → publish), **không thêm bypass**: `tests/int/review-p1.int.spec.ts` (test ở dòng ~400) và `tests/int/review-rights.int.spec.ts` (test ở dòng ~216). Chúng trước đây publish + Approved trong một lần gọi hệ thống; đó đúng là đường bị lỗ hổng.

## 2. Chạy bị lỗi (giữ log)
Lượt r4 (`home-banners-cms-2026-11-05-r4/logs`) chạy trên hook đã sửa nhưng **chưa chỉnh hai test cũ**: tsc, eslint, prettier, unit, approval đều exit 0; `int-affected` exit 1 (2/41 lỗi — hai test cũ nói trên, bị hook từ chối đúng thiết kế). Trước đó một lượt chạy riêng file approval có 2 lỗi do regex thông báo lỗi sai trong test mới (hành vi từ chối vẫn đúng); đã sửa regex. Log r4 giữ nguyên, không gán cho nguồn cuối.

## 3. Kiểm chứng nguồn cuối (r5)
Thư mục `brand-assets/screenshots/home-banners-cms-2026-11-05-r5/logs` (git-ignored). Chạy tuần tự bằng `final-chain-r5.sh`; database thử riêng có marker `drphynex_independent_review_test`; biến S3/SMTP bị unset.
Fingerprint: SHA-256 từng file của `src tests scripts deploy` + package.json, package-lock.json, tsconfig.json, vitest*.mts, next.config.ts, eslint.config.mjs (218 file; trừ `importMap.js` tự sinh). Trước và sau chuỗi **giống hệt** (`cmp` trên danh sách): `af99eb1788475bc8252f4d248c72cdec9566a5d8726ba2284267a735e4e0c8f7` (hash của file danh sách).

| Lệnh | Exit | Kết quả |
|---|---|---|
| `tsc --noEmit --incremental false` | 0 | |
| `eslint --max-warnings=0` (page, components/home, lib, hook, globals, 4 spec banner) | 0 | |
| `prettier --check` (banner-revision, hook, approval spec, review-p1, review-rights) | 0 | |
| `vitest run --config vitest.unit.config.mts` | 0 | 18 file, 565/565 |
| integration: approval + review-p1 + review-rights | 0 | 3 file, 49/49 |
| integration: home-banners + review-p1 + review-rights + access | 0 | 4 file, 41/41 |

Không chạy lại production build và integration toàn bộ 10 file (không có phụ thuộc mới; theo yêu cầu chỉ mở rộng khi có lỗi). Kết quả build r3 (exit 0) và integration 91/91 **thuộc nguồn r3, không áp cho nguồn này**.

## 4. Đính chính bằng chứng r3
`source-at-start.sha256` / `source-at-end.sha256` của r3 chỉ hash file migration và danh sách `git status`, **không chứng minh toàn bộ nguồn bất biến**. Chúng không được dùng làm bằng chứng nguồn bất biến cho r3. Fingerprint đầy đủ chỉ bắt đầu từ r4/r5. Log r3 giữ nguyên.

## 5. Chưa xác minh
- **Chu trình Admin** (sửa ảnh chung → duyệt riêng KO/EN → publish) **chưa chạy lại** trên nguồn cuối; chỉ được phủ bằng integration test. Lượt Admin thật gần nhất là r2, trước các lần sửa hook.
- Production build trên nguồn này chưa chạy.
- Ảnh/packshot thật, S3/CDN: chưa kiểm tra.

## 6. Migration và điều kiện
Migration `20261105_085002_home_banners.ts` không đổi (SHA-256 `92e833a9…15b7`, 282 câu lệnh); fingerprint vẫn là đề xuất chưa duyệt; chưa chạy trên `drphynex`. **Tính năng đã sửa P1: có (theo test). Đủ điều kiện migration thật: chưa** — atomic state, volume anchor, role superuser, marker, target file, backup manifest vẫn là blocker.

## 7. File nguồn thay đổi so với r3
Xem `docs/home-banners-manifest-r4-2026-11-06.md`.
