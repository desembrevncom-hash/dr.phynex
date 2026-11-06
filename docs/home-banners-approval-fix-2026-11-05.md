# Banner trang chủ: sửa P1 workflow phê duyệt (bản cuối, 05/11/2026)

- **Nhánh / worktree:** `home-banners-cms`, `C:/Users/THAI/Websites/website-demo-home-banners`, nền `29cd44fef2b4669c248e7bb1166382bb206f6ca8`.
- **Trạng thái Git:** chưa commit, chưa merge, chưa push. Không publish nội dung thật. **Không chạy migration trên `drphynex`**; không nới SQL guard hay điều kiện executor.
- **Báo cáo này thay thế** `home-banners-cms-2026-11-05.md`, `home-banners-migration-plan-2026-11-05.md` và `home-banners-manifest-2026-11-05.*` ở các điểm về migration và workflow duyệt (đã gắn dòng "SUPERSEDED" ở đầu mỗi file). Phần mô tả form, quyền truy cập khách và Media 500 của báo cáo cũ vẫn đúng.
- **Hai kết luận tách riêng:**
  - **Tính năng đã sửa:** CÓ (mục 1–3).
  - **Đủ điều kiện chạy migration thật:** KHÔNG. Atomic state, volume anchor và điều kiện của `drphynex` (role superuser, chưa có marker, chưa có file target) vẫn là blocker. Kế hoạch ở `home-banners-migration-plan-2026-11-05.md` §0 vẫn đúng; riêng số liệu và tên migration lấy theo mục 4 dưới đây.

## 1. Ngoại lệ "không có `req.user`" trong hook duyệt

Hook: `src/hooks/guardHomeBannerApproval.ts`.

### 1.1 Các đường có thể gọi hook mà không có `req.user`

| Đường | `req.payloadAPI` | Có tới được hook không | Kết quả |
|---|---|---|---|
| REST của khách (không token) | `REST` | **Không**: `access.update` của global là `staff`, bị từ chối trước `beforeChange` (401/403) | Không ghi được. Test: 4 body (đổi chữ, `approved`, `published`, `bannerApprovals`) đều bị 401/403 và `bannerApprovals` không đổi |
| GraphQL | `GraphQL` | **Không**: `graphQL: { disable: true }` trong `payload.config.ts` | Không có đường |
| Local API **không** bypass quyền, không user (`overrideAccess: false`) | `local` | Không: access từ chối. Nếu bằng cách nào đó tới được, hook **từ chối** (403) | Test: bị từ chối |
| Local API **có** bypass quyền, không user (`overrideAccess` mặc định `true`): seed, script, job, test | `local` | **Có** | **Ngoại lệ hệ thống**: xem 1.2 |
| Trang web (Next.js) | `local` | Chỉ đọc: `lib/content.ts` luôn dùng `overrideAccess: false`; không ghi | Không ghi |

### 1.2 Cơ chế tin cậy cụ thể

Hook coi là thao tác hệ thống khi và chỉ khi **cả ba** điều kiện đúng: không có người dùng, `req.payloadAPI === 'local'` (gọi trong tiến trình, Payload chỉ đặt `REST` hoặc `GraphQL` cho request HTTP), và tham số `overrideAccess === true` do chính nơi gọi truyền vào. Thiếu một điều kiện: **403, không ghi**.

Việc thiếu `req.user` đơn lẻ không còn là bằng chứng được phép. Đây là sửa so với lần trước, khi hook chỉ kiểm tra `!req.user`. Hành vi khớp với ngoại lệ sẵn có `guardGlobalPublishing`, vốn cũng miễn publish cho lời gọi không user.

Thao tác hệ thống **không bỏ qua workflow hai bước**: lệnh sửa nội dung vẫn bị đưa về In review (do `guardGlobalPublishing`); phê duyệt phải là một lần lưu riêng không kèm thay đổi; hook ghi revision tương ứng. Vì vậy một script không thể "duyệt hộ" nội dung mà nó vừa sửa trong cùng một lệnh.

### 1.3 Hai test cũ

`tests/int/review-p1.int.spec.ts:400` và `tests/int/review-rights.int.spec.ts:216` hỏng ở lượt trước vì hook mới chặn cả đường hệ thống. Phần chuẩn bị của chúng (đặt sẵn trạng thái "đã duyệt và đã publish" bằng lời gọi Local API không user) là **seed hệ thống**, không phải mô phỏng thao tác biên tập; các bước biên tập thật trong cùng test đã dùng đúng người dùng (REST với token editor, hoặc `user: editor/translator` với `overrideAccess: false`). Vì thế tôi **không sửa hai file test cũ**, và cũng không miễn workflow cho chúng: chúng chạy đúng qua đường hệ thống ở 1.2. Hai file này đạt trong cả lượt chạy riêng 3 file lẫn lượt integration đầy đủ cuối (r3).

### 1.4 Client tự gửi `bannerApprovals`

