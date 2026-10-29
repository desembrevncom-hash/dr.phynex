# Nội dung sản phẩm: thông tin đã có, còn thiếu và cần xác nhận

Ngày: 29/10/2026. **Toàn bộ là bản nháp.** Sản phẩm, thành phần và ảnh đều ở trạng thái `draft`, chưa xuất bản. Duyệt nội dung là bước **riêng**, độc lập với duyệt giao diện (xem §3).

Nguồn: các file thiết kế bao bì cuối (bản nhập Việt Nam) trong `brand-assets/packaging/`. Chữ đã được chép lại từng panel vào `brand-assets/content-extract/*.md`. Hai thư mục này không đưa lên Git. Bốn file PDF đã được tải vào CMS mục **Tài liệu nguồn** (riêng tư, chỉ nhân viên xem) và gắn vào từng công dụng.

| Mã nguồn | File |
|---|---|
| B-BOX | `rx-matrix-balm_box.pdf` (260930-닥터피넥스 알엑스 매트릭스 밤 40mL 단상자…) |
| B-TUBE | `rx-matrix-balm_tube.pdf` (…밤 40mL 튜브…) |
| S-POUCH | `rx-matrix-sheet_pouch.pdf` (…시트 25mL 파우치…) |
| S-BOX | `rx-matrix-sheet_box.pdf` (…시트 25mLx5Sheets 단상자…) |
| F-BOX / F-VIAL | `mx-01-forma_box.pdf` / `mx-01-forma_vial.pdf` |
| L-BOX / L-VIAL | `mx-02-luma_box.pdf` / `mx-02-luma_vial.pdf` |

Mỗi file có 1 trang; vị trí ghi theo panel (mặt trước, mặt sau, mặt bên).

## Phân loại nguồn gốc nội dung

Mỗi sản phẩm có trường **Editorial note (internal)** theo từng ngôn ngữ. Trường này chỉ nhân viên xem; đã có kiểm thử xác nhận khách và API công khai không đọc được. Ghi chú nói rõ từng phần thuộc loại nào:

| Loại | Áp dụng cho |
|---|---|
| **CHÉP TỪ BAO BÌ** | ko: mô tả, công dụng, cách dùng, lưu ý · en: mô tả, cách dùng, lưu ý · INCI (tiếng Anh) · tên ko/en · dung tích |
| **BẢN DỊCH (AI)** | toàn bộ vi · công dụng en (bao bì tiếng Anh không có mục [효능/효과]) · tên thành phần vi |
| **AI ĐỀ XUẤT** | mô tả ngắn ở cả ba ngôn ngữ (rút gọn từ mô tả trên bao bì) · tiêu đề, giới thiệu trang chủ, mô tả dòng (xem content-drafts.md) |
| **Khách cung cấp** | tên sản phẩm tiếng Việt (29/10/2026) |

Mâu thuẫn của LUMA được ghi ở ghi chú biên tập của sản phẩm (dòng "CẦN XÁC NHẬN"), không ở phần hiển thị. Công dụng được nạp đúng như in trên hộp; tôi không tự chọn công dụng nào là đúng.

## 1. Bảng thông tin theo sản phẩm

Ký hiệu: ✅ có, kèm nguồn · ⚠️ có nhưng cần xác nhận · ⬜ trống.

### RX Matrix Balm

| Mục | Trạng thái | Nội dung / nguồn |
|---|---|---|
| Tên | ✅ | ko 닥터피넥스 알엑스 매트릭스 밤 (B-BOX mặt sau) · en RX Matrix Balm (B-BOX mặt trước) · vi do khách cung cấp |
| Dung tích | ✅ | 40 mL / 1.35 fl.oz. (B-BOX mặt trước) |
| Mô tả | ✅ | ko: B-BOX mặt sau · en: B-BOX mặt bên tiếng Anh · vi: AI dịch từ ko |
| Công dụng | ⚠️ | "피부의 미백 및 주름개선에 도움을 줍니다" (B-BOX mặt sau [효능/효과]; hộp ghi 미백 및 주름개선 이중 기능성 화장품). Cần đối chiếu phiếu công bố tại Việt Nam |
| Thành phần nổi bật | ✅ | PDRN 20,000 ppm, Milk Exosome, NMN & NAD+, Peptide Complex, Panthenol 50,000 ppm, PhynEX™ Regenerative Complex (B-BOX mặt trước). Đã liên kết: PDRN, Milk Exosome, NMN, NAD+, Panthenol |
| INCI | ✅ | Bản tiếng Anh (B-BOX mặt bên tiếng Anh); bản tiếng Hàn [전성분] ở B-BOX mặt bên |
| Cách dùng | ✅ | ko [TIP] + [용법/용량] · en [Directions] · vi AI dịch |
| Lưu ý | ✅ | ko [사용할 때의 주의사항] · en [Caution] · vi AI dịch |
| Ảnh | ⚠️ | Hộp: dùng được cho preview. Tuýp: các mockup có nắp cao hơn bản vẽ (xem image-audit.md) |
| Tài liệu nguồn trong CMS | ✅ | B-BOX |

