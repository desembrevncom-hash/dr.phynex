# Quy trình làm website

Dự án chạy Local trên Windows (PowerShell; dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`, dùng `python` thay cho `python3`).

## 1. Trước khi xây website

- Đọc mã nguồn, `package.json`, PRODUCT.md, DESIGN.md và tài liệu hiện có trước khi đề xuất hay sửa.
- Xác định: thương hiệu, khách hàng mục tiêu, mục tiêu website, danh sách trang, hành động chuyển đổi chính.
- Chỉ hỏi thông tin còn thiếu khi nó thực sự ảnh hưởng tới thiết kế hoặc chức năng; phần còn lại tự quyết định và nêu rõ giả định.
- Dự án đã có mã: giữ stack và quy ước đang dùng, trừ khi có lý do cụ thể (nêu lý do trước khi đổi).

## 2. Phân vai kỹ năng

| Skill | Vai trò | Lệnh chính |
|---|---|---|
| `ui-ux-pro-max` | Nghiên cứu và đề xuất hệ thống thiết kế theo brief | `python .claude/skills/ui-ux-pro-max/scripts/search.py "<sản phẩm> <ngành> <từ khóa>" --design-system -p "<Tên>"` |
| `design-taste-frontend` | Phát triển hướng thẩm mỹ, kiểm tra giao diện trên trình duyệt | `node .claude/skills/design-taste-frontend/scripts/draw.mjs ...`, `lint.mjs`, `inspect.mjs` |
| `impeccable` | Kiểm tra và tinh chỉnh sau khi có bản giao diện (critique, audit, polish...) | `.claude/skills/impeccable/scripts/impeccable.cmd context` (chạy một lần mỗi phiên) |

- Khi hướng dẫn giữa các skill khác nhau: ưu tiên brief đã được người dùng xác nhận, sau đó là DESIGN.md của dự án. Báo rõ xung đột cần người dùng quyết định, không tự chọn im lặng.
- Tạm **không dùng** scroll scenes của Taste Skill (`assets/scenes`, `scenes.mjs`, `--redraw scenes`): bộ cài hiện thiếu tài nguyên. Nếu bản vẽ hướng thiết kế có scenes, bỏ qua phần đó và ghi chú trong báo cáo. Không tự tải hoặc cài thêm để khắc phục.
- Giữ nguyên cấu hình hooks hiện tại (`.impeccable/config.local.json`, `.claude/settings.local.json`) trừ khi người dùng yêu cầu.

## 3. Tài liệu dự án

- Khi có brief: tạo PRODUCT.md (mục tiêu, người dùng, phạm vi, luồng chính), theo `.claude/skills/impeccable/reference/init.md` khi phù hợp.
- Tạo DESIGN.md ghi rõ: màu (token), font **hỗ trợ đầy đủ tiếng Việt** (kiểm tra subset `vietnamese` trên Google Fonts), khoảng cách, bố cục, component, hình ảnh, chuyển động.
- Không tạo PRODUCT.md hay DESIGN.md khi chưa có brief.
- Không bịa thông tin doanh nghiệp, chứng nhận, số liệu, đánh giá khách hàng hay công dụng sản phẩm. Nội dung mẫu phải được đánh dấu và liệt kê để khách xác nhận.

## 4. Triển khai

- Hoàn thiện **một trang đại diện** (thường là trang chủ) và được duyệt trước khi nhân rộng sang các trang khác.
- Xử lý khi có liên quan: responsive, điều hướng bằng bàn phím, focus hiển thị rõ, tương phản (≥ 4.5:1 cho chữ thường), trạng thái loading, empty, error, success.
- Dùng ảnh và nội dung đúng thương hiệu; chỗ chờ khách cung cấp đánh dấu rõ (ví dụ `[CHỜ CUNG CẤP: ảnh cửa hàng]`).
- Chỉ thêm hiệu ứng có mục đích, dùng transform/opacity, luôn có phương án `prefers-reduced-motion`.

## 5. Kiểm tra và bàn giao

- Chạy website thực tế trên Local (dev server hoặc file build).
- Kiểm tra ở chiều rộng 390, 768 và 1440 px (`inspect.mjs` của Taste Skill hoặc trình duyệt tích hợp), và xem ảnh chụp thực tế.
- Bấm thử menu, liên kết, form và các chức năng chính.
- Chạy build và các kiểm tra dự án có (lint, test, type-check).
- Sau mỗi vòng kiểm tra, sửa lỗi quan trọng trước khi bàn giao.
- Báo cáo rõ: đã kiểm tra gì, lỗi còn lại, chức năng chưa kết nối thật (form, thanh toán, API...).
- Không tuyên bố đã kiểm tra nếu chưa thực hiện.
- Không đưa secret vào mã nguồn. Không tự triển khai công khai khi chưa được yêu cầu.