- Trường `bannerApprovals` do server ghi: mọi giá trị client gửi bị thay bằng giá trị tính lại.
- Test mới, editor đăng nhập gửi REST `{bannerApprovals: {vi, ko, en: <giá trị giả>}}`: HTTP 200, giá trị giả **không xuất hiện** ở bất kỳ ngôn ngữ nào; VI giữ đúng revision thật.
- Test cũ trong cùng file: gửi giả bằng Local API có user; phê duyệt không bị giả mạo.
- Khách không gửi được gì (1.1).

### 1.5 Test mới cho mục này (`tests/int/home-banners-approval.int.spec.ts`, nhóm "calls without a user")

1. Khách không ghi, duyệt hay publish được banner qua REST.
2. Local API không user và không bypass quyền: bị từ chối.
3. Editor gửi `bannerApprovals` giả qua REST: bị bỏ qua.
4. Thao tác hệ thống: sửa chữ bị đưa về In review; lần lưu duyệt riêng ghi đúng revision.

## 2. Workflow duyệt (cơ chế không đổi so với lượt trước; trạng thái đã kiểm chứng)

- **Sửa nội dung dùng chung:** 8 trường dùng chung (loại visual, ảnh desktop/mobile, vị trí ảnh, cách hiện chữ, đích CTA, màu nền, màu chữ) tạo thành "revision" SHA-256 đã chuẩn hóa; gửi lại giá trị không đổi từ Admin không đổi revision.
  - Sửa chúng buộc phải lưu **nháp**.
  - Việc đó xóa phê duyệt của **mọi** ngôn ngữ và đưa ngôn ngữ đang sửa về In review.
  - Bản đã publish không bị sửa hay hạ trạng thái.
- **Duyệt từng ngôn ngữ:** chỉ editor/admin, bằng một lần lưu nháp riêng với Approved và không kèm thay đổi nào; server ghi revision mà ngôn ngữ đó đã duyệt (`bannerApprovals`, trường không dịch, đi cùng cấu hình dùng chung khi publish).
- **Publish bị từ chối** (409, không ghi gì): khi ngôn ngữ chưa duyệt revision hiện tại, hoặc khi bản sắp công khai đổi cấu hình dùng chung đang hiển thị mà một ngôn ngữ công khai khác chưa duyệt. Sửa dùng chung kèm publish trong cùng request: bị từ chối.
- **Bảo toàn bản công khai cũ:** mọi bước đều ở bản nháp; request bị từ chối không ghi. Trên Admin thật (database thử, bấm tay): lưu nháp đổi ảnh dùng chung (khách không đổi) → duyệt KO riêng → Publish KO **bị từ chối** vì EN chưa duyệt (khách vẫn thấy ảnh cũ) → duyệt lại EN → Publish KO thành công. Ảnh: `brand-assets/screenshots/home-banners-cms-2026-11-05-r2/admin/`.
- Trang chủ phía khách còn kiểm tra: chỉ hiện banner CMS khi bản công khai đã được duyệt đúng revision (phòng thủ thêm).

## 3. Kết quả kiểm tra trên nguồn cuối

Nguồn cuối = trạng thái sau lần sửa hook cuối (ngoại lệ hệ thống fail-closed + test mới). Lượt chạy: `brand-assets/screenshots/home-banners-cms-2026-11-05-r3/logs/` (`chain.log` ghi giờ từng bước). Chạy **tuần tự**, đo hash nguồn đầu và cuối chuỗi (`source-at-start.sha256`, `source-at-end.sha256`; giống hệt nhau).

| Bước | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `tsc --noEmit --incremental false` | exit 0 |
| ESLint | `--max-warnings=0` trên page, components/home, lib, hook, globals, 4 file test banner | exit 0 |
| Prettier | `--check` các file mới/sửa | exit 0 |
| Unit | `vitest.unit.config.mts --maxWorkers=1` | 18 file, **565/565** |
| Integration đầy đủ | `vitest.config.mts --maxWorkers=1 --no-file-parallelism`, database thử `drphynex_independent_review_test` (marker `drphynex-independent-review-disposable-v1`, kiểm bằng `assertDisposableDatabase`) | 10 file, **91/91** |
| Production build | `next build --webpack`, `NODE_ENV=production`, heap 2048 MiB, một worker chuỗi, `.next` riêng của worktree, database thử riêng `drphynex_media500_feat_test` | exit 0; compile thành công, TypeScript đạt, 7/7 trang tĩnh |

**Trước/sau lần sửa hook cuối** (không gán kết quả cũ cho nguồn cuối):

| Lượt | Nguồn | Kết quả |
|---|---|---|
| r2 (chuỗi đầu) | trước khi thêm ngoại lệ hệ thống | unit 565/565, build exit 0, **integration 85/87** (2 lỗi ở mục 1.3) |
| Chạy riêng 4 file sau sửa hook (lần 1, `!req.user` đơn thuần) | hook cũ | 38/38 |
| Chạy riêng 3 file (`home-banners-approval`, `review-p1`, `review-rights`) sau khi làm hook fail-closed và thêm 4 test | hook cuối | 35 test: 33 đạt, 2 lỗi do tôi viết sai kỳ vọng trong test mới (không phải lỗi hook); sửa test, `home-banners-approval` 16/16 |
| **r3 (chuỗi cuối)** | **nguồn cuối** | **unit 565/565, integration 91/91, build exit 0** |

