# Trang chủ Main — tích hợp slider 5 banner (05/11/2026)

Mốc thiết kế: `docs/mockups/drphynex-main-homepage-v1.html`, SHA-256 `7c5eb83dc153b5a3fb90f08fd723c8465181ea2b77bc63e4341bfc951a7c52ff` (đã tính lại, khớp bàn giao). Bản tham chiếu product `docs/mockups/drphynex-product-layout-reference-v1.html` giữ nguyên (SHA-256 `3aa00344cf3db8657db10fb2cf16f83938e1e7ceb5b7d30f44ba12aebd540698`). Không sửa thư mục `docs/mockups/`.

Baseline Git: `299ae028b691fca66e8249912ae66ae22ccae0dc`, nhánh `phase-3-brand-design`, **chưa commit** (WIP đợt trước vẫn chưa commit; bản này nằm chồng lên WIP đó). Bản bàn giao được xác định bằng manifest SHA-256 đầy đủ ở cuối tài liệu. SHA-256 của chính tài liệu này nằm trong `docs/home-slider-handoff-2026-11-05.sha256`.

## Đã triển khai

- Trang chủ chỉ còn Header → một slider 5 banner → Footer. Thứ tự: Brand → MX-01 FORMA → MX-02 LUMA → RX MATRIX BALM → RX MATRIX SHEET.
- `src/components/home/HomeSlider.tsx` (client): autoplay 6 s; nút Pause của người dùng được giữ qua hover/focus; hover hoặc focus trong slider tạm dừng; `prefers-reduced-motion` tắt autoplay và chuyển cảnh; slide ẩn có `inert` + `aria-hidden` + `visibility:hidden`; phím ←/→ chỉ xử lý trong slider (onKeyDown trên section); vuốt ngang trên mobile; timer/listener dọn theo lifecycle React (interval reset khi đổi slide thủ công). Một cụm điều khiển: 5 chấm (44×44) + Play/Pause, không có mũi tên.
- Header: logo giữa (48 px desktop / 38 px mobile), tầng 1 cao 92 px, tầng 2 cao 50 px, đúng 6 menu (4 sản phẩm, Brand, Contact) trỏ route thật `/{locale}/products/{slug}`, `/brand`, `/contact`. Bộ chọn ngôn ngữ desktop dạng `KO | EN | VI`; mobile hiển thị mã ngôn ngữ hiện tại, danh sách đầy đủ nằm trong menu. Vẫn giữ path + query đã được trang cho phép, và khóa ngôn ngữ chưa có bản.
- Footer tối theo mockup, chỉ có thông tin đã xác nhận: Dr.PhynEX, BIOSCIENCE DERMATOLOGY, tagline, link sản phẩm, link trang, chính sách. Không có email, địa chỉ hay số liệu.
- i18n: namespace mới `homeSlider` và `footer` trong ko/en/vi. KO vẫn là mặc định (`/` → 307 `/ko`).

## Điều chỉnh so với mockup (có chủ đích)

