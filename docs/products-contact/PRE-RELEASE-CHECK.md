# Bước kiểm tra trước phát hành: không mang dữ liệu demo lên bản thật

Bản xem thử cổng 3021 chạy trên database thử `drphynex_independent_review_test` (có marker). Database này chứa dữ liệu **chỉ dùng để duyệt**, tuyệt đối không được có trong bản phát hành:

| Dữ liệu demo | Nguồn tạo |
|---|---|
| 3 điểm bán minh họa Seoul, Busan, Incheon ("Điểm bán minh họa" / "예시 매장" / "Sample store") | `scripts/seed-contact-demo.ts` |
| Sản phẩm mẫu `mau-san-pham-thu` ("[MẪU]" / "[SAMPLE]" / "[샘플]") | `scripts/seed-product-review.ts guest` |
| Tài khoản thử `review-admin`, `review-editor`, `review-translator` `@test.local` | `scripts/seed-product-review.ts reset` |

Các script seed đều từ chối mọi database không có marker thử, nên bình thường dữ liệu này không thể lọt sang database thật. Bước dưới đây là lớp kiểm tra **độc lập**, bắt buộc chạy trước mỗi lần phát hành, kể cả khi database được sao chép hay khôi phục từ bản sao lưu.

## Cách chạy (chỉ đọc)

Trỏ tới file `.env` của môi trường sẽ phát hành:

```powershell
node scripts/check-release-data.mjs <đường dẫn tới .env của môi trường phát hành>
```

hoặc `npm run check:release-data` (đọc `./.env`).

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
