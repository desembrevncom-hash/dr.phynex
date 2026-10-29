# Dr.PhynEX: giai đoạn 3, trạng thái

Ngày: 29/10/2026. Nhánh `phase-3-brand-design`, tạo từ `phase-2-foundation` (mốc `e1643f6`). Chỉ chạy Local, giữ `noindex`, chưa triển khai công khai.

## 1. Trạng thái thiết kế: đã có logo và bao bì, chờ chọn hướng (xem §1b, §1c, §6)

Ngày 29/10 đã nhận logo SVG và file thiết kế bao bì của 4 sản phẩm. Màu đã xác nhận từ các file này. Font chưa xác nhận.

Chưa làm: DESIGN.md và dựng trang. Hai việc này chờ bạn chọn một trong hai hướng ở §6, và chờ bạn xác nhận nội dung được phép công bố. Tôi không dựng giao diện bằng sản phẩm hay ảnh giả.

## 1b. Logo đã nhận (29/10/2026)

Tệp gốc: `brand-assets/logo/drphynex-logo-original.svg`, xuất từ Adobe Illustrator 24.1, viewBox 1280×462. Bản sao giữ nguyên byte (SHA-256 `546c7178…41e6`); chưa chỉnh sửa gì.

**Đọc từ tệp (đã xác nhận)**
- Cấu trúc: chữ "Dr.PhynEX" và ký hiệu ™, bên dưới là một đường kẻ ngang chạy hết chiều rộng. Đuôi chữ "y" nối xuống đường kẻ này. Dưới đường kẻ là dòng chữ "BIOSCIENCE DERMATOLOGY" viết hoa, giãn chữ rộng.
- Màu (đúng mã trong SVG):
  - Navy `#003A70`: "Dr.Phyn", ™, đường kẻ và dòng chữ phụ.
  - Đỏ `#CE0E2D`: "EX".
  - Lớp `#FFFFFF` có khai báo trong SVG nhưng không phần nào dùng.
- Toàn bộ chữ đã chuyển thành đường nét (không có thẻ `<text>`), nên tệp **không cho biết tên font**. Chữ thuộc kiểu sans-serif không chân; tên font cần bạn xác nhận.

**Tương phản (WCAG)**
| Cặp màu | Tỉ lệ | Đánh giá |
|---|---|---|
| Navy trên trắng | 11.42:1 | Đạt AA/AAA cho chữ thường |
| Đỏ trên trắng | 5.64:1 | Đạt AA cho chữ thường |
| Navy trên xám rất nhạt `#F5F6F8` | 10.56:1 | Đạt |
| Đỏ trên xám rất nhạt `#F5F6F8` | 5.21:1 | Đạt AA |
| Đỏ trên navy | 2.03:1 | **Không đạt**: logo màu không đặt được trên nền navy |

**Hệ quả cho thiết kế (đề xuất, chưa chốt)**
- Logo màu chỉ đặt trên nền trắng hoặc xám rất nhạt. Điều này hợp với hướng Korean Clinical Minimalism.
- Navy `#003A70` là ứng viên cho màu chữ nhấn, liên kết và nút chính. Đỏ `#CE0E2D` chỉ nên dùng điểm xuyết rất ít, vì đỏ trên web dễ bị hiểu là lỗi hoặc cảnh báo. Màu báo lỗi của form cần tách khỏi màu đỏ thương hiệu.
- Ở chiều ngang dưới khoảng 160px, dòng "BIOSCIENCE DERMATOLOGY" quá nhỏ để đọc. Nên có phiên bản logo chỉ có chữ "Dr.PhynEX" cho header trên mobile và favicon, nhưng **chỉ khi thương hiệu cung cấp hoặc cho phép**; tôi không tự cắt hay sửa logo.
- Dòng "BIOSCIENCE DERMATOLOGY" là chữ có trong logo. Website không tự diễn giải nó thành câu chuyện hay công dụng khi chưa có tài liệu.

**Cần thêm về logo**
- [ ] Bản logo trắng hoặc một màu (cho nền tối, ảnh, footer navy). Nếu không có, website sẽ không đặt logo trên nền tối.
- [ ] Có phiên bản rút gọn (không dòng chữ phụ) hoặc biểu tượng cho favicon không? Có được phép bỏ dòng chữ phụ ở kích thước nhỏ không?
- [ ] Vùng an toàn và kích thước tối thiểu (nếu guideline có).
- [ ] Tên font của logo và font dùng trên bao bì.
- [ ] Màu chuẩn in (Pantone/CMYK), nếu có, để đối chiếu với `#003A70` và `#CE0E2D`.