| Mục | Mockup | Bản tích hợp | Lý do |
|---|---|---|---|
| Eyebrow trên tiêu đề | Có | Bỏ | Theo brief trước |
| Ảnh sản phẩm | `/brand-assets/preview-images/*.webp` | Media CMS qua `findPublic` + `MediaImage`; không có ảnh được phép thì dùng đồ họa trừu tượng (mã dòng + số, không mô phỏng bao bì) | Không đưa preview-images ra public; giữ ACL |
| Blend/filter ảnh | `mix-blend-mode:multiply` + drop-shadow | Không dùng | Tránh làm sai màu bao bì |
| Nội dung slide sản phẩm | Câu chữ mới trong mockup | Dùng lại `redesign.products.*.line/body` đã có từ brief; `shortDescription` CMS nếu bản ghi được phép đọc | Mockup có claim chưa được cung cấp: “피부 깊숙이 전달”, “회복 환경”, “건강한 피부 변화”, “hydrogel/하이드로겔” |
| Mô tả slide Brand | “…건강한 피부 변화를 이끕니다” | Tagline + `home-page.intro` (CMS) hoặc `redesign.heroBody` | Bỏ claim hiệu quả |
| Tiêu đề slide Brand | Cố định | `home-page.headline` (CMS) nếu có, mặc định câu mockup đã dịch | Tận dụng CMS hiện có |
| Footer “About” | Brand, Contact | Brand, Ingredients, Journal, Stores, Partnership, Contact | Header chỉ còn 6 mục; nếu bỏ khỏi footer thì 4 trang hiện có sẽ không còn link vào |
| Cột hình tablet (768–1023) | 220 px + margin 8 px | 200 px, không có margin | Với 220 px, EN/VI slide Brand chỉ còn 7–9 px trên controls (yêu cầu ≥ 16). Chiều cao banner giữ 520 px |
| Chấm chưa chọn | `#94A3B8` | `#6B7A8C` | Đạt ≥ 3:1 trên mọi nền slide |
| Chữ phụ footer | `#64748B` (3.85:1) | `#8A9AAE` (6.4:1) | Đạt ≥ 4.5:1 |
| Focus | outline navy | Giữ outline navy cho chấm, nút và CTA; footer dùng outline trắng (`.on-dark`) | Focus nhìn rõ |

Chiều cao banner giữ đúng thông số: ≤360 px: 650; 361–767: 620; 768–1023: 520; 1024–1279: 580; ≥1280: 640.

## Kiểm tra đã chạy

- `tsc --noEmit` PASS; ESLint (file thay đổi, max-warnings=0) PASS; Prettier PASS với các file thuộc đợt này.
- Unit: 15 file / 538 test PASS (một worker, không nạp `.env`).
- Build: `next build --webpack` với `DRPHYNEX_DESIGN_PREVIEW=1 DRPHYNEX_DESIGN_BUILD=1`, heap 2048 MiB, output `.next-design-build`: exit 0, TypeScript và tạo trang hoàn tất. Không ghi đè `.next` hoặc `.next-design` của server đang chạy.
- Dev server Local `http://127.0.0.1:3010` (cấu hình design-preview hiện có). Console không báo lỗi hoặc cảnh báo hydration.
- Quét bằng CDP (Chrome headless): 4 chiều rộng (320, 390, 768, 1440) × 3 ngôn ngữ × 5 slide = 60 trường hợp. Không có chữ/CTA bị cắt, không tràn ngang; khoảng cách từ dòng chữ cuối đến controls nhỏ nhất là 21 px (768 VI), ở 390/320 là ≥ 73 px. Controls nằm trong viewport ở 320 px.
- Zoom trình duyệt thật 200%: profile Chrome đặt mức zoom mặc định 200% (không dùng deviceScaleFactor). Đo được `devicePixelRatio=2`, CSS viewport 632 px (cửa sổ 1280) và 712 px (cửa sổ 1440); 30/30 trường hợp đạt. Ở mức zoom này slider (620 px CSS) cao hơn viewport, nên nội dung cần cuộn để xem nhưng không bị cắt.
- Reduced motion (CDP `prefers-reduced-motion: reduce`): sau 7 s vẫn ở slide 1, `aria-live=polite`, không có chuyển cảnh. Không bật reduced motion: tự chuyển slide sau khoảng 6 s.
- Trong trình duyệt tích hợp: hover chuột thật tạm dừng autoplay; Pause giữ nguyên qua hover; chấm, ←/→ khi focus trong slider hoạt động; ←/→ ngoài slider không tác dụng; link trong slide ẩn không nhận focus; focusin tạm dừng autoplay (bắn sự kiện thật vì cửa sổ pane không có focus hệ điều hành). Menu mobile có 6 mục và danh sách ngôn ngữ; Escape đóng menu và trả focus. CTA Brand dẫn đến `/vi/brand`; trên trang đó, link ngôn ngữ trỏ `/ko/brand` và `/en/brand`. Bấm vào vùng slide ẩn không điều hướng.
- HTML khách ko/en/vi: 1 `h1`, `noindex` còn nguyên, không có `preview-images`/`/api/media`, không có giá, không có “hydrogel”. Contact `en` khóa VI đúng theo bản có sẵn.

