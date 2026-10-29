# Kế hoạch triển khai thử (Vercel)

Cập nhật: 29/10/2026, sau mốc nghiệm thu Local `2d2d7a5`. **Chưa tạo dịch vụ, chưa phát sinh phí, chưa push, chưa triển khai.** Giá và giới hạn gói dịch vụ dưới đây cần kiểm tra lại trên trang của nhà cung cấp trước khi đăng ký.

> Cập nhật sau review độc lập: xem [independent-review-remediation.md](independent-review-remediation.md). Cache nội dung chia sẻ đã được gỡ để ưu tiên thu hồi; URL optimizer bị chặn, upload dùng no-store. Storage có migration schema riêng chưa chạy trên database thật. Các bảng kiểm tra cũ dưới đây là lịch sử, không thay thế báo cáo mới.

## 1. Trạng thái chuẩn bị

| Hạng mục | Đã làm trên Local | Đã kiểm tra trên Local | Phải kiểm tra lại sau khi kết nối |
|---|---|---|---|
| Tắt GraphQL | `graphQL: { disable: true }` (cách chính thức của Payload). Admin và website chỉ dùng REST/Local API | `/api/graphql` và `/api/graphql-playground` trả 404; admin mở danh sách sản phẩm bình thường; test xác nhận cấu hình | — |
| Object storage | `src/config/storage.ts`: `@payloadcms/storage-s3`, chỉ bật khi có `S3_BUCKET`. Bucket riêng tư (`acl: 'private'`), không tắt kiểm tra quyền, nên file vẫn đi qua route của Payload. Prefix `media/` và `source-documents/`. Trên Vercel mà thiếu bucket thì build dừng có báo lỗi | Với biến giả: plugin bật, tắt ghi đĩa, quyền đọc vẫn là `releasedOrStaff` (Media) và `staff` (Source documents). Không có biến: vẫn ghi đĩa như cũ | **Chưa kết nối bucket thật.** Cần thử: tải ảnh lên, ảnh chưa duyệt trả 403 cho khách, ảnh đã duyệt hiển thị, Source documents chỉ nhân viên mở được, header phản hồi không có cache công khai |
| Rate limit dùng chung | Bảng `form_rate_limits` (migration `20261029_080000`), cập nhật nguyên tử trong Postgres; 5 lần / 10 phút cho mỗi form và mỗi khách. Khóa là **mã băm có muối** của IP, không lưu IP. Nếu DB lỗi thì dùng giới hạn trong bộ nhớ. IP lấy từ `x-real-ip` (Vercel tự đặt) | Migration đã chạy trên DB Local (đã sao lưu trước: `drphynex-backups/2026-10-29_1429`). Test: chặn lần thứ 6, tách theo form và khách, sang cửa sổ mới thì mở lại, khóa không chứa IP | Kiểm tra trên Vercel rằng `x-real-ip` là IP khách thật và nhiều instance dùng chung bộ đếm |
| Email thông báo form | `src/config/email.ts`: adapter SMTP (`@payloadcms/email-nodemailer`), chỉ bật khi có `SMTP_HOST`. Hook trên Contact submissions và B2B inquiries gửi tới `FORM_NOTIFY_TO`. Email **không chứa dữ liệu form**, chỉ có số thứ tự và liên kết vào admin. Gửi lỗi thì bài gửi vẫn được lưu | Test với hàm gửi giả: không cấu hình thì không gửi; có cấu hình thì gửi một email không chứa tên, email hay nội dung; lỗi SMTP không làm mất bài gửi | **Chưa gửi email thật.** Cần thử: gửi form trên staging, email tới đúng hộp thư, không vào spam (SPF/DKIM) |
| Cache / revalidation | Truy vấn của **khách** đi qua Next data cache (`unstable_cache`, tag `cms-public`, tự hết hạn sau 1 giờ). Mọi thay đổi ở các collection hiển thị trên site, kể cả Media, và ở các global đều xóa tag này (`src/lib/revalidate.ts`). Preview không bao giờ đi qua cache; ở draft mode, Next cũng không đọc hay ghi data cache. HTML vẫn render theo từng request (`force-dynamic`), CDN không cache trang | Build production Local: khi cache đã có dữ liệu, 10 lượt khách tải `/ko/products` phát sinh số truy vấn DB không hơn mức nền. Cùng lúc đó, khách vẫn thấy trang trống, preview thấy 4 sản phẩm nháp, khách gọi trang chi tiết nháp nhận 404. Crawl 11 đường dẫn × 3 ngôn ngữ (33 trang) đúng mã trạng thái | **Chưa kiểm tra làm mới cache khi xuất bản**, vì không được sửa dữ liệu thật. Cần thử trên staging: xuất bản và duyệt một nội dung thử, khách thấy ngay; bỏ xuất bản thì khách hết thấy |
| Import map của admin | `src/app/(payload)/admin/importMap.js` đã có `S3ClientUploadHandler` (sinh bằng `generate:importmap` khi bật biến storage). Khi chưa bật storage, mục này không ảnh hưởng gì | Build và admin Local chạy bình thường | Nếu chạy lại `generate:importmap`, phải đặt biến `S3_*` (giá trị giả cũng được), nếu không mục này bị xóa và admin trên Vercel sẽ báo thiếu component |
| Kết nối DB | Pool tối đa 3 kết nối mỗi instance trên Vercel (10 trên Local) | Build và test Local | Dùng chuỗi kết nối **pooled** của nhà cung cấp |
| Migration khi build | Script `npm run build:vercel` = `migrate` rồi `build` | Chưa chạy trên Vercel | Build Command trên Vercel đặt thành `npm run build:vercel` |

