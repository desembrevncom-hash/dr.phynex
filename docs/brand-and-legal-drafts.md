# Đề xuất nội dung: Thương hiệu, Chính sách bảo mật, Điều khoản

Ngày: 29/10/2026. **Chỉ là đề xuất để duyệt, chưa nạp vào CMS và chưa hiển thị.** Trang Thương hiệu, Chính sách bảo mật và Điều khoản hiện có trạng thái trống: khách thấy "Đang cập nhật", còn preview hiện nhãn chờ.

## 1. Trang Thương hiệu

Hiện chưa có hồ sơ thương hiệu (câu chuyện, triết lý, năm thành lập, phòng nghiên cứu). Dưới đây là khung trang, kèm những gì đã có căn cứ.

| Phần | Nội dung có thể dùng ngay (có căn cứ) | Cần thương hiệu cung cấp |
|---|---|---|
| Mở đầu | Tagline "BIOSCIENCE DERMATOLOGY" (logo); "thương hiệu mỹ phẩm Hàn Quốc theo định hướng dermocosmetic" (PRODUCT.md, đã xác nhận) | Định vị, câu chuyện thương hiệu |
| Hai dòng sản phẩm | RX (Balm, Sheet) và MX (FORMA, LUMA), lấy từ bao bì; có thể dẫn sang trang danh mục | Ý nghĩa của tên RX/MX, nếu muốn giải thích |
| Nghiên cứu / công nghệ | Tên "PhynEX™ Regenerative Complex", "3GF Regenerative System" (in trên bao bì) | Mô tả có nguồn; **không tự diễn giải** |
| Sản xuất | Nhãn ghi nhà sản xuất / người chịu trách nhiệm đưa ra thị trường theo luật Hàn: 이스터너생명과학(주) / ENBIOSCIENCE CO., LTD; "Made in Korea" (nhãn lọ, túi); ISO 22716 (bao bì) | Xác nhận được phép công bố; bản chứng nhận ISO; vai trò chủ thương hiệu |
| Người phát triển | "DEVELOPED BY JANG JINU" (bao bì) | Đồng ý nêu tên, tiểu sử (nếu muốn) |

## 2. Chính sách bảo mật: dữ liệu website thực sự thu thập

Phần này liệt kê dữ liệu **theo đúng mã nguồn hiện tại**, để bộ phận pháp lý soạn chính sách. Đây không phải văn bản chính sách.

| Nơi thu thập | Dữ liệu | Lưu ở đâu | Ai xem |
|---|---|---|---|
| Form Liên hệ (`/contact`) | Họ tên, email, số điện thoại (không bắt buộc), chủ đề, nội dung, ngôn ngữ trang, đồng ý lưu trữ | Database CMS, collection Contact submissions | Chỉ tài khoản admin |
| Form Hợp tác (`/partnership`) | Tên công ty, người liên hệ, email, số điện thoại (không bắt buộc), quốc gia, loại hình kinh doanh, kênh bán hiện có, nội dung, ngôn ngữ, đồng ý lưu trữ | Database CMS, collection Partner inquiries | Chỉ tài khoản admin |
| Chống spam | Địa chỉ IP, chỉ dùng để giới hạn số lần gửi | Bộ nhớ tạm của server (không ghi vào database), mất khi server khởi động lại | Không ai xem |
| Cookie `NEXT_LOCALE` | Ngôn ngữ đã chọn | Trình duyệt khách | — |
| Cookie `payload-token` và cookie chế độ xem trước | Phiên đăng nhập và chế độ preview | Trình duyệt **nhân viên** | — |

Hiện **không** có: analytics, pixel quảng cáo, gửi email thông báo, chia sẻ dữ liệu với bên thứ ba.

**Cần pháp lý và thương hiệu quyết định:**
- Bên kiểm soát dữ liệu (tên pháp lý, địa chỉ, email liên hệ về dữ liệu cá nhân).
- Thời hạn lưu trữ.
- Cơ sở pháp lý theo Nghị định 13/2023/NĐ-CP (Việt Nam) và PIPA (Hàn Quốc), nếu áp dụng.
- Nơi đặt server khi triển khai (Vercel, Postgres, R2/S3) và việc chuyển dữ liệu ra nước ngoài.
- Nhà cung cấp email, nếu sau này bật thông báo.

## 3. Điều khoản sử dụng

Điểm cần đưa vào, theo đúng phạm vi website:
- Website chỉ giới thiệu sản phẩm: không bán hàng, không có giá hay thanh toán.
- Thông tin sản phẩm lấy theo bao bì và tài liệu thương hiệu.
- Sở hữu trí tuệ: logo, hình ảnh.
- Liên kết sang trang ngoài (website điểm bán).
- Luật áp dụng.

Văn bản cần do pháp lý soạn hoặc duyệt. Tôi không soạn điều khoản pháp lý.