Lệnh và đường dẫn bằng chứng: xem mục "Lệnh đã chạy và bằng chứng".

## Chưa xác minh / giới hạn

- **Chưa kiểm tra staff preview (đăng nhập) và chưa thấy packshot thật trong banner.** Cần chủ tài khoản tự đăng nhập. Chưa xác minh: ảnh CMS hiển thị trong slide, tỉ lệ và kích thước ảnh thật ở 320/390/768/1440, khoảng cách tới controls khi có ảnh, ảnh riêng tư tải được trong phiên preview, màu bao bì khi không có blend. Hiện cả 4 sản phẩm còn draft: khách thấy đồ họa thay thế, và link sản phẩm trả 404 cho khách (đúng ACL).
- Chưa thử trên thiết bị cảm ứng thật (vuốt chỉ kiểm tra qua code).
- Chưa đo bằng trình đọc màn hình.
- CSS của các section trang chủ cũ vẫn còn trong `globals.css` và được giữ có chủ đích: trang Brand còn dùng `insight-philosophy`, `philosophy-*`, `concept-name`, `brand-text-link`. Chỉ đề xuất dọn sau review, sau khi xác định chính xác class nào không còn dùng.
- Nội dung các slide cần thương hiệu duyệt: bản dịch câu tiêu đề Brand (EN/VI), nhãn CTA, “© 2026 Dr.PhynEX”.
- Không commit, stash, reset, deploy, publish, migrate, reset database, đổi quyền hay sửa CMS.
- Mã đang được giữ nguyên để Codex review. Cách tách commit chỉ đề xuất sau khi review xong.

## Lệnh đã chạy và bằng chứng

Thư mục làm việc: `C:\Users\THAI\Websites\website-demo`, Node 24, PowerShell/Git Bash trên Windows.

| Kiểm tra | Lệnh (đúng như đã chạy) | Kết quả |
|---|---|---|
| Hash mockup | `sha256sum docs/mockups/*.html` | Khớp `7c5eb83dc153b5a3fb90f08fd723c8465181ea2b77bc63e4341bfc951a7c52ff` |
| Type-check | `npx.cmd tsc --noEmit --incremental false` | exit 0 |
| Lint | `npx.cmd eslint --max-warnings=0 "src/app/(frontend)/[locale]/page.tsx" src/components/home/HomeSlider.tsx src/components/layout/PageShell.tsx src/components/layout/LanguageSwitcher.tsx` | exit 0 |
| Format | `npx.cmd prettier --check` trên 4 file trên + `globals.css` + `src/messages/*.json` (chạy `--write` cho `page.tsx` và `LanguageSwitcher.tsx`; cả hai do đợt này viết lại) | sạch |
| Unit | `$env:NODE_OPTIONS='--no-deprecation --max-old-space-size=2048'; npx.cmd vitest run --config ./vitest.unit.config.mts --maxWorkers=1` | 15 file, 538 test PASS |
| Build | `$env:NODE_OPTIONS='--no-deprecation --max-old-space-size=2048'; $env:DRPHYNEX_DESIGN_PREVIEW='1'; $env:DRPHYNEX_DESIGN_BUILD='1'; node node_modules/next/dist/bin/next build --webpack` | exit 0; log: `brand-assets/screenshots/home-slider-2026-11-05/logs/build-design.log` |
| Quét layout 60 trường hợp + reduced motion + autoplay | `node brand-assets/screenshots/home-slider-2026-11-05/scripts/sweep.mjs <thư mục output>` (Chrome headless qua CDP, server `http://127.0.0.1:3010`) | 62 dòng, 0 lỗi; `brand-assets/screenshots/home-slider-2026-11-05/app/results.json` (kết quả lần chạy sau khi sửa tablet) |
| Zoom trình duyệt thật 200% | `node brand-assets/screenshots/home-slider-2026-11-05/scripts/zoom200.mjs <thư mục output> 1280x800` và `... 1440x900` | DPR 2, CSS vw 632/712, 30 trường hợp, 0 lỗi; `brand-assets/screenshots/home-slider-2026-11-05/logs/zoom200-stdout.txt` |
| HTML khách | `curl -s http://127.0.0.1:3010/{ko,en,vi}` rồi grep `preview-images`, `/api/media`, `<img`, `hydrogel\|하이드로겔`, giá, `<h1`, `meta robots` | 0 media riêng, chỉ có logo, 0 giá, 1 h1, noindex |
| Link ngôn ngữ | `curl` trên `/vi/brand`, `/vi/products?line=mx`, `/en/contact`, `/ko/products/rx-matrix-balm` | brand/contact giữ path; VI bị khóa trên `/en/contact`; `line=mx` bị bỏ vì không khớp line nào khách thấy (đúng quy tắc allowlist của trang); sản phẩm draft trả 404 |
| Tương tác thật | Trình duyệt tích hợp của Claude desktop: hover thật, click dot, click CTA, mở/đóng menu mobile bằng Escape ở 390 px | Như mục "Kiểm tra đã chạy" |

