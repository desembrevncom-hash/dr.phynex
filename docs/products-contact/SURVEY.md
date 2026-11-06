# Khảo sát 4 trang sản phẩm và luồng liên hệ — 06/11/2026

Nguồn: nhánh `products-contact` tạo từ `3fddb54` (Admin UX đã chốt). Dữ liệu CMS đọc từ database thật `drphynex` trong transaction READ ONLY (version nháp mới nhất của từng sản phẩm); trang khách đọc từ production cục bộ `localhost:3000` (build 3fddb54); preview xem bằng tài khoản thật đã đăng nhập, không lưu/duyệt/xuất bản.

**Không có nội dung nào trong bảng là "đã duyệt".** Cả 4 sản phẩm: `_status = draft`, KO/EN `in-review`, VI `ai-draft`. Nhãn nguồn lấy từ ghi chú biên tập (chỉ nhân viên thấy): "CHÉP TỪ BAO BÌ", "BẢN DỊCH (AI)", "AI ĐỀ XUẤT".

## 1. Hiện trạng theo sản phẩm

| Hạng mục | MX-01 FORMA | MX-02 LUMA | RX MATRIX BALM | RX MATRIX SHEET |
|---|---|---|---|---|
| Trang khách (ko/en/vi) | 404 (draft) | 404 (draft) | 404 (draft) | 404 (draft) |
| Tên KO / EN / VI | 닥터피넥스 엠엑스 01 포마 / MX-01 FORMA / Tế bào gốc Dr. PhynEX MX-01 FORMA | 닥터피넥스 엠엑스 02 루마 / MX-02 LUMA / Tế bào gốc Dr. PhynEX MX-02 LUMA | 닥터피넥스 알엑스 매트릭스 밤 / RX Matrix Balm / Kem dưỡng Dr. PhynEX RX Matrix Balm | 닥터피넥스 알엑스 매트릭스 시트 / RX Matrix Sheet / Mặt nạ Dr. PhynEX RX Matrix Sheet |
| Loại sản phẩm (trường riêng) | Chưa có (không gán danh mục) | Chưa có | Chưa có | Chưa có |
| Quy cách (CMS) | 8 mL × 5 | 8 mL × 5 | **40 mL** | 25 mL × 5 |
| Mô tả ngắn / mô tả | Có ×3 (ngắn: AI đề xuất) | Có ×3 | Có ×3 | Có ×3 |
| Công dụng (claim có nguồn) | 1 claim ×3 ngôn ngữ, nguồn hộp [효능/효과], có file | 1 claim ×3, có file | 1 claim ×3, có file | **Không có** (bao bì không có mục 효능/효과) |
| Thành phần chính (liên kết) | PDRN, Milk exosome, NMN, NAD+ | PDRN, Milk exosome | PDRN, Milk exosome, NMN, NAD+, Panthenol | Centella leaf water, PDRN, EGF, Sodium hyaluronate, Allantoin |
| INCI | Có (chép bao bì) | Có | Có (có ppm) | Có (có ppm) |
| Cách dùng / Lưu ý | Có ×3 | Có ×3 | Có ×3 | Có ×3 |
| Ảnh | 1 ảnh lọ, `publicRelease=false` ("Preview only") | 1 ảnh lọ, private | 1 ảnh hộp, private | 1 ảnh túi, private |
| Accent (CMS) | mx-cyan | mx-pink | rx-red | **rx-red** |

Chung:
- Không ảnh nào được phát hành công khai → khi sản phẩm được xuất bản, khách sẽ thấy khung "chưa có ảnh". Không có ảnh texture/tuýp.
- Site settings chưa có email/điện thoại/địa chỉ/giờ làm việc → **chưa có kênh liên hệ đã xác minh**; trang Liên hệ chỉ còn form lưu vào CMS.
- Điểm bán: chưa có điểm bán đã xác nhận (trang Điểm bán hiển thị trạng thái rỗng).
- Chưa có yêu cầu liên hệ nào trong CMS (0 bản ghi).

## 2. Lỗi thực tế

