# Design: Dr.PhynEX

Hướng thiết kế: **A, Clinical Label** (người dùng chọn ngày 29/10/2026), theo phong cách Korean Clinical Minimalism.

Ký hiệu:
- **[XÁC NHẬN]**: lấy từ logo hoặc file bao bì, hoặc do người dùng chỉ định.
- **[TẠM]**: đề xuất của nhóm thiết kế, chờ duyệt.

Nguồn: `brand-assets/logo/`, `brand-assets/packaging/`, [docs/phase-3-status.md](docs/phase-3-status.md), [docs/image-audit.md](docs/image-audit.md).

## 1. Nguyên tắc

1. **Sản phẩm là hình ảnh chính.** Ảnh bao bì lớn, đặt trên nền sáng có nhiều khoảng trống. Không dùng ảnh trang trí thay cho sản phẩm.
2. **Lấy chất liệu từ bao bì, dùng ít.** Đường kẻ navy, khung thành phần và bảng thông tin chỉ xuất hiện ở nơi có dữ liệu thật: trang chi tiết, dòng ngăn mục. Trang không được giống một bảng thông số kỹ thuật.
3. **Hai dòng, một hệ thống.**
   - Dòng RX: nền trắng, navy và đỏ.
   - Dòng MX: khu vực nền than, màu nhấn cyan hoặc hồng theo từng sản phẩm.
   - Hai dòng dùng chung điều hướng, typography, lưới và cách tương tác.
4. **Ba ngôn ngữ ngang hàng.** Kiểm tra cách xuống dòng thật của tiếng Hàn, Anh và Việt. Không đặt chiều rộng cố định dựa trên chữ tiếng Anh.
5. **Không có trong tài liệu thì không vẽ ra.** Không thêm biểu tượng chứng nhận, số liệu hay nhận xét khách hàng.

## 2. Màu

| Token | Giá trị | Nguồn | Dùng cho |
|---|---|---|---|
| `navy` | `#003A70` | [XÁC NHẬN] logo SVG, Pantone 654 C | Tiêu đề, liên kết, nút chính, đường kẻ nhấn |
| `navy-strong` | `#002A52` | [TẠM] | Trạng thái hover và active của nút navy |
| `red` | `#CE0E2D` | [XÁC NHẬN] logo SVG, Pantone 186 C | Chữ "RX" và điểm nhấn rất nhỏ của dòng RX. **Không** dùng để báo lỗi |
| `yellow` | `#FFB81C` | [TẠM] ước lượng Pantone 1235 C | Chỉ dùng làm viền hoặc nền nhỏ; **không dùng cho chữ** (1.8:1 trên nền trắng) |
| `ink` | `#1C2B3A` | [TẠM] | Chữ thường (14.4:1 trên trắng) |
| `ink-muted` | `#55657A` | [TẠM] | Chữ phụ (5.95:1 trên trắng, 5.49:1 trên `surface-muted`) |
| `surface` | `#FFFFFF` | [XÁC NHẬN] hướng nền trắng | Nền trang |
| `surface-muted` | `#F4F6F8` | [TẠM] | Nền khung ảnh sản phẩm, khu vực phụ |
| `line` | `#DDE3EA` | [TẠM] | Đường kẻ mảnh |
| `line-strong` | `#B9C3CE` | [TẠM] | Viền ô nhập liệu, đường kẻ cần rõ hơn |
| `mx-charcoal` | `#23272A` | [TẠM] ước lượng từ C65 M55 Y50 K70 | Nền khu vực dòng MX |
| `mx-charcoal-raised` | `#2E3337` | [TẠM] | Thẻ đặt trên nền than |
| `mx-text-muted` | `#B8C0C7` | [TẠM] | Chữ phụ trên nền than (8.2:1) |
| `mx-cyan` | `#00A3CF` | [TẠM] ước lượng từ C95 M5 Y15 K0 (FORMA) | Màu nhấn MX-01 trên nền than (5.1:1). **Không** đặt chữ trắng lên nền cyan (2.9:1) |
| `mx-pink` | `#EC6BA8` | [TẠM] ước lượng từ C5 M70 Y0 K0 (LUMA) | Màu nhấn MX-02 trên nền than (5.2:1) |
| `danger` | `#B42318` | [TẠM] | Báo lỗi form (6.6:1); tách khỏi màu đỏ thương hiệu bằng biểu tượng và chữ |
| `success` | `#1E7A46` | [TẠM] | Thông báo gửi form thành công (5.4:1) |
| `focus` | `#2F6FB0` | [TẠM] | Viền focus 2px, cách phần tử 2px |

Logo màu chỉ đặt trên `surface` hoặc `surface-muted`. Trên nền than không đặt logo, vì đỏ trên navy hay than đều không đạt tương phản và chưa có bản logo đảo màu.