`npm audit`: 18 mục. Có thêm 3 mục "low" chỉ vì hai adapter mới phụ thuộc `payload` (gốc vẫn là `deepmerge`), không có lỗi gốc mới. Đánh giá theo ảnh hưởng thực tế ở [acceptance-status.md](acceptance-status.md) §4.

## 2. Kiến trúc đề xuất

```
Vercel (Next.js + Payload, một project)
 ├─ Production  ← nhánh main      → DB production  + bucket production
 └─ Preview     ← nhánh staging   → DB staging     + bucket staging   (Vercel Authentication)
Email: SMTP của nhà cung cấp email (cùng tài khoản; FORM_NOTIFY_TO khác nhau theo môi trường)
```

- **Một project Vercel, hai môi trường.** Biến môi trường đặt riêng cho Production và Preview. Môi trường thử **không bao giờ** dùng DB hay bucket của production.
- **Một tên miền staging cố định** (ví dụ `staging.<tên-miền>`) gắn với nhánh `staging`. Admin cần `NEXT_PUBLIC_SERVER_URL` khớp tên miền để qua CORS/CSRF; URL ngẫu nhiên của từng bản deploy sẽ không đăng nhập admin được, và đó là chủ đích.
- **Vùng chạy function** đặt gần DB (cùng vùng với DB).

## 3. Dịch vụ cần kết nối

| Dịch vụ | Đề xuất | Vì sao | Cần có cho từng môi trường |
|---|---|---|---|
| Postgres có quản lý | **Neon** (tích hợp sẵn trong Vercel Marketplace). Phương án khác: Supabase | Có chuỗi kết nối pooled; tạo nhánh DB cho staging; có khôi phục theo thời điểm (PITR) | Hai database hoặc hai branch tách biệt; bật PITR; chuỗi pooled cho runtime |
| Object storage | **Cloudflare R2**. Phương án khác: AWS S3 | Không tính phí băng thông tải xuống, API S3; adapter đã viết | Hai bucket riêng tư: `drphynex-prod`, `drphynex-staging`; khóa API riêng cho mỗi bucket, chỉ quyền đọc/ghi object |
| Email (SMTP) | Dịch vụ email giao dịch có SMTP (Resend, Postmark, Amazon SES...), hoặc SMTP của email công ty nếu có | Adapter SMTP dùng được với mọi nhà cung cấp | Tên miền gửi đã xác thực SPF/DKIM; địa chỉ nhận thông báo |
| Tên miền | Tên miền của thương hiệu | — | Bản ghi DNS cho site, staging và email |

## 4. Biến môi trường

Không ghi giá trị vào Git hay tài liệu. Đặt trong Vercel → Settings → Environment Variables, chọn đúng môi trường. Mẫu ở `.env.example`.

