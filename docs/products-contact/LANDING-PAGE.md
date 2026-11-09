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

## 3. Trình dựng trực quan (tab "Landing page")

Dùng lại 8 loại khối, dữ liệu, Media, preview và quy trình duyệt hiện có. **Không thêm schema, không thêm migration.** Trình dựng chỉ là giao diện Admin trên cùng form Payload.

### Cách dùng (biên tập viên)

1. Admin → Sản phẩm → chọn sản phẩm → tab **Landing page** → **Mở trình dựng**. Trình dựng phủ toàn màn hình, gồm 3 vùng:
   - **trái:** danh sách khối và trạng thái từng khối ở ngôn ngữ đang chỉnh;
   - **giữa:** xem trước bản nháp đã lưu;
   - **phải:** các trường của khối đang chọn.
2. **+ Thêm khối**: 8 loại khối, mỗi loại có tên tiếng Việt và một câu mô tả khi nào nên dùng. Khối mới được chèn sau khối đang chọn.
3. **Đổi thứ tự:**
   - kéo biểu tượng ⋮⋮;
   - hoặc dùng nút **↑ Lên / ↓ Xuống**: nhấn Tab tới nút rồi Enter, có thông báo cho trình đọc màn hình;
   - với tay nắm ⋮⋮ cũng dùng được bàn phím: Space, phím mũi tên, rồi Space để thả.
4. **Nhân bản**, **Thu gọn** (▾/▸), **Ẩn / Hiện lại** và **Xoá**:
   - Ẩn giữ nguyên nội dung để bật lại.
   - Xoá có hộp xác nhận, gợi ý dùng "Ẩn" nếu chỉ muốn tạm không hiển thị.
5. **Ảnh trong khối:**
   - Có **Tạo mới** (tải lên ngay trong khối) và **Chọn từ thư viện** của Payload, kèm ảnh thu nhỏ.
   - Khi đã có ảnh: **Thay ảnh** (tải ảnh mới hoặc chọn từ thư viện) và **Gỡ ảnh**.
   - Có dòng báo ảnh riêng tư hay đã được phép công khai.
   - Quyền Media giữ nguyên: ảnh mới luôn riêng tư cho tới khi tích "Đã duyệt cho phép công khai" trong Media.
   - Alt theo ngôn ngữ là trường alt bắt buộc của Media. Dải ảnh lớn có thêm alt riêng trong khối và ảnh điện thoại tuỳ chọn.
6. **Nhãn phạm vi** cạnh từng trường:
   - **Riêng ngôn ngữ**: chữ nhập cho ngôn ngữ đang chỉnh.
   - **Dùng chung KO/EN/VI**: ẩn/hiện, ảnh, nền, bố cục, số thẻ/câu hỏi.
7. **Xem trước:**
   - Chọn Điện thoại 390 / Máy tính bảng 768 / Máy tính 1440.
   - Bấm vào một khối trong xem trước để mở đúng khối đó ở bảng chỉnh.
   - **Xem như khách**: khối trống, khối ẩn và ảnh riêng tư biến mất hẳn, kể cả dải nền, và không có đánh dấu nhân sự.
   - Xem trước chỉ hiện **bản nháp đã lưu**. Khi có thay đổi chưa lưu, khung xem trước hiện "**Lưu nháp để xem thay đổi**", và tự tải lại sau mỗi lần lưu.
   - Cảnh báo thiếu nội dung nằm trong Admin: trạng thái ở danh sách khối và ở đầu bảng chỉnh.
8. **Lưu bản nháp** nằm ở thanh trên của trình dựng. **Xuất bản** vẫn là thao tác riêng ở thanh tài liệu, sau khi đóng trình dựng.
9. **Đổi ngôn ngữ** bằng KO/EN/VI trên thanh trình dựng; trình dựng mở lại ở ngôn ngữ mới.
   - Nếu còn thay đổi chưa lưu, trình dựng hỏi trước. Bộ chọn ngôn ngữ ở header của Payload cũng hỏi như vậy.
   - Rời trang khi chưa lưu: trình duyệt cảnh báo.
