# HomeSlider — sửa hai findings của Codex (fix1, 05/11/2026)

Tài liệu bổ sung cho `docs/home-slider-handoff-2026-11-05.md`. Bản bàn giao trước được giữ nguyên: tài liệu, file `.sha256` của nó và thư mục bằng chứng `brand-assets/screenshots/home-slider-2026-11-05/` (kiểm tra lại bằng `sha256sum -c`: OK). Baseline Git vẫn là `299ae028b691fca66e8249912ae66ae22ccae0dc`. **Không commit**, không stash, không reset.

Không tìm thấy file báo cáo review của Codex trong repository; các `docs/independent-review-*` là báo cáo của đợt cũ. Hai finding được sửa theo mô tả trong yêu cầu, và trạng thái lỗi đã được tái hiện trước khi sửa (xem bên dưới). Đầu phiên đã đối chiếu working tree với manifest trước: khớp.

## Kết luận

| Mục | Kết quả |
|---|---|
| Finding 1: autoplay chạy khi chuột vẫn trên slider | Đã sửa. Regression test A–E đạt (happy-dom) và đạt trên trình duyệt thật. Mutation check: với hành vi cũ, A/B/D fail |
| Finding 2: artwork Brand tại tablet | Đã sửa. 767/768/769/1023/1024 × KO/EN/VI × 5 slide: 75/75 đạt bounding-box toàn visual. Chiều cao banner tablet giữ 520 px |
| Fallback MX-02 tại 1440 (phát hiện thêm) | Đã sửa CSS. **Chưa đo lại bằng audit bounding-box** (lần chạy cuối bị lỗi, xem mục 4) |
| Footer | Trả về phạm vi đã chốt: 8 link mỗi ngôn ngữ |
| Staff preview / packshot thật | **Chưa kiểm chứng** |

Chưa nghiệm thu toàn bộ: còn hai mục chưa xác minh (MX-02 tại 1440 sau khi sửa, và staff preview).

## 1. Autoplay khi vẫn hover

**Root cause:** `HomeSlider` dùng một cờ `interacting` cho cả hover lẫn focus. `onBlur` (focus rời ra footer) đặt cờ về `false` dù chuột vẫn trên slider, nên autoplay chạy lại khi đang hover. Ngược lại, `onMouseLeave` dựa vào `document.activeElement` để đoán focus.

**Thay đổi tối thiểu:**
- `src/components/home/autoplay.ts` (mới): reducer có bốn nguồn tạm dừng độc lập: `hover`, `focus`, `userPaused`, `reducedMotion`. `isAutoplaying()` chỉ trả `true` khi cả bốn đều `false`. Reducer trả lại đúng object cũ khi giá trị không đổi, nên không gây render thừa.
- `src/components/home/HomeSlider.tsx`:
  - Dùng `useReducer` thay ba `useState` và cờ `interacting`.
  - `onPointerEnter`/`onPointerLeave` chỉ đổi `hover`; `onFocus`/`onBlur` chỉ đổi `focus`. `onBlur` chỉ xóa focus khi `relatedTarget` nằm ngoài slider.
  - Nút Pause/Play chỉ đổi `userPaused`.
  - Bỏ qua `pointerType === 'touch'`: thao tác chạm sinh mouse event tương thích nhưng không có leave, nên hover sẽ bị kẹt.
  - Interval vẫn là một `useEffect([playing, total, cycle])`. Render không liên quan không đổi `playing`, nên không tạo thêm interval. Cleanup giữ nguyên.

**Regression test:** `tests/unit/home-slider-autoplay.spec.ts` render component thật bằng `react-dom/client` + happy-dom, dùng fake timers.
- happy-dom 20.14.6 đã có sẵn trong lockfile qua `vitest` và `@lexical/headless`; không đổi `package.json`.
- Các ca kiểm tra:
  - A, B (cùng B2: focus chuyển giữa các control bên trong slider), C, D (cùng D2: re-render không reset/nhân interval), E.
  - Baseline 6 s; cleanup khi unmount.
  - Ba test cho reducer.
- Kết quả: 12/12 PASS.
- Mutation check: tạm đưa lại hành vi cũ thì A, B, D fail (`logs/mutation-check.txt`). File sau đó được khôi phục và kiểm tra lại hash: OK.

**Trình duyệt thật** (`scripts/autoplay-real.mjs`): chuột qua CDP `Input.dispatchMouseEvent`, focus thật qua `Emulation.setFocusEmulationEnabled`, 1440×900, `/ko`. Kết quả 5/5 PASS, chạy hai lần (`logs/autoplay-real.log`, `logs/autoplay-real-final.log`):

