# Bảng nghiệm thu website Dr.PhynEX (Local)

Cập nhật: 29/10/2026. Nhánh `phase-3-brand-design`, mốc trước `250a5c9`. Chỉ chạy Local; chưa push, chưa triển khai công khai. **Chưa có nội dung hay ảnh nào được xuất bản.**

Bảng này gom kết quả từ các báo cáo trước: [phase-2-report.md](phase-2-report.md), [phase-3-status.md](phase-3-status.md), [product-content.md](product-content.md), [image-audit.md](image-audit.md), [dependency-audit.md](dependency-audit.md).

**Cách đọc:** "Kỹ thuật đạt" chỉ có nghĩa là trang chạy đúng (đúng mã trạng thái, phân quyền, responsive, ngôn ngữ). Nó **không** có nghĩa là trang đã được nghiệm thu. Nghiệm thu cần đủ ba điều kiện: nội dung đã duyệt, giao diện đã duyệt, và không còn việc nào trong cột cuối.

## 1. Trang và chức năng

| Trang / chức năng | Kết quả kỹ thuật (đã chạy) | Nội dung và bản dịch | Duyệt giao diện | Còn thiếu để ra mắt |
|---|---|---|---|---|
| Trang chủ `/[locale]` | 3 ngôn ngữ × 390/768/1440: không tràn ngang; preview và khách; bàn phím, menu mobile, reduced motion | Tiêu đề, giới thiệu, mô tả dòng là **AI đề xuất** (`ai-draft`), chưa duyệt | Chờ duyệt (`444b148`) | Duyệt nội dung; ảnh hero riêng; người bản ngữ duyệt ko/vi |
| Chi tiết sản phẩm `/products/[slug]` | 3 ngôn ngữ × 3 chiều rộng; thứ tự DOM tên → ảnh; khách nhận 404 khi còn nháp | Chép từ bao bì (ko/en `in-review`), vi AI dịch (`ai-draft`); mô tả ngắn là AI đề xuất; công dụng LUMA mâu thuẫn | Chờ duyệt (`444b148`) | Phiếu công bố tại VN; xác nhận LUMA; ảnh đúng bao bì; duyệt và xuất bản |
| Danh mục `/products` + lọc RX/MX | Preview: 4 sản phẩm, lọc bằng chuột và bàn phím; ngôn ngữ giữ `?line`; khách thấy trạng thái trống | Theo sản phẩm | Chờ duyệt (`812a3ed`) | Như trên |
| Trang dòng `/products/line/[slug]` | 200 trong preview; khách 404 khi còn nháp | Mô tả dòng là AI đề xuất | Chờ duyệt | Duyệt mô tả dòng |
| Thành phần `/ingredients` (+ chi tiết) | Preview: 9 thành phần, chi tiết PDRN (INCI, 4 sản phẩm, nhãn chờ); khách: trạng thái trống; ảnh 3 ngôn ngữ × 3 chiều rộng | Chỉ có tên và INCI; **không có mô tả**; một số quy đổi tên → INCI chờ xác minh (§3) | Chờ duyệt (`250a5c9`) | Mô tả thành phần có nguồn; xác minh INCI |
| Thương hiệu `/brand` | Khách: trạng thái trống; preview: nhãn chờ (ko/en/vi) | **Chưa có** hồ sơ thương hiệu; khung đề xuất ở brand-and-legal-drafts.md | Chờ duyệt | Hồ sơ thương hiệu |
| Journal `/journal` (+ chi tiết) | **DB nghiệm thu riêng**: danh sách, lọc chủ đề, chi tiết bài dài, bài chỉ có tiếng Hàn (EN/VI 404, bị vô hiệu trong bộ chuyển), chuyển ngôn ngữ giữ `?topic`, 3 ngôn ngữ × 3 chiều rộng. CMS thật: trạng thái trống (khách) | **Chưa có** bài viết | Chờ duyệt | Bài viết thật |
| Chính sách bảo mật / Điều khoản | **DB nghiệm thu**: văn bản dài, bản tiếng Việt chưa duyệt hiện trạng thái trống và không lộ nội dung, bộ chuyển vô hiệu VI; 3 ngôn ngữ × 3 chiều rộng. CMS thật: trạng thái trống | **Chưa có**; dữ liệu website thu thập đã liệt kê cho pháp lý | Chờ duyệt | Văn bản do pháp lý soạn hoặc duyệt |
| Liên hệ `/contact` | Khách và preview; form (lỗi, thành công) | Chưa có thông tin liên hệ chính thức | Chờ duyệt (`812a3ed`) | Thông tin liên hệ; email thông báo (§4) |
| Hợp tác `/partnership` | Form gửi thật (bản ghi thử đã xóa), lỗi từng trường, focus | Chưa có nội dung chương trình | Chờ duyệt | Nội dung chương trình; email thông báo |
| Điểm bán `/stores` | Trạng thái trống; lọc quốc gia (giữ `?country` khi đổi ngôn ngữ) | Chưa có điểm bán | Chờ duyệt | Danh sách điểm bán đã xác nhận |
| Header / footer / breadcrumb | Crawl khách: 36 trang (DB thật) và 43 trang (DB nghiệm thu) đều 200; không có liên kết tới nội dung nháp | Nhãn giao diện ko/vi do AI soạn | Chờ duyệt (logo web; đề xuất wordmark chưa dùng) | Người bản ngữ duyệt nhãn; quyết định wordmark |
| Chuyển ngôn ngữ | Giữ trang; giữ `?line`, `?concern`, `?topic`, `?country`; vô hiệu ngôn ngữ chưa duyệt | — | — | — |
| Preview `/preview` | Bắt buộc đăng nhập nhân viên; từ trang ngoài bị chặn; thoát preview thì về giao diện khách | — | — | — |
| Quyền truy cập (API) | 15/15 kiểm thử quyền; Media riêng tư (403); ghi chú biên tập ẩn với khách | — | — | Rà lại trước khi ra mắt (§4) |
| Admin `/admin` | Đăng nhập, sửa bản nháp (giai đoạn 2); tài khoản của bạn còn nguyên | — | — | — |
| `robots.txt`, noindex, sitemap | Chặn toàn bộ; sitemap chỉ liệt kê nội dung đã duyệt (hiện trống) | — | — | Bỏ chặn khi được duyệt ra mắt |
| Sao lưu Local | Đã tạo và phục hồi thử vào DB riêng (khớp) | — | — | Bản sao ngoài máy có mã hóa; sao lưu trên môi trường thật |

