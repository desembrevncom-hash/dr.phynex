# Bàn giao: UX/UI Admin tiếng Việt (màn hình banner + dashboard) — vòng hoàn thiện

Nhánh `admin-ux-vi`, worktree `C:\Users\THAI\Websites\website-demo-admin-ux`, từ `b7fd2cd`. **Chưa commit, chưa merge, không migration, không đụng production cổng 3000 và DB `drphynex`.**
Diff đầy đủ (gồm `src/payload-types.ts`): `admin-ux.diff` (SHA-256 `342a1667…dd62`). Ảnh: `images/`.

## 1–2. Ràng buộc bản đã xem + chặn đồng thời phía server
- **Dấu bản lưu `_save`**: `updatedAt` của global *không đổi* khi lưu nháp (phát hiện khi viết test), nên mỗi lần ghi Home Page, `guardHomeBannerApproval` ghi một `_save` ngẫu nhiên vào JSON `bannerApprovals` (đã có sẵn, không đổi schema; `readApprovals` bỏ qua).
- `approvalState` (trường ảo) trả `basis` (hash nội dung localized của ngôn ngữ + cấu hình chung + trường không localize, **không** gồm timestamp/approvals/trường ảo) kèm `docSave` = `_save` của chính bản nháp đã dùng để tính.
- **Panel** (`src/lib/approval-view.ts`, hàm thuần có unit test): chỉ tin `basis` khi `docSave` trùng `_save` của tài liệu mà form đang hiển thị (lấy từ `useDocumentInfo().data`). Basis mới từ server không bao giờ được ghép với nội dung form cũ; nếu lệch → khóa nút, báo tiếng Việt ("không khớp bản đã lưu… tải lại") và có nút "Tải bản mới nhất". Sau lưu/duyệt panel đọc lại trạng thái rồi so khớp lại; trong lúc đó nút khóa.
- **Nguyên tử phía server**: mọi lần ghi Home Page lấy `pg_advisory_xact_lock` (trong transaction của request) ngay đầu `guardHomeBannerApproval`; lần duyệt đọc lại bản nháp **trong cùng transaction sau khi đã giữ khóa**, so `basis`, rồi ghi approval, khóa nhả khi commit. Lưu của phiên khác hoặc đã commit trước (basis lệch → 409) hoặc chờ khóa và áp dụng sau (nội dung đổi nên tự đặt lại duyệt). Không còn khoảng hở đọc-rồi-ghi hai bước. ACL, workflow từng locale, bản công khai giữ nguyên.
- Giới hạn còn lại: khóa là toàn Home Page (mọi locale ghi tuần tự, chấp nhận vì ghi ít); cơ chế `lost update` có sẵn của Payload với bản `originalDoc` đọc trước khóa của chính người lưu (không thuộc phạm vi duyệt) không đổi.

## 3. Regression (đồng bộ bằng điều kiện DB, không sleep)
`tests/int/home-banners-basis.int.spec.ts` (12 test) gồm: A xem cũ, B lưu, A duyệt → từ chối; **B lưu giữa kiểm tra và ghi của A**: dùng seam `context.afterApprovalCheck` (chỉ Local API), B khởi chạy rồi test đợi tới khi `pg_locks` báo B đang chờ khóa (vòng lặp có điều kiện, hạn 20 s) — xác nhận B bị giữ, A commit, B áp dụng sau, kết quả cuối **không duyệt nhầm** nội dung của B; `docSave` ghép đúng bản lưu và đổi sau mỗi lần lưu; luồng một người sửa→lưu→xem→duyệt; REST header; dịch giả; không tự xuất bản. `tests/unit/approval-view.spec.ts`: panel không nhận basis mới khi nội dung hiển thị còn cũ.

