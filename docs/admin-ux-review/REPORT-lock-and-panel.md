# Vòng sửa: khóa trước lần đọc quyết định + panel đổi locale

Bổ sung cho `HANDOVER.md` (vòng trước giữ nguyên). Nhánh `admin-ux-vi`, từ `b7fd2cd`, **chưa commit/merge, không migration, không publish, không đụng cổng 3000 và DB `drphynex`** (chỉ DB thử có marker).
Diff đầy đủ gồm `src/payload-types.ts`: `admin-ux.diff` (SHA-256 `4dbd2ea3…37d3`). `payload-types.ts` không đổi so với vòng trước (chỉ `approvalState`, đổi thứ tự thành viên slot, chú thích tiếng Việt).

> Quy ước: **[MÃ]** = lỗi xác nhận bằng đọc mã Payload/mã dự án. **[TÁI HIỆN]** = hậu quả đã chạy được trên DB hoặc trình duyệt. Hai loại không gộp; chỗ không tái hiện được ghi rõ.

## 1. Khóa trước lần đọc quyết định
**Lifecycle thực tế** (`payload/dist/globals/operations/update.js`): `initTransaction` → `beforeOperation` → access → `getLatestGlobalVersion` (đọc quyết định) → `afterRead` (= `originalDoc`) → `beforeValidate` → `beforeChange` (guardGlobalPublishing, guardHomeBannerApproval) → ghi → commit/rollback.
- **[MÃ]** Vòng trước khóa nằm trong `guardHomeBannerApproval` (beforeChange), tức **sau** khi `originalDoc` và `bannerApprovals` đã đọc. Lần duyệt đọc lại bản mới trong transaction nên chặn được duyệt bản cũ, nhưng nhánh "đã có approval" và các phép so `before/after`, `previous.bannerApprovals` dùng `originalDoc` đọc trước khóa.
- **Sửa**: hook đầu tiên `lockAndCaptureHomePage` (`beforeOperation`, chỉ `update`) lấy `pg_advisory_xact_lock` **sau khi transaction đã mở và trước mọi lần đọc**; mọi đường ghi Home Page (Admin, REST, Local API, publish, duyệt) đi qua đúng operation này nên dùng cùng khóa. `guardHomeBannerApproval` **không còn tự khóa** mà từ chối chạy (lỗi 500, fail closed) nếu thiếu khóa của chính transaction đó. `originalDoc`, approvals đã lưu và kiểm tra basis giờ cùng mô tả một trạng thái đã commit. Không dùng `originalDoc` đọc trước khóa.
- Giới hạn: các beforeOperation khác đứng trước (`blockGlobalRestore`, `publishOnlyRequestedGlobalLocale`) không đọc DB (đã đọc mã). Ghi trực tiếp bằng `payload.db` (migration/script) không đi qua operation nên ngoài phạm vi.

**Regression PostgreSQL** `tests/int/home-banners-order.int.spec.ts` (6 test, hai transaction thật). Đồng bộ xác định: seam `afterHomePageLock` (chỉ Local API) chạy khi writer 1 đang giữ khóa, chưa đọc gì; nó khởi chạy writer 2 rồi **chờ điều kiện DB** (`pg_locks` có writer chưa được cấp khóa, hạn 20 s). Không dùng sleep.
- Nội dung trước, duyệt sau → duyệt bản cũ bị 409, không còn approval, trạng thái "Đang xem xét".
- Duyệt trước, nội dung sau → bản nội dung mới không giữ approval của bản cũ.
- **Nhánh đã có approval**: đang approved, writer 1 đổi cấu hình dùng chung, writer 2 "lưu lại approved" không cần basis → bị từ chối, approvals rỗng.
- Rollback sau lần kiểm tra (throw trước khi ghi) → khóa nhả, không approval, writer kế tiếp chạy bình thường; writer lỗi ngay sau khi lấy khóa → rollback, không lưu gì, khóa nhả; commit nhả khóa sau mọi loại ghi (`pg_locks` advisory = 0).
- **Thử đột biến** (tạm đưa khóa về vị trí cũ trong guard): 3 test đồng bộ hỏng vì writer 2 không bao giờ xếp hàng ("timed out waiting for second writer queued"). Tức test phân biệt được vị trí khóa. **Không tái hiện được** hậu quả sai dữ liệu cuối cùng của thiết kế cũ trên DB; bằng chứng cho lỗi cũ là **[MÃ]** cộng đột biến này. Đã hoàn nguyên (grep `MUTATION` = 0).