- A: index 0, `aria-live=polite`
- B: index 0
- C: vẫn ở slide 0 khi Pause, Play lại thì sang slide 1
- D: sau khoảng 6 / 12 / 18 s lần lượt ở slide 1 / 2 / 3 (mỗi chu kỳ một bước, chỉ một interval)
- E: index 0

## 2. Artwork Brand tại tablet

**Root cause:** từ 768 px, `.home-brand-art` có kích thước cố định 340 px, trong khi ô visual tablet cao 200 px. Artwork tràn 70 px ở trên và dưới, bị slider cắt và đè lên khối chữ. Đo thêm thấy một lỗi cùng loại tại 1024 px: artwork 400 px nằm trong cột rộng 374 px, tràn ra hai bên 13 px.

**Thay đổi tối thiểu** (`globals.css`, khối `.home-brand-art`):
- Dưới 1024 px: `aspect-ratio: 1; height: 100%; max-width: 100%`, artwork bám theo chiều cao ô visual (180 / 160 / 200 px).
- Từ 1024 px: `width: min(400px, 100%)`.
- Từ 1280 px: `width: min(440px, 100%)`.
- Bỏ các kích thước cố định 150/340/400/440.
- Không dùng `overflow: hidden`, không đổi chữ, không đổi chiều cao banner.

Số đo slide Brand (từ `breakpoints/before-results.json` và `after-results.json`; `oT`/`oB`/`oS` là phần tràn trên/dưới/hai bên so với ô visual; "bị cắt" là phần nằm ngoài slider):

| Rộng | Ngôn ngữ | Trước: ô → artwork | Trước: tràn, bị cắt, đè chữ | Sau: artwork | Sau: tràn, bị cắt, đè chữ | Khoảng cách tới controls |
|---|---|---|---|---|---|---|
| 767 | KO/EN/VI | 180 → 180 | 0, 0, 0 | 180 | 0, 0, 0 | 103 / 93 / 91 |
| 768, 769 | KO | 200 → 340 | oT/oB 70, cắt 41 px, đè 19 720 px² (58 px) | 200 | 0, 0, 0; cách chữ 12 px | 33 |
| 768, 769 | EN | 200 → 340 | 70, cắt 52 px, đè 19 720 px² | 200 | 0, 0, 0 | 23 |
| 768, 769 | VI | 200 → 340 | 70, cắt 53 px, đè 19 720 px² | 200 | 0, 0, 0 | 21 |
| 1023 | KO/EN/VI | 200 → 340 | 70, cắt 42 / 53 / 55 px, đè 19 720 px² | 200 | 0, 0, 0 | 32 / 21 / 19 |
| 1024 | KO/EN/VI | cột 374 → 400 | oS 13 px | 374 | 0, 0, 0 | 162 / 140 / 137 |

Chiều cao banner: 767 → 620 px; 768–1023 → 520 px; 1024 → 580 px. Không thay đổi so với trước khi sửa.

Toàn bộ 75 trường hợp (5 độ rộng × 3 ngôn ngữ × 5 slide) sau khi sửa đều đạt: không tràn hay bị cắt, không nằm dưới header, không đè chữ, khoảng cách tới controls ≥ 16 px (nhỏ nhất 19,1 px tại 1023 VI), CTA và controls nằm trong viewport, không cuộn ngang. Ảnh cùng viewport (768×1024, cùng script): `tablet-before/` và `tablet-after/`. Cặp đối chiếu chính: `before-768-vi-slide-1.jpg` ↔ `after-768-vi-slide-1.jpg`.

## 3. Fallback MX-02 (phát hiện thêm khi đo toàn visual)

Audit mở rộng `after-wide` (320, 360, 361, 390, 1280, 1440 × 3 × 5 = 90 trường hợp) chỉ có 2 lỗi: 1440 EN/VI slide MX-02. Mark thay thế "MX ▯ 02" rộng 499 px trong cột 482,8 px (tràn 8,1 px mỗi bên, không bị cắt và không đè chữ); KO vừa khít 482,8 px.

**Sửa:** `.home-formula-art` đổi `font-size: clamp(56px, 9vw, 140px)` thành `clamp(56px, 9vw, 120px)`. Thay đổi này chỉ có tác dụng khi viewport rộng hơn khoảng 1333 px; dưới mức đó, kết quả đo cũ vẫn đúng. Theo tỉ lệ đã đo (499 / 129,6 px), độ rộng dự kiến là khoảng 462 px < 482,8 px. **Đây là phép tính, chưa phải số đo.** Lần audit cuối bị lỗi trước khi tới 1440 (mục 4). Sweep cuối tại 1440 (chữ, CTA, controls) đạt, nhưng sweep không đo độ tràn ngang của visual.

