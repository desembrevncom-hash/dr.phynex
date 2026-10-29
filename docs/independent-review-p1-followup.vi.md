# Khắc phục P1 và quy tắc restore — 29/10/2026

> Đính chính tiếp sau review tại 2253430: xem [khắc phục publish full-form và locale Local API](independent-review-publish-followup.vi.md). Các số kiểm tra bên dưới là lịch sử; chưa bao phủ payload Publish đầy đủ của admin hoặc locale gốc bị publishSpecificLocale che khuất.

Phạm vi bắt đầu: `fa51fd19bd350cfa38c169e9afe7f2d6ba1bffea`, nhánh `fix/independent-review`, working tree sạch. Một agent sửa tuần tự trong `C:/Users/THAI/.codex/worktrees/independent-review/website-demo`. Checkout gốc tiếp tục ở `30d896a`, các thư mục công cụ chưa tracked được giữ nguyên. Không đổi thiết kế, dependency, migration, dịch vụ hoặc nội dung thật.

## Đính chính báo cáo trước

Các kết luận tại fa51fd1 về binary và publish theo locale đã rộng hơn bằng chứng lúc đó. 38 test và 17 HTTP check trước chỉ chứng minh các đường đã chạy: multipart và publish một locale hợp lệ. Chúng không bao phủ JSON uploadEdits, global locale=all, editor kế thừa approval hoặc native restore. Không dùng các con số cũ làm bằng chứng đóng toàn bộ quyền xuất bản/file.

## Bằng chứng trước và sau

| Nhóm | Trước sửa / giới hạn bằng chứng | Khắc phục | Bằng chứng sau sửa |
|---|---|---|---|
| Media JSON crop | Regression mới nhận 200 thay vì 403; probe review trước đã thấy ảnh 40×40 bị đổi thành 10×10 và publicRelease thành false | Guard trước generateFileData trong beforeOperation; nhận diện req.file, uploadEdits, focalX/Y và thay danh tính file | Ma trận 12 trường hợp: translator 403, editor trên Media đã phát hành 409; Sharp không được gọi; danh sách file, SHA-256, filename, filesize, width/height, publicRelease không đổi; GET file khách 200 và checksum cũ |
| Các đường ảnh khác | Test cũ chỉ kiểm tra multipart | Kiểm tra crop/width/height/focalPoint query, focalX/Y JSON; từ chối biến đổi bulk thiếu id; Local API mang user cũng chịu guard kể cả overrideAccess | Crop/resize/focal/multipart cùng được kiểm tra; translator không biến đổi Media chưa phát hành; editor vẫn crop được Media chưa phát hành và file giữ private; alt-only translator vẫn được phép |
| Global locale=all | Regression mới nhận 200 thay vì 400 đúng chuỗi public EN → draft EN → publish all; probe trước thấy draft lọt HTML/title | Kiểm tra locale thô trước fallback; từ chối all, *, invalid và publishAllLocales; áp dụng factory collection/global | REST và Local API từ chối; bản EN công khai/title/SEO và KO cũ được giữ; HTTP riêng kiểm tra HTML/title/metadata |
| Editor kế thừa approved | Regression mới vẫn nhận approved sau sửa draft | So sánh nội dung localized, gồm SEO/group/rich text/array localized; chuyển in-review dù editor gửi approved cùng lần sửa; không cho sửa nội dung trực tiếp vào bản chính | Draft editor về in-review; publish bị từ chối 409; bản cũ còn nguyên. Save draft → save chỉ approval → publish locale cụ thể thành công. Hạ duyệt có chủ đích của bản đã xuất bản vẫn thu hồi được |
| Restore | Test ban đầu bị validation tên do locale mặc định, nên không được coi là bằng chứng restore an toàn/không an toàn. Mã dependency và probe native cô lập sau đó chứng minh global restore?draft=true ghi snapshot lịch sử vào bản chính và hạ status draft | Chặn mọi restoreVersion ở beforeOperation của content collection/global, gồm REST, Local API và overrideAccess; HTTP 409 | Regression chặn collection/global, cả draft=true và false; bản công khai không đổi. Probe native chỉ tạm bỏ guard trong bộ nhớ test để xác nhận hành vi dependency, rồi phục hồi guard trong finally |

## Workflow quản trị hiện tại

