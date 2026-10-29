# Hướng dẫn quản trị nội dung

Dành cho người biên tập website Dr.PhynEX. Trang quản trị: `<địa chỉ website>/admin` (trên máy Local: `http://localhost:3000/admin`).

## Quy tắc chính

Khách chỉ thấy một nội dung ở một ngôn ngữ khi có **đủ cả hai** điều kiện:
1. Nội dung đã được **Publish** (xuất bản).
2. Trạng thái bản dịch của ngôn ngữ đó là **Approved** (đã duyệt).

Thiếu một trong hai thì khách thấy "Đang cập nhật" hoặc trang 404. Website **không** tự lấy ngôn ngữ khác để thay thế.

## Vai trò

| Vai trò | Được làm |
|---|---|
| **Admin** | Mọi việc, gồm quản lý tài khoản và xem, xử lý form |
| **Editor** | Tạo, sửa, xóa nội dung; duyệt bản dịch; xuất bản; cho phép công bố ảnh |
| **Translator** | Sửa bản nháp và bản dịch; **không** duyệt và **không** xuất bản |

## 1. Sửa sản phẩm

1. Vào **Catalog → Products**, chọn sản phẩm.
2. Chọn ngôn ngữ cần sửa ở ô **Locale** phía trên (한국어 / English / Tiếng Việt). Mỗi ngôn ngữ lưu riêng.
3. Các tab:
   - **Overview:** tên, mô tả ngắn, mô tả, ảnh;
   - **Claims:** công dụng; mỗi dòng phải có tài liệu nguồn;
   - **Ingredients & use:** thành phần chính, INCI, cách dùng, lưu ý;
   - **Classification:** dòng sản phẩm, danh mục, màu nhấn;
   - **SEO.**
4. Bấm **Save draft** để lưu nháp. Bản nháp chưa hiện cho khách.
5. **Editorial note (internal)** ở cột phải là ghi chú nội bộ: nguồn nội dung, câu hỏi còn mở. Khách không bao giờ thấy ghi chú này.

Lưu ý:
- Chỉ ghi công dụng, số liệu, chứng nhận có trong tài liệu của thương hiệu. Không tự thêm.
- Dòng sản phẩm (RX, MX) hiện mới có tên tiếng Hàn. Khi xem danh sách ở locale English hoặc Tiếng Việt, cột Line hiện `<No Line>`. Dữ liệu vẫn đúng; muốn hết hiện như vậy thì bổ sung tên dòng ở ngôn ngữ đó trong **Product Lines**.

## 2. Quản lý bản dịch

Ô **Translation Status** ở cột phải, riêng cho từng ngôn ngữ:

| Trạng thái | Nghĩa |
|---|---|
| **AI draft** | Bản dịch máy, chưa ai kiểm tra |
| **In review** | Đang được người kiểm tra |
| **Approved** | Đã duyệt. Chỉ Editor và Admin chọn được |

Quy trình đề xuất:
1. Hoàn thiện bản tiếng Hàn (ngôn ngữ gốc).
2. Dịch hoặc kiểm tra bản English và Tiếng Việt; đặt **In review**.
3. Người bản ngữ đọc lại trong preview (mục 3).
4. Editor đặt **Approved** cho từng ngôn ngữ đã đạt.

Một ngôn ngữ chưa duyệt thì bộ chuyển ngôn ngữ trên website gạch ngang ngôn ngữ đó. Các ngôn ngữ đã duyệt vẫn hiển thị bình thường.

## 3. Xem trước (preview)

1. Đăng nhập admin.
2. Mở `<địa chỉ website>/preview?path=/vi/products/rx-matrix-balm`, thay phần sau `path=` bằng trang cần xem (luôn bắt đầu bằng `/ko`, `/en` hoặc `/vi`).
3. Thanh trên cùng báo "Bản xem trước". Trang hiện **bản nháp mới nhất ở mọi ngôn ngữ**, kèm nhãn `[CHỜ CUNG CẤP: …]` ở những chỗ còn thiếu nội dung.
4. Bấm **Thoát xem trước** để xem đúng như khách.

Preview chỉ dành cho nhân viên đã đăng nhập. Khách mở cùng đường dẫn sẽ được chuyển tới trang đăng nhập.

## 4. Duyệt và xuất bản

Chỉ Editor hoặc Admin:
1. Kiểm tra từng ngôn ngữ trong preview.
2. Đặt **Approved** cho các ngôn ngữ đạt yêu cầu.
3. Bấm **Publish changes**.
4. Bấm **Thoát xem trước** rồi mở trang như khách để xác nhận. Nội dung mới sẽ hiện ngay. Nếu sau một phút vẫn chưa thấy, báo bộ phận kỹ thuật; bộ nhớ đệm cũng tự làm mới sau tối đa 1 giờ.

Muốn gỡ khỏi website: chọn **Unpublish**, hoặc đặt ngôn ngữ đó về **In review** rồi Publish lại.

Các trang Thương hiệu, Trang chủ, Hợp tác (mục **Pages**) và Bài viết, Chính sách, Điểm bán cũng theo cùng quy tắc.

## 5. Cho phép công bố ảnh

Ảnh tải lên mặc định là **riêng tư**: chỉ nhân viên xem được, khách nhận lỗi 403.

1. Vào **Assets → Media**, chọn ảnh.
2. Điền **Alt** (mô tả ảnh) ở mỗi ngôn ngữ.
3. Ở **Review note**, ghi nguồn ảnh và cách đã đối chiếu với bao bì.
4. Chỉ khi thương hiệu đã đồng ý dùng ảnh công khai: tích **Cleared for publication**, rồi lưu.

Lưu ý:
- Ảnh gắn vào sản phẩm đã xuất bản nhưng chưa được tích vẫn **không** hiện cho khách.
- Tài liệu nội bộ (PDF bao bì, hồ sơ sản phẩm) đặt trong **Source documents**, không đặt trong Media. Mục này không bao giờ công khai.

## 6. Xử lý form liên hệ và hợp tác

Chỉ Admin xem được:
1. Vào **Inbox → Contact Submissions** (liên hệ) hoặc **B2B inquiries** (hợp tác).
2. Mở bài gửi. Cột **locale** cho biết khách gửi từ trang ngôn ngữ nào.
3. Trả lời khách bằng email công ty (website không tự gửi thư trả lời).
4. Cập nhật **Status**: `new` → `in-progress` → `closed`.
5. Xóa bài gửi khi hết thời hạn lưu trữ mà chính sách bảo mật quy định.

Khi đã cấu hình email, mỗi bài gửi mới tạo một email thông báo. Email chỉ có số thứ tự và liên kết vào admin, không chứa nội dung form, nên muốn đọc phải đăng nhập.

Không chép dữ liệu khách ra file, chat hay email cá nhân.

## 7. Khi gặp sự cố

| Hiện tượng | Kiểm tra |
|---|---|
| Khách không thấy nội dung vừa sửa | Đã **Publish** chưa? Ngôn ngữ đó đã **Approved** chưa? |
| Ảnh không hiện cho khách | Đã tích **Cleared for publication** chưa? |
| Không chọn được Approved | Tài khoản Translator không duyệt được; nhờ Editor |
| Bị khóa đăng nhập | Sai mật khẩu 5 lần sẽ khóa 10 phút |