Lần quét đầu tiên báo lỗi ở 768 EN/VI slide Brand: khoảng cách đến controls chỉ còn 9 px và 7 px. Sau khi sửa cột hình tablet, chạy lại và đạt (nhỏ nhất 21 px). Kết quả của lần đầu đã bị lần chạy lại ghi đè, chỉ còn trong lịch sử phiên làm việc.

Thư mục bằng chứng (bị Git bỏ qua): `brand-assets/screenshots/home-slider-2026-11-05/`

- `app/app-{320,390,768,1440}-{ko,en,vi}-slide-{1..5}.jpg`: 60 ảnh; `app-*-ko-full.jpg`: 4 ảnh toàn trang.
- `app/zoom200-{1280,1440}-{ko,en,vi}-slide-{1..5}.jpg`: 30 ảnh ở zoom 200%. Ảnh chỉ chụp viewport đầu trang; nội dung bên dưới được xác nhận bằng số đo.
- `app/results.json`: số đo của 60 trường hợp, reduced motion và autoplay.
- `mockup/main-{1440,390}-slide-{1..5}.jpg`, `mockup/main-768-slide-1.jpg`: bản sao ảnh trong `docs/mockups/main-screenshots/` để đối chiếu. Ảnh mockup chụp từ một phiên bản mockup cũ hơn: footer có email, file đóng băng hiện tại thì không.
- `scripts/sweep.mjs`, `scripts/zoom200.mjs`: script đã chạy.
- `logs/build-design.log`, `logs/zoom200-stdout.txt`.
- SHA-256 của từng file bằng chứng: `brand-assets/screenshots/home-slider-2026-11-05.evidence.sha256` (tạo bằng `find . -type f | sort | xargs sha256sum` trong thư mục bằng chứng). SHA-256 của chính file đó: `b06129fbff4e772681db7f8db9bab222d9c78ffe9cc3bc784dabb29d575d56c8`.

Ảnh đối chiếu chính: desktop `app/app-1440-ko-slide-1.jpg` ↔ `mockup/main-1440-slide-1.jpg`; mobile `app/app-390-ko-slide-1.jpg` ↔ `mockup/main-390-slide-1.jpg`; tablet `app/app-768-ko-slide-1.jpg` ↔ `mockup/main-768-slide-1.jpg`.

## Manifest

Tạo lúc bàn giao, khi chưa có thay đổi mã sau các lần kiểm tra. Baseline `HEAD` = `299ae028b691fca66e8249912ae66ae22ccae0dc`. Hash tính trên byte của file trong cây làm việc (`sha256sum`). Không có commit, stash hay reset.

### A. Thay đổi tích hợp HomeSlider (chỉ đợt này)

| SHA-256 | File | Trạng thái Git |
|---|---|---|
| `a46fbd904974fe1ee39c4cc6a9c52a4cf64bc1e460b67e7c869102847adee7db` | `src/components/home/HomeSlider.tsx` | untracked |
| (xem `docs/home-slider-handoff-2026-11-05.sha256`) | `docs/home-slider-handoff-2026-11-05.md` | untracked (tài liệu này) |

