# Bàn giao: 4 trang sản phẩm + mua qua tư vấn — 06/11/2026

Nhánh `products-contact` (worktree `C:\Users\THAI\Websites\website-demo-products`), tạo từ `3fddb54` (Admin UX đã chốt). Chưa merge, push, publish, migration; production `localhost:3000` vẫn chạy `3fddb54`; database thật `drphynex` chỉ được đọc (transaction READ ONLY); WIP ở checkout chính giữ nguyên.

| Commit | Nội dung |
|---|---|
| `c56e532` | Khảo sát (`SURVEY.md`) + script seed dữ liệu thử `scripts/seed-product-review.ts` |
| `13259a8` | Liên hệ: giữ sản phẩm quan tâm, chặn lưu trùng, test |
| `f8e535e` | Trang sản phẩm: CTA mua qua tư vấn, loại sản phẩm, ghi chú duyệt cho nhân viên |
| `a185935` | Biên bản bàn giao |
| `8b04aff` | Sửa (phát hiện khi chuẩn bị review): đổi ngôn ngữ trên Liên hệ giữ sản phẩm; chống trùng chỉ khi mọi trường trùng |
| (commit này) | Bảng quyết định `DECISIONS-M1-M8.md`, cập nhật biên bản |

## Đã hoàn tất

| Hạng mục | Kết quả |
|---|---|
| Khảo sát 4 sản phẩm, đối chiếu CMS / trang khách / preview | `SURVEY.md`: bảng hiện trạng, 6 lỗi thực tế, 8 mâu thuẫn M1–M8 |
| CTA nhất quán | Khối "Mua qua tư vấn" trên mọi trang sản phẩm: nút chính "Yêu cầu tư vấn" → `/contact?product=<slug>`, nút phụ "Tìm điểm bán". Không giá, không giỏ hàng/thanh toán/vận chuyển |
| Giữ sản phẩm khi sang liên hệ | Form hiện "Sản phẩm quan tâm: <tên>" + "Bỏ chọn sản phẩm"; chủ đề chọn sẵn "Sản phẩm". Khách chỉ thấy sản phẩm đã xuất bản + duyệt (tên bản nháp không lộ) |
| Lưu trong CMS | Bản ghi `contact-submissions` mở đầu bằng "Sản phẩm quan tâm: <tên> (/products/<slug>)", nội dung khách giữ nguyên bên dưới. **Không thêm schema** |
| Chống gửi trùng | Nút khoá khi đang gửi (đã có) + server không lưu lại khi **mọi trường đã chuẩn hoá** (họ tên, email, điện thoại, chủ đề, ngôn ngữ, nội dung gồm dòng sản phẩm) trùng trong 10 phút; cùng nội dung gửi từ trang ngôn ngữ khác = yêu cầu riêng. Ngôn ngữ thiếu hoặc không thuộc ko/en/vi = lỗi validation, không ghi (vẫn báo thành công, không đếm lead lần hai). Sửa tên/số điện thoại rồi gửi lại = yêu cầu mới, được lưu. Giới hạn tần suất sẵn có (5 lần/10 phút/IP) vẫn hoạt động |
| Đổi ngôn ngữ | Trên trang Liên hệ, bộ chuyển ngôn ngữ giữ `?product=` (chỉ khi sản phẩm đã hiện được ở trang này); trang ngôn ngữ kia kiểm tra lại quyền |
| Trường bắt buộc, báo lỗi, thành công | Đã có; kiểm lại trên trình duyệt: gửi rỗng → thông báo được focus, 4 trường đánh dấu lỗi, sản phẩm vẫn giữ; gửi đúng → thông báo thành công được focus |
| Thông tin sản phẩm | "Quy cách" (lấy từ CMS), "Loại sản phẩm" chỉ khi CMS có gán danh mục (hiện chưa có → preview đánh dấu CHỜ CUNG CẤP). Công dụng chỉ hiện claim có tài liệu nguồn như trước |
| Đánh dấu bản dịch chưa duyệt | Preview của nhân viên có khối "Ghi chú duyệt": trạng thái bản ngôn ngữ đang xem (Bản nháp AI / Đang chờ duyệt / Đã duyệt), nháp hay đã xuất bản, số ảnh chưa được phép công khai, ghi chú biên tập (nguồn, CẦN XÁC NHẬN). Khách không bao giờ thấy |
| Ảnh | Giữ gallery `object-contain` theo tỷ lệ bao bì. Không ảnh nào đã được phép công khai → khách sẽ thấy khung trống khi sản phẩm được xuất bản (xem quyết định bên dưới) |
| Kênh liên hệ | Không thêm kênh nào: Site settings chưa có email/điện thoại đã xác minh, trang Liên hệ vẫn chỉ đánh dấu CHỜ CUNG CẤP trong preview |
| Email | Không gửi email cho khách. Email nội bộ chỉ gửi khi cấu hình `FORM_NOTIFY_TO` + SMTP (môi trường thử không có → không gửi) |

Không thiết kế lại banner, header hay Admin. ACL, bảo vệ media private, workflow duyệt và phân tách nháp/công khai không đổi (có test).