Lưu ý: số unit giữ nguyên 565 vì lần sửa cuối chỉ thêm test integration. Số "565/565" và "build exit 0" ở r2 **không** được dùng cho nguồn cuối; các con số của r3 là lượt chạy mới.

Kiểm tra thủ công trên Admin (r2, chạy trước lần sửa hook cuối): Save draft → Approve → Publish và nhánh bị từ chối đã thao tác thật bằng tài khoản test trên database thử. Lần sửa hook cuối chỉ thêm kiểm tra cho nhánh không có người dùng, nên không ảnh hưởng đường có người dùng; nhánh đó được phủ bằng test tích hợp ở r3, **chưa bấm lại trên giao diện sau lần sửa cuối**.

## 4. Migration

- **Tên:** `20261105_085002_home_banners.ts` (+ `.json` snapshot). SHA-256 `92e833a903647237ffa943f6ab23603db7dd72dafa3eac75a33234f685b215b7`.
- **Số lượng (đếm từ chính file):** **282 câu lệnh** = **60 enum** (`CREATE TYPE`) + **182 `ALTER TABLE`** (**142 cột** + **40 khóa ngoại**) + **40 index**. Test `sql-guard` ghim đúng 282.
- **142 cột** = 140 cột banner (như báo cáo trước) + 2 cột `jsonb` `banner_approvals` (`home_page`) và `version_banner_approvals` (`_home_page_v`). Phân bổ theo bảng như `home-banners-cms-2026-11-05.md` §1.4, cộng thêm hai cột `jsonb` ở hai bảng chính.
- **Chỉ mở rộng:** không `DROP`/`UPDATE`/`DELETE`/`RENAME`/`NOT NULL` trong `up`.
- **Migration cũ `20261105_075648_home_banners` đã được rút:** `grep 075648` trong `src`, `deploy`, `tests`, `scripts` không còn kết quả; không còn trong `src/migrations/index.ts` và `deploy/migrations.approved.json`; hai file cũ đã xóa. Nó chưa từng chạy trên `drphynex`.
- **Fingerprint trong `deploy/migrations.approved.json`** (dòng cho `20261105_085002_home_banners.ts`): **ĐỀ XUẤT, CHỜ REVIEW, chưa được duyệt**. Unit test của repo cần dòng này, nhưng điều đó không có nghĩa migration đã được duyệt.
- **Database làm việc `drphynex`:** không bị đụng tới; không chạy migration.

## 5. Media 500: lỗi có sẵn của baseline

- **Kết luận:** lỗi có trước, **không phải hồi quy** của tính năng banner; nên lập finding riêng. Tôi không sửa Media.
- **Đối chứng:** commit nền `29cd44f` và bản tính năng, mỗi bên chạy trên database riêng có marker (`drphynex_media500_base_test`, `drphynex_media500_feat_test`), cùng fixture (2 ảnh), cùng request khách không cookie, mỗi request 3 lần.
- **Kết quả giống hệt:** `/api/media?where[alt][like]=TEST&depth=0` → **500** `Something went wrong.`; kèm `locale=ko` → 200 (1 ảnh); `locale=en` → 200 (0); `locale=all` → 200 (1).
- **Nguyên nhân gốc:** chưa xác định, và log server không có stack trace. Chỉ biết điều kiện tái hiện: lọc `like` trên trường `alt` có `localized: true` mà không chỉ định `locale`.
- Bằng chứng: `brand-assets/screenshots/home-banners-cms-2026-11-05-r2/media500/`.

## 6. Dữ liệu và bằng chứng giữ nguyên

- Giữ nguyên: bằng chứng cũ `home-banners-cms-2026-11-05/` (r1) và `-r2/`; các database sao chép `drphynex_banner_evidence_r1` và `_r2` (trạng thái Admin thật); các database `drphynex_media500_*_test`; worktree baseline `website-demo-baseline-29cd44f`.
- **Database thử `drphynex_independent_review_test` đã bị bộ integration reset ở r3** (nằm trong thiết kế của bộ test, không có server nào đang phục vụ nó); bản lưu trạng thái Admin nằm ở `_r2`.
- Manifest nguồn r3: `docs/home-banners-manifest-r3-2026-11-05.md` và `.sha256`.

## 7. Chưa xác minh

- Chưa chạy migration trên bất kỳ database làm việc nào; còn blocker atomic state, volume anchor, role/marker của `drphynex`.
- Chưa bấm lại luồng Admin sau lần sửa hook cuối (xem mục 3).
- Chưa thử với ảnh/packshot thật; chưa kiểm tra bản staff-preview EN/VI với dữ liệu thật; chưa kiểm tra "Xuất bản" bằng giao diện trên môi trường có CDN/S3.
- Không có lượt integration nào chạy trên đúng nguồn cuối ngoài r3; không có lượt chạy trên Windows với `drphynex` thật.
- Nguyên nhân gốc của Media 500 chưa xác định.
