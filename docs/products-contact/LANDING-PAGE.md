# Bộ dựng landing page sản phẩm (Payload + Next.js) — 09/11/2026

Nhánh `products-contact`. Đã dựng mẫu **MX-02 LUMA** trên bản xem thử `localhost:3021` (DB thử `drphynex_independent_review_test`). FORMA, BALM và SHEET **chưa** được cấu hình: chúng vẫn hiển thị bố cục hiện tại cho tới khi mẫu được duyệt. Không đụng DB thật hay cổng 3000; không xuất bản nội dung thật.

## 1. Dữ liệu

### Dùng lại trường có sẵn (nhập một lần)

Landing page đọc trực tiếp từ sản phẩm: tên, dòng sản phẩm, dung tích/quy cách, ảnh sản phẩm, mô tả ngắn, thành phần chính, INCI, cách dùng, lưu ý, màu nhấn và đường dẫn. URL sản phẩm giữ nguyên `/<locale>/products/<slug>`.

### Trường mới: tab "Landing page" → `landing` (blocks)

| Khối | Field (★ = theo ngôn ngữ; còn lại dùng chung) | Hiện với khách khi |
|---|---|---|
| Hero sản phẩm | ★câu giới thiệu, ★đoạn mở đầu (trống → mô tả ngắn), ảnh (trống → ảnh sản phẩm), hiện quy cách, ★nhãn nút tư vấn, kiểu nền | luôn hiện (thiếu gì thì dùng trường của sản phẩm) |
| Dải ảnh lớn | ảnh máy tính, ảnh điện thoại (tuỳ chọn), ★alt, ★chú thích, kiểu nền | có ảnh **được phép công khai** |
| Ảnh + nội dung | ảnh, vị trí ảnh trái/phải, ★tiêu đề, ★đoạn mô tả, kiểu nền | có ảnh công khai và tiêu đề hoặc đoạn mô tả |
| Lưới điểm nổi bật | ★tiêu đề khối, danh sách thẻ (★tiêu đề, ★mô tả), kiểu nền | ≥ 1 thẻ có tiêu đề ở ngôn ngữ đang xem; chỉ nhập công dụng đã duyệt có nguồn |
| Thành phần nổi bật | ★tiêu đề khối, danh sách (liên kết thành phần tuỳ chọn, ★tên, ★mô tả, ảnh, ghi chú nguồn **nội bộ**); trống → dùng "Thành phần chính" của sản phẩm | ≥ 1 thành phần có tên |
| Chi tiết sản phẩm | ★tiêu đề khối, bật/tắt quy cách · INCI · cách dùng · lưu ý (đọc từ trường có sẵn) | có ít nhất một mục có dữ liệu |
| Câu hỏi thường gặp | ★tiêu đề khối, danh sách (★câu hỏi, ★câu trả lời) | ≥ 1 câu có cả hỏi và đáp |
| CTA cuối trang | ★tiêu đề, ★đoạn mô tả, ★nhãn nút | luôn hiện; nút mở form tư vấn kèm sản phẩm |

- Mỗi khối có thêm "Ẩn khối này" và "Kiểu nền" (Sáng, Sáng xám, Tối, Màu nhấn của sản phẩm).
- **Dùng chung cho KO/EN/VI:** khối nào có, thứ tự, ẩn/hiện, kiểu nền, ảnh, vị trí ảnh, các công tắc.
- **Riêng theo ngôn ngữ:** mọi chữ (★).
- Khối thiếu nội dung bị **ẩn gọn với khách**. Trong xem trước staff, khối đó vẫn hiện kèm dấu "[Xem trước] Khách chưa thấy khối này: thiếu …". Ảnh chưa công khai chỉ hiện trong xem trước, kèm dấu.
- Sản phẩm **không có khối nào đang hiện** thì giữ **bố cục hiện tại**.
- Trang landing luôn có đúng một h1: lấy từ hero, hoặc một tiêu đề gọn nếu không có hero.

### Quyền và duyệt