### RX Matrix Sheet

| Mục | Trạng thái | Nội dung / nguồn |
|---|---|---|
| Tên | ✅ | ko 닥터피넥스 알엑스 매트릭스 시트 · en RX Matrix Sheet (S-POUCH mặt sau) |
| Dung tích | ✅ | 25 mL × 5 (S-BOX: 25mL x 5 Sheets, Net 125mL / 4.22 fl.oz.); 1 túi 25 mL / 0.84 fl.oz. (S-POUCH) |
| Mô tả | ✅ | ko/en: S-POUCH mặt sau · vi: AI dịch |
| Công dụng | ⬜ | Bao bì **không có** mục [효능/효과] và không ghi "기능성". Các dòng ở mặt trước (SKIN RADIANCE, CALMING & HYDRATING, COOLING EFFECT…) chưa đưa vào |
| Thành phần nổi bật | ✅ | Centella Asiatica Leaf Water 741940.5 ppm, PDRN, E.G.F, Sodium Hyaluronate, Allantoin, Plant Extract Complex (mặt trước S-POUCH/S-BOX) |
| INCI | ✅ | S-POUCH mặt sau, tiếng Anh; bản tiếng Hàn cũng có |
| Cách dùng | ✅ | ko [사용방법] · en [Directions] · vi AI dịch |
| Lưu ý | ✅ | ko có thêm mục 4 "눈 주위를 피하여 사용할 것" |
| Ảnh | ✅ preview | Mặt trước túi (từ PSD). Thiếu ảnh hộp nền sáng |
| Tài liệu nguồn trong CMS | ✅ | S-POUCH |

### MX-01 FORMA

| Mục | Trạng thái | Nội dung / nguồn |
|---|---|---|
| Tên | ✅ | ko 닥터피넥스 엠엑스 01 포마 · en MX-01 FORMA (F-BOX) |
| Dung tích | ✅ | 8 mL × 5 lọ, Net 40 mL / 1.35 fl.oz. (F-BOX); lọ 8 mL / 0.27 fl.oz. (F-VIAL) |
| Mô tả | ✅ | ko: F-BOX mặt sau · en: F-BOX mặt bên ("PDRN derived from salmon") · vi: AI dịch |
| Công dụng | ⚠️ | "피부의 주름개선에 도움을 줍니다" (F-BOX [효능/효과]; 주름개선 기능성 화장품). Cần đối chiếu phiếu công bố tại Việt Nam |
| Thành phần nổi bật | ✅ | PDRN X Milk Exosome, 3GF Regenerative System, Peptide Complex, NMN+NAD+ (mặt trên F-BOX) |
| INCI | ✅ | F-BOX mặt bên, tiếng Anh. Bản tiếng Hàn có trên hộp nhưng chưa chép (chữ rất nhỏ) |
| Cách dùng / Lưu ý | ✅ | ko/en theo F-BOX · vi AI dịch |
| Ảnh | ⚠️ | Chỉ có ảnh lọ (mặt trước). Thiếu ảnh hộp |
| Tài liệu nguồn trong CMS | ✅ | F-BOX |

### MX-02 LUMA

| Mục | Trạng thái | Nội dung / nguồn |
|---|---|---|
| Tên | ✅ | ko 닥터피넥스 엠엑스 02 루마 · en MX-02 LUMA (L-BOX) |
| Dung tích | ✅ | 8 mL × 5 lọ, Net 40 mL / 1.35 fl.oz.; lọ 8 mL / 0.27 fl.oz. |
| Mô tả | ✅ | ko: L-BOX mặt sau · en: L-BOX mặt bên · vi: AI dịch |
| Công dụng | ⚠️ **mâu thuẫn** | Hộp và nhãn lọ ghi "미백 및 주름개선 이중 기능성 화장품", nhưng [효능/효과] chỉ ghi "피부의 주름개선에 도움을 줍니다". Đã nạp đúng như in; mâu thuẫn ghi trong ghi chú biên tập nội bộ; cần thương hiệu xác nhận |
| Thành phần nổi bật | ✅ | PDRN X Milk Exosome, 17 Amino Acid Complex, Vitamin Complex (mặt trên L-BOX) |
| INCI | ✅ | L-BOX mặt bên, tiếng Anh |
| Cách dùng / Lưu ý | ✅ | ko/en theo L-BOX · vi AI dịch |
| Ảnh | ⚠️ | Chỉ có ảnh lọ (mặt trước). Thiếu ảnh hộp |
| Tài liệu nguồn trong CMS | ✅ | L-BOX |

