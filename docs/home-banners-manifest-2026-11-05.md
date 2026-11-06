> **SUPERSEDED (05/11/2026, r3):** các số liệu về migration (tên `20261105_075648`, 140 cột, 280 câu lệnh, fingerprint `4160c7f9…`) và workflow duyệt trong tài liệu này đã được thay bởi `home-banners-approval-fix-2026-11-05.md`. Migration hiện hành: `20261105_085002_home_banners.ts` (142 cột, 282 câu lệnh). Giữ nguyên nội dung gốc bên dưới làm lịch sử.

# Manifest thay đổi: home-banners-cms (05/11/2026)

- Nhánh `home-banners-cms`, worktree `C:/Users/THAI/Websites/website-demo-home-banners`.
- Commit nền: `29cd44fef2b4669c248e7bb1166382bb206f6ca8`, cũng là merge-base với `phase-3-brand-design`. Chưa commit.
- Phụ thuộc: `package.json` và `package-lock.json` **không đổi**; không thêm dependency. Mã mới chỉ import `payload`, `@payloadcms/db-postgres`, `next/image`, `vitest` và Node `crypto`, đều đã có sẵn.
- Không phụ thuộc WIP chưa commit của checkout chính.
- Không gồm: `src/app/(payload)/admin/importMap.js`. Dev server tự sinh lại file này (chỉ đổi thứ tự dòng), nên đã khôi phục về bản commit.
- SHA-256 là của byte trên đĩa. Blob ID là `git hash-object` (sau chuẩn hóa xuống dòng của Git), dùng để đối chiếu không phụ thuộc CRLF/LF.
- Bản máy kiểm tra được: `docs/home-banners-manifest-2026-11-05.sha256` (`sha256sum -c`). Hash của file `.sha256` và của manifest này nằm trong báo cáo bàn giao.
- **Trạng thái migration:** chưa chạy trên `drphynex`. Fingerprint trong `deploy/migrations.approved.json` là **đề xuất chờ review**.

| File | Loại | Nhóm | SHA-256 | Git blob |
|---|---|---|---|---|
| `deploy/migrations.approved.json` | sửa | migration (fingerprint ĐỀ XUẤT, chờ review) | `766d46e0e69e6bbf64c2668cd7f59be3d4facba5b8eb8bc22e24ee4a8712a357` | `845a4fd09c70e0edae6c31361d8b206889dc68c9` |
| `docs/home-banners-cms-2026-11-05.md` | mới | tài liệu | `0d16d6165152f189d6729cb3445c956c5a76c4af44da5148afdc02d55dce0588` | `9cc6c0267650b69f313c53604f0f2229afa4061c` |
| `docs/home-banners-migration-plan-2026-11-05.md` | mới | tài liệu | `273adec486282cc2cef313e46d2c4b6b725ae163826fd1decc0ef79dbd668b46` | `848028224c9f407e6daac61461fd99f00363e676` |
| `src/app/(frontend)/[locale]/page.tsx` | sửa | frontend | `2c10a8b20452199aea8c972f46acf774b3b0acf655c39c4e6c09948660b8d574` | `54e638ffcc0f6c2cbf789c2c13fe7258a77341f0` |
| `src/app/(frontend)/globals.css` | sửa | frontend | `d177c9549dbfddb75e8aa5e1e22fa78adc1b4e7bd5492ed95a5900fa78c5449d` | `ed2a8197b149e1a5d57d472068bbf67b90180479` |
| `src/components/home/BannerPicture.tsx` | mới | frontend | `3149f8ac94b2be973c0dd655f15ccb5c70cb19b03a790cc2b9b670dc0212d675` | `c1c779590144fdf62eb48275d66a2e65e7918e2b` |
| `src/components/home/HomeSlider.tsx` | sửa | frontend | `73044285052fa1697e11b760564d0e715ca231c72aa0a4f2d89ff497cbf7b507` | `c151dc2eb80149ae44218c2422427f85cf0e45c6` |
| `src/globals/homeBanners.ts` | mới | schema | `fe6e7a4facc3ba0f1973148a2ac159aed954a1807ce2b436dace458cc20287aa` | `6b7356c9b69a620aaa0b782a6d1d4db90917650b` |
| `src/globals/index.ts` | sửa | schema | `c4d192dd824705be262b145def810864443cb520b4ce9eee20e50f7475eb9b68` | `2c87a31ef79220a4223a2069223345d9fa08fe1b` |
| `src/lib/home-banners.ts` | mới | frontend | `0d31a2142c54182478c19ece14b4def362611af8ab3f429978381d18704f610c` | `ac482d0a5e4d1b2ec93e7141973dcdf09f0b1f37` |
| `src/migrations/20261105_075648_home_banners.json` | mới | migration (snapshot) | `b352cfcabb126968548dbba8baef9a6669699c1588556f85d2e6001e0ecfb280` | `e7a40ff11eee8ecf7e1ae51636f3125663687435` |
| `src/migrations/20261105_075648_home_banners.ts` | mới | migration | `4160c7f977db69efbd46d8d6424ba1bc5979a8c1b2db30135bd912fddf6c7338` | `cc15115705f6f0096c08d2c32dd79aec8a5f3b4b` |
| `src/migrations/index.ts` | sửa | migration (registry, sinh tự động) | `d3e1d1e617e90ae54141ac1bf909ce59d122501974eebc7e838958ec18a670be` | `56dfbba14d77b4de40003542a3ef54695fe2f2fa` |
| `src/payload-types.ts` | sửa | types (sinh tự động) | `a6661957d9c936ac27c0eb17872dbaf8badfc5745822297c8334c20a87111844` | `4d5dae1367c396122c60b409a99c9e972763e83c` |
| `tests/int/home-banners.int.spec.ts` | mới | test | `8dadf690539a8d5512f614ca423d4e75173510dd9c4e2508654d0cb88534f134` | `fbf5775fe533d535f8cb82ae72f955c5c2b37ecf` |
| `tests/int/storage.int.spec.ts` | sửa | test (snapshot drift) | `63ec6b4d7896b7d9f5b0fc189bf29407032fe8e424ab2f9d4ef78c759e265618` | `01eb7fac45dd11cbaee89abd9c238d3e0cc30b4a` |
| `tests/unit/home-banners.spec.ts` | mới | test | `852ca6e90b13a42dfd2f5e1900aff177ce0b92688ce6abea1513f6098a49c5fa` | `5b6569ac843f2f52003540118a68c8be2da3f354` |
| `tests/unit/sql-guard.spec.ts` | sửa | test (ghim migration) | `4eb827ba1dfd14496e83ba73596574f8756f3d3ec3fb99f1f1d9a45a6f98ce02` | `e073efb21f6d31d37dcee22b038d9577fd418edc` |