- **Biên dịch viên** sửa được chữ trong khối. Họ **không** thêm, xoá hay sắp xếp khối được: server trả lỗi 403. Các field dùng chung (ẩn, ảnh, kiểu nền, bố cục) là field chỉ biên tập viên ghi được, nên giá trị biên dịch viên gửi lên bị bỏ qua.
- **Mọi thay đổi trong landing** (chữ hoặc cấu trúc) là thay đổi nội dung của **ngôn ngữ đang lưu**. Ngôn ngữ đó về "Đang xem xét", phải lưu nháp, duyệt ở một lần lưu riêng, rồi mới xuất bản (`guardPublishing` đã được mở rộng cho trường blocks). Xuất bản lại với dữ liệu landing không đổi thì không bị chặn nhầm.
- Khách chỉ nhận bản đã xuất bản và đã duyệt của đúng ngôn ngữ. Ảnh private không bao giờ được trả cho khách: chỉ có id, không có file.

### ⚠ Cần bạn quyết định: thay đổi cấu trúc ảnh hưởng mọi ngôn ngữ

Payload xuất bản theo ngôn ngữ, nhưng **trường dùng chung đi theo bản nháp**. Đã thử trên DB thử (`landing/10-sample-publish-vi.log`, `11-cases.log`):
- Thêm landing cho sản phẩm mẫu, duyệt và xuất bản **chỉ VI**.
- Kết quả: trang khách **KO cũng chuyển sang bố cục landing**, dù KO không được duyệt lại. Chữ KO còn trống nên được ẩn gọn, nhưng cấu trúc đã thay đổi.

Đề xuất: áp dụng đúng quy tắc mà banner trang chủ đang dùng:
- Thay đổi cấu trúc dùng chung phải lưu nháp, và **xoá duyệt của mọi ngôn ngữ**.
- Xuất bản một ngôn ngữ chỉ được phép khi **mọi ngôn ngữ đang công khai** bị ảnh hưởng cũng đã được duyệt lại.

Quy tắc này chưa được triển khai trong đợt này; cần bạn đồng ý.

## 2. Migration (ĐỀ XUẤT, chưa duyệt)

- File `src/migrations/20261107_050810_landing_blocks.ts`, SHA-256 `1d36f01a798c0edcfbe58b484517b104142362cd069c990fcde5ca6eb7ba0b30`, đã ghi vào `deploy/migrations.proposed.json`.
- `deploy/migrations.approved.json` **không đổi**, nên executor có kiểm soát **từ chối** chạy cho tới khi reviewer chuyển entry sang danh sách đã duyệt (có test).
- **Chỉ thêm mới**, gồm 234 lệnh:
  - 44 bảng `lp_*` (bản chính) và `_lp_*_v` (phiên bản), kèm bảng `_locales`;
  - enum, index, khoá ngoại trỏ tới `products`, `_products_v`, `media`, `ingredients`;
  - **không có** ALTER, DROP hay UPDATE nào trên bảng hiện có (có test kiểm từng lệnh).
  - Tên định danh dài nhất là 50 ký tự.
  - `down()` xoá đúng các bảng và enum mới.
- **Bảo toàn dữ liệu cũ** (đã chạy trên DB thử, `landing/02-counts-before.txt` và `04-counts-after.txt`): số dòng của products, phiên bản, locales, rels, media, cài đặt, điểm bán, yêu cầu liên hệ, users, cùng checksum chữ sản phẩm (bản chính và phiên bản), **giữ nguyên**; chỉ số migration tăng từ 6 lên 7. Sản phẩm cũ có `landing` rỗng, nên giữ bố cục hiện tại.
- **Kế hoạch áp dụng nơi khác** (chỉ sau khi duyệt):
  1. Sao lưu theo quy trình hiện có.
  2. Duyệt entry trong `migrations.approved.json`.
  3. Chạy executor có kiểm soát.
  4. Đối chiếu số đếm và checksum như trên.
  5. Không nhập nội dung landing nào cho tới khi biên tập viên cấu hình và duyệt.
- DB thử: `node_modules/.bin/tsx scripts/seed-product-review.ts migrate` chỉ chạy các migration còn chờ, có kiểm marker.

## 3. Hướng dẫn biên tập: thêm khối → nhập nội dung → xem trước → gửi duyệt

1. Admin → Sản phẩm → chọn sản phẩm → tab **Landing page**. Khung đầu tab cho biết landing đang dùng hay chưa, khối nào còn thiếu ở ngôn ngữ đang chọn, và có link xem trước KO/EN/VI.
2. **Thêm: Khối** → chọn loại khối. Kéo biểu tượng ⋮⋮ để sắp xếp, hoặc mở menu "…" → **Di chuyển lên/xuống**. Tích "Ẩn khối này" để tạm ẩn mà không mất nội dung (thao tác này chỉ biên tập viên làm được).
3. Chọn **Ngôn ngữ nội dung** ở góc trên (KO/EN/VI), rồi nhập chữ cho ngôn ngữ đó. Tiêu đề mỗi khối hiện trạng thái:
   - "Đủ nội dung (VI)";
   - "Hiển thị; nên bổ sung …";
   - "Khách chưa thấy: thiếu …".