File logo:
- `brand-assets/logo/drphynex-logo-original.svg`: file gốc, không commit.
- `public/brand/drphynex-logo-web.svg`: bản web đang dùng, có commit. Hình vẽ giống hệt bản gốc (30/30 hình, đã so sánh tự động); chỉ cắt `viewBox` sát nội dung (1178×330) và bỏ metadata của Illustrator. Ở cùng chiều cao, logo hiện to hơn khoảng 40%.
- `brand-assets/proposals/drphynex-wordmark-web-PROPOSAL.svg`: **đề xuất, chưa dùng**. Giống bản web nhưng bỏ dòng tagline, dành cho header mobile và favicon. Cần thương hiệu duyệt.

## 3. Typography

| Vai trò | Font | Ghi chú |
|---|---|---|
| Tiêu đề Latin và tiếng Việt | **Plus Jakarta Sans** 600–800 [TẠM] | Sans hình học, gần với chữ in hoa đậm trên hộp RX. Google Fonts có subset `vietnamese` (đã kiểm tra 29/10/2026) |
| Chữ thường, và toàn bộ chữ Hàn | **Noto Sans KR** 300–500 [TẠM] | Có Hangul, `latin` và `vietnamese` (đã kiểm tra). Tiêu đề tiếng Hàn tự động dùng font này |
| Font dự phòng | `system-ui`, `Apple SD Gothic Neo`, `Malgun Gothic`, `sans-serif` | |

Font trên bao bì chưa xác nhận được, vì chữ trong file đã chuyển thành nét vẽ. Bảng trên là đề xuất. Không dùng serif và không dùng màu vàng ánh kim [XÁC NHẬN].

Cỡ chữ (rem, co giãn theo `clamp`):

| Cấp | Mobile → desktop | Độ đậm | Line-height |
|---|---|---|---|
| Display (tên sản phẩm lớn) | 2.25 → 4 | 800 | 1.05 |
| Hero (`display-hero`) | en/vi 2.5 → 4.5; ko 2.125 → 3.75 | en/vi 800; ko 700 | en 1.04; vi 1.16 (chừa chỗ cho dấu chồng); ko 1.24 |
| H1 | 2 → 3.25 | 700 | 1.1 |
| H2 | 1.5 → 2.25 | 700 | 1.15 |
| H3 | 1.125 → 1.25 | 600 | 1.3 |
| Body | 1 | 400 | 1.7 (tiếng Hàn 1.75) |
| Small | 0.875 | 400 | 1.6 |
Không dùng nhãn nhỏ (eyebrow) phía trên tiêu đề: tiêu đề tự đứng. Tagline "BIOSCIENCE DERMATOLOGY" chỉ xuất hiện trong logo. Không viết hoa toàn bộ hay giãn chữ cho tiếng Hàn và tiếng Việt. Với tiếng Hàn dùng `word-break: keep-all`, để không ngắt giữa một từ.

## 4. Khoảng cách và lưới

- Thang khoảng cách 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Khoảng cách giữa các khối trang: 64px trên mobile, 96–128px trên desktop.
- Lưới: 4 cột (mobile), 8 cột (≥768px), 12 cột (≥1024px).
- Lề hai bên: 20px (mobile), 32px (tablet), 48px (desktop).
- Chiều rộng tối đa của nội dung: 1280px; đoạn văn tối đa 65 ký tự.
- Bo góc: 4px cho khung thành phần và nút (giống bao bì); 8px cho khung ảnh.

## 5. Component