1. **Khách bấm 4 sản phẩm trên header và slider trang chủ đều gặp 404** vì sản phẩm còn draft. Hết khi sản phẩm được duyệt + xuất bản (không tự làm).
2. Preview không cho biết ngôn ngữ đang xem là AI-draft hay đã duyệt, cũng không hiện ghi chú "CẦN XÁC NHẬN" → người duyệt dễ hiểu nhầm nội dung đã sẵn sàng.
3. Nút "Liên hệ" trên trang sản phẩm mở form trống: mất thông tin sản phẩm khách đang xem; chủ đề không được chọn sẵn.
4. Form liên hệ: nút gửi bị khoá khi đang gửi, nhưng server không chặn bản ghi trùng (bấm lại/gửi lại cùng nội dung tạo hai bản ghi).
5. CTA "Mua ở đâu → Tìm điểm bán" dẫn tới trang chưa có điểm bán nào; đường mua thực tế duy nhất hiện nay là liên hệ.
6. VI: cách dùng Balm có hai câu lặp ý ("Sáng và tối…" và "Lấy một lượng…") — cần người duyệt bản dịch xem lại.

## 3. Mâu thuẫn — cần chủ sản phẩm quyết định (không tự chọn)

> Bảng đầy đủ, đã đối chiếu lại: `DECISIONS-M1-M8.md` (thay cho bảng dưới; M8 được sửa: bản VI dịch đúng bản KO).

| # | Nội dung | Nguồn A | Nguồn B | Đang hiển thị |
|---|---|---|---|---|
| M1 | Quy cách RX MATRIX BALM | CMS + ảnh hộp (artwork): **40 mL** | Brief 05/11 (`src/lib/product-brief.ts` và câu `redesign.balmNote` trong messages): **50 g** "đã xác nhận" | Trang sản phẩm: 40 mL (CMS). Giá trị 50 g chưa được hiển thị ở đâu trong bản đã commit |
| M2 | Màu nhận diện BALM / SHEET | CMS accent: Balm `rx-red`, Sheet `rx-red` | Brief: Balm đỏ, Sheet **vàng**; slider trang chủ: Balm **navy**, Sheet đỏ | Mỗi nơi một màu; cần chốt theo bao bì |
| M3 | Thành phần nổi bật MX-01 FORMA | Bao bì mặt trên: PDRN X MILK EXOSOME, 3GF, PEPTIDE COMPLEX, NMN+NAD+ | Brief: Sodium DNA 1% + Panthenol 1% (INCI không ghi %) | Trang sản phẩm: danh sách CMS; con số % của brief chưa hiển thị |
| M4 | MX-02 LUMA chức năng | Hộp/nhãn lọ: "미백 및 주름개선 이중 기능성" (làm sáng + nếp nhăn) | Mục [효능/효과]: chỉ nếp nhăn | Claim trang sản phẩm: chỉ nếp nhăn. **Slider trang chủ (khách đang thấy):** "Hướng đến làn da sáng và đều màu" |
| M5 | Tên gọi hoạt chất | Mô tả KO/EN/VI: "PDRN" | INCI + brief: "Sodium DNA" | Cả hai, ở các khối khác nhau |
| M6 | Tên VI MX-01/MX-02 | "Tế bào gốc Dr. PhynEX …" (khách cung cấp 29/10) | Bao bì/INCI không có thành phần tế bào gốc | Tên VI hiện "Tế bào gốc…" (có thể bị hiểu là claim) |
| M7 | Niacinamide 2% (Balm), 17 amino acid (LUMA) | Brief | INCI có Niacinamide nhưng không ghi %; LUMA INCI liệt kê axit amin | Chỉ trong dữ liệu brief, chưa hiển thị |
| M8 | Mô tả VI Balm | AI dịch: "…giúp làn da khô ráp, bị kích ứng trở nên ẩm mịn và khỏe mạnh" | Claim được duyệt nguồn chỉ là "làm sáng + nếp nhăn" | Bản nháp VI |

## 4. Thông tin cần chủ sản phẩm cung cấp/xác nhận

- Duyệt nội dung KO/EN và người bản ngữ duyệt bản dịch VI cho cả 4 sản phẩm.
- Quyết định M1–M8.
- Loại sản phẩm chính thức từng mã (ampoule/serum, balm/kem, mặt nạ giấy) và có muốn tạo danh mục trong CMS hay không.
- Ảnh được phép công khai (đúng bao bì; thêm ảnh tuýp/texture).
- Kênh liên hệ chính thức (email, điện thoại, Zalo/Kakao nếu có, giờ làm việc) và email nhận thông báo nội bộ (`FORM_NOTIFY_TO`).
- Điểm bán đã xác nhận (nếu có) hoặc xác nhận chỉ bán qua tư vấn.