10. **Biên dịch viên** mở cùng trình dựng nhưng không có nút thêm, xoá, nhân bản, đổi thứ tự hay ẩn/hiện. Các trường dùng chung chỉ đọc; chữ riêng ngôn ngữ sửa được. Server vẫn chặn (403) như trước.
11. Quy tắc duyệt cấu trúc (mục 1) áp dụng nguyên vẹn. Mọi thay đổi dùng chung xoá duyệt cấu trúc của KO/EN/VI khi lưu nháp. Đầu tab hiện cả hai loại duyệt.

### Mã nguồn

- `src/components/admin/landing/LandingBuilder.tsx`: component Field của `landing`. Dùng `RenderFields`, `addFieldRow`/`moveFieldRow`/`DUPLICATE_ROW`/`removeFieldRow`, `DraggableSortable`, `ConfirmationModal`, `SaveDraftButton` của Payload.
- `LandingImageField.tsx`: upload chuẩn của Payload cùng nút Thay/Gỡ và trạng thái công khai.
- `ScopedLabel.tsx`: nhãn phạm vi.
- `useLandingRows.ts`, `blockStatus.ts`: dữ liệu và trạng thái khối, dùng chung với tiêu đề khối cũ và phần đầu tab.
- `src/components/admin/LocaleSwitchGuard.tsx`: hỏi trước khi đổi ngôn ngữ ở header khi có thay đổi chưa lưu.
- Xem trước:
  - `src/components/landing/LandingPreviewBridge.tsx`: chọn khối bằng `postMessage` cùng origin.
  - `data-lp-id`: chỉ có trong xem trước của nhân sự (`?lp=staff|guest`).
  - `src/lib/guest-view.ts`: chế độ "Xem như khách", có unit test.
- `src/fields/landing.ts`: chỉ thêm `admin.components` (nhãn, trường ảnh, Field). DB không đổi; `payload-types` không đổi.

### Sửa lỗi có sẵn: "Tài liệu đã được sửa đổi" sau mỗi lần lưu nháp

- **Hiện tượng:** ở mọi tài liệu nội dung, kể cả khi sửa bằng trường gốc (ví dụ "Ghi chú biên tập"), sau một lần lưu nháp, lần sửa tiếp theo bật hộp "Tài liệu đã được sửa đổi… bởi người dùng khác". Lần lưu sau bị chặn cho tới khi tải lại.
- **Nguyên nhân:** hook `publishOnlyRequestedLocale` ép `publishSpecificLocale` cả khi lưu nháp.
  - Payload khi đó ghi thêm một phiên bản "snapshot" làm bản nháp mới nhất, mang `updatedAt` **cũ** của tài liệu (DB thử: mỗi lần lưu tạo hai dòng `_products_v`).
  - Bước kiểm tra dữ liệu cũ của Admin so `updatedAt` này với giá trị lần lưu trả về, nên báo nhầm.
- **Sửa:** `src/hooks/publishLocale.ts` chỉ đặt `publishSpecificLocale` khi **xuất bản**. Kiểm tra ngôn ngữ hợp lệ, chặn "xuất bản mọi ngôn ngữ" và ngữ cảnh duyệt giữ nguyên.
- **Kiểm tra:**
  - Integration đầy đủ 152/152.
  - Test mới `Admin stale-data check after a draft save` **thất bại** khi bỏ sửa đổi (`builder/06-mutation-stale.log`) và đạt khi có sửa đổi.
  - Đây là thay đổi ở hook dùng chung của quy trình xuất bản theo ngôn ngữ, nên được **review tách riêng** khỏi giao diện trình dựng. Hồ sơ nằm ở `drphynex-products-review-evidence/hook-review/` (diff `ce996f9` cùng spec `tests/int/draft-save-hook.int.spec.ts` từ commit `a298e8c`; integration 166/166).

### Schema: đề xuất, chưa làm

Luồng nghiệm thu không cần trường mới. Nếu muốn mọi khối ảnh có đủ "alt theo ngôn ngữ trong khối" và "ảnh điện thoại" như Dải ảnh lớn, cần thêm các trường sau:

| Khối | Trường thiếu | Lý do | Tác động DB |
|---|---|---|---|
| Ảnh + nội dung (`split`) | `alt` (riêng ngôn ngữ), `mobileImage` (dùng chung) | Alt hiện lấy từ alt của Media (đã theo ngôn ngữ) nên không đổi được theo ngữ cảnh khối; điện thoại dùng cùng ảnh | Thêm cột `alt` vào `lp_split_locales` và `_lp_split_v_locales`; cột `mobile_image_id` kèm khoá ngoại vào `lp_split` và `_lp_split_v` |
| Hero (`hero`) | `alt` (riêng ngôn ngữ), `mobileImage` (dùng chung) | Như trên | Tương tự với các bảng `lp_hero*` |