## 1c. Bao bì 4 sản phẩm đã nhận (29/10/2026)

Bản sao trong `brand-assets/packaging/` (không commit). Mỗi sản phẩm có hai tệp: hộp đơn (`_box`) và bao bì trong (`_tube`, `_pouch`, `_vial`). Đây là các file thiết kế cuối, xuất từ Illustrator 24.1, dùng cho hàng nhập về Việt Nam. Chữ trong file đã chuyển thành nét vẽ, nên tôi đọc bằng cách render PDF thành ảnh, không trích được văn bản.

| Sản phẩm (tên người dùng cung cấp) | Tên in trên hộp | Dòng | Quy cách |
|---|---|---|---|
| Kem dưỡng Dr. PhynEX RX Matrix Balm | RX MATRIX BALM | RX | 40 mL, tuýp PE trắng mờ trong hộp giấy |
| Mặt nạ Dr. PhynEX RX Matrix Sheet | RX MATRIX SHEET | RX | 25 mL × 5 miếng, túi nhôm trong hộp giấy |
| Tế bào gốc Dr. PhynEX MX-01 FORMA | MX–01 FORMA, MATRIX BOOST SHOT | MX | 8 mL × 5 lọ, có khay và hộp nắp |
| Tế bào gốc DR. PHYNEX MX-02 LUMA | MX–02 LUMA, MATRIX BOOST SHOT | MX | 8 mL × 5 lọ, có khay và hộp nắp |

**Hai hệ hình ảnh khác nhau (đã xác nhận từ file)**

*Dòng RX*
- Hộp trắng, in 3 màu pha (spot color):
  - Pantone 186 C (đỏ);
  - Pantone 654 C (navy, khớp với `#003A70` của logo);
  - Pantone 1235 C (vàng cam).
- Logo màu đặt trên nền trắng.
- Tên sản phẩm viết hoa, sans-serif đậm: "RX" màu đỏ, phần còn lại màu navy.
- Dòng phụ dùng sans-serif nét mảnh, ví dụ hộp Balm in "Advanced Post-Procedure Rejuvenating System".
- Các khung thông tin bo góc. Có hai kiểu: viền mảnh màu đỏ, vàng hoặc navy; hoặc nền đặc màu với chữ trắng.
- Có khung "POWERED BY PhynEX™ REGENERATIVE COMPLEX" nền đỏ.

*Dòng MX*
- Hộp màu than gần đen, in CMYK cộng mực trắng, có ép nổi và phủ UV.
- Giữa hộp là chữ "X" lớn hiệu ứng ánh sáng.
- Logo đảo màu: "Dr.Phyn" trắng, "EX" mang màu nhấn của từng sản phẩm.
- Màu nhấn:
  - FORMA: xanh cyan C95 M5 Y15 K0;
  - LUMA: hồng C5 M70 Y0 K0.
- Nền: C65 M55 Y50 K70.

| Màu | Nguồn | Giá trị in | sRGB dùng cho web |
|---|---|---|---|
| Navy | Logo SVG / Pantone 654 C | Pantone 654 C | `#003A70` (**đã xác nhận** từ SVG) |
| Đỏ | Logo SVG / Pantone 186 C | Pantone 186 C | `#CE0E2D` (**đã xác nhận** từ SVG) |
| Vàng cam | Hộp RX | Pantone 1235 C | `#FFB81C` (ước lượng theo giá trị sRGB Pantone công bố, cần đối chiếu) |
| Cyan FORMA | Hộp MX-01 | C95 M5 Y15 K0 | khoảng `#00A3CF` (ước lượng từ CMYK, cần đối chiếu bản in) |
| Hồng LUMA | Hộp MX-02 | C5 M70 Y0 K0 | khoảng `#EC6BA8` (ước lượng) |
| Than MX | Hộp MX | C65 M55 Y50 K70 | khoảng `#23272A` (ước lượng) |

Vàng `#FFB81C` trên nền trắng chỉ đạt khoảng 1.8:1, nên **không dùng cho chữ**; chỉ dùng làm nền hoặc viền, với chữ navy đặt lên trên. Cyan và hồng cũng cần kiểm tra lại tương phản trước khi dùng cho chữ.