## 2. Nhật ký kiểm tra lần này

**Đã chạy:**
- **Database nghiệm thu riêng `drphynex_acceptance`:** sao từ dữ liệu hiện tại, thêm nội dung đánh dấu `[TEST]`. Database CMS thật không bị thay đổi: vẫn 0 bài viết, 0 trang pháp lý, 1 tài khoản.
  - Seed: `scripts/acceptance/seed-test-content.ts` (từ chối chạy nếu không phải DB nghiệm thu).
  - Server: `scripts/acceptance/start-server.sh`, cổng 3002.
  - Kết quả: 12/12 trường hợp đạt (danh sách, bộ lọc, chi tiết, 404 theo ngôn ngữ, bộ chuyển ngôn ngữ, văn bản chưa duyệt không bị lộ).
  - Crawl 43 trang, tất cả 200.
  - Ảnh 4 trang × 3 ngôn ngữ × 3 chiều rộng, không tràn ngang: `brand-assets/screenshots/acceptance-testdb/`.
- **Lỗi phát hiện và đã sửa:**
  1. Tiêu đề h2/h3 trong rich text giãn dòng 1.7 như đoạn văn, nhìn rời rạc: nay 1.3, màu navy.
  2. Breadcrumb với tiêu đề bài dài xuống nhiều dòng: nay cắt bằng dấu "…" (tiêu đề đầy đủ là H1).
- **Đối chiếu thành phần ↔ sản phẩm:** `scripts/acceptance/verify-ingredients.ts`, chỉ đọc. Lần chạy đầu báo 5 lỗi, nhưng đó là lỗi của chính script (tách INCI cắt nhầm dấu phẩy trong "(50,000ppm)", so khớp sai "E.G.F"/"NAD+"). Sau khi sửa script: 16/16 liên kết có tên trong INCI và có in ở mặt trước bao bì.
- **CMS thật, góc nhìn khách:** crawl 36 trang (200); trang nháp 404; Media 403; noindex.
- `npm test` 15/15; typecheck, lint, build sạch; `npm audit` 15 mục (0 critical), không đổi.