### B. File chứa thay đổi của cả hai đợt (WIP trước + HomeSlider)

| SHA-256 | File | Trạng thái Git |
|---|---|---|
| `f2a0f5a48a0aea52f27779b8cce77990b1f0effcd705f87da9e6bdf570303411` | `src/app/(frontend)/[locale]/page.tsx` | tracked, modified |
| `2de25ac7e1b630f0f02f56cd74a4168129700e279f66bcb0a675e10c96f5911a` | `src/app/(frontend)/globals.css` | tracked, modified |
| `233129c53b48919edf353202093ae8b3bd7a0d465522b6ac0c0030536c071582` | `src/components/layout/LanguageSwitcher.tsx` | tracked, modified |
| `42dd3ef3ea905b463b3b29e43c9b7b750a2f9db1e77b84bbffa0e75b8592e411` | `src/components/layout/PageShell.tsx` | tracked, modified |
| `7720a2e2e0681f0c37640a4ca0af75f68edaa413f995281a6d96355caabe27c3` | `src/messages/en.json` | tracked, modified |
| `7cbe6c314ecfff75702ff8fe3ac232d6616774a5f115d18517c1774cd3c0f0af` | `src/messages/ko.json` | tracked, modified |
| `0c26f916ea43a1b9c0480d0943d827528adadc9d7ccb15fe8cb36b7749900aac` | `src/messages/vi.json` | tracked, modified |

Phần nào thuộc đợt nào:

- `src/app/(frontend)/[locale]/page.tsx`: WIP: trang chủ editorial (hero, collection, triết lý, brand, contact). HomeSlider: viết lại toàn bộ thành Header → slider → Footer; phần WIP của file này không còn trong nội dung hiện tại.
- `src/app/(frontend)/globals.css`: WIP: khối redesign (header, insight-hero, collection, philosophy, brand-story, product-facts…). HomeSlider: sửa quy tắc header/mobile header, thay `.language-menu` bằng `.language-switch`, thêm `.home-slider*`, `.home-slide*`, `.home-brand-*`, `.home-formula-art`, `.site-footer*`. CSS cũ của trang chủ được giữ vì trang Brand còn dùng (`insight-philosophy`, `philosophy-*`, `concept-name`, `brand-text-link`).
- `src/components/layout/LanguageSwitcher.tsx`: WIP: `<details>` dropdown giữ path/query/available. HomeSlider: viết lại thành link `KO | EN | VI` (inline) và danh sách tên đầy đủ (list); giữ nguyên logic path/query/available.
- `src/components/layout/PageShell.tsx`: WIP: header hai tầng, 6 menu, logo, MobileMenu. HomeSlider: switcher inline/list, nhãn mã ngôn ngữ mobile, danh sách ngôn ngữ trong menu mobile, footer tối mới (thay footer sáng của WIP).
- `src/messages/en.json`: Như ko.json.
- `src/messages/ko.json`: WIP: namespace `redesign`. HomeSlider: thêm namespace `homeSlider` và `footer` (chỉ thêm, không sửa key cũ).
- `src/messages/vi.json`: Như ko.json.

### C. WIP có trước (HomeSlider không sửa)