**Font:** cả 8 file đều không còn thông tin font, vì chữ đã chuyển thành nét. Theo hình dáng chữ, bao bì dùng sans-serif hình học đậm cho tên sản phẩm và sans-serif mảnh cho dòng phụ. **Tên font chưa xác nhận.**

**Chữ in trên bao bì là thông tin công dụng hoặc thành phần.** Ví dụ:
- "PDRN 20,000 ppm", "PANTHENOL 50,000 ppm", "MILK EXOSOME", "NMN & NAD+";
- "REJUVENATING · ANTI-WRINKLE · FIRMING · ELASTICITY";
- "SKIN BRIGHTENING", "FOR PROFESSIONAL USE ONLY".

Website chỉ dùng những dòng này **sau khi bạn xác nhận chúng được phép công bố** và có tài liệu nguồn trong CMS. Tôi chưa nhập gì vào CMS.

**Thông tin khác thấy trong file (chưa dùng):**
- Bảng thông số in có tên công ty 이스터너생명과학(주) / ENBIOSCIENCE CO., LTD.
- Hộp mặt nạ có mã REF dạng `PX-RX-…`.

Không đưa lên website khi chưa được xác nhận.

**Ảnh trong `F:\Downloads\Dr.Phynex`:**
- Các thư mục sản phẩm và `New folder` chứa ảnh tên "Generated Image…" và "Ảnh ChatGPT…", tức là ảnh do AI tạo.
- Tôi chưa mở những ảnh này. Theo yêu cầu, website không được làm thay đổi hình dáng bao bì, logo hay chữ trên ảnh sản phẩm, nên chỉ dùng ảnh AI nếu bạn xác nhận chúng giữ đúng bao bì thật.
- Ảnh chụp thật hoặc ảnh render 3D từ chính file thiết kế sẽ an toàn hơn.

**Gợi ý của UI/UX Pro Max (đã chạy, không dùng):** công cụ đề xuất kiểu Liquid Glass, đen và vàng ánh kim, font Cormorant/Montserrat. Gợi ý này mâu thuẫn với màu đã có trong logo và bao bì, và Cormorant không có chữ Hàn. Theo thứ tự ưu tiên trong CLAUDE.md (brief rồi mới đến tài liệu thương hiệu), tôi không dùng.

**Font web đã kiểm tra trên Google Fonts (29/10/2026):**
- Có subset `vietnamese`: Noto Sans KR, Noto Serif KR, Gothic A1, Inter, Be Vietnam Pro, Manrope, Montserrat, IBM Plex Sans, Plus Jakarta Sans, Archivo, Hanken Grotesk, Newsreader, Fraunces, Source Serif 4.
- **Không có** subset `vietnamese`: IBM Plex Sans KR, Nanum Gothic.
- Ba font Hàn (Noto Sans KR, Noto Serif KR, Gothic A1) có dải chữ Hangul.

## 2. Tài nguyên cần để bắt đầu thiết kế

Danh sách đầy đủ: [phase-1-plan.md §5](phase-1-plan.md). Đây là **mức tối thiểu** cho trang chủ và một trang sản phẩm đại diện:

**Bắt buộc**
- [x] Logo gốc dạng vector: đã nhận bản màu SVG (29/10). Còn thiếu bản trắng/một màu, xem §1b.
- [ ] Brand guideline nếu có: mã màu, font, vùng an toàn của logo. Nếu không có, xác nhận là được phép đề xuất màu và font tạm thời từ logo và bao bì.
- [ ] Một sản phẩm đại diện (bạn sẽ gửi bao bì 4 sản phẩm), gồm:
  - tên chính thức (ko, kèm en/vi nếu có), dòng sản phẩm, dung tích;
  - ảnh bao bì nền trơn độ phân giải cao (PNG hoặc TIFF, tốt nhất có nền trong suốt) và quyền sử dụng ảnh;
  - mô tả ngắn, công dụng **được phép công bố** kèm tài liệu nguồn, thành phần chính, bảng INCI, cách dùng, lưu ý.
- [ ] Tiêu đề và đoạn giới thiệu cho trang chủ (tiếng Hàn là bản gốc), hoặc tài liệu để trích nội dung.

