# Kiểm tra ảnh sản phẩm

Ngày: 29/10/2026. Nguồn: `F:\Downloads\Dr.Phynex`. Tôi đã mở và xem toàn bộ 22 tệp ảnh: 18 JPG/PNG và 3 PSD; riêng PSD được đọc ảnh ghép (composite) bằng script, vì máy không có Photoshop. Các ảnh được đối chiếu với file thiết kế trong `brand-assets/packaging/` về hình dáng, tỷ lệ, nắp, logo, chữ và màu.

**Kết luận này chỉ để chọn ảnh dùng trong bản xem trước. Mọi ảnh vẫn cần bạn xác nhận trước khi dùng công khai.** Không ảnh nào được tải lên CMS ở chế độ công khai.

## Dùng được cho bản xem trước

Ảnh chỉ được cắt khung để lấy một sản phẩm; không chỉnh màu, không sửa chữ hay hình dáng. Bản đã xuất nằm trong `brand-assets/preview-images/` (git-ignored).

| Tệp xuất | Nguồn | Đối chiếu | Lưu ý |
|---|---|---|---|
| `rx-matrix-balm-box.webp` | `1.Kem dưỡng…/Generated-Image-October-23,-2026---3_12PM.png` (nền trong suốt) | Mặt trước hộp khớp file thiết kế: logo, tên, dòng phụ, 7 khung thành phần, `Net 40mL / 1.35 fl.oz.`. Tỷ lệ mặt trước khoảng 1:4.1, khớp bản dao | Chữ thành phần ở cạnh hộp quá nhỏ để đối chiếu từng chữ |
| `rx-matrix-sheet-pouch.webp` | `2.Mặt nạ…/Generated Image October 23, 2026 - 5_34PM.psd` (ảnh ghép, mặt trước túi) | Khớp file túi 155×120 mm: bố cục, khung thành phần, `741940.5 ppm`, `Net 25mL / 0.84 fl.oz.` | Tệp gốc còn có mặt sau; chỉ cắt mặt trước |
| `mx-02-luma-vial.webp` | `New folder/Generated Image October 16, 2026 - 11_30AM.jpg` (lọ trái) | Nhãn trước khớp file nhãn 68×22 mm: `MX–02 LUMA`, `MATRIX BOOST SHOT`, `8mL / 0.27 fl. oz.`. Nhãn sau trong tệp gốc cũng khớp. Nắp nhôm bạc và đầu trong khớp mô tả "투명헤드실버티어캡" | Ảnh có hai lọ; chỉ cắt lọ mặt trước |
| `mx-01-forma-vial.webp` | `New folder/Generated Image October 16, 2026 - 1_46PM.jpg` (ô 0°) | Nhãn trước khớp file nhãn: `MX–01 FORMA`, `8mL / 0.27 fl. oz.`, màu cyan | **Các ô mặt sau trong cùng tệp có lỗi chữ Hàn** (ví dụ "화정품" thay cho "화장품", "사용기지" thay cho "사용기한"). Chỉ dùng ô 0° |

Hai tệp sau trùng nội dung với tệp đã xét (cùng mã băm MD5): `…3_15PM (1).jpg` và `…1_46PM (1).jpg`.

## Có sai lệch, cần thay hoặc xác nhận

| Tệp | Sai lệch |
|---|---|
| `1.Kem dưỡng…/Generated Image October 16, 2026 - 3_34PM.jpg`, `…3_43PM.jpg`, `Generated-Image-October-16,-2026---3_43PM.png` (tuýp có nhãn) | **Tỷ lệ nắp sai.** Bản vẽ tuýp ghi thân 105 mm, nắp 25 mm, nắp rộng 23 mm (nắp/thân ≈ 0.24). Trên ảnh, nắp/thân khoảng 0.37–0.5, tức nắp cao hơn rõ rệt. Phần chữ trên nhãn khớp |
| `1.Kem dưỡng…/Generated Image October 16, 2026 - 3_12PM.jpg`, `…3_15PM.jpg`, `…3_21PM.jpg` | Tuýp trắng **chưa có nhãn**: không phải ảnh sản phẩm |
| `1.Kem dưỡng…/Ảnh ChatGPT 15_26_42 16 thg 10, 2026.png` | Ảnh chụp lại bản vẽ kỹ thuật (có thước đo), chỉ 395×598 px |
| `New folder/Generated Image October 16, 2026 - 11_22AM.jpg` (LUMA) | Nhãn ghi **`5mL / 0.17 fl. oz.`**, sai so với `8mL / 0.27 fl. oz.`; có chú thích kích thước trong ảnh |
| `New folder/…11_48AM.jpg`, `…1_08PM.jpg`, `…1_31PM.jpg` (LUMA) | Nhãn ghi **`8mL / 0.17 fl. oz.`** (sai: 8 mL ≈ 0.27 fl. oz.) |
| `New folder/…1_58PM.jpg`, `…2_08PM.jpg` (LUMA, 6 góc) | **Chữ bị AI làm sai** cả mặt trước và sau, ví dụ "UPEENTION · RAGMINCE", "0.37 fl.oz", "6mL / 0.57 fl.oz", chữ Hàn sai |
| `New folder/…1_39PM.jpg` (FORMA, 6 góc) | Mặt trước khớp; mặt sau quá nhỏ để đối chiếu và nhiều khả năng có lỗi giống tệp 1:46PM. Chưa dùng |
| `2.Mặt nạ…/Generated Image October 24, 2026 - 10_33AM.psd` (2 hộp mặt nạ) | Chữ mặt trước khớp, nhưng nền đen không hợp trang sáng. Chưa dùng; có thể dùng sau nếu cần ảnh hộp |
| `1.Kem dưỡng…/Generated Image October 23, 2026 - 3_12PM.psd` và `…copy.jpg` | Cùng ảnh hộp Balm với tệp PNG đã chọn (bản nền đen và bản nền xám). Không sai lệch; dùng bản PNG nền trong suốt |

## Còn thiếu

- Ảnh hộp MX-01 và MX-02 (hộp màu than có chữ X). Hiện chỉ có ảnh lọ.
- Ảnh tuýp Balm đúng tỷ lệ nắp.
- Ảnh texture hoặc lifestyle.
- Xác nhận quyền sử dụng cho mọi ảnh trên.