**Chưa chạy:**
- **Preview trên CMS thật cho Journal, Chính sách bảo mật, Điều khoản (ko/en/vi):** cần bạn đăng nhập lại. Phiên trước đã hết hạn sau 2 giờ. Trên CMS thật các trang này chưa có nội dung, nên preview chỉ có thể hiện nhãn chờ. Trạng thái có dữ liệu đã được kiểm tra trên DB nghiệm thu với tư cách khách (nội dung đã duyệt hiển thị giống nhau cho khách và preview).
- **Preview trên DB nghiệm thu:** không chạy. Cần tài khoản trong DB đó; tôi không tạo tài khoản.
- Kiểm thử e2e tự động trên trình duyệt (Playwright): chưa có.
- Kiểm tra bằng trình đọc màn hình thật (NVDA/VoiceOver): chưa chạy. Mới kiểm tra cấu trúc (H1 duy nhất, `aria-current`, focus).

## 3. Đối chiếu thành phần ↔ sản phẩm

Nguồn: mặt trước/mặt trên hộp và bảng INCI tiếng Anh trên bao bì ([product-content.md](product-content.md)).

| Thành phần (tên thương mại) | Tên INCI trong CMS | Sản phẩm liên kết | Căn cứ có mặt trong sản phẩm | Quy đổi tên → INCI |
|---|---|---|---|---|
| PDRN | Sodium DNA | **Cả 4**: Balm, Sheet, FORMA, LUMA | Cả 4 hộp in "PDRN" ở mặt trước/mặt trên; cả 4 bảng INCI có "Sodium DNA" | **Balm: xác nhận** (mặt trước "PDRN 20,000 ppm" trùng INCI "Sodium DNA(20,000ppm)"). FORMA: mô tả ghi "PDRN derived from salmon", INCI ghi "Sodium DNA". Sheet và LUMA: chỉ có hai tên riêng rẽ. **Chờ thương hiệu xác minh** PDRN = Sodium DNA với Sheet, FORMA, LUMA |
| Milk Exosome | Milk Exosomes | Balm, FORMA, LUMA | Mặt trước/mặt trên in "MILK EXOSOME"; INCI có "Milk Exosomes" | Trùng tên: xác nhận |
| NMN | Nicotinamide Mononucleotide | Balm, FORMA | "NMN & NAD+" / "NMN+NAD+"; INCI có tên đầy đủ | Viết tắt thông dụng, bao bì không ghi rõ quy đổi: **chờ xác minh** (rủi ro thấp) |
| NAD+ | Nicotinamide Adenine Dinucleotide | Balm, FORMA | Như trên | Như trên |
| Panthenol | Panthenol | Balm | "PANTHENOL 50,000 ppm" = INCI "Panthenol(50,000ppm)" | Xác nhận |
| Centella Asiatica Leaf Water | Centella Asiatica Leaf Water | Sheet | Mặt trước "741940.5 ppm" = INCI | Xác nhận |
| E.G.F | sh-Oligopeptide-1 | Sheet | Mặt trước in "E.G.F"; INCI có "sh-Oligopeptide-1" | Bao bì không ghi rõ EGF = sh-Oligopeptide-1: **chờ xác minh** |
| Sodium Hyaluronate | Sodium Hyaluronate | Sheet | Mặt trước = INCI "(100ppm)" | Xác nhận |
| Allantoin | Allantoin | Sheet | Mặt trước = INCI "(500ppm)" | Xác nhận |

Ghi chú:
- Chỉ liên kết những thành phần **in ở mặt trước** bao bì. Một số chất có trong INCI nhưng không in ở mặt trước thì không liên kết, ví dụ NMN/NAD+ trong LUMA, sh-Oligopeptide-1 trong Balm và FORMA. Cách này có chủ đích để tránh tự suy diễn "thành phần chính".
- "Tên thương mại" là tên in nổi trên bao bì (PDRN, E.G.F, NMN). "Tên INCI" là tên trong bảng thành phần. Các "complex" (PhynEX™ Regenerative Complex, Peptide Complex, 3GF, 17 Amino Acid, Vitamin) **không** được tạo thành thành phần, vì không có tên INCI tương ứng duy nhất.
- Trạng thái nháp và trạng thái duyệt của dữ liệu không thay đổi.

## 4. Rà soát trước khi triển khai (theo mã hiện tại)