**Nên có**
- [ ] Ảnh texture, ảnh lifestyle hoặc ảnh chiến dịch (kèm quyền sử dụng).
- [ ] Tài liệu mẫu đã in: hộp, catalogue, brochure. Giúp đối chiếu màu in với màu màn hình.
- [ ] Font đang dùng trên bao bì (tên font hoặc file). Cần xác nhận font có hỗ trợ tiếng Hàn và tiếng Việt, hoặc chọn font đi kèm.
- [ ] Mô tả 1–2 thành phần hoặc công nghệ chính kèm nguồn, nếu muốn có trên trang chủ.

**Cách gửi**
- Chép tệp vào thư mục `brand-assets/` ở gốc dự án (thư mục này đã được thêm vào `.gitignore`), rồi báo tôi.
- Ảnh và nội dung **được phép công bố** sẽ được tải lên CMS sau khi bạn xác nhận. Tài liệu nội bộ dùng làm nguồn cho công dụng sẽ vào **Tài liệu nguồn** (riêng tư).

## 3. Kiểm tra quyền truy cập tệp

Cách kiểm tra:
- tạo một tài khoản QA tạm với mật khẩu ngẫu nhiên;
- tải lên một tệp vào **SourceDocuments** và một ảnh vào **Media**;
- gọi các đường dẫn dưới đây bằng `curl` trên dev server khi không đăng nhập;
- xóa tệp và tài khoản sau khi xong (database còn 0 users, 0 media, 0 source documents).

| Yêu cầu (khách, không đăng nhập) | Kết quả |
|---|---|
| `/api/source-documents/file/<tên>` (kể cả `?download=true`) | 403 |
| `/api/source-documents`, `/api/source-documents/<id>` | 403 |
| `/private-uploads/source-documents/<tên>`, `/source-documents/<tên>`, `/<tên>` | 404 |
| Đường dẫn vòng (`..%2F`) qua `/api/media/file/` hoặc `/api/source-documents/file/` | 403 |
| `/_next/static/../../private-uploads/...` (`--path-as-is`) | 404 |
| `/api/media/file/<tên tệp riêng>` | 500 với thông báo chung, không trả nội dung tệp |
| Admin: `/api/source-documents/file/<tên>` | 200 (đúng) |
| Khách: `/api/media/file/<ảnh công khai>` | 200 (đúng) |
| `/media/<ảnh>` (đường dẫn tĩnh) | 404; ảnh chỉ đi qua API |

Tệp riêng nằm ngoài `public/`, nên Next.js không phục vụ tĩnh. Payload kiểm tra quyền `read` trước khi trả tệp.

**Cần lưu ý: Media là công khai.** Khách có thể **liệt kê** toàn bộ thư viện qua `/api/media` (đã thử: trả về tên tệp, kích thước, alt), kể cả ảnh gắn với sản phẩm chưa xuất bản. Vì vậy:
- Quy tắc biên tập: **chỉ tải lên Media ảnh đã được phép công bố**. Ảnh chưa ra mắt và tài liệu nội bộ để ở SourceDocuments. Quy tắc này đã ghi trong mô tả của Media trong admin.
- Nếu cần tải ảnh lên trước ngày ra mắt, có thể thêm trường "được phép công bố" và giới hạn quyền đọc Media theo trường này. Việc này đổi backend và cần migration, nên chờ bạn duyệt.

## 4. Đã làm trong giai đoạn này

- Nâng `vitest` lên 4.1.12 để vá một lỗ hổng critical mới công bố (chỉ dùng khi phát triển). Bảng theo dõi các mục còn lại: [dependency-audit.md](dependency-audit.md).
- Thêm mô tả quy tắc công bố cho Media trong admin (chỉ là văn bản, không đổi schema).
- Thêm `brand-assets/` vào `.gitignore`.
- Giữ `noindex, nofollow` và `robots.txt` chặn toàn bộ (đã kiểm tra lại).
- `npm test` 14/14, `typecheck` và `lint` sạch. Chưa đổi truy vấn hay hiển thị nội dung.

## 5. Bước tiếp theo khi có tài liệu

1. Đọc logo, bao bì và guideline, rồi trích màu và ghi nhận font thật.
2. Chạy UI/UX Pro Max để đề xuất hệ thống thiết kế. Dùng Taste Skill để phát triển **hai hướng** khác nhau về bố cục và typography trong khuôn khổ Korean Clinical Minimalism, rồi đề xuất một hướng.
3. Sau khi bạn chọn hướng: tạo DESIGN.md, ghi rõ phần đã xác nhận và phần đề xuất tạm.
4. Nhập sản phẩm đại diện vào CMS và duyệt bản dịch. Dựng trang chủ và trang sản phẩm bằng dữ liệu thật.
5. Rà soát bằng Impeccable. Kiểm tra ở 390/768/1440 px, ba ngôn ngữ, bàn phím, reduced motion; chạy lại kiểm thử quyền. Gửi bạn preview và ảnh chụp để duyệt.