4. **Lưu bản nháp**, rồi bấm link xem trước của ngôn ngữ đó. Xem trước chỉ hiện bản nháp **đã lưu**.
5. Gửi duyệt: ngôn ngữ đã sửa tự về "Đang xem xét". Người duyệt kiểm xem trước, đặt "Đã duyệt" ở một lần lưu riêng không sửa nội dung, rồi **Xuất bản trong [ngôn ngữ]**.

## 4. Mẫu LUMA trên DB thử

Seed: `scripts/seed-product-review.ts luma-landing`, bản nháp do tài khoản biên tập viên thử lưu.

| # | Khối | Nội dung |
|---|---|---|
| 1 | Hero | Câu slider đã duyệt; đoạn mở đầu = mô tả ngắn trung tính đã duyệt; quy cách 8 mL × 5; nút "Yêu cầu tư vấn" |
| 2 | Dải ảnh lớn | Ảnh lọ (chưa công khai, chỉ hiện trong xem trước) |
| 3 | Thành phần nổi bật | Sodium DNA · 우유엑소좀/Milk Exosome/Exosome sữa · 17 axit amin · phức hợp vitamin. Chỉ có tên in trên bao bì; ghi chú nguồn nội bộ |
| 4 | Lưới điểm nổi bật | **Để trống** (công dụng chờ nguồn); khách không thấy |
| 5 | Chi tiết sản phẩm | Đọc từ trường có sẵn |
| 6 | CTA cuối trang | Nền tối |

## 5. Nghiệm thu (log trong `drphynex-products-review-evidence/landing/`)

- **Biên tập trên 3021** (`08-admin-accept.log`), qua trình duyệt headless thật:
  - thêm khối "Câu hỏi thường gặp", di chuyển lên trên CTA, nhập câu hỏi/đáp VI ([MẪU]); tiêu đề khối chuyển sang "Đủ nội dung (VI)";
  - lưu nháp: thứ tự mới và chữ được lưu, VI về "Đang xem xét";
  - preview VI hiện FAQ ngay trước CTA; preview KO đánh dấu khối thiếu chữ KO.

  Bước xoá qua menu chưa bấm trúng nút. Dữ liệu thử được khôi phục bằng script seed.
- **Tình huống** (`11-cases.log`, đạt hết):
  - FORMA, BALM, SHEET chưa có khối thì giữ bố cục cũ;
  - preview LUMA KO/EN/VI có đúng một h1, có dấu ảnh private và dấu lưới trống, CTA giữ sản phẩm;
  - khách vào LUMA nhận 404 (nháp);
  - sản phẩm mẫu: bản nháp có landing nhưng **khách vẫn thấy bố cục cũ**; sau khi duyệt và xuất bản VI, khách thấy landing, **khối ảnh private bị bỏ**, CTA mở form với "Sản phẩm quan tâm" đúng.
- **Ảnh:**
  - LUMA preview KO/EN/VI × 390/768/1440: `shots/landing-luma/`;
  - khách xem sản phẩm mẫu: `shots/landing-guest/`;
  - Admin: `landing/explore-admin.jpg`, `landing/accept/*.jpg`.

  Không trang nào tràn ngang.
- **Kiểm tra:** unit 650/650, integration 146/146 (gồm `tests/int/landing.int.spec.ts` 6 test), typecheck 0, eslint toàn repo 0, build 0.
  - Trước khi chạy integration, DB thử được sao lưu bằng `pg_dump` và khôi phục sau đó.

## 6. Giới hạn và việc tiếp theo

- Quy tắc duyệt chéo ngôn ngữ cho thay đổi cấu trúc: chờ quyết định (mục 1).
- Ảnh lớn, texture và campaign cho LUMA: chưa có ảnh được phép công khai.
- Khối "Ảnh + nội dung" và FAQ chưa có nội dung thật.
- Sau khi mẫu LUMA được duyệt: cấu hình FORMA, BALM, SHEET (chỉ là nhập liệu, không cần mã mới).