| Biến | Production | Preview (staging) | Ghi chú |
|---|---|---|---|
| `DATABASE_URL` | DB production (pooled) | DB staging (pooled) | Bắt buộc |
| `PAYLOAD_SECRET` | Chuỗi ngẫu nhiên A | Chuỗi ngẫu nhiên **khác** | Khác nhau để phiên đăng nhập staging không dùng được ở production; cũng là muối cho khóa rate limit |
| `NEXT_PUBLIC_SERVER_URL` | `https://<tên-miền>` | `https://staging.<tên-miền>` | Không có dấu `/` ở cuối |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket và khóa production | Bucket và khóa staging | Bắt buộc trên Vercel |
| `S3_ENDPOINT`, `S3_REGION` | R2: `https://<account-id>.r2.cloudflarestorage.com`, `auto` | Như production | S3: bỏ endpoint, đặt region thật |
| `S3_CLIENT_UPLOADS` | `true` nếu cần tải file trên 4,5 MB | Như production | Cần thêm CORS cho bucket (PUT từ tên miền site) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Theo nhà cung cấp email | Có thể dùng chung | Thiếu `SMTP_HOST` thì không gửi email |
| `FORM_NOTIFY_TO` | Hộp thư nhận form thật | Hộp thư thử | Có thể ghi nhiều địa chỉ, phân cách bằng dấu phẩy |

## 5. Bảo vệ môi trường thử

- **Vercel Authentication (Standard Protection)** cho mọi bản Preview, kể cả tên miền staging: chỉ thành viên của team Vercel mới xem được.
- `noindex` và `robots.txt` chặn toàn bộ vẫn giữ trên mọi môi trường cho tới khi ra mắt được duyệt.
- DB và bucket staging tách khỏi production; khóa API riêng; `PAYLOAD_SECRET` riêng.
- Dữ liệu staging là bản sao của Local hiện tại, gồm tài khoản admin của bạn (mã băm mật khẩu) và bài gửi form (nếu có). Chỉ nhập vào DB staging được bảo vệ; không tạo tài khoản mới nếu chưa cần.
- Admin bật khóa tài khoản sau 5 lần đăng nhập sai (đã có).

## 6. Migration, sao lưu và rollback

**Migration**
- Mỗi bản build chạy `payload migrate` trên đúng DB của môi trường đó, rồi mới build.
- Migration mới luôn chạy trên staging trước; chỉ merge vào `main` khi staging đã ổn.
- Viết migration theo kiểu "mở rộng trước, thu gọn sau": thêm cột hoặc bảng trước, xóa sau một đợt phát hành, để bản code cũ vẫn chạy được với schema mới khi cần rollback.

**Sao lưu**
- Production: PITR của nhà cung cấp DB, cộng một bản `pg_dump` mã hóa trước mỗi lần phát hành có migration (cách mã hóa ở [backup-and-restore.md](backup-and-restore.md) §3).
- File: R2 không có versioning giống S3 (kiểm tra lại khi đăng ký), nên chép định kỳ bucket production sang một bucket hoặc nơi lưu sao lưu riêng (ví dụ bằng `rclone sync`). Nếu chọn S3 thì bật Versioning.
- Thử khôi phục mỗi quý vào DB hoặc bucket tạm.

**Rollback**
1. Lỗi do mã: dùng **Instant Rollback** của Vercel về bản trước. Không cần đụng DB nếu migration tương thích ngược.
2. Lỗi do migration: rollback mã như bước 1, rồi `payload migrate:down` cho migration lỗi, hoặc khôi phục DB về thời điểm trước khi deploy (PITR, khôi phục ra branch mới rồi chuyển sang).
3. Mất hoặc hỏng file: chép lại từ bản sao bucket.

## 7. Các bước triển khai thử (khi đã có dịch vụ)

1. Tạo DB staging, bucket staging, tài khoản email; lấy chuỗi kết nối và khóa.
2. Tạo project Vercel từ repo; Build Command `npm run build:vercel`; bật Vercel Authentication; gắn tên miền staging với nhánh `staging`.
3. Đặt biến môi trường cho Preview (§4).
4. Chuyển dữ liệu Local sang staging:
   - `pg_restore` bản sao lưu mới nhất vào DB staging;
   - chép `media/` vào prefix `media/` và `private-uploads/source-documents/` vào prefix `source-documents/` của bucket staging, giữ nguyên tên file.
