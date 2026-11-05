# HomeSlider fix1: kiểm tra bổ sung (05/11/2026)

Bổ sung cho `docs/home-slider-fix1-2026-11-05.md`. Không sửa mã, không format, không build lại, không chạy lại toàn bộ unit test, không commit.

Báo cáo và bằng chứng trước được giữ nguyên, đã kiểm tra lại bằng `sha256sum -c` (OK):
- `docs/home-slider-handoff-2026-11-05.md`
- `docs/home-slider-fix1-2026-11-05.md`
- `brand-assets/screenshots/home-slider-2026-11-05-fix1/`

## Mã nguồn không đổi

Đối chiếu với manifest fix1 trước và sau lượt kiểm tra, cả 5 file đều OK (`logs/source-hashes-checked.sha256`):

```
9610fa42fbe392b5610c28dacd43d3f255d1775d98576496cb646ffaee1bda92  src/components/home/HomeSlider.tsx
3e7a2821588b477f5d93181fb764cbd2f1166f99259983f6cd8ae2898778a67b  src/components/home/autoplay.ts
cc2c461a7fd207c02685cce03d98cc673ea505761ae51112a903540f33e01422  tests/unit/home-slider-autoplay.spec.ts
6ff14abac6b6802250f60fb4f0658ed7e101a2e14ac56d29725e86f24b5275bf  src/app/(frontend)/globals.css
89b0994586feafde38949f8181083cea0fad712fce7be952dfe6ca0555ae09cc  src/components/layout/PageShell.tsx
```

## Cách đo

Script `scripts/audit2.mjs`: Chrome headless qua CDP, DPR 1, server `http://127.0.0.1:3010`.

**Điều kiện sẵn sàng**, chờ tối đa 30 s và kiểm tra lại mỗi 250 ms:
- `document.readyState === 'complete'`
- `document.fonts.status === 'loaded'`
- có `.home-slider`, đủ 5 `.home-slide` và 5 nút chấm
- không còn `<img>` nào chưa tải xong

Nếu quá thời gian mà chưa sẵn sàng, script lưu `*-NOT-READY.json` (URL cuối, HTTP status của document, trạng thái cuối, console và exception) cùng ảnh `*-NOT-READY.jpg`, rồi tính là FAIL. Trong lượt này không có trường hợp nào chưa sẵn sàng.

**Đo từng slide:** tắt autoplay, bấm chấm, chờ 750 ms (transition 600 ms) và 2 animation frame. Số đo lấy từ hợp của bounding box mọi phần tử con trong `.home-slide-visual`. Với mark MX/RX, độ rộng chữ thật được đo bằng `Range.getClientRects()` cộng với khối viên thuốc ở giữa.

**Tiêu chí FAIL:**
- visual tràn ra ngoài cột ở bất kỳ phía nào (> 0,5 px), hoặc `scrollWidth > clientWidth` của mark
- visual bị slider cắt, nằm dưới header, đè lên chữ hoặc controls, hoặc nằm thấp hơn mép trên controls
- khoảng cách từ chữ tới controls < 16 px
- CTA hoặc controls ra ngoài viewport, tiêu đề tràn, trang cuộn ngang
- HTTP khác 200, hoặc có console error/exception

## 1. Fallback MX-02 tại 1440 px, đo thật

| Ngôn ngữ | font-size | Cột | Mark (đo) | Tràn trái/phải | Cách cột chữ | Bị cắt | Visual → controls | Chữ → controls |
|---|---|---|---|---|---|---|---|---|
| KO | 120 px | 482,8 | 462,0 | −10,4 / −10,4 (nằm trong) | 58,4 | 0 | 22 | 191,9 |
| EN | 120 px | 482,8 | 462,0 | −10,4 / −10,4 | 58,4 | 0 | 22 | 180,8 |
| VI | 120 px | 482,8 | 462,0 | −10,4 / −10,4 | 58,4 | 0 | 22 | 190,5 |

Đạt. Lần đo `after-wide` trước khi sửa: 499 px, tràn 8,1 px mỗi bên ở EN/VI.

"Visual → controls = 22" là khoảng cách từ đáy ô visual (khối mark cao bằng ô) tới mép trên controls. Ở desktop, controls nằm dưới cả cột chữ lẫn cột visual.

## 2. Quanh ngưỡng CSS mới

Quy tắc: `.home-formula-art { font-size: clamp(56px, 9vw, 120px) }`.
- Mức trần 120 px bắt đầu có hiệu lực khi 9vw ≥ 120 px, tức viewport ≥ 1333,33 px.
- Cột visual ngừng giãn từ 1280 px (`.container-page` max-width 80rem).

| Viewport | font-size đo | Mark (KO = EN = VI) | Cột | Kết quả |
|---|---|---|---|---|
| 1280 | 115,20 | 443,5 | 482,8 | đạt |
| 1332 | 119,88 | 461,5 | 482,8 | đạt |
| 1333 | 119,97 | 461,9 | 482,8 | đạt |
| 1334 | 120,00 | 462,0 | 482,8 | đạt |
| 1335 | 120,00 | 462,0 | 482,8 | đạt |
| 1440 | 120,00 | 462,0 | 482,8 | đạt |
| 1920 | 120,00 | 462,0 | 482,8 | đạt |

