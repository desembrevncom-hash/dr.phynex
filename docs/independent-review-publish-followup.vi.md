# Khắc phục publish full-form và locale Local API — 29/10/2026

Baseline: `22534300f70f5fc393258c8d19c74d1b1ffedb09`, nhánh `fix/independent-review`, working tree sạch. Một agent sửa tuần tự trong worktree riêng; không thay mã Media, restore, dependency, schema hoặc migration.

## Bằng chứng trước/sau

| Phát hiện | Trước sửa | Sau sửa |
|---|---|---|
| Product: payload đầy đủ của admin lặp lại In review khi Publish | Regression REST nhận 200 thay vì 409; review UI trước đã thấy bản công khai cũ từ 200 thành 404 | REST full-form 409; cả bản công khai và draft giữ nguyên. Admin thực tế Save Draft → Publish chưa duyệt hiện lỗi; guest EN và KO đều 200, tên/metadata cũ còn nguyên |
| Brand Page: cùng payload full-form | Regression REST nhận 200 thay vì 409; global mất nội dung công khai cũ | REST và admin từ chối Publish chưa duyệt; HTML/title/metadata EN cũ và KO giữ nguyên, draft mới còn nguyên |
| Duyệt và publish hợp lệ | Cần giữ được workflow hiện tại | Lưu Approved riêng qua admin, rồi Publish đúng EN thành công cho Product và Brand Page; không làm đổi nội dung/SEO KO |
| Hạ duyệt có chủ đích | In review gửi lại bị hiểu nhầm là thu hồi | Chỉ cho ngoại lệ thu hồi khi revision trước thực sự Approved, request chọn In review/AI draft và không sửa nội dung. Editor thực hiện thành công qua REST và admin; translator bị từ chối 403 |
| Local API global: locale all/*/invalid bị publishSpecificLocale=en che khuất | Regression getPayloadClient nhận mutation thay vì từ chối | Lớp withContentLocaleGuard kiểm tra options gốc trước Payload: create/update/updateGlobal của content versioned từ chối locale sai, thiếu locale, publishAllLocales và locale không khớp publishSpecificLocale |

## Quy tắc publish và thu hồi

Nội dung thay đổi phải Save Draft. Khi draft đã In review, việc Publish gửi lại chính trạng thái ấy luôn bị từ chối; server không suy ra ý định thu hồi. Request bị từ chối không thay bản công khai hoặc draft.

Workflow đã thử trong admin bằng editor test: sửa Product có rich text/Claims, Save Draft, Publish chưa duyệt bị từ chối; chọn Approved và Save Draft riêng; Publish thành công. Brand Page được thử tương tự với title, body và SEO. Guest HTTP xác minh bản cũ còn public trong lúc chờ duyệt; bản mới chỉ public sau duyệt. EN/KO được kiểm tra riêng.

Để hạ duyệt qua form: từ revision đang Approved, chọn In review rồi Publish changes trực tiếp, không sửa nội dung và không chèn Save Draft giữa hai bước. Đó là chuyển trạng thái thực sự, được kiểm tra quyền editor/admin phía server. Nếu draft đã In review, Publish không phải lệnh thu hồi và vẫn bị từ chối. Không thêm nút hoặc tính năng mới.

## Phạm vi chính xác của Local API

`src/lib/content-mutations.ts` cung cấp wrapper; `getPayloadClient()` trả client có wrapper. Wrapper kiểm tra locale trước khi Payload thay req.locale. Locale phải ko/en/vi; publishSpecificLocale nếu có phải khớp; không cho publishAllLocales. Chỉ áp dụng create/update/updateGlobal của entity có versions; không thay đổi hành vi Media, tài khoản, submission hoặc các API đọc.

Đã rà mutation trong src/scripts. Hai importer, seed acceptance và hai HTTP harness được đưa qua wrapper. Các server action dùng getPayloadClient; submission không thuộc content versioned. Các script acceptance/storage chỉ đọc không cần đổi. Seed acceptance được chuyển sang lưu draft, duyệt riêng rồi chỉ publish locale approved, để không tiếp tục gửi publish chưa duyệt. **Không chạy importer hoặc seed acceptance**, không ghi database acceptance hoặc database thật.

**Không vá hoặc thay thế getPayload() của Payload.** Lời gọi trực tiếp vào raw Payload, payload.db và code bên ngoài không qua wrapper không được lớp này bảo vệ locale gốc. Đặc biệt raw updateGlobal với locale sai kèm publishSpecificLocale hợp lệ vẫn nằm ngoài cam kết. Tests nội bộ có dùng raw Payload để kiểm tra hooks/dependency. REST vẫn có hook kiểm tra raw query locale; không coi wrapper là thay thế quyền server hoặc REST guard.

## Kiểm tra đã thực hiện

- Trước sửa: 3 regression mới thất bại đúng lý do; 49 test cũ đạt. Commit red `bb67601`.
- Sau sửa: **52/52 test, 7 file đạt**. Full-form test so sánh bản công khai và draft trước/sau từ chối; kiểm tra duyệt, publish, translator không được thu hồi, locale khác và SEO. Timestamp updatedAt dùng chung của document có thể đổi sau mutation hợp lệ; nội dung/SEO locale khác không đổi.
- **49/49 HTTP P1 mở rộng + 17/17 HTTP cũ đạt** trên cổng 3015. Gồm HTML/title/metadata, pending draft, publish, thu hồi/hạ duyệt, unpublish, ảnh, optimizer và restore regression cũ.
- Kiểm tra admin thực tế cả Product và Brand Page bằng editor có role đã assert; chọn EN, làm đủ chuỗi âm/dương và thu hồi. HTTP guest xác minh độc lập; KO vẫn 200 với metadata cũ sau thu hồi EN. Global khi thu hồi có thể render trang khung mặc định 200, nhưng không còn nội dung revision vừa thu hồi.
- TypeScript và ESLint phạm vi thay đổi đạt. Production webpack build tại `2dbb18acaba54e28b5bd87f7e811d3cf5d69860e` đạt trong worktree riêng. Sau build chỉ chỉnh fixture HTTP, seed bảo trì và tài liệu; runtime src không đổi.
- Một lần HTTP trung gian dừng ở assertion restore cũ vì các test mới đã chủ động thu hồi global. Đã sửa precondition của fixture: duyệt/publish lại revision đã kiểm tra trước khi kiểm tra restore. Mã restore không đổi; lần chạy lại toàn bộ HTTP đạt.

Trước mọi reset: wrapper đọc current_database và database comment qua kết nối PostgreSQL thật read-only; từng file test xác minh lại trên chính Payload connection trước dropDatabase. Chỉ chấp nhận `drphynex_independent_review_test` và marker `drphynex-independent-review-disposable-v1`. Integration upload ở thư mục tạm; HTTP/UI chỉ dùng worktree và database test. Không chạy migration trên drphynex, không dùng tài khoản/nội dung thật, không kết nối bucket/SMTP thật.

## Commit và giới hạn bàn giao

- `bb67601`: regression red full-form và locale gốc.
- `123f956`: chỉ coi Approved → trạng thái thấp hơn là hạ duyệt thực sự.
- `0e3dcfb`: wrapper Local API và các caller dự án.
- `2dbb18a`: regression đầy đủ và HTTP mới.
- Commit bàn giao tiếp theo chỉ hoàn thiện fixture/seed và báo cáo; không đổi runtime đã build.

Chưa merge, push, deploy hoặc phát sinh dịch vụ/phí. Staging storage/CDN/serverless và workflow quản trị trên cấu hình triển khai thật vẫn cần kiểm tra. Phạm vi Media/restore giữ nguyên và chỉ chạy hồi quy liên quan.
