# Bộ dựng landing page sản phẩm (Payload + Next.js) — 09/11/2026

Nhánh `products-contact`. Bố cục mẫu **MX-02 LUMA** đã được duyệt (09/11). FORMA, BALM và SHEET đã được lưu **bản nháp** với cùng bộ khối trên bản xem thử `localhost:3021` (DB thử `drphynex_independent_review_test`) và đang chờ duyệt nội dung (mục 4). Không đụng DB thật hay cổng 3000; không xuất bản nội dung thật.

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
- Thay đổi **cấu trúc** còn ảnh hưởng mọi ngôn ngữ: xem mục kế tiếp.
- Khách chỉ nhận bản đã xuất bản và đã duyệt của đúng ngôn ngữ. Ảnh private không bao giờ được trả cho khách: chỉ có id, không có file.

### Duyệt cấu trúc dùng chung (đã triển khai, cùng cơ chế banner trang chủ)

Payload xuất bản theo ngôn ngữ, nhưng **trường dùng chung đi theo bản nháp**. Trước đây, duyệt và xuất bản chỉ VI có thể làm khách KO thấy bố cục mới dù KO chưa duyệt. Quy tắc hiện tại (`src/hooks/guardLanding.ts` → `guardLandingApproval`, `src/lib/landing-approval.ts`):

- **Cấu trúc** = mọi thứ trong landing trừ chữ theo ngôn ngữ: thêm/xoá/đổi thứ tự khối, ẩn/hiện, ảnh, kiểu nền, bố cục, thành phần được chọn. Mã băm SHA-256 của phần này là "bản cấu trúc".
- Server tự ghi `landingApprovals` = { ngôn ngữ → bản cấu trúc mà ngôn ngữ đó đã duyệt }. Giá trị client gửi lên bị thay thế.
- **Đổi cấu trúc**: bắt buộc lưu nháp (xuất bản kèm thay đổi cấu trúc bị từ chối, 409). Khi lưu, **duyệt cấu trúc của KO/EN/VI bị xoá**, ngôn ngữ đang lưu về "Đang xem xét".
- **Chỉ sửa chữ của một ngôn ngữ**: chỉ ngôn ngữ đó về "Đang xem xét" và mất duyệt; các ngôn ngữ khác giữ nguyên.
- **Duyệt lại**: lưu nháp với "Đã duyệt" và không kèm thay đổi khác. Lần lưu này ghi duyệt của ngôn ngữ đó cho đúng bản cấu trúc hiện tại.
- **Xuất bản ngôn ngữ X** (kiểm ở server):
  - X phải đã duyệt đúng bản cấu trúc hiện tại.
  - Nếu bản cấu trúc khác bản đang công khai, **mọi ngôn ngữ đang công khai** (đã xuất bản và đã duyệt) cũng phải duyệt đúng bản mới. Nếu thiếu, server trả 409 và nêu tên ngôn ngữ; **bản công khai cũ được giữ nguyên**.
  - Ngôn ngữ **chưa từng công khai** vẫn ở nháp, được duyệt riêng trước lần xuất bản đầu.
  - Xuất bản lại khi chữ và cấu trúc không đổi vẫn chạy được.
- **Hai trạng thái duyệt trong Admin** (phần đầu tab Landing page). Một ngôn ngữ cần có cả hai mới xuất bản được:
  1. **Duyệt nội dung** (trường "Trạng thái duyệt" ở cột phải): riêng từng ngôn ngữ, cho chữ của ngôn ngữ đó.
  2. **Duyệt cấu trúc landing**: dùng chung KO/EN/VI. Server tính khi đọc (trường ảo `landingApprovalState`, không lưu, không cần migration), nên nó phản ánh **bản nháp đã lưu**, không phải thay đổi chưa lưu trong form.
  - Chọn "Đã duyệt" rồi lưu nháp (không kèm thay đổi khác) sẽ ghi cả hai cho ngôn ngữ đó.
  - Nếu một ngôn ngữ ghi "Đã duyệt" ở mục 1 nhưng mục 2 là "cần duyệt" (cấu trúc vừa đổi từ ngôn ngữ khác), Admin nhắc lưu nháp lại ngôn ngữ đó.

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

### Migration thứ hai: duyệt cấu trúc (ĐỀ XUẤT, chưa duyệt)

- File `src/migrations/20261109_024237_landing_approvals.ts`, SHA-256 `b10c36e95916b8cc3b2a7e80a4716f2a6d79f5663e14c32ff71370f0544ba8e7`, nằm trong `deploy/migrations.proposed.json` cùng migration trên. `approved.json` vẫn không đổi.
- `up()` gồm đúng 2 lệnh, đều chỉ thêm mới (có test kiểm):
  - `ALTER TABLE "products" ADD COLUMN "landing_approvals" jsonb;`
  - `ALTER TABLE "_products_v" ADD COLUMN "version_landing_approvals" jsonb;`
- Cột cho phép NULL, không có giá trị mặc định, không sửa dòng nào. `down()` xoá đúng 2 cột này.
- Dữ liệu cũ: NULL được hiểu là "chưa ngôn ngữ nào duyệt cấu trúc". Sản phẩm chưa có landing (cấu trúc rỗng) không bị chặn.
- **Bảo toàn dữ liệu** trên DB thử (`landing-approval/02-counts-before.txt` và `04-counts-after.txt`): số dòng và checksum chữ sản phẩm giữ nguyên; số migration tăng từ 7 lên 8.
- Kế hoạch áp dụng nơi khác giống migration trên. Áp hai migration theo thứ tự tên file.

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