Đây là ảnh thay thế hiển thị cho khách. Kết quả này không nói gì về packshot thật.

## 4. Chuỗi kiểm tra cuối (chạy tuần tự, sau lần sửa cuối)

| Bước | Lệnh | Exit | Log |
|---|---|---|---|
| Audit bounding-box 11 độ rộng | `node scripts/breakpoints.mjs <out> final "320,360,361,390,767,768,769,1023,1024,1280,1440"` | **1** | `logs/bp-final.log` |
| Sweep 5 slide | `node ../home-slider-2026-11-05/scripts/sweep.mjs <out>` | 0 | `logs/sweep-final.log`, `sweep-final/results.json` |
| Zoom thật 200% | `node ../home-slider-2026-11-05/scripts/zoom200.mjs <out> 1280x800` và `1440x900` | 0 | `logs/zoom-final.log`, `zoom-final/` |
| Autoplay thật | `node scripts/autoplay-real.mjs` | 0 | `logs/autoplay-real-final.log` |
| Build | `$env:NODE_OPTIONS='--no-deprecation --max-old-space-size=2048'; $env:DRPHYNEX_DESIGN_PREVIEW='1'; $env:DRPHYNEX_DESIGN_BUILD='1'; node node_modules/next/dist/bin/next build --webpack` | 0 | `logs/build-fix1.log` |

- **Audit cuối, exit 1:** sau 2 trang (320 KO, 320 EN), trang thứ ba (320 VI) không có `.home-slider` khi đo, nên `getBoundingClientRect` gặp `null`. Lần chạy bắt đầu khoảng 1 phút sau khi sửa `PageShell.tsx` (13:48:33) và `globals.css` (13:48:37). Nguyên nhân có thể là dev server còn đang biên dịch lại, **chưa xác minh**. Sweep chạy ngay sau đó tải 320 VI bình thường. Chưa chạy lại.
- **Sweep:** 60 trường hợp + reduced motion + autoplay, 0 lỗi. Khoảng cách tới controls nhỏ nhất 21 px; không còn visual đè chữ ở tablet.
- **Zoom 200%:** cửa sổ 1440 → DPR 2, CSS viewport 712 px, 15/15 đạt. Cửa sổ 1280 → CSS viewport 632 px, 15/15 đạt.
- **Build:** biên dịch, TypeScript và 7/7 trang tĩnh hoàn tất; không có warning/error trong log.

Kiểm tra mã, chạy trước hai lần sửa cuối (footer, MX-02):

| Bước | Lệnh | Exit | Log |
|---|---|---|---|
| Typecheck | `npx.cmd tsc --noEmit --incremental false` | 0 | `logs/tsc.log` |
| ESLint | `npx.cmd eslint --max-warnings=0 "src/app/(frontend)/[locale]/page.tsx" src/components/home src/components/layout tests/unit/home-slider-autoplay.spec.ts` | 0 | `logs/eslint.log` |
| Prettier | `npx.cmd prettier --check src/components/home tests/unit/home-slider-autoplay.spec.ts "src/app/(frontend)/globals.css"` | 0 | `logs/prettier.log` |
| Unit | `npx.cmd vitest run --config ./vitest.unit.config.mts --maxWorkers=1` | 0 | `logs/unit-full.log`: 16 file, 550 test |

Sau hai lần sửa cuối, TypeScript chỉ được kiểm tra lại trong bước build (đạt). ESLint và Prettier **chưa chạy lại** cho `PageShell.tsx` (đổi 2 dòng) và `globals.css` (đổi 2 dòng).

## 5. HTTP khách: footer và endpoint ảnh

Chi tiết trong `logs/guest-http.txt`. Server `http://127.0.0.1:3010`, không có cookie.