**Tạm hoãn (09/11):** chưa tạo, chưa chạy migration thứ ba. Hai migration hiện có vẫn ở trạng thái đề xuất.

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

### Nghiệm thu trình dựng (log và ảnh trong `drphynex-products-review-evidence/builder/`)

Headless Chrome thật trên 3021 (DB thử), dùng tài khoản biên tập viên thử, chuột và bàn phím thật. Kết quả: `builder/02-accept.log` **ALL PASS**, ảnh từng bước trong `builder/steps/`. Các bước:

1. Mở LUMA trong trình dựng.
2. Menu "Thêm khối" có 8 loại khối, tên và mô tả tiếng Việt. Thêm "Ảnh + nội dung".
3. Tải ảnh ([MẪU]) ngay trong khối: có ảnh thu nhỏ và nút Thay/Gỡ; ảnh riêng tư theo mặc định.
4. Nhập chữ VI ([MẪU]); mọi trường có nhãn phạm vi.
5. Kéo bằng chuột xuống một vị trí; Lên/Xuống bằng Enter, có thông báo cho trình đọc màn hình.
6. Lưu nháp:
   - xem trước tải lại với khối ở vị trí 3;
   - ảnh riêng tư có đánh dấu "[Xem trước]";
   - tài liệu vẫn là bản nháp, chữ VI được lưu.
7. Bấm khối trong xem trước mở đúng khối. Xem trên điện thoại 390. "Xem như khách": không còn khối Dải ảnh lớn, Ảnh + nội dung hay Lưới điểm, không có đánh dấu.
8. Ẩn rồi lưu: khối biến khỏi xem trước, nội dung vẫn lưu. Hiện lại rồi lưu: tiêu đề, đoạn mô tả và ảnh còn nguyên.
9. Thay đổi cấu trúc: duyệt cấu trúc KO/EN/VI bị xoá; đầu tab hiện "cần duyệt".
10. Đổi ngôn ngữ khi có sửa chưa lưu:
    - trình dựng và header Payload đều hỏi; bấm Huỷ thì vẫn ở VI và giữ thay đổi;
    - rời trang có cảnh báo;
    - bấm OK thì sang KO, trình dựng mở lại, thay đổi chưa lưu không bị ghi.
11. FORMA mở cùng trình dựng. Ở cửa sổ hẹp 900 px, mỗi lần chỉ hiện một vùng.
12. Biên dịch viên: không có thao tác cấu trúc; trường dùng chung chỉ đọc; chữ sửa được.

Kiểm tra mã: unit 653/653, integration 152/152 (DB thử được sao lưu trước và khôi phục sau), typecheck 0, eslint 0, build 0. Sau nghiệm thu, LUMA được nạp lại về mẫu 6 khối.

## 6. Giới hạn và việc tiếp theo

- Duyệt cấu trúc dùng chung: đã triển khai (mục 1). Giới hạn UX:
  - Khi cấu trúc đổi, các ngôn ngữ khác vẫn hiện nhãn "Đã duyệt" ở trường trạng thái dịch, dù duyệt cấu trúc của chúng đã bị xoá. Phần đầu tab Landing page hiện đúng "cần duyệt".
  - Muốn duyệt lại ngôn ngữ đó: người duyệt mở ngôn ngữ đó, giữ "Đã duyệt", không sửa gì khác và **lưu nháp**.
- Ảnh lớn, texture và campaign cho LUMA: chưa có ảnh được phép công khai.
- Khối "Ảnh + nội dung" và FAQ chưa có nội dung thật.
- Trình dựng: xem trước cập nhật **sau khi lưu nháp**, chưa cập nhật trực tiếp khi gõ. Trang khách là server component, và Live Preview của Payload chưa được bật cho dự án.
- Mỗi lần nghiệm thu tải một ảnh `mau-anh-thu*.png` (riêng tư, alt [MẪU]) vào Media của DB thử. Các ảnh này chưa xoá.
- FORMA, BALM, SHEET: đã lưu bản nháp landing, chờ duyệt nội dung. Chờ nguồn: câu giới thiệu hero, thành phần nổi bật (M3/M5), công dụng.