## 4. Nghiệm thu UI (Chrome headless qua DevTools, bản build production cổng 3021, DB thử)
`scripts/admin-ux-accept.mjs` — **ALL PASS** (bàn phím thật Tab/Shift+Tab/Enter/Space):
- Enter mở tab Banner; nút accordion có tên riêng ("Mở hoặc đóng Banner N …", trước đây cả 5 nút cùng tên "Bật/tắt block"); Space mở slot 2, Enter mở/đóng slot 3; Tab/Shift+Tab đúng thứ tự.
- Bộ chuyển ngôn ngữ: Enter mở menu, Enter chọn English → `?locale=en`.
- Gõ → nút duyệt khóa; Enter ở "Lưu bản nháp" → nút bật lại; Space ở nút duyệt → "Đã duyệt cấu hình cho tiếng Việt. Chưa xuất bản."
- **Hai phiên thật** (hai Chrome riêng, editor A và admin B): A xem, B lưu, A bấm duyệt → bị từ chối bằng tiếng Việt, ngôn ngữ Việt ở trạng thái "Chưa duyệt"; A tải lại thấy chữ của B và duyệt được bản đó.
- Ảnh: `accept-slot2-open.png` (slot 2 thực sự mở, có ảnh thu nhỏ), `accept-two-sessions-conflict.png`, `accept-keyboard-approved.png`; ảnh trước/sau `before-*`/`after-*` (editor, 1440/768/390), dashboard, dịch giả. Ảnh `…slot2-open` cũ (không mở slot) **đã xóa**; nhãn đúng là `accept-slot2-open.png`.
- Nhãn chuẩn hóa: "claims" → **"Tuyên bố công dụng"** (nhãn trường, tab, đơn số, mô tả). Sửa thêm: chú thích ảnh còn trích nhãn tiếng Anh cũ "Cleared for publication" → "Đã duyệt cho phép công khai".
- **Tài khoản seed**: `scripts/seed-admin-demo.ts` giờ sinh mật khẩu **ngẫu nhiên mỗi lần chạy**, chỉ ghi vào file tạm của hệ điều hành (ngoài repo, `drphynex-admin-ux-fixture.json`) và chỉ tồn tại trong DB thử có marker; diff không chứa mật khẩu/secret (đã grep). Không phải tài khoản thật.

## 5. Kiểm tra đã chạy (nguồn cuối)
Unit 596/596; tích hợp 117/117 (11 file, gồm chống lệch schema `storage.int.spec.ts`); `tsc` và `eslint` sạch; `next build --webpack` thành công (build cuối không báo "Compiled with warnings"; bản trước và bản b7fd2cd từng có 1 cảnh báo chưa xác định). Build lại sau mọi thay đổi runtime (`SlotLabel`, chú thích ảnh).

## Fingerprint nguồn (ngoài thư mục băm: `C:\Users\THAI\Websites\drphynex-admin-ux-evidence\`)
Manifest SHA-256 từng tệp (tracked + untracked không bị ignore, bỏ `docs/admin-ux-review/`, CRLF→LF):
- Trước nghiệm thu UI: `manifest.before-acceptance.txt` — 297 tệp — hash `b6d5e2ce…3e63`
- Sau nghiệm thu (nguồn cuối): `manifest.after-acceptance.txt` — 298 tệp — hash `a6eb3058…8faa`
- Khác biệt giữa hai mốc (do lỗi tìm thấy khi nghiệm thu): thêm `scripts/admin-ux-accept.mjs`; sửa `scripts/admin-ux-shots.mjs`, `src/components/admin/SlotLabel.tsx` (tên/aria-expanded cho nút accordion), `src/globals/homeBanners.ts` (chú thích ảnh), `tests/unit/admin-vi.spec.ts`.
Evidence cũ (vòng trước, `docs/admin-ux-review` bản đầu và logs) giữ nguyên; kết quả này ghi riêng ở đây.

## `payload-types.ts` (sinh lại bằng `generate:types`)
Chỉ có 3 loại thay đổi, không cột DB nào mới: (1) chú thích mô tả chuyển sang tiếng Việt; (2) thêm `approvalState` (trường ảo, không lưu); (3) **đổi thứ tự thành viên** trong 5 kiểu `banners.<slot>` vì khai báo trường được sắp lại theo nhóm giao diện (thứ tự upload giữ nguyên để tên index không đổi). Migration snapshot không đổi, test drift xanh.

## Hạn chế còn lại
- Thuật ngữ tự dịch cần chủ sản phẩm xác nhận.
- Nút gửi của form đăng nhập Payload không có nhãn chữ (Payload gốc, chưa xử lý).
- "Việc cần duyệt toàn website" trên dashboard vẫn là trạng thái trống (chưa nối dữ liệu).
- Menu ngôn ngữ nội dung vẫn có "Sao chép sang ngôn ngữ" / "Xuất bản trong …" của Payload (hành vi gốc, ACL/guard server vẫn áp dụng).

## Tái lập
`node_modules/.bin/tsx scripts/seed-admin-demo.ts` → `npm run build` → `next start -H 127.0.0.1 -p 3021` → `node scripts/admin-ux-accept.mjs 3021`. Chỉ chạy được trên DB thử có marker.
