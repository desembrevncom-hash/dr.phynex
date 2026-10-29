# Bảng nghiệm thu website Dr.PhynEX (Local)

Cập nhật: 29/10/2026. Nhánh `phase-3-brand-design`, mốc nghiệm thu `d27b59a` (mốc trước `250a5c9`). Chỉ chạy Local; chưa push, chưa triển khai công khai. **Chưa có nội dung hay ảnh nào được xuất bản.**

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

### Lần chốt nghiệm thu (sau `d27b59a`)

Chỉ chạy các kiểm tra liên quan. Các kiểm tra đã đạt ở trên không chạy lại, vì không có thay đổi mã giao diện.

**Đã chạy:**
- **Database của server production cổng 3001: `drphynex`** (DB thật). Đối chiếu bằng thời điểm mở kết nối trong `pg_stat_activity` với thời điểm khởi động tiến trình: 3000 → `drphynex`, 3001 → `drphynex`, 3002 → `drphynex_acceptance`. Không in connection string.
- **Bốn sản phẩm qua Payload Local API, có đọc bản nháp** (`scripts/acceptance/check-products.ts`, chỉ đọc):

  | Sản phẩm | Tồn tại | `_status` | Phiên bản (versions) | Bản đã xuất bản | ko | en | vi |
  |---|---|---|---|---|---|---|---|
  | RX Matrix Balm (`rx-matrix-balm`) | Có | draft | 20 | 0 | in-review | in-review | ai-draft |
  | RX Matrix Sheet (`rx-matrix-sheet`) | Có | draft | 23 | 0 | in-review | in-review | ai-draft |
  | MX-01 FORMA (`mx-01-forma`) | Có | draft | 18 | 0 | in-review | in-review | ai-draft |
  | MX-02 LUMA (`mx-02-luma`) | Có | draft | 21 | 0 | in-review | in-review | ai-draft |

  - Cả ba ngôn ngữ của cả bốn sản phẩm đều có đủ: tên, mô tả ngắn, mô tả, INCI, cách dùng, lưu ý.
  - **Tài liệu: 4 sản phẩm, 82 phiên bản** (tổng 82 = 20 + 23 + 18 + 21, nên không có phiên bản nào thuộc sản phẩm đã mất).
  - **Công khai: 0 sản phẩm** ở cả ko/en/vi, đúng với việc chưa xuất bản gì.
  - Không thiếu nội dung, nên không cần đối chiếu bản sao lưu và không import hay restore gì.
- **Dọn môi trường:**
  - Dừng server nghiệm thu cổng 3002. `preview_stop` lại không tắt tiến trình con `next start -p 3002`; tôi đã xác nhận đúng tiến trình đó rồi mới tắt.
  - Xóa `drphynex_acceptance` sau khi kiểm tra không còn kết nối nào tới nó.
  - Còn lại `drphynex` (DB thật) và `drphynex_test`; cả hai không bị đụng tới. Server 3000 không bị đụng tới. Bản sao lưu đã phục hồi thử vẫn giữ nguyên.
- **`npm audit`:** chạy lại, 15 mục như trước, nay được đánh giá theo đường gọi thực tế (§4).

**Chưa chạy:**
- **Preview Journal, Chính sách bảo mật, Điều khoản trên CMS thật (ko/en/vi):** lúc chốt, trình duyệt chưa có phiên đăng nhập. Ngay cả khi chạy, CMS thật đang có 0 bài viết và 0 trang pháp lý, nên kết quả chỉ ghi nhận được trạng thái trống và nhãn chờ. Đó **không** phải kiểm tra preview có dữ liệu.
- **Preview có dữ liệu:** chưa từng chạy. DB nghiệm thu đã xóa; muốn chạy lại, phải tạo lại bằng cách sao chép DB thật vào `drphynex_acceptance`, chạy `seed-test-content.ts` và đăng nhập bằng tài khoản đã có trong bản sao.
- E2E tự động và kiểm tra bằng trình đọc màn hình: vẫn chưa chạy.

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
| Dependency audit | 15 mục (4 low, 5 moderate, 6 high, 0 critical), xuất phát từ 4 gói gốc; đánh giá theo đường gọi thực tế ở bảng dưới | P1–P3 theo từng gói | Xem bảng dưới. Không dùng `npm audit fix --force` (nó đề xuất hạ Payload xuống 0.1.9, sẽ phá dự án) |
| Kết nối DB serverless | `postgresAdapter` dùng pool thường | **P1** | Dùng chuỗi kết nối pooled (PgBouncer/Neon/Supabase pooler), giới hạn pool nhỏ |
| SEO khi ra mắt | `robots.txt` chặn toàn bộ, mọi trang noindex | Khi ra mắt | Bỏ chặn, kiểm tra sitemap và hreflang |

