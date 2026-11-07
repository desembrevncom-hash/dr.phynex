# Bước kiểm tra trước phát hành: không mang dữ liệu demo lên bản thật

Bản xem thử cổng 3021 chạy trên database thử `drphynex_independent_review_test` (có marker). Database này chứa dữ liệu **chỉ dùng để duyệt**, tuyệt đối không được có trong bản phát hành:

| Dữ liệu demo | Nguồn tạo |
|---|---|
| 3 điểm bán minh họa Seoul, Busan, Incheon ("Điểm bán minh họa" / "예시 매장" / "Sample store") | `scripts/seed-contact-demo.ts` |
| Sản phẩm mẫu `mau-san-pham-thu` ("[MẪU]" / "[SAMPLE]" / "[샘플]") | `scripts/seed-product-review.ts guest` |
| Tài khoản thử `review-admin`, `review-editor`, `review-translator` `@test.local` | `scripts/seed-product-review.ts reset` |

Các script seed đều từ chối mọi database không có marker thử, nên bình thường dữ liệu này không thể lọt sang database thật. Bước dưới đây là lớp kiểm tra **độc lập**, bắt buộc chạy trước mỗi lần phát hành, kể cả khi database được sao chép hay khôi phục từ bản sao lưu.

## Cách chạy (chỉ đọc)

**Cách khuyến nghị:** trỏ tới file `.env` của đúng môi trường sắp phát hành.

```powershell
node scripts/check-release-data.mjs <đường dẫn tới .env của môi trường phát hành>
```

hoặc `npm run check:release-data -- <đường dẫn .env>`.

- **Khi có truyền file**, `DATABASE_URL` chỉ được lấy từ chính file đó. File không tồn tại, không đọc được, hoặc không có hay để trống `DATABASE_URL` thì trả **exit 2 trước khi kết nối**. Script **không bao giờ** chuyển sang `DATABASE_URL` của shell, nên gõ sai đường dẫn không thể khiến nó kiểm nhầm một DB khác.
- **Khi không truyền file** (`node scripts/check-release-data.mjs` hoặc `npm run check:release-data`), script dùng `DATABASE_URL` của shell. Nếu shell không có biến này thì trả exit 2.
- Dòng đầu kết quả in tên database và nguồn đã dùng (`source: env file …` hoặc `source: shell DATABASE_URL`). **Đối chiếu tên này với DB đích** trước khi tin kết quả.
- `DATABASE_URL` phải là URL PostgreSQL rõ ràng: `postgres://` hoặc `postgresql://`, có host, có tên database, và port hợp lệ nếu có ghi. Giá trị như `fixture-only`, scheme khác hay port sai bị từ chối với exit 2, trước khi tạo kết nối. Lỗi kết nối chỉ báo lý do cố định kèm mã lỗi (ví dụ `connection refused (code ECONNREFUSED)`), không in thông báo thô của driver.
- Script mở transaction READ ONLY, không ghi gì và không in mật khẩu hay chuỗi kết nối.
- Kiểm cả bản đã xuất bản lẫn các phiên bản nháp hoặc lịch sử (`_stores_v`, `_products_v`).
- Kết quả:
  - **exit 0** (`CLEAN`): được phát hành.
  - **exit 1** (`NOT CLEAN`): dừng. Danh sách bản ghi vi phạm được in ra; xử lý trên database đó qua quy trình xoá đã được duyệt, rồi chạy lại.
  - **exit 2**: không kiểm được. Không phát hành.

## Kết quả đã chạy ngày 07/11/2026

`drphynex-products-review-evidence/contact-block/12-release-data-check.log`:
- DB thử `drphynex_independent_review_test`: **NOT CLEAN** (đúng như mong đợi): 9 bản ghi điểm bán minh họa, các phiên bản nháp của chúng, sản phẩm mẫu, 3 tài khoản thử; exit 1.
- DB thật cục bộ `drphynex` (chỉ đọc): **CLEAN**, exit 0.

Sau khi sửa cách chọn nguồn (`contact-review/release-check-fix/02-real-cases.log`). Trong mọi trường hợp dưới đây, shell đều đặt sẵn `DATABASE_URL` trỏ tới DB thử:

| Trường hợp | Kết quả |
|---|---|
| Đường dẫn `.env` sai | exit 2, không dùng shell |
| `.env` không có `DATABASE_URL` | exit 2, không dùng shell |
| File trỏ DB thử, shell trỏ cổng không tồn tại | Dùng DB trong file: `source: env file …`, NOT CLEAN, exit 1 |
| Không truyền file | Dùng shell, exit 1 |
| DB thật qua file `.env` của nó (chỉ đọc) | CLEAN, exit 0 |

Regression: `tests/unit/check-release-data.spec.ts`, 6/6. Test này dùng hai listener TCP giả để chứng minh script không kết nối khi phải từ chối, và chỉ kết nối tới DB trong file.