- Chọn một locale ko/en/vi. Lưu thay đổi nội dung bằng Save draft (`draft=true`). Với revision đã có nội dung, approval trở lại In review; không thể duyệt và sửa nội dung mới trong cùng một save.
- Editor kiểm tra bản nháp rồi lưu Approved trong một thao tác không thay nội dung; sau đó publish đúng locale. Publish không hợp lệ bị từ chối thay vì tự chọn ko. Tạo revision đầu tiên được phép duyệt có chủ đích ngay lúc tạo; translator vẫn không được approve/publish.
- Media đang cleared for publication không được thay binary hoặc danh tính file tại chỗ, kể cả editor. Tạo Media mới ở trạng thái private, kiểm tra/crop trước khi duyệt, rồi đổi quan hệ ảnh theo quyền editor. Translator được sửa alt/caption theo quyền hiện có. Guard bulk từ chối thao tác biến đổi binary thiếu một id cụ thể.
- **Restore đang bị chặn toàn bộ**, không phải restore theo locale và chưa có chức năng restore thành draft an toàn. Có thể đọc lịch sử theo quyền staff và chép nội dung cần dùng vào bản nháp mới, rồi duyệt/xuất bản từng locale. Không dùng endpoint restore hoặc Local restore để khôi phục công khai.
- Mô tả collection/global trong admin thông báo rõ restore bị chặn và hướng xử lý; sidebar approval mô tả quy trình save/review/publish.

## Kiểm tra và an toàn

- Trước mọi schema reset, wrapper xác minh PostgreSQL thật bằng current_database và database comment qua kết nối read-only; helper từng file test xác minh lại trên chính Payload connection trước dropDatabase. Chỉ chấp nhận `drphynex_independent_review_test` + marker `drphynex-independent-review-disposable-v1`.
- Integration upload ở thư mục OS tạm; HTTP upload trong media của worktree riêng. Tài khoản và nội dung test trung tính, password ngẫu nhiên, chỉ trong DB test. Không in token/secret, dữ liệu form hoặc thông tin tài khoản thật.
- Regression trước sửa: 4 test thất bại, 39 đạt. Ba thất bại đầu là bằng chứng hai P1 và editor approval; thất bại restore đầu không đủ giá trị vì validation, như đã nêu trên.
- Suite sau sửa: 49/49 test, 7 file đạt. Bao gồm bộ cũ về storage/schema/migration, quyền, cache, form và chức năng; không chạy migration mới và không chạy migration trên drphynex.
- Bộ HTTP cũ phát hiện hồi quy hạ duyệt sau republish ở ứng viên trung gian. Regression riêng đã tái hiện; guard ghi ý định hạ duyệt ngay trong beforeOperation thay vì suy ra từ data đã được Payload điền mặc định. Suite kiểm tra cả từ chối publish draft chưa duyệt lẫn cho phép thu hồi có chủ đích.
- TypeScript: đạt. ESLint phạm vi sửa: đạt. Build production webpack tại b169c0e: đạt; TypeScript của build đạt. HTTP production trên cổng 3015 cùng bundle: 29/29 P1 và 17/17 bộ cũ đạt (46 kiểm tra), gồm hạ duyệt sau republish, unpublish, thu hồi ảnh và optimizer 410. Sau đó chỉ thêm chốt role của HTTP fixture và tài liệu, không đổi runtime đã build. Server test do đợt này tạo đã dừng.

Lệnh kiểm tra không được dùng `build:vercel`. Build production bằng Next webpack trong worktree riêng, biến môi trường chỉ DB test, S3/SMTP/VERCEL bị loại bỏ. Server HTTP riêng cổng 3015; không lấy 3000/3001 làm bằng chứng cho nhánh sửa. Không reset schema khi HTTP server đang kiểm tra.

## Giới hạn

Không xác nhận S3/R2/CDN/SMTP/serverless staging thật; không thay dependency hoặc đánh giá advisory mới trong đợt P1 này. Không thay cơ chế ảnh/cache đã có: upload qua Payload kiểm tra quyền và no-store, optimizer cũ 410. Không thể thu hồi ảnh đã tải, screenshot hoặc CDN ngoài ứng dụng. Restore tự động an toàn vẫn là giới hạn đã chặn, không phải một tính năng đã hoàn tất. Không tuyên bố đã nghiệm thu lại giao diện/accessibility toàn site trong đợt sửa backend này.

Lệnh kiểm tra HTTP: `NODE_ENV=production node --import tsx scripts/review-p1-http.ts`, sau đó `scripts/review-http.ts` từ worktree riêng. HTTP fixture tạo admin test trước rồi assert đúng role editor/translator; không dùng tài khoản thật.

Các commit nhóm: 04d0cce regression trước sửa; 714f2da guard xử lý ảnh; d62fefd locale/approval; 9d93563 chặn restore + mô tả admin; 470dcb2 mở rộng regression/HTTP; db1e585 guard danh tính file Local API. 8467699/b169c0e sửa và kiểm tra hạ duyệt sau republish, phân biệt ý định request với default Payload. Generated types chỉ cập nhật comment mô tả admin, không thay schema. Bản bàn giao cuối thêm tài liệu và kết quả kiểm tra, giữ nguyên runtime đã build.