| Component | Mô tả |
|---|---|
| Header | Logo bản web bên trái (cao 40px mobile, 48px desktop). Trên ≥1024px: menu ngang. Dưới 1024px: nút "Menu" mở bảng điều hướng (có `aria-expanded`, đóng bằng phím Esc). Bên phải là bộ chọn ngôn ngữ KO / EN / VI. Có đường kẻ `line` ở cạnh dưới |
| Hero | Tiêu đề và đoạn mở đầu lấy từ CMS (`HomePage`); khi chưa có tiêu đề thì hiện tên thương hiệu. Một ảnh sản phẩm lớn trên khung dọc `surface-muted`. Có hai CTA: Sản phẩm, Điểm bán. **Còn thiếu ảnh hero riêng**; hiện dùng ảnh sản phẩm nổi bật, và preview đánh dấu chỗ này |
| Khối dòng (2 sản phẩm) | Không dùng lưới catalogue đều nhau: thẻ đầu rộng 7/12, thẻ sau rộng 5/12 và đặt thấp hơn. Dòng có số sản phẩm khác thì dùng lưới đều |
| Trang sản phẩm | DOM theo thứ tự: tên (H1) + dung tích → gallery → mô tả + khối "Mua ở đâu". Trên desktop, gallery chiếm cột trái qua cả hai hàng. Ảnh dưới 1024px cao tối đa `clamp(300px, 56vh, 440px)`, ở 768px cao 460px; dùng `object-contain`, không cắt bao bì |
| Footer | Logo; liên kết chính 2 cột (mobile), 3 cột (≥640px); liên kết pháp lý trên một hàng, có đường kẻ ngăn cách |
| Mở đầu trang (`PageIntro`) | Dùng cho trang nội dung: đường kẻ navy, H1 navy, đoạn dẫn ở cột phải (desktop) |
| Bộ lọc (`FilterTabs`) | Link dạng tab, gạch dưới navy khi đang chọn, `aria-current`; hoạt động không cần JavaScript |
| Nhóm dòng (`LineGroup`) | Danh mục: lưới đều 1/2/3 cột; dòng MX trên nền than. Khác với bố cục so le ở trang chủ |
| Form | Ô nhập viền `line-strong`, focus navy; nút chính navy cao 48px; form đặt trên khung `surface-muted`; thông báo lỗi/thành công nhận focus |
| Trạng thái trống (Điểm bán) | Khung `surface-muted`: tiêu đề, một câu giải thích, liên kết sang Liên hệ và Hợp tác. Không có dữ liệu mẫu |
| Khối dòng sản phẩm | Mã dòng và mô tả dòng lấy từ CMS, cùng danh sách thẻ sản phẩm. Dòng MX dùng giao diện `dark` |
| Thẻ sản phẩm | Ảnh trên `surface-muted` (với MX: thẻ `mx-charcoal-raised`), tên sản phẩm, quy cách, liên kết "Xem chi tiết". Có một vạch 24×2px màu nhấn của sản phẩm phía trên tên |
| Khung thành phần | Viền 1px màu nhấn, bo 4px, chữ navy. **Chỉ dùng trên trang chi tiết**, tối đa một hàng |
| Đường kẻ | 1px `line`; riêng đầu khối dùng 1px `navy`, giống đường kẻ dưới logo |
| Nút | Chính: nền navy, chữ trắng. Phụ: viền navy. Cao tối thiểu 44px |
| Dải liên hệ | Liên kết tới Điểm bán và Hợp tác B2B. Không có giá, không có giỏ hàng |
| Thanh xem trước | Chỉ hiện ở chế độ preview: "Bản xem trước: nội dung nháp, chưa xuất bản", kèm nút thoát |
| Khung chờ | Viền nét đứt, chữ theo ngôn ngữ trang: `[제공 대기: …]`, `[TO BE SUPPLIED: …]`, `[CHỜ CUNG CẤP: …]`. Chỉ hiện trong preview |

## 6. Hình ảnh

- Chỉ dùng ảnh **đúng bao bì thật**. Không đổi hình dáng, tỷ lệ, logo, chữ hay màu. Chỉ được cắt khung.
- Ảnh nền trắng đặt trên `surface-muted` dùng `mix-blend-mode: multiply`, để nền ảnh hòa vào khung mà không phải sửa ảnh.
- Ảnh dòng MX (lọ nền trắng) đặt trong thẻ sáng nằm trên khu vực nền than.
- Ảnh chưa được phép công bố có `publicRelease = false` trong CMS. Khách không xem hay liệt kê được, chỉ hiện trong preview của nhân viên.
- Danh sách ảnh đã kiểm tra và sai lệch: [docs/image-audit.md](docs/image-audit.md).

## 7. Chuyển động

- Chỉ dùng `opacity` và `transform`. Thời lượng 160–240ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
- Chỉ có một chuyển động chủ đích: ảnh sản phẩm ở hero hiện dần lúc tải trang (720ms, dịch 16px, opacity). Các khối khác không có hiệu ứng xuất hiện.
- Hover thẻ sản phẩm: ảnh phóng 1.02, mũi tên dịch 4px.
- Mũi tên và biểu tượng vẽ bằng SVG cùng nét 1.5px; không dùng ký tự Unicode hay emoji làm icon.
- Vùng chọn chữ (`::selection`) nền navy, chữ trắng.
- Mở menu: trượt và mờ dần trong 200ms.
- `prefers-reduced-motion: reduce`: tắt mọi chuyển động và hiển thị ngay ở trạng thái cuối.
- Không dùng scroll scenes của Taste Skill (theo CLAUDE.md).

## 8. Khả năng truy cập

- Chữ thường có tương phản ≥ 4.5:1 (các cặp màu đã đo ở §2).
- Viền focus luôn hiện khi điều hướng bằng bàn phím. Có link "Chuyển đến nội dung" đầu trang.
- `lang` đúng theo từng ngôn ngữ. Ảnh có `alt` theo ngôn ngữ, lấy từ CMS.
- Vùng bấm tối thiểu 44×44px.