| Hạng mục | Hiện trạng trong mã | Ưu tiên | Cách xử lý cụ thể |
|---|---|---|---|
| Lưu file production | `upload.staticDir` ghi vào `media/` và `private-uploads/` trên đĩa. Vercel không giữ đĩa, nên file sẽ mất | **P0 (chặn ra mắt)** | Thêm `@payloadcms/storage-s3` (R2 hoặc S3), giữ `disablePayloadAccessControl: false` để file vẫn đi qua kiểm tra quyền của Payload (Media `publicRelease`, Source documents riêng tư). Tách prefix hoặc bucket cho `source-documents`. Chép file hiện có lên bucket. Bật versioning |
| Sao lưu môi trường thật | Chỉ có sao lưu Local thủ công | **P0** | Postgres có quản lý với sao lưu tự động và PITR; bucket có versioning; phục hồi thử định kỳ; bản sao mã hóa ngoài nhà cung cấp chính |
| Giới hạn tần suất form | `src/lib/forms.ts`: `Map` trong bộ nhớ, 5 lần / 10 phút theo IP. Trên serverless mỗi instance có bộ đếm riêng. IP lấy từ phần tử đầu của `x-forwarded-for`, giá trị này có thể bị giả mạo; mọi request thiếu header dùng chung khóa `unknown` | **P1** | Lưu bộ đếm vào Postgres (một bảng nhỏ, upsert theo khóa và cửa sổ thời gian) hoặc một kho KV. Lấy IP từ header do nền tảng đặt (trên Vercel là `x-real-ip` / `x-vercel-forwarded-for`). Có thể thêm captcha không theo dõi người dùng (ví dụ Turnstile) nếu spam tăng |
| Email thông báo | Payload chưa có email adapter (đang ghi ra console). Form chỉ lưu vào CMS | **P1** (trước khi nhận form thật) | Thêm adapter (Resend hoặc SMTP qua `@payloadcms/email-nodemailer`), cùng hook `afterChange` trên Contact submissions / Partner inquiries để gửi tới địa chỉ cấu hình bằng biến môi trường. Tiêu đề email không chứa dữ liệu cá nhân. Cần duyệt nhà cung cấp và chi phí |
| Cache / revalidation | `[locale]/layout.tsx` đặt `dynamic = 'force-dynamic'`: mỗi request đều truy vấn DB. Chạy đúng nhưng chậm và tốn | **P2** | Bỏ force-dynamic cho trang công khai; dùng `unstable_cache` / fetch tags theo collection và slug; hook `afterChange`/`afterDelete` của Payload gọi `revalidateTag`. Draft mode vẫn bỏ qua cache |
| Quyền truy cập | Đã kiểm thử 15 trường hợp. `serverURL`/`cors`/`csrf` lấy từ `NEXT_PUBLIC_SERVER_URL`; GraphQL playground tắt ở production; khóa tài khoản sau 5 lần sai, mặc định hết phiên sau 2 giờ | **P1** | Đặt `NEXT_PUBLIC_SERVER_URL` đúng tên miền. Cân nhắc tắt GraphQL hẳn (frontend không dùng; giảm bề mặt tấn công, gồm cả advisory `graphql-scalars`). Bật 2FA hoặc SSO cho admin nếu có thể. Rà lại danh sách tài khoản và vai trò trước ra mắt |
| Dependency audit | 15 mục: 4 low, 5 moderate, 6 high, 0 critical; không có bản sửa không gây vỡ ([dependency-audit.md](dependency-audit.md)) | **P2** (theo dõi) | Nâng Payload khi có bản vá; chạy lại `npm audit` trước ra mắt; không dùng `--force` |
| Kết nối DB serverless | `postgresAdapter` dùng pool thường | **P1** | Dùng chuỗi kết nối pooled (PgBouncer/Neon/Supabase pooler), giới hạn pool nhỏ |
| SEO khi ra mắt | `robots.txt` chặn toàn bộ, mọi trang noindex | Khi ra mắt | Bỏ chặn, kiểm tra sitemap và hreflang |

Chưa đăng ký dịch vụ trả phí hay thay cấu hình hosting nào.

## 5. Ghi chú môi trường Local

- Cổng 3000: một server `next dev` của dự án, không do tôi khởi động; tôi để nguyên.
- Cổng 3001: bản production để kiểm tra trên DB thật. Cổng 3002: bản production trên DB nghiệm thu.
- DB `drphynex_acceptance` chứa bản sao dữ liệu thật (kể cả tài khoản) cộng nội dung TEST. Xóa khi không còn dùng: `docker exec drphynex-postgres sh -c 'dropdb -U "$POSTGRES_USER" drphynex_acceptance'`.
- Sao lưu: [backup-and-restore.md](backup-and-restore.md).
