# Product

<!-- impeccable:product-schema 1 -->

Ký hiệu: **[XÁC NHẬN]** là yêu cầu người dùng đã xác nhận · **[GIẢ ĐỊNH]** là suy luận, cần duyệt · **[CHƯA QUYẾT]** là quyết định còn mở.

## Platform

web (ưu tiên mobile)

## Stack

- [XÁC NHẬN] Next.js, TypeScript, Tailwind CSS, Payload CMS, PostgreSQL, object storage.
- Kiểm tra tương thích theo tài liệu chính thức (28/10/2026):
  - Payload 3.92.1 yêu cầu Node `^22.23.4 || >=24.22.1` và Next.js `15.2.9+ … 15.4.x` hoặc `>=16.2.6`. Next.js hiện tại là 16.4.3, đạt yêu cầu.
  - Adapter Postgres: `@payloadcms/db-postgres`.
  - Object storage: `@payloadcms/storage-s3`, dùng được với AWS S3 và Cloudflare R2 (endpoint tùy chỉnh, `region: 'auto'`, `forcePathStyle: true`).
  - Định tuyến đa ngôn ngữ: `next-intl` 4.x hỗ trợ Next 16. Next 16 dùng file `src/proxy.ts` thay cho `middleware.ts`.
  - Tailwind CSS 4.x.
- Node đã nâng lên v24.22.1 (đạt yêu cầu). Phiên bản đang khóa trong `package-lock.json`: Payload 3.92.1, Next.js 16.4.3, next-intl 4.14.9, Tailwind 4.3.3 (chi tiết: [docs/phase-2-report.md](docs/phase-2-report.md)).
- [XÁC NHẬN] Local: PostgreSQL chạy bằng Docker. Dùng npm (không cài pnpm).
- [XÁC NHẬN] Triển khai dự kiến: Vercel, PostgreSQL có quản lý, object storage là Cloudflare R2 hoặc AWS S3 qua `@payloadcms/storage-s3`.
  - [CHƯA QUYẾT] Nhà cung cấp Postgres cụ thể và việc chọn R2 hay S3. Có thể phát sinh phí, cần duyệt trước.
  - Database cần chuỗi kết nối pooled, phù hợp môi trường serverless.
- Local dùng Postgres Docker và lưu tệp trên đĩa; khi lên Vercel thì chuyển sang R2/S3.

## Users

- [XÁC NHẬN] Người tiêu dùng tìm hiểu mỹ phẩm Hàn Quốc định hướng dermocosmetic, chủ yếu xem trên điện thoại, bằng tiếng Hàn, Anh hoặc Việt.
- [XÁC NHẬN] Đối tác B2B: nhà phân phối, đại lý, nhà bán lẻ, spa/phòng khám (nhóm cụ thể là [GIẢ ĐỊNH]) tìm hiểu để hợp tác.
- [XÁC NHẬN] Biên tập viên nội bộ quản lý nội dung ba ngôn ngữ qua backend quản trị.
- [GIẢ ĐỊNH] Việc chính của người tiêu dùng: hiểu thương hiệu, tìm sản phẩm hợp với da/vấn đề da, xem thành phần, rồi tìm điểm bán hoặc liên hệ.

## Product Purpose

Website thương hiệu Dr.PhynEX: giới thiệu thương hiệu, danh mục sản phẩm, thành phần và công nghệ, Journal, điểm bán, liên hệ và hợp tác B2B, ở ba ngôn ngữ `/ko`, `/en`, `/vi`.

Thành công nghĩa là:
- người dùng tìm được sản phẩm phù hợp và biết điểm bán hoặc cách liên hệ;
- đối tác gửi được yêu cầu hợp tác đủ thông tin;
- biên tập viên tự cập nhật nội dung mà không cần lập trình viên.

[CHƯA QUYẾT] Chỉ số đo lường cụ thể.

## Positioning

[CHƯA QUYẾT] Chờ hồ sơ thương hiệu. Đã xác nhận: mỹ phẩm Hàn Quốc, định hướng dermocosmetic. Không tự viết định vị, câu chuyện thương hiệu hay cơ chế khác biệt khi chưa có tài liệu.

## Operating Context

- Biên tập trong Payload Admin. Nội dung có trạng thái bản nháp/xuất bản; mỗi ngôn ngữ có trạng thái duyệt bản dịch riêng.
- [XÁC NHẬN] Bản dịch do AI tạo chỉ là bản nháp, phải có người duyệt trước khi xuất bản.
- [XÁC NHẬN] Nội dung thương hiệu và công dụng sản phẩm chỉ lấy từ tài liệu người dùng cung cấp.
- [GIẢ ĐỊNH] Công dụng sản phẩm hiển thị tại Việt Nam cần khớp hồ sơ công bố mỹ phẩm; phía khách hàng đối chiếu pháp lý.

## Capabilities and Constraints

**Phạm vi giai đoạn đầu [XÁC NHẬN]**
- Trang chủ.
- Thương hiệu.
- Danh mục và chi tiết sản phẩm.
- Thành phần & công nghệ.
- Journal (danh sách và bài viết).
- Điểm bán.
- Liên hệ.
- Hợp tác B2B.