### Thành phần (9 mục, nháp)

PDRN (Sodium DNA), Milk Exosome, NMN, NAD+, Panthenol, Centella Asiatica Leaf Water, EGF (sh-Oligopeptide-1), Sodium Hyaluronate, Allantoin. Mỗi mục chỉ có tên và tên INCI; **chưa có mô tả**, vì không có tài liệu nguồn nào mô tả từng thành phần.

## 2. Đã thấy trên bao bì nhưng chưa đưa lên website (chờ quyết định)

- Các dòng trên mặt trước như "Advanced Post-Procedure Rejuvenating System", "REJUVENATING · ANTI-WRINKLE · FIRMING · ELASTICITY", "SKIN BRIGHTENING", "4-FREE FORMULA", "Bio-tech sheet".
- "MADE BY ISO 22716:2007 … (ISO-GMP)": tuyên bố chứng nhận, cần bản chứng nhận trước khi đăng.
- "DEVELOPED BY JANG JINU": tên một cá nhân; cần đồng ý trước khi đăng.
- Thông tin doanh nghiệp: 이스터너생명과학(주) / ENBIOSCIENCE CO., LTD, ghi ở mục "화장품제조업자/화장품책임판매업자" (nhà sản xuất / người chịu trách nhiệm đưa ra thị trường theo luật Hàn). Số điện thoại tư vấn. Chưa dùng; không suy ra vai trò chủ thương hiệu hay nhà phân phối.
- Mã vạch EAN: Balm 8809925805170 · FORMA 8809925805163 · LUMA 8809925805156. Mã của Sheet chưa thấy trên file. Chưa nhập vào trường SKU, vì SKU và EAN có thể khác nhau.
- Mặt nạ có mã REF `PX-RX-56131-8386-001A`.
- Thông số tuýp: tuýp PE 30 phi trắng mờ, nắp lớn trắng mờ, chiều dài nhập kho 108 mm (B-TUBE).

## 3. Quy trình xác nhận nội dung (tách khỏi duyệt giao diện)

Duyệt giao diện = duyệt các commit mốc trên nhánh `phase-3-brand-design`. Duyệt nội dung diễn ra trong CMS, theo từng sản phẩm và từng ngôn ngữ:

1. Thương hiệu kiểm tra bản chép tiếng Hàn so với bao bì (ko đang ở `in-review`).
2. Kiểm tra bản tiếng Anh (lấy từ bao bì; phần công dụng tiếng Anh do AI dịch).
3. Người bản ngữ duyệt bản tiếng Việt (`ai-draft` → `in-review` → `approved`).
4. Đối chiếu công dụng với phiếu công bố mỹ phẩm tại Việt Nam, rồi điền tài liệu nguồn cho từng công dụng.
5. Editor đặt `approved` cho từng ngôn ngữ và bấm Publish. Đồng thời tick "Cleared for publication" cho ảnh đã được phép công bố.

Website chỉ hiển thị một ngôn ngữ khi sản phẩm đã **xuất bản** và ngôn ngữ đó đã **approved**. Duyệt giao diện không làm nội dung tự xuất bản, và ngược lại.

## 4. Tài liệu cần bổ sung (chỉ những thứ chưa có)

1. **Phiếu công bố mỹ phẩm tại Việt Nam** (hoặc danh sách công dụng được phép ghi) cho 4 sản phẩm. Cần để biết có được nói "làm sáng da / cải thiện nếp nhăn" ở trang /vi hay không.
2. **Xác nhận công dụng của MX-02 LUMA**: chức năng kép (làm sáng + cải thiện nếp nhăn) hay chỉ cải thiện nếp nhăn, vì bao bì đang ghi hai cách.
3. **Ảnh sản phẩm đúng bao bì**: tuýp Balm đúng tỷ lệ nắp; hộp MX-01 và MX-02; một ảnh hero riêng (ảnh nhóm hoặc ảnh chiến dịch).
4. **Vai trò doanh nghiệp**: ai là chủ thương hiệu, ai là đơn vị phân phối tại Việt Nam, và thông tin liên hệ được phép đăng.
5. **Quyết định về các dòng in trên mặt trước bao bì** (§2): dòng nào được đăng; bản chứng nhận ISO 22716 nếu muốn ghi; sự đồng ý nêu tên người phát triển.
6. *(Nếu muốn có trang thành phần)* Mô tả có nguồn cho các thành phần chính.