## 6. Hai hướng thiết kế (đề xuất, chờ chọn)

Cả hai hướng đều theo Korean Clinical Minimalism:
- nền trắng hoặc xám rất nhạt;
- navy `#003A70` là màu chữ và màu nhấn chính, đỏ `#CE0E2D` chỉ điểm xuyết;
- logo màu chỉ đặt trên nền sáng;
- chuyển động nhẹ, chỉ dùng opacity và transform, có phương án `prefers-reduced-motion`.

Ảnh hộp MX màu tối được đặt như một tấm ảnh sản phẩm trên trang sáng. Không chuyển cả trang sang nền tối.

**A. Clinical Label: đề xuất**
- Ngôn ngữ thiết kế lấy trực tiếp từ hộp dòng RX:
  - tiêu đề sans-serif đậm viết hoa, chữ dòng sản phẩm màu đỏ, tên sản phẩm màu navy;
  - đường kẻ navy, giống đường kẻ dưới logo, dùng để ngăn các phần;
  - thành phần chính đặt trong khung bo góc viền đỏ, vàng hoặc navy, giống trên hộp;
  - INCI và cách dùng trình bày như bảng thông số.
- Bố cục: lưới chặt, nhiều hàng kẻ. Ảnh sản phẩm đặt trên nền xám nhạt; mỗi sản phẩm có thẻ với đường kẻ trên.
- Typography (tạm): một sans-serif hình học có chữ Việt cho Latin (ứng viên Manrope hoặc Plus Jakarta Sans), Noto Sans KR cho tiếng Hàn. Đậm 700–800 cho tiêu đề, 300–400 cho chữ thường.
- Lý do đề xuất:
  - website sẽ khớp với bao bì khách cầm trên tay;
  - lưới kiểu bảng thông số giúp hiển thị nhiều thông tin có nguồn mà vẫn gọn;
  - hợp với điện thoại;
  - chỉ dùng sans-serif nên chữ Hàn và chữ Việt đồng đều.

**B. Editorial Lab**
- Kiểu tạp chí:
  - tiêu đề serif mảnh (ứng viên Newsreader hoặc Source Serif 4, kèm Noto Serif KR cho tiếng Hàn);
  - chữ thường dùng sans-serif;
  - mỗi sản phẩm có một ảnh lớn tràn ngang;
  - danh sách đánh số 01/02/03 và nhiều khoảng trắng.
- Ưu điểm: cảm giác cao cấp, có nhịp kể chuyện.
- Nhược điểm:
  - bao bì không dùng serif, nên website lệch khỏi bộ nhận diện;
  - cần nhiều ảnh lớn chất lượng cao, mà hiện chỉ có file thiết kế và ảnh do AI tạo;
  - phần kể chuyện cần nội dung thương hiệu, mà hiện chưa có.

Sau khi bạn chọn hướng: tạo DESIGN.md (tách thông số đã xác nhận và đề xuất tạm), dựng bằng Taste Skill, rồi rà soát bằng Impeccable.

## 7. Trang chủ đại diện (29/10/2026, hướng A Clinical Label)

**Đã làm**
- [DESIGN.md](../DESIGN.md): tách rõ [XÁC NHẬN] và [TẠM].
- Kiểm tra ảnh: [image-audit.md](image-audit.md). Dùng 4 ảnh cắt khung cho preview. Các ảnh còn lại có sai lệch về nắp tuýp hoặc chữ trên nhãn lọ.
- Backend (migration `20261029_021524_media_release_and_line_appearance`):
  - Media có cờ `publicRelease`, mặc định tắt. Khách không xem, tải hay liệt kê được ảnh chưa bật cờ. Chỉ editor/admin bật được. Có trường `reviewNote` nội bộ.
  - Product line có `appearance` (light/dark); product có `accent` (navy, RX red, MX cyan, MX pink).
  - Chế độ xem trước `/preview?path=…`: yêu cầu phiên admin của nhân viên **và** draft mode; nội dung được đọc bằng quyền của chính người đó. Khách luôn nhận nội dung công khai đã duyệt. Đường dẫn được kiểm tra để chống chuyển hướng ra ngoài. Sitemap luôn chỉ lấy nội dung công khai.