## Cần bạn quyết định

1. **M1–M8 trong `DECISIONS-M1-M8.md`** (quy cách Balm 40 mL vs 50 g, màu Balm/Sheet, thành phần nổi bật FORMA, chức năng LUMA, PDRN vs Sodium DNA, tên "Tế bào gốc…", % trong brief, mô tả Balm "da bị kích ứng").
2. Loại sản phẩm chính thức của từng mã; có tạo danh mục trong CMS không (không cần schema mới).
3. Ảnh được phép công khai cho từng sản phẩm (hiện cả 4 đều "Preview only").
4. Kênh liên hệ chính thức + địa chỉ nhận thông báo nội bộ.
5. ~~Trường riêng cho sản phẩm quan tâm~~: **đã quyết (06/11)**: giữ dòng đầu tin nhắn, không schema/migration trong đợt này.
6. Chữ giao diện mới KO/EN/VI ("Mua qua tư vấn", "Yêu cầu tư vấn", "Sản phẩm quan tâm", "Quy cách"…) do tôi viết, cần người bản ngữ duyệt cùng bản dịch.
7. Duyệt + xuất bản 4 sản phẩm (đến lúc đó khách bấm header/slider vẫn gặp 404).

## Kiểm tra (log gốc trong `C:\Users\THAI\Websites\drphynex-products-review-evidence\`)

- Lần chạy cuối trên `8b04aff` (thư mục `review/`): `01-typecheck` exit 0 · `02-eslint` (toàn repo) exit 0 · `03-unit` 626/626 · `04-integration` 137/137 (gồm `contact-interest.int.spec.ts` 8 test) · `05-build` exit 0 · `07-flow.log` ALL PASS (18 bước, thêm: đổi ngôn ngữ trên Liên hệ giữ sản phẩm; sản phẩm nháp không xuất hiện trong HTML/link). Lần chạy trước trên `f8e535e`: `10–13`, `02-build`, `04-flow.log`.
- Luồng trình duyệt headless thật trên 3021:
  - Khách (390 px): danh sách → sản phẩm mẫu → CTA đúng thứ tự → liên hệ giữ sản phẩm → gửi rỗng báo lỗi → bấm gửi 3 lần + gửi lại → 1 bản ghi; sản phẩm nháp: trang 404, không hiện ở form.
  - Nhân viên (1440 px, preview): trang chủ → header MX-01 FORMA → ghi chú duyệt đúng (VI AI-draft, nháp, 1 ảnh private) → Enter trên CTA → liên hệ giữ sản phẩm nháp → gửi thành công → đổi ngôn ngữ giữ đường dẫn sản phẩm → Admin hộp thư thấy 2 yêu cầu.
  - `06-stored-submissions.txt`: đúng 2 bản ghi, có dòng sản phẩm quan tâm.
- Ảnh trước/sau ở 390/768/1440 px: `shots/before/`, `shots/after/` (preview, 4 sản phẩm VI + KO FORMA + EN Balm + Liên hệ), `shots/after-guest/`, `shots/flow/`. Không trang nào tràn ngang, mỗi trang một h1.
- DB thật: snapshot READ ONLY trước/sau bằng nhau; 3000 vẫn là tiến trình cũ.

## Xem thử

`http://localhost:3021` chạy đúng `f8e535e` trên database thử có marker (`drphynex_independent_review_test`): 4 sản phẩm nạp từ bản chép bao bì (nháp, VI = AI draft như dữ liệu thật) + 1 sản phẩm "[MẪU]" đã xuất bản để thử đường khách. Tài khoản thử `review-admin@test.local`; mật khẩu ngẫu nhiên, lấy bằng:

```powershell
(Get-Content "$env:TEMP\drphynex-products-review-fixture.json" | ConvertFrom-Json).admin.password
```

Dùng cửa sổ ẩn danh (cookie localhost dùng chung giữa các cổng: đăng nhập 3021 sẽ đăng xuất 3000 trong cùng trình duyệt). Sau khi đăng nhập Admin, mở `http://localhost:3021/preview?path=/vi` để xem nháp.

## Giới hạn còn lại

- Chặn trùng chỉ áp dụng cho các lần gửi nối tiếp (bấm nhiều lần, gửi lại); **hai request đồng thời** (hai tab bấm gửi cùng một thời điểm) có thể cùng không thấy bản kia và tạo hai bản ghi. Muốn chặn tuyệt đối cần ràng buộc ở database (schema), đã quyết không làm trong đợt này.
- Giới hạn tần suất được kiểm trước bước chống trùng, nên các lần bấm lặp vẫn tính vào hạn mức 5 lần/10 phút/IP. Yêu cầu bị giới hạn không được lưu, nhưng form giữ nguyên dữ liệu và báo lỗi rõ để khách gửi lại sau.
- Chưa kiểm bằng trình đọc màn hình thật; đã kiểm focus/aria bằng script.
- Commit `13259a8` riêng lẻ chưa được build/test độc lập; toàn bộ kiểm tra chạy trên `f8e535e` và lại trên `8b04aff`.
