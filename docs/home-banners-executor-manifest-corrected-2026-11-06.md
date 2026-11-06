# Manifest hiệu chỉnh — executor (2026-11-06)

Bổ sung cho `docs/home-banners-executor-manifest-2026-11-06.md` (giữ nguyên, không sửa; hash trong `…manifest-2026-11-06.sha256`). Manifest cũ vẫn đúng ở phần hash mã/test và fingerprint; hai điểm dưới đây được hiệu chỉnh.

## 1. Danh sách hash bằng chứng rehearsal3 (sửa lỗi tự hash)
- **Lỗi:** `rehearsal3/evidence-files.sha256` được tạo bên trong thư mục `rehearsal3/` mà nó hash, nên chứa một dòng hash của chính nó (dòng 17, ghi lúc file chưa hoàn chỉnh). Kiểm lại bằng `sha256sum -c`: 62/63 dòng khớp, dòng tự tham chiếu **không** khớp. Hash của danh sách ghi trong manifest cũ (`32c48718…`) vì vậy không có giá trị chứng minh.
- **Xử lý:** giữ nguyên artifact cũ (không xóa, không sửa). Tạo danh sách mới `C:\Users\THAI\Websites\drphynex-b5-rehearsal\evidence-rehearsal3-corrected.sha256` nằm **ngoài** thư mục được hash, loại `evidence-files.sha256`, các file URL/mật khẩu cục bộ (`*.local`) và file tạm `*.hold`/`*.orig`. Nội dung: **62 file**; SHA-256 của danh sách: `c0b0243457a72a5ee7e248e9c1ebe39c6deae3d93a3549b6ee0a724318091c99`. Không file nào trong danh sách mới là chính nó hay danh sách cũ.

## 2. Công cụ restore thực dùng
- Rehearsal 3 dùng binary **`tools\pg_restore_docker_r3.exe`** (wrapper chạy `pg_restore --list` trong container `drphynex-b5-r3-pg`), build từ **`tools\pg_restore_docker_r3.cs`** (sinh từ `pg_restore_docker.cs` bằng cách đổi tên container).

| File | SHA-256 hiện tại | Ghi chú |
|---|---|---|
| `tools\pg_restore_docker_r3.exe` | `fac64f6a16c2285266d75ded43e5e27666ca4fd0a8e78e7892dc3403cc0e15fa` | binary thực dùng cho `MIGRATION_PG_RESTORE` ở rehearsal3 |
| `tools\pg_restore_docker_r3.cs` | `edd812d833a11decaaf1d0398335ef7d30f914436cfe11a82479131effc31fa7` | nguồn của binary trên |
| `tools\pg_restore_docker.exe` / `.cs` | `b8ae0d42…aff5` / `d9e5f9e9…b42f` | wrapper của rehearsal 1–2 (container cũ), **không** dùng ở rehearsal 3 |

- **Đính chính fingerprint:** fingerprint trước/sau rehearsal3 (235 file, `7ac295a6…1bfc2`) chứa `pg_restore_docker.exe`/`.cs` (wrapper cũ) nhưng **không** chứa `_r3.exe`/`_r3.cs`. Hai file này vì vậy **không** nằm trong bằng chứng bất biến trước/sau. Chỉ có hai dữ kiện gián tiếp: thời điểm sửa đổi cuối của chúng (09:31:00) sớm hơn lần chạy executor (log 09:32:13), và hash hôm nay được ghi ở trên. Không tuyên bố hồi tố rằng binary được dùng lúc chạy đã bất biến, hay build lại từ `.cs` cho ra cùng byte.
- **Ghim cho lần thực thi tiếp theo:** công cụ restore là một mục bắt buộc của checkpoint (`checkpoint.json` trong gói cấu hình chạy thật): đường dẫn tuyệt đối, SHA-256 của `.exe` và `.cs`, container đích; `fp-real.sh` đưa chúng vào fingerprint **trước và sau** lần chạy, và lần chạy dừng nếu hash khác checkpoint. Wrapper của lần chạy thật phải trỏ container thật (`drphynex-postgres`) và được review riêng; wrapper r3 không dùng lại.

## 3. Mã đã review (xác minh lại hôm nay, không chạy lại test)
`sha256sum -c` trên bảy file mã/test của manifest cũ: **7/7 khớp** (`state-store.ts`, `migration-anchor.ts`, `migrate-guarded.ts`, `migration-guard.ts`, ba spec). Ba tài liệu của manifest cũ cũng khớp `.sha256`. Không chạy lại unit/guard vì mã không đổi.