5. Push nhánh `staging` (chỉ khi bạn đồng ý), chờ build xong.
6. Kiểm tra lại các mục ở cột cuối §1, cộng đăng nhập admin, preview, form, 3 ngôn ngữ và 3 chiều rộng.
7. Production làm tương tự với biến riêng, **chỉ khi** nội dung, giao diện và pháp lý đã được duyệt (xem danh sách chặn ra mắt ở [acceptance-status.md](acceptance-status.md) §6). Bỏ noindex là một thay đổi riêng, cần bạn đồng ý.

## 8. Lựa chọn cần bạn quyết định

**Đã chọn (29/10/2026): theo đề xuất**, gồm Vercel Pro, Neon, Cloudflare R2 và email qua SMTP. Người dùng tự tạo tài khoản. Tên miền, vùng chạy và nhà cung cấp SMTP cụ thể còn chờ xác nhận (mục 4–5 dưới đây).

1. **Gói Vercel.** Gói Hobby (miễn phí) chỉ dành cho mục đích cá nhân, không thương mại. Website thương hiệu thường cần gói **Pro**, tính phí theo thành viên mỗi tháng. Bạn xác nhận dùng Pro, hay chỉ dùng Hobby cho bản thử nội bộ?
2. **Postgres:** Neon (đề xuất) hay Supabase. Gói miễn phí có giới hạn dung lượng và thời gian PITR ngắn; production nên dùng gói trả phí có PITR dài hơn.
3. **Storage:** R2 (đề xuất) hay S3.
4. **Email:** dùng dịch vụ email giao dịch (cần đăng ký) hay SMTP sẵn có của công ty; và địa chỉ nhận thông báo form.
5. **Tên miền và vùng chạy:** tên miền chính thức; khách chủ yếu ở Việt Nam hay Hàn Quốc, để chọn vùng chạy cho DB và Vercel (ví dụ Singapore hoặc Seoul).

## 9. Thông tin cần lấy để kết nối staging

**Không dán secret vào chat, Git hay tài liệu.** Nhập thẳng vào Vercel → Settings → Environment Variables, môi trường **Preview**. Riêng các giá trị cần dùng trên máy Local (để chuyển dữ liệu lên staging), ghi vào file `.env.staging.local` trong thư mục dự án; Git đã bỏ qua mọi file `.env*.local`.

| Dịch vụ | Việc cần làm | Lấy ra | Đặt vào |
|---|---|---|---|
| **Vercel** (gói Pro) | Tạo team; import repo **khi bạn đồng ý push**; Build Command `npm run build:vercel`; bật Deployment Protection → Vercel Authentication (Standard) | Tên team và project (không phải secret) | Báo tôi |
| **Neon** | Tạo project ở vùng đã chọn; tạo database hoặc branch `staging` riêng (production tạo sau) | Chuỗi kết nối **pooled** (host có `-pooler`) và chuỗi **direct** của staging | Pooled → `DATABASE_URL` (Preview). Direct → `.env.staging.local` để tôi restore dữ liệu Local |
| **Cloudflare R2** | Tạo bucket `drphynex-staging`, **không** bật public access hay `r2.dev`; tạo API token "Object Read & Write" chỉ cho bucket này | Account ID (để ghép endpoint), Access Key ID, Secret Access Key | `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (Preview), và bản sao trong `.env.staging.local` để tôi chép file lên |
| **Email SMTP** | Chọn nhà cung cấp; xác thực tên miền gửi (SPF, DKIM) | Host, port, user, password; địa chỉ gửi | `SMTP_*`, `EMAIL_FROM_ADDRESS` (Preview) |
| **Bạn tự quyết** | — | Hộp thư nhận thông báo staging; tên miền staging | `FORM_NOTIFY_TO`, `NEXT_PUBLIC_SERVER_URL` (Preview) |
| **Tự tạo** | Chuỗi ngẫu nhiên mới: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | — | `PAYLOAD_SECRET` (Preview), khác với Local |

Khi xong, chỉ cần báo "đã đặt biến staging". Sau đó tôi sẽ:
1. Đọc `.env.staging.local`, kiểm tra tên database và bucket là của staging (chỉ in tên, không in secret).
2. Tạo bản sao lưu Local mới, rồi restore vào DB staging; chép `media/` và `source-documents/` lên bucket staging.
3. Chờ bạn đồng ý push nhánh `staging`, rồi kiểm tra lại các mục ở cột cuối §1.