Kích thước tăng liên tục qua ngưỡng, không có bước nhảy. Toàn bộ 105 trường hợp (7 viewport × 3 ngôn ngữ × 5 slide) đạt: 0 lỗi, 0 chưa sẵn sàng, HTTP 200, không có console error (`audit/mx02-results.json`, `logs/audit2-mx02.log`).

Giới hạn: đo trong Chrome headless với `--hide-scrollbars`, nên `100vw` bằng `innerWidth`. Trên trình duyệt có thanh cuộn dạng cố định (Windows), `9vw` tính cả bề rộng thanh cuộn, còn cột thì hẹp hơn tương ứng. Từ 1280 px cột cố định 482,8 px và mark tối đa 462 px, nên vẫn còn khoảng 20 px dự phòng. Trường hợp này chưa đo bằng trình duyệt có thanh cuộn.

## 3. `/vi` tại 320 px

Chạy riêng 3 lần tải trang độc lập × 5 slide: cả 3 lần HTTP 200, sẵn sàng sau 2 679 / 1 766 / 1 583 ms. 15/15 đạt:
- chữ → controls: 80,9 px (slide Brand), 114,5 px (các slide khác)
- không tràn, không bị cắt, `scrollWidth` 320

Kết quả trong `audit/vi320-results.json` và `logs/audit2-vi320.log`; ảnh `audit/vi320-r{1,2,3}-320-vi-slide-{1..5}.jpg`.

Lỗi `null` của lần audit trước **không tái hiện**. Nguyên nhân khả dĩ vẫn là dev server đang biên dịch lại ngay sau khi sửa file, nhưng **chưa xác minh được**: dev server (PID 3380) được khởi động ngoài phiên này nên không đọc được log biên dịch. Script cũ không chờ trạng thái sẵn sàng; script mới có chờ, và nếu trang không sẵn sàng sẽ ghi FAIL kèm chẩn đoán thay vì dừng giữa chừng.

## 4. ESLint / Prettier (chỉ kiểm tra, không ghi file)

| Lệnh | Exit | Log |
|---|---|---|
| `npx.cmd eslint --max-warnings=0 src/components/layout/PageShell.tsx` | 0 | `logs/eslint-pageshell.log` |
| `npx.cmd prettier --check src/components/layout/PageShell.tsx "src/app/(frontend)/globals.css"` | 0 ("All matched files use Prettier code style!") | `logs/prettier-check2.log` |

## Trạng thái

Mọi kiểm tra trong lượt này đều đạt và mã không đổi, nên không build lại và không chạy lại toàn bộ unit test. Phạm vi của từng kết quả trước đó, so với các hash ở trên, được ghi trong mục **Đính chính** bên dưới.

### Đính chính (bổ sung sau khi Codex review)

Bản đầu của tài liệu này viết: "Kết quả build (exit 0) và unit (550/550) của fix1 vẫn áp dụng cho đúng các hash trên." Câu đó **không chính xác** đối với unit. Phạm vi đúng:

- **Unit 550/550** (16 file) bắt đầu lúc 13:38:15, **trước** hai lần sửa cuối: `PageShell.tsx` lúc 13:48:33 và `globals.css` lúc 13:48:37. Không có lần chạy đủ 550 test nào trên bản cuối, và không tuyên bố điều đó.
- **Build cuối** chạy sau hai lần sửa đó, trên đúng các hash hiện tại: biên dịch thành công, TypeScript thành công, 7/7 trang tĩnh, exit 0 (`fix1/logs/build-fix1.log`).
- **Regression autoplay 12/12** chạy lúc 13:34. Ba file `HomeSlider.tsx`, `autoplay.ts` và `home-slider-autoplay.spec.ts` có hash trùng với bản hiện tại. Hai file sửa sau đó (`PageShell.tsx`, `globals.css`) không được test này import. Bản autoplay chạy trên trình duyệt thật (A–E, 5/5) chạy sau hai lần sửa cuối.
- **ESLint** (`PageShell.tsx`) và **Prettier --check** (`PageShell.tsx`, `globals.css`) đạt trên nguồn hiện tại (mục 4 ở trên).

Bằng chứng gốc không thay đổi. Chỉ đoạn văn này được sửa, và hash của tài liệu đã được cập nhật.

**Chưa kiểm chứng:**
- **Packshot thật trong staff preview (EN/VI).** Không có phiên đăng nhập; không đăng nhập thay người dùng và không đổi quyền. Mọi số đo ở đây là của đồ họa thay thế dành cho khách, không áp dụng cho ảnh thật.
- MX-02 trên trình duyệt có thanh cuộn cố định.
- Thiết bị cảm ứng thật; trình đọc màn hình.

Bản sửa được đóng băng để Codex kiểm tra lại. Đây không phải nghiệm thu toàn bộ.

## Bằng chứng

Thư mục (bị Git bỏ qua): `brand-assets/screenshots/home-slider-2026-11-05-fix2/`
- `audit/`: kết quả JSON và ảnh
- `logs/`
- `scripts/audit2.mjs`

SHA-256 từng file: `brand-assets/screenshots/home-slider-2026-11-05-fix2.evidence.sha256`. SHA-256 của tài liệu này: `docs/home-slider-fix1-supplement-2026-11-05.sha256`.