**Ngoài phạm vi [XÁC NHẬN]**
- Giỏ hàng, thanh toán, vận chuyển.
- Dịch vụ trả phí khi chưa được duyệt.
- Triển khai công khai khi chưa được yêu cầu.

**Ràng buộc**
- Ba ngôn ngữ có tiền tố đường dẫn `/ko`, `/en`, `/vi` [XÁC NHẬN].
- Form liên hệ và B2B lưu vào CMS. Gửi email thông báo cần nhà cung cấp email, hiện [CHƯA QUYẾT].
- Font phải hỗ trợ đầy đủ tiếng Hàn và tiếng Việt (xem CLAUDE.md).

**Đã chốt [XÁC NHẬN]**
- Ngôn ngữ gốc của nội dung: **tiếng Hàn**. Tiếng Anh và tiếng Việt dịch từ bản Hàn.
- Khi vào `/`: chọn ngôn ngữ theo trình duyệt, nếu không khớp thì về `/en`.
- Trang sản phẩm **chỉ giới thiệu và liên hệ**:
  - không giá, không link mua hay link sàn;
  - lời kêu gọi hành động dẫn tới trang Điểm bán và Liên hệ.

- Phân đoạn URL dùng tiếng Anh cho cả ba ngôn ngữ (`/vi/products/...`), slug dùng chung giữa các ngôn ngữ.

## Brand Commitments

- Tên thương hiệu: **Dr.PhynEX**, giữ đúng chữ hoa/thường. Mọi biến thể khác [CHƯA QUYẾT].
- Định hướng: mỹ phẩm Hàn Quốc, dermocosmetic, ưu tiên sản phẩm và trải nghiệm mobile [XÁC NHẬN].
- Màu nhận diện, logo, font, giọng văn: [CHƯA QUYẾT], chờ tài liệu. Không tự chốt.

## Evidence on Hand

Hiện **chưa có tài liệu nào** trong dự án: không logo, ảnh bao bì, danh mục sản phẩm, hồ sơ thương hiệu, chứng nhận hay thông tin liên hệ.

Không được tự tạo:
- sản phẩm, thành phần, công dụng, kết quả thử nghiệm;
- chứng nhận, giải thưởng, số liệu;
- đánh giá khách hàng, báo chí, đối tác;
- địa chỉ điểm bán.

Danh sách tài liệu cần cung cấp: [docs/phase-1-plan.md](docs/phase-1-plan.md) §5.

## Product Principles

1. **Chỉ nói điều có nguồn.** Mỗi công dụng và tuyên bố sản phẩm truy được về tài liệu của thương hiệu.
2. **Sản phẩm là trung tâm.** Mọi trang dẫn về sản phẩm, thành phần, điểm bán hoặc liên hệ.
3. **Ba ngôn ngữ ngang hàng.** Không ngôn ngữ nào là bản dịch sơ sài; bản AI không xuất bản khi chưa duyệt.
4. **Mobile trước.** Thiết kế và kiểm thử từ màn hình 390px.
5. **Biên tập viên tự chủ.** Nội dung thường xuyên thay đổi đều quản lý được trong CMS.

## Accessibility & Inclusion

- WCAG 2.2 AA là mục tiêu [GIẢ ĐỊNH]: tương phản, bàn phím, focus, nhãn form, `prefers-reduced-motion`.
- Thuộc tính `lang` đúng theo từng ngôn ngữ (`ko`, `en`, `vi`); dùng `hreflang` cho SEO.

## Acceptance Criteria (giai đoạn đầu)

1. Cả ba ngôn ngữ truy cập được qua `/ko`, `/en`, `/vi`. Bộ chuyển ngôn ngữ giữ nguyên trang đang xem; có `hreflang` và `lang` đúng.
2. Đủ các trang trong phạm vi; nội dung lấy từ CMS, không có văn bản cứng ngoài nhãn giao diện.
3. Biên tập viên tạo, sửa, xuất bản được sản phẩm, thành phần, bài Journal, điểm bán, trang thương hiệu, cho từng ngôn ngữ, kèm trạng thái duyệt bản dịch.
4. Bản dịch chưa duyệt không hiển thị công khai.
5. Danh mục sản phẩm lọc được theo dòng sản phẩm và theo nhu cầu da (khi dữ liệu có).
6. Trang chi tiết sản phẩm có đủ: tên, ảnh, mô tả, công dụng có nguồn, thành phần chính, bảng INCI, cách dùng, lưu ý, đường dẫn tới Điểm bán và Liên hệ (không giá, không link mua).
7. Form liên hệ và B2B có kiểm tra dữ liệu, chống spam cơ bản, đủ trạng thái lỗi/thành công, lưu vào CMS.
8. Ảnh tải lên được: local lưu trên đĩa; trên Vercel lưu vào R2/S3.
9. Đạt kiểm tra ở 390 / 768 / 1440 px, điều hướng bằng bàn phím, tương phản AA; build và lint chạy sạch.
10. Mọi phần nội dung chờ cung cấp được đánh dấu rõ, không có sản phẩm hay số liệu giả.