### FORMA, BALM, SHEET (bản nháp, cùng bộ khối, chờ duyệt nội dung)

Seed: `scripts/seed-product-review.ts landing-drafts`. Bộ khối và thứ tự giống LUMA, nền giống LUMA. Chỉ dùng nội dung và ảnh của chính sản phẩm đó; mục nào chưa có nguồn đã duyệt thì để trống.

| # | Khối | MX-01 FORMA · RX Matrix Balm · RX Matrix Sheet |
|---|---|---|
| 1 | Hero | **Câu giới thiệu để trống**: chưa có câu slider được duyệt cho ba sản phẩm này (M4 chỉ duyệt câu của LUMA). h1 là tên sản phẩm. Đoạn mở đầu lấy mô tả ngắn có sẵn, quy cách lấy từ "Dung tích": FORMA 8 mL × 5, Balm 40 mL (M1), Sheet 25 mL × 5 |
| 2 | Dải ảnh lớn | Ảnh của chính sản phẩm: lọ FORMA, hộp Balm, túi Sheet. Ảnh chưa công khai nên chỉ hiện trong xem trước. Mô tả ảnh tả đúng vật trong ảnh (lọ/hộp/túi + tên) |
| 3 | Thành phần nổi bật | **Ẩn**: chưa có danh sách thành phần nổi bật được duyệt (M3 cho FORMA, M5 cho tên PDRN/Sodium DNA). Nếu để trống mà không ẩn, khối sẽ lấy "Thành phần chính" của sản phẩm, là danh sách đang tranh chấp. Bỏ ẩn sau khi có danh sách đã duyệt |
| 4 | Lưới điểm nổi bật | **Để trống** (công dụng chờ nguồn); khách không thấy |
| 5 | Chi tiết sản phẩm | Đọc từ trường có sẵn (quy cách, INCI, cách dùng, lưu ý) |
| 6 | CTA cuối trang | Nền tối |

Phần lấy từ trường có sẵn **vẫn đang chờ duyệt** theo từng ngôn ngữ. Cần duyệt khi xem trước:
- mô tả ngắn: FORMA nhắc "đa peptide" (M3); Balm VI do AI dịch, M8;
- INCI, cách dùng, lưu ý.

Khi lưu landing, VI của Balm và Sheet chuyển từ "Bản nháp AI" sang "Đang xem xét", đúng như khi biên tập viên lưu trong Admin. Phần chữ AI dịch không thay đổi, vẫn cần duyệt.

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
- **Duyệt cấu trúc dùng chung** (log trong `landing-approval/`):
  - `tests/int/landing.int.spec.ts`, 11/11 test. Regression tái hiện lỗi:
    - KO đang công khai, đổi thứ tự khối, chỉ duyệt VI rồi xuất bản VI → **bị chặn** ("…khách đang thấy ở KO…").
    - Khách KO và VI vẫn thấy thứ tự cũ và chữ KO cũ.
    - KO duyệt đúng bản mới → xuất bản VI thành công, khách cả hai ngôn ngữ thấy thứ tự mới.
    - Chỉ sửa chữ VI (biên dịch viên): chỉ VI mất duyệt, KO giữ duyệt và chữ công khai. Duyệt VI → xuất bản được, không cần KO duyệt lại.
    - Ngoài ra kiểm: xuất bản lại không đổi; EN chưa từng công khai được duyệt riêng rồi xuất bản lần đầu; giá trị duyệt do client gửi bị thay thế; tình trạng duyệt trong Admin.
  - Kiểm đột biến (`06-mutation.log`): tắt tạm kiểm tra chéo ngôn ngữ thì test regression **thất bại** như kỳ vọng. Mã đã được khôi phục.
  - Toàn bộ: integration 151/151, unit 651/651, typecheck 0, eslint 0, build 0. DB thử được sao lưu bằng `pg_dump` trước khi chạy và khôi phục sau đó.
  - Trước khi chạy integration, DB thử được sao lưu bằng `pg_dump` và khôi phục sau đó.

## 6. Giới hạn và việc tiếp theo

- Duyệt cấu trúc dùng chung: đã triển khai (mục 1). Giới hạn UX:
  - Khi cấu trúc đổi, các ngôn ngữ khác vẫn hiện nhãn "Đã duyệt" ở trường trạng thái dịch, dù duyệt cấu trúc của chúng đã bị xoá. Phần đầu tab Landing page hiện đúng "cần duyệt".
  - Muốn duyệt lại ngôn ngữ đó: người duyệt mở ngôn ngữ đó, giữ "Đã duyệt", không sửa gì khác và **lưu nháp**.
- Ảnh lớn, texture và campaign cho LUMA: chưa có ảnh được phép công khai.
- Khối "Ảnh + nội dung" và FAQ chưa có nội dung thật.
- FORMA, BALM, SHEET: đã lưu bản nháp landing, chờ duyệt nội dung. Chờ nguồn: câu giới thiệu hero, thành phần nổi bật (M3/M5), công dụng.