| SHA-256 | File | Trạng thái Git |
|---|---|---|
| `678670babfe8ba1f29cf5a0c550563751b97f9681b35801e7bff1d58d2cd909c` | `.gitignore` | tracked, modified |
| `218b2d904cdd931bb8a9274345f42338f442bab092f600b639a1b1d10ad77195` | `DESIGN.md` | tracked, modified |
| `0bb79cfccbb792bde068faa7c2b1158923f1808e8f1d6fc98806ba624ec2bc7b` | `PRODUCT.md` | tracked, modified |
| `f3f19a890385858e22fe3136adb3cb548af92986dc906c224e99d314360aa3e0` | `docs/backup-and-restore.md` | tracked, modified |
| `851081420112b8308c56efb797607e99f089d854113c54ef1ef03180ca2240e6` | `docs/deployment-plan.md` | tracked, modified |
| `863f7169f5c22917218884cf3f458fe047888267df16cbdcbbcad82e78bc9a44` | `next.config.ts` | tracked, modified |
| `1390294c89c2d5d891b71168efe9d7b054d365dd49ff67a225aee0ad39df4181` | `src/app/(frontend)/[locale]/brand/page.tsx` | tracked, modified |
| `ba0b86fb8f05489bb69b4817c252d3b1e447bab5c4d2707e2a2345d3b06a772b` | `src/app/(frontend)/[locale]/products/[slug]/page.tsx` | tracked, modified |
| `b730741bfef492af11045919f357a1082ba58d40e615a951456e83e479be8250` | `src/components/layout/MobileMenu.tsx` | tracked, modified |
| `ef71c4f5598ebd6c274a5d440aa1f55ccf4d45ddf3891f96a2266c9e0034d02a` | `src/i18n/locales.ts` | tracked, modified |
| `ffd5d2e67da412cfa8575f9acdd18c49c8fdd793a6a5629975abd3463f7bf345` | `src/i18n/routing.ts` | tracked, modified |
| `7818acc11065bb7cbd526a7053a28787c7cb47b017e419751bbfc1dd36ca7b5e` | `src/lib/seo.ts` | tracked, modified |
| `e269ddb76d19b361f9e5f3df930d9a906c56dac0945217393ed4795cc0dad965` | `src/payload-types.ts` | tracked, modified |
| `ab1feb1480f1645c51af381c21b682f580504c0955f1d3c7a4d691c9c2e1b061` | `src/payload.config.ts` | tracked, modified |
| `5be0c2c05b1b7c3fcec0ff8b64c45c4715b6a12c1060443236df44d7549e8daf` | `tests/unit/seo.spec.ts` | tracked, modified |
| `d60289e586ee420324eb42448beae11358a7e9b72136e393ecf15fc51cf42918` | `tsconfig.json` | tracked, modified |
| `063098f6cb31bb44c6f8fbea25b3876de7ee1e5f7d00a50dbab506f6415eb7f0` | `AGENTS.md` | untracked |
| `2d2e93d9e26655c025bc0363f49d4eebd44903c665645c8df467729ab6927189` | `docs/local-integration-acceptance.md` | untracked |
| `a53c4b8e1b060c96d08e2122faee8d0324e9e4274180bf1a9377d9271a0dded5` | `docs/redesign-2026-11-05.md` | untracked |
| `48e8edfa051d1b9b481ea1a8d4fe28824c6179a6079e59f2a68f8848f890b394` | `src/components/product/ProductFacts.tsx` | untracked |
| `33e27ad3646f2cfc9ef9f41862cafd774ab528bb278e7b5707f1fa7ebb8c5deb` | `src/lib/product-brief.ts` | untracked |

`AGENTS.md` do `next dev` tự sinh (theo nội dung của file).

### D. Mốc tham chiếu đóng băng (untracked, không sửa)

| SHA-256 | File | Trạng thái Git |
|---|---|---|
| `7c5eb83dc153b5a3fb90f08fd723c8465181ea2b77bc63e4341bfc951a7c52ff` | `docs/mockups/drphynex-main-homepage-v1.html` | untracked |
| `3aa00344cf3db8657db10fb2cf16f83938e1e7ceb5b7d30f44ba12aebd540698` | `docs/mockups/drphynex-product-layout-reference-v1.html` | untracked |

Các file còn lại trong `docs/mockups/` là tài liệu và script của đợt mockup, không liên quan đến bản tích hợp này. Chúng không được sửa và không có trong manifest.

### E. Output bị Git bỏ qua (không phải mã bàn giao)

- `.next-design-build/`: output của lần build kiểm tra.
- `.next-design/`: output của dev server design-preview.
- `brand-assets/screenshots/home-slider-2026-11-05/`: bằng chứng; xem mục tiếp theo.