## 2. Panel đổi locale
- **[MÃ]** Bản cũ: `setRefreshing(false)` ở `finally` của *mọi* request (response cũ tắt trạng thái chờ của request mới); `fresh` không gắn locale/thế hệ; trạng thái đã tải của locale cũ vẫn dùng được; thông báo không gắn locale.
- **Sửa**: `ApprovalState` mang `locale`; `ApprovalRefresher` (`src/lib/approval-refresh.ts`, thuần, có `AbortController`) gán *thế hệ* + locale cho mỗi request, chỉ request mới nhất của locale hiện tại được ghi kết quả hoặc tắt trạng thái chờ, request cũ bị hủy/bỏ qua. `selectApprovalState`: đang chờ, lỗi, hoặc dữ liệu của locale khác → không có trạng thái (nút khóa). `buildApprovalRequest`: nhãn nút, URL, basis cùng lấy từ một state của đúng locale, trả `null` nếu lệch. Thông báo chỉ hiện cho locale gắn với nó. Refresh lỗi → nút "Thử đọc lại trạng thái".
- **Regression** `tests/unit/approval-refresh.spec.ts` (+`approval-view.spec.ts`), dùng promise/thế hệ điều khiển tay: KO→EN với KO về sau; KO về trước EN; KO→EN→KO với response đảo thứ tự; đổi locale khi đang refresh (response cũ không tắt trạng thái chờ); refresh lỗi rồi đọc lại; state mang locale khác bị bỏ; nhãn/URL/basis đúng locale.
- **[TÁI HIỆN] trên trình duyệt**: đổi locale trong Payload là **điều hướng đầy đủ** (nút DOM của panel và biến `window` không còn sau khi đổi), nên race đổi locale giữa chừng **không thể xảy ra trên giao diện hiện tại**; bản sửa là phòng thủ lớp thứ hai và được chứng minh bằng test đơn vị, không phải bằng trình duyệt. Trình duyệt đã kiểm: KO→VI→KO nhanh (VI chậm 4 s) rồi duyệt → POST đúng `locale=ko` và đúng basis KO, thông báo nêu tiếng Hàn; **refresh sau lưu thất bại** (mọi lần đọc lỗi) → khóa duyệt + nút thử lại, bật mạng rồi thử lại → nút duyệt đúng nhãn; hai phiên (A xem, B lưu, A duyệt → từ chối tiếng Việt; tải lại thì duyệt được).

## 3. Bằng chứng nguồn cuối (evidence cũ giữ nguyên; mới ở `C:\Users\THAI\Websites\drphynex-admin-ux-evidence\`)
- **Fingerprint trước chuỗi chính** (`chain2`): `manifest.chain2-before` hash `2f660f42…92cf`, 301 tệp. **Sau**: giống hệt (`SOURCE UNCHANGED`). Mỗi bước có log gốc + lệnh + exit code (`chain2/*.log`, `steps.tsv`):
  typecheck 0 · eslint 0 · unit **607/607** · tích hợp **123/123** (12 file, gồm chống lệch schema) · `npm run build` 0 (không cảnh báo) · seed → **exit 1** (tiến trình seed đã in "Seed finished" nhưng **không thoát**, tôi kill tay; DB đã commit) · browser 0 nhưng có **2 FAIL do kịch bản nghiệm thu** (lọc nhầm POST `/api/media` của Payload; bơm lỗi bị request khác tiêu thụ).
- **Nguồn đã đổi sau chuỗi chính** (chỉ `scripts/`): sửa hai lỗi kịch bản trên, `seed-admin-demo.ts` thêm `process.exit(0)` sau khi xong, kịch bản accept thoát mã 1 khi có FAIL, đổi kịch bản "refresh lỗi" sang đúng tình huống thực (sau lưu, mọi lần đọc lỗi). Mã runtime/test không đổi (so manifest: chỉ khác dòng `scripts/`; `chain3`, `chain4`, `chain5/non-scripts-diff-vs-chain2.txt`).
- Chạy lại phần bị ảnh hưởng: `chain3` (còn FAIL kịch bản refresh lỗi, vì đổi locale là điều hướng đầy đủ), `chain4` (kịch bản refresh lỗi chập chờn vì panel đọc hai lần sau lưu, lần đọc thứ hai thành công), rồi sửa kịch bản. **`chain5` chạy hai lần liên tiếp: ALL PASS, exit 0**, typecheck 0, eslint 0, seed exit 0. Fingerprint nguồn cuối `42680f64…d658`, 301 tệp, trước = sau.
- Giữ nguyên `chain3`/`chain4` (có FAIL) như bằng chứng đường đi, không xóa.

## Còn lại / giới hạn
- **Test `pg_locks` cần môi trường thử độc quyền**: điều kiện chờ đếm mọi advisory lock trên cả máy chủ PostgreSQL (không lọc theo khóa hay database). Nếu tiến trình khác giữ/chờ advisory lock cùng lúc, điều kiện có thể sai. Chưa đổi logic test ở lượt này (việc tiếp theo: lọc theo khóa và database).
- Comment hook khóa đã sửa: hook không phải hook `beforeOperation` đầu tiên; `blockGlobalRestore` và `publishOnlyRequestedGlobalLocale` chạy trước nhưng không đọc DB, nên khóa vẫn lấy trước lần đọc latest version.
- Khóa là toàn Home Page nên mọi locale ghi tuần tự (chấp nhận được).
- Tiến trình `seed-admin-demo.ts` từng không thoát khi chạy qua chuỗi lệnh; đã thêm thoát tường minh nhưng chưa tìm ra handle nào giữ tiến trình.
- Thuật ngữ dịch cần chủ sản phẩm xác nhận; nút gửi form đăng nhập Payload thiếu nhãn chữ; dashboard "Việc cần duyệt toàn website" vẫn là trạng thái trống.
