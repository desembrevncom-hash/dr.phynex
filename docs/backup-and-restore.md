# Sao lưu và khôi phục (Local)

**Commit mã không phải là sao lưu nội dung.** Git chỉ chứa mã, migration và tài liệu. Nội dung CMS, file tải lên và secret nằm ngoài Git.

## 1. Bản sao lưu chứa gì, và vì sao phải bảo vệ

| Thành phần | Chứa dữ liệu nhạy cảm? |
|---|---|
| `drphynex-db.dump` (pg_dump) | **Có.** Gồm tài khoản (email, **mã băm mật khẩu**, phiên đăng nhập), bài gửi form Liên hệ/Hợp tác (**họ tên, email, số điện thoại, nội dung, có thể là dữ liệu cá nhân**), bản nháp và ghi chú biên tập nội bộ |
| `media/` | Ảnh, kể cả ảnh chưa được phép công bố |
| `private-uploads/` | Tài liệu nguồn nội bộ (PDF bao bì) |
| `brand-assets/` | File gốc của thương hiệu, bản chép chữ, ảnh xem trước |

Bản sao lưu **không** chứa `.env`. Mã băm mật khẩu không phải mật khẩu, nhưng vẫn có thể bị dò nếu lộ. Vì vậy hãy xử lý bản dump như tài liệu mật.

## 2. Tạo bản sao lưu

```bash
bash scripts/backup-local.sh
```

Script ghi vào `../drphynex-backups/<thời điểm>/`, ngoài repo. Nội dung gồm file dump, ba thư mục ở trên và `files.sha256`, và script tự kiểm tra file dump đọc được.

Bản đã tạo và đã phục hồi thử thành công: `C:\Users\THAI\Websites\drphynex-backups\2026-10-29_1305\` (xem `RESTORE.md` trong thư mục đó).

## 3. Bản sao thứ hai ngoài máy, được mã hóa (đề xuất, chưa thực hiện)

Mục tiêu: một bản sao nằm ngoài máy này, được mã hóa trước khi rời máy. Tôi chưa tải lên dịch vụ nào.

1. **Mã hóa thành một file**, chọn một trong hai cách:
   - **7-Zip** (AES-256, mã hóa cả tên file):
     ```bash
     7z a -t7z -mhe=on -p drphynex-backup-YYYY-MM-DD.7z "C:\Users\THAI\Websites\drphynex-backups\<thời điểm>"
     ```
   - **age** (mã hóa bằng khóa công khai, không cần nhập mật khẩu mỗi lần):
     ```bash
     age -r <khóa-công-khai> -o backup.tar.age backup.tar
     ```
2. **Nơi lưu**: ổ cứng ngoài, hoặc dịch vụ lưu trữ của công ty. Chỉ đưa lên **file đã mã hóa**.
3. **Mật khẩu hoặc khóa giải mã**: lưu trong trình quản lý mật khẩu của công ty. Không ghi trong cùng thư mục, cùng email hay cùng ổ với bản sao lưu.
4. **Định kỳ**: mỗi tuần, hoặc trước mỗi đợt nhập liệu lớn. Mỗi quý, phục hồi thử một lần (§5).
5. Xóa các bản sao lưu cũ theo thời hạn lưu trữ mà chính sách bảo mật quy định, vì trong đó có dữ liệu form.

## 4. Biến môi trường (`.env`): bảo quản và khôi phục

`.env` không nằm trong Git và không nằm trong bản sao lưu. Hãy lưu nội dung file này dưới dạng ghi chú bảo mật trong trình quản lý mật khẩu.

| Biến | Dùng để làm gì | Nếu mất |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Container Postgres Local | Volume cũ dùng mật khẩu cũ. Nếu mất mật khẩu: đặt lại bằng `docker exec drphynex-postgres psql -U <user> -c "ALTER USER <user> PASSWORD '<mới>'"`, rồi sửa `.env` |
| `DATABASE_URL` | Kết nối Payload → Postgres | Ghép lại từ các biến ở trên |
| `PAYLOAD_SECRET` | Ký phiên đăng nhập (JWT) | Tạo chuỗi mới. Mọi người phải đăng nhập lại; nội dung và mật khẩu không bị ảnh hưởng |
| `NEXT_PUBLIC_SERVER_URL` | Địa chỉ site (CORS/CSRF, hreflang) | Đặt lại theo môi trường |
| `S3_*`, `SMTP_*`, `EMAIL_FROM_*`, `FORM_NOTIFY_TO` | Chỉ dùng khi triển khai (storage, email); Local để trống | Tạo khóa mới ở nhà cung cấp và thu hồi khóa cũ; xem [deployment-plan.md](deployment-plan.md) §4 |

Khôi phục trên máy mới:
1. `cp .env.example .env`
2. Điền giá trị từ trình quản lý mật khẩu.
3. `npm ci`
4. `npm run db:up`
5. Phục hồi dump theo §5.

**Không** dán `.env` vào Git, vào chat hay vào báo cáo.

## 5. Khôi phục

Phục hồi thử (không động vào dữ liệu đang chạy):

```bash
docker exec drphynex-postgres sh -c 'createdb -U "$POSTGRES_USER" drphynex_restore_check'
```

```bash
docker exec -i drphynex-postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d drphynex_restore_check --no-owner --exit-on-error' < <thư-mục-sao-lưu>/drphynex-db.dump
```

So sánh số bản ghi với database đang chạy, rồi xóa database thử:

```bash
docker exec drphynex-postgres sh -c 'dropdb -U "$POSTGRES_USER" drphynex_restore_check'
```

Phục hồi file vào một thư mục tạm, rồi kiểm tra bằng `sha256sum -c <thư-mục-sao-lưu>/files.sha256`.

Phục hồi thật (ghi đè):
1. Dừng ứng dụng.
2. **Tạo một bản sao lưu mới của trạng thái hiện tại.**
3. Phục hồi vào database chính.
4. Chép lại `media/` và `private-uploads/`.
5. Chạy `npm run migrate:status` để kiểm tra.

## 6. Trên môi trường triển khai (sau này)

Cần thêm, khi đã chọn nhà cung cấp:
- Postgres có quản lý, bật sao lưu tự động và khôi phục theo thời điểm (PITR).
- Bucket R2/S3 bật versioning.
- Phục hồi thử định kỳ.

Chi tiết ở [acceptance-status.md](acceptance-status.md) §4.
