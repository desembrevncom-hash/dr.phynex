# Bàn giao xử lý review độc lập — 29/10/2026

> Đính chính sau review lần hai: các kết luận đóng toàn bộ binary/locale/restore tại fa51fd1 không đủ rộng. Xem [khắc phục P1 và giới hạn restore](independent-review-p1-followup.vi.md) trước khi dùng kết luận hoặc số test cũ bên dưới. Đây là báo cáo lịch sử, không thay kết quả xác minh ứng viên mới.

Đã hoàn tất bốn nhóm để review lại, **chưa phải nghiệm thu ra mắt**. Giữ Clinical Label, CSS, ảnh thương hiệu và nội dung CMS thật; chỉ thêm nhãn điều hướng phân trang. Một agent thực hiện tuần tự.

Mốc đầu: 2c35a5261048b3fedf515518188b72a291c77827. Các thay đổi triển khai cũ đã được lưu trong b765ca6 và 2c35a52. Commit checkpoint 30d896a ghi rõ còn chưa hoàn chỉnh; nhánh sửa fix/independent-review tạo từ mốc này. Ba thư mục công cụ chưa tracked được giữ nguyên, không đưa vào commit ứng dụng.

## Bảng đối chiếu từng phát hiện

| Phát hiện | Kết luận | Sửa và kiểm thử |
|---|---|---|
| S3 thêm field nhưng migration thiếu | Đúng | Luôn chèn prefix và _objectKey khi adapter Local tắt; cột thực tế là prefix và _objectkey. Có migration, generated types và snapshot từ schema adapter. Test database mới, nâng cấp có metadata upload, đọc qua Payload, so schema Local/S3 giả và kiểm tra không drift đều đạt. |
| Publish locale khác làm lộ bản dịch mới chưa duyệt | Đúng, đã tái hiện trước sửa | Buộc publishSpecificLocale tại beforeOperation cho collection/global; bản dịch translator sửa trở lại in-review. Test chứng minh giữ bản EN đã xuất bản và giữ draft EN mới sau khi publish KO. |
| Translator thay binary Media công khai | Đúng, multipart trả 200 trước sửa | Chặn server-side, nay 403. Ảnh công khai không được ghi đè ngay cả bởi editor: tạo Media mới chưa phát hành rồi duyệt và đổi quan hệ. Test giữ filename/release cũ và Media mới mặc định private. |
| Translator đổi ảnh/field cấu trúc chung | Đúng, đã tái hiện | Editor-only cho heroImage/image còn thiếu. Test Local API xác minh ảnh, slug, appearance và order không bị đổi. |
| Race invalidation trước commit | Chưa tái hiện race đồng thời gốc | Gỡ persistent guest cache và hook invalidation cũ; mỗi request kiểm tra trạng thái CMS đã commit. HTTP kiểm chứng draft, publish, unpublish, hạ duyệt và republish; không hứa thu hồi request đã chạy. |
| Ảnh optimize còn sau thu hồi | Chưa tái hiện cache CDN/optimizer đã làm nóng từ bản cũ | Tắt Next optimizer; proxy chặn URL optimizer cũ bằng 410. Ảnh gốc đi qua Payload, private/no-store; HTTP trước thu hồi 200/no-store, sau thu hồi 403, optimizer vẫn 410. |
| Khởi tạo Payload/rate limit ngoài catch | Đúng | Đưa vào try/catch cả hai action, log loại lỗi thay vì object có thể chứa dữ liệu. Test lỗi khởi tạo trả FormState server và giữ giá trị fixture. |
| Journal cắt ở 24 bài | Đúng | Có trang trước/sau, giữ topic/page hợp lệ khi đổi locale; chuẩn hóa page sai và vượt giới hạn. HTTP 25 bài thấy bài cũ ở trang 2; locale ít bài chuyển về trang hợp lệ. |
| Ingredient/Technology chung URL khi trùng slug | Đúng | Technology dùng /technologies/[slug], component chi tiết dùng chung, cập nhật danh sách/sản phẩm/sitemap. HTTP hai slug giống nhau vẫn ra hai nội dung; URL technology cũ không mơ hồ redirect 308. |
| Hreflang pháp lý có locale chưa duyệt | Đúng | Metadata dùng approvedLocalesFor. HTTP xác nhận EN có, VI chưa duyệt không có trong hreflang. |
| Audit cũ ghi số lượng không còn đúng | Đúng | Hiện 19 package: 7 low, 5 moderate, 7 high, 0 critical. Không cài/nâng dependency, không audit fix --force. Đường thực thi và advisory chính thức ghi trong báo cáo kỹ thuật. |

## Kiểm tra và giới hạn

- **38/38 test, 6 file đạt**; gồm test từ chối tên database thật dù có marker test, và từ chối marker sai.
- **17/17 kiểm tra HTTP production đạt** trên cổng test 3015, worktree riêng.
- TypeScript và ESLint đạt. Build webpack production riêng đạt tại 16acd52; các commit sau chỉ thêm snapshot, test và tài liệu, không đổi runtime.
- Đã xem Journal trang 2 tại 390/768/1440px, không tràn ngang; bấm Previous và EN sang KO giữ topic. Chưa nhận đây là nghiệm thu accessibility/visual toàn site hoặc toàn bộ ma trận ngôn ngữ.
- Database duy nhất được phép ghi khi test: drphynex_independent_review_test. Trước mọi dropDatabase, đọc current_database() và marker qua kết nối thật; không chỉ tin biến môi trường hay hậu tố tên. Upload integration ở thư mục tạm; upload HTTP ở worktree riêng.
- Kết nối read-only xác nhận migration storage mới chưa có trong drphynex. Không thay tài khoản, nội dung hay trạng thái thật. Không kết nối bucket/SMTP thật.
- Chỉ server test do đợt này tạo đã dừng sau kiểm tra; không dừng server có sẵn.

Cache nội dung hiện ưu tiên thu hồi hơn số lượng query. Ảnh không còn được Next tự biến đổi responsive; cần resize/nén asset web trước upload. Không có Payload imageSizes được cấu hình. Không thể thu hồi bản tải về, ảnh đã nạp, screenshot hoặc cache CDN bên ngoài chưa purge. Bucket phải tiếp tục private và giữ kiểm tra quyền Payload.

## Commit theo nhóm

- Storage: 256ae70; snapshot/schema drift/chốt test bổ sung: daf1bd7.
- Test tái hiện trước sửa quyền: d06ab2c. Sửa quyền: 4f1916e; bổ sung global/anonymous: fdd8af4.
- Cache/thu hồi: c8480b8.
- Chức năng: 1242fca; HTTP và offset biên: 16acd52.

Phạm vi review lại: git diff 30d896a..fix/independent-review. Có thể bỏ snapshot JSON sinh tự động khi đọc nhanh, nhưng vẫn kiểm tra migration SQL và bài test drift. Worktree nhánh fix được giữ để review; checkout gốc trở lại nhánh phase-3-brand-design tại checkpoint nhằm không buộc server/DB Local hiện có dùng schema mới trước khi được duyệt.

Chưa push, deploy, tạo dịch vụ hoặc phát sinh phí. Còn chờ trước ra mắt: nội dung/ảnh đã duyệt, staging storage/SMTP/serverless thật, diễn tập khôi phục và nghiệm thu giao diện/accessibility đầy đủ. Giữ noindex.

Chi tiết kỹ thuật và cách chạy lại: [independent-review-remediation.md](independent-review-remediation.md).