| Kiểm tra | Kết quả | Đánh giá |
|---|---|---|
| Footer `/ko`, `/en`, `/vi` | Mỗi ngôn ngữ 8 link: 4 sản phẩm, Brand, Contact, Privacy, Terms | Đúng phạm vi đã chốt |
| `/{l}/brand`, `/contact`, `/privacy`, `/terms` | 200 | Đạt |
| `/{l}/products/{4 slug}` | 404 | **Dự kiến**: sản phẩm còn draft, khách không được đọc |
| `/api/media/file/{4 file}` | 403, `cache-control: private, no-store` | **Dự kiến**: file riêng tư bị từ chối |
| `/api/media/{2,7,9,10}` | 404 | Dự kiến: không lộ bản ghi |
| `/api/media?limit=50`, `/api/products?locale=en&depth=2` | `totalDocs 0`, không có tên file | Dự kiến: không rò dữ liệu |
| `/_next/image?url=/api/media/file/mx-01-forma-vial.webp…` | 410 | Dự kiến: optimizer cũ bị chặn |
| `/brand-assets/preview-images/…` | 404 | Dự kiến: không public |
| HTML trang chủ | Không có URL media; chuỗi khớp duy nhất là `webpack.js` | Đạt |

Không có lỗi ngoài dự kiến.

## 6. Chưa kiểm chứng

- **Staff preview và packshot thật (EN/VI):** chưa kiểm chứng. Phiên trình duyệt tích hợp không có user (`/api/users/me` không trả user, không có banner preview, 0 ảnh trong slide). Không đăng nhập thay người dùng. Mọi kết quả ở trên dùng đồ họa thay thế của khách, không áp dụng cho ảnh thật: kích thước, tỉ lệ, khoảng cách tới controls, màu bao bì, và việc tải ảnh riêng tư trong phiên preview.
- **MX-02 tại 1440 sau khi sửa:** chưa đo lại bằng audit bounding-box (audit cuối exit 1).
- **ESLint/Prettier** cho hai lần sửa cuối: chưa chạy lại.
- Thiết bị cảm ứng thật; trình đọc màn hình.

## 7. Manifest fix1

File thay đổi trong đợt này (SHA-256 đầy đủ). Hash trước lấy từ manifest của bản bàn giao trước.

| File | Trạng thái Git | SHA-256 trước (bàn giao trước) | SHA-256 hiện tại |
|---|---|---|---|
| `src/components/home/HomeSlider.tsx` | untracked | `a46fbd904974fe1ee39c4cc6a9c52a4cf64bc1e460b67e7c869102847adee7db` | `9610fa42fbe392b5610c28dacd43d3f255d1775d98576496cb646ffaee1bda92` |
| `src/components/home/autoplay.ts` | untracked, mới | — | `3e7a2821588b477f5d93181fb764cbd2f1166f99259983f6cd8ae2898778a67b` |
| `tests/unit/home-slider-autoplay.spec.ts` | untracked, mới | — | `cc2c461a7fd207c02685cce03d98cc673ea505761ae51112a903540f33e01422` |
| `src/app/(frontend)/globals.css` | tracked, modified (WIP + HomeSlider + fix1) | `2de25ac7e1b630f0f02f56cd74a4168129700e279f66bcb0a675e10c96f5911a` | `6ff14abac6b6802250f60fb4f0658ed7e101a2e14ac56d29725e86f24b5275bf` |
| `src/components/layout/PageShell.tsx` | tracked, modified (WIP + HomeSlider + fix1) | `42dd3ef3ea905b463b3b29e43c9b7b750a2f9db1e77b84bbffa0e75b8592e411` | `89b0994586feafde38949f8181083cea0fad712fce7be952dfe6ca0555ae09cc` |

28 file còn lại trong manifest trước đã được kiểm tra lại bằng `sha256sum -c`: không đổi.

Mốc đóng băng (không đổi):
- `7c5eb83dc153b5a3fb90f08fd723c8465181ea2b77bc63e4341bfc951a7c52ff  docs/mockups/drphynex-main-homepage-v1.html`
- `3aa00344cf3db8657db10fb2cf16f83938e1e7ceb5b7d30f44ba12aebd540698  docs/mockups/drphynex-product-layout-reference-v1.html`

Bằng chứng (bị Git bỏ qua): `brand-assets/screenshots/home-slider-2026-11-05-fix1/`
- `tablet-before/`, `tablet-after/`
- `breakpoints/` (`after-results.json`, `after-wide-*`, `final-*`)
- `sweep-final/`, `zoom-final/`
- `logs/`, `scripts/`

SHA-256 của từng file bằng chứng: `brand-assets/screenshots/home-slider-2026-11-05-fix1.evidence.sha256`. SHA-256 của chính tài liệu này: `docs/home-slider-fix1-2026-11-05.sha256`.

Không commit, deploy, publish, migration, reset DB hay đổi ACL/quyền. Bản sửa được đóng băng để Codex kiểm tra lại. Cách tách commit sẽ đề xuất sau khi review xong.