- Nội dung nháp: 2 dòng (RX, MX) và 4 sản phẩm. Chỉ gồm tên và quy cách lấy từ bao bì, `translationStatus = in-review`, **chưa xuất bản**. Script: `scripts/import-preview-content.ts`.
- Trang chủ: header có menu mobile, chuyển ngôn ngữ KO/EN/VI; hero; khối dòng RX nền trắng; khối dòng MX nền than với màu nhấn từng sản phẩm; khối "Nơi có Dr.PhynEX"; footer. Chỗ thiếu nội dung có khung `[CHỜ CUNG CẤP: …]`, khung này chỉ hiện trong preview.
- Font: Plus Jakarta Sans (tiêu đề Latin/Việt) và Noto Sans KR (chữ thường, toàn bộ tiếng Hàn), tự host qua `next/font`.

**Kiểm tra (bản build production, `npm run build` + `npm start`)**
| Hạng mục | Kết quả |
|---|---|
| 3 ngôn ngữ × 390/768/1440 px | Không tràn ngang (scrollWidth = viewport), không ảnh lỗi, font đúng. Ảnh chụp: `brand-assets/screenshots/phase-3-home/` |
| Xuống dòng | Sửa lỗi "Dr. / PhynEX" bị ngắt dòng ở tên tiếng Việt (giữ thương hiệu trên một dòng) |
| Menu mobile | Mở/đóng, `aria-expanded`, phím Esc đóng và trả focus về nút |
| Chuyển ngôn ngữ | Giữ đúng trang (/ko → /en) |
| Liên kết sản phẩm | 7 liên kết tới trang chi tiết và trang dòng; trang chi tiết mở được trong preview |
| Bàn phím | Tab đầu tiên vào "Chuyển đến nội dung"; viền focus hiện rõ trên nền sáng và nền than |
| Reduced motion | Ảnh chụp `home-vi-390-reduced.jpg`; chỉ có một chuyển động (ảnh hero) và nó tắt khi bật reduced motion |
| Khách (không đăng nhập) | `/ko /en /vi` 200, hiện trạng thái chưa có nội dung; `/vi/products/rx-matrix-balm` 404; ảnh `/api/media/file/…` 403; `/api/media` và `/api/products?draft=true` trả 0 tài liệu |
| `/preview` khi chưa đăng nhập | Chuyển tới `/admin/login` |
| Kiểm thử quyền | `npm test` 15/15 (thêm kiểm thử quyền Media) |
| typecheck, lint, build | Sạch |
| Impeccable | Chạy `impeccable detect`: 0 phát hiện. Rà soát theo craft floor **một luồng (degraded, không dùng sub-agent)**; đã sửa: bỏ eyebrow trên H1, thay ký tự "→" bằng icon SVG, chỉ giữ một chuyển động, tạo kiểu cho vùng chọn chữ |

**Còn mở**
- Tiêu đề và đoạn giới thiệu trang chủ, mô tả hai dòng RX/MX: chờ nội dung.
- Ở 390 px, dòng chữ "BIOSCIENCE DERMATOLOGY" trong logo header quá nhỏ để đọc. Cần bản logo rút gọn hoặc được phép bỏ dòng phụ.
- Trên mobile, ảnh hộp Balm xuất hiện ở hero rồi lặp lại ngay ở thẻ đầu dòng RX. Cần chọn ảnh hero riêng (field `HomePage.heroImage`), ví dụ ảnh nhóm sản phẩm hoặc ảnh lifestyle.
- Tên tiếng Việt "Tế bào gốc…" do khách cung cấp. Tôi chuẩn hóa "DR. PHYNEX" thành "Dr. PhynEX" theo quy tắc tên thương hiệu. Cụm "tế bào gốc" nên được đối chiếu pháp lý trước khi công bố.
- Nhãn lọ ghi 이스터너생명과학(주) / ENBIOSCIENCE CO., LTD ở mục "[화장품제조업자/화장품책임판매업자]" (nhà sản xuất / người chịu trách nhiệm đưa ra thị trường theo luật Hàn). Website **chưa** dùng thông tin này. Vai trò chủ thương hiệu và đơn vị phân phối tại Việt Nam vẫn chưa xác định.
- Tài khoản QA tạm đã xóa. Để xem preview, bạn cần tạo tài khoản admin tại `/admin`.