**Dependency audit theo ảnh hưởng thực tế** (chạy lại `npm audit` ngày 29/10/2026, kết quả không đổi; 6 mục "high" chỉ là cùng hai lỗi gốc lan lên các gói Payload phụ thuộc):

| Gói gốc (mức npm) | Đường gọi trong dự án | Ảnh hưởng thực tế | Ưu tiên | Cách xử lý |
|---|---|---|---|---|
| `graphql-scalars` (high, ReDoS ở scalar `PhoneNumber`) | Payload GraphQL chỉ dùng `DateTime` và `EmailAddress`; không có field nào dùng `PhoneNumber`. Nhưng endpoint `/api/graphql` vẫn mở công khai | Thấp: không chạm được lỗi. Endpoint thừa vẫn là bề mặt tấn công | **P1** (sửa rẻ) | Đặt `graphQL: { disable: true }` trong `payload.config.ts` (frontend không dùng GraphQL); kiểm tra lại admin sau khi tắt |
| `happy-dom` qua `@lexical/headless` (high: SSRF, chạy mã khi parse HTML không tin cậy) | Phía server chỉ dùng trong bộ chuyển HTML → Lexical (`convertHTMLToLexical`). Mã dự án và script import **không** gọi hàm này; trình soạn thảo lưu JSON | Thấp khi giữ nguyên: không có đường nhận HTML từ ngoài | **P2** | Không thêm tính năng nhập HTML (từ form, URL, file) cho tới khi Payload có bản vá; nâng Payload khi bản vá ra |
| `esbuild` ≤ 0.24.2 qua `drizzle-kit` (moderate, chỉ ảnh hưởng dev server của esbuild) | Chỉ là công cụ migration (`payload migrate`), không chạy trong production, không mở dev server esbuild | Không ảnh hưởng runtime | **P3** | Theo dõi; nâng khi Payload cập nhật `drizzle-kit` |
| `deepmerge` (low, prototype poisoning) qua `payload` | Payload dùng để gộp cấu hình nội bộ, không gộp dữ liệu người dùng gửi lên | Rất thấp | **P3** | Theo dõi |

Chưa đăng ký dịch vụ trả phí hay thay cấu hình hosting nào.

## 5. Ghi chú môi trường Local

- Cổng 3000: server `next dev` của dự án (DB `drphynex`); để nguyên.
- Cổng 3001: bản production trên DB thật `drphynex`.
- Cổng 3002 và DB `drphynex_acceptance`: **đã dừng và đã xóa** khi chốt nghiệm thu.
- Sao lưu: [backup-and-restore.md](backup-and-restore.md).

## 6. Việc còn chặn ra mắt

| # | Việc | Ai thực hiện |
|---|---|---|
| 1 | Duyệt nội dung 4 sản phẩm (ko/en đang `in-review`); người bản ngữ duyệt bản vi (`ai-draft`); xác nhận công dụng LUMA | Người dùng / thương hiệu cung cấp |
| 2 | Xác minh quy đổi INCI (PDRN = Sodium DNA cho Sheet, FORMA, LUMA; E.G.F; NMN/NAD+) và căn cứ được phép nêu công dụng (phiếu công bố tại VN nếu áp dụng) | Người dùng / thương hiệu cung cấp |
| 3 | Ảnh sản phẩm đúng bao bì, được phép công bố | Người dùng / thương hiệu cung cấp |
| 4 | Chính sách bảo mật và Điều khoản do pháp lý soạn hoặc duyệt (bắt buộc vì website có form thu thập dữ liệu); thông tin liên hệ chính thức | Người dùng / thương hiệu cung cấp |
| 5 | Duyệt giao diện trang chủ và các trang mẫu; quyết định trang trống nào được phép ra mắt (Thương hiệu, Journal, Điểm bán, Hợp tác) | Người dùng quyết định |
| 6 | Chọn hosting, Postgres có quản lý (PITR, kết nối pooled), lưu trữ file R2/S3, dịch vụ email, tên miền | Cần chọn dịch vụ (người dùng quyết định; Claude so sánh nếu cần) |
| 7 | Sau khi có dịch vụ: storage adapter, rate limit dùng chung, email thông báo form, tắt GraphQL, cấu hình tên miền, cache/revalidate, phục hồi thử trên môi trường thật | Claude hoàn thiện kỹ thuật |
| 8 | Preview có dữ liệu, e2e, trình đọc màn hình; chạy lại `npm audit`; bỏ noindex khi được duyệt ra mắt | Claude hoàn thiện kỹ thuật (bỏ noindex chỉ khi người dùng đồng ý) |
