# Manifest nguồn r3: home-banners-cms (05/11/2026)

- Nhánh `home-banners-cms`, worktree `C:/Users/THAI/Websites/website-demo-home-banners`; commit nền `29cd44fef2b4669c248e7bb1166382bb206f6ca8`. Chưa commit. `package.json` và `package-lock.json` không đổi.
- Đây là nguồn đã chạy chuỗi kiểm tra r3 (typecheck, lint, prettier, unit 565/565, integration 91/91, build exit 0); hash nguồn đầu và cuối chuỗi giống nhau (`brand-assets/screenshots/home-banners-cms-2026-11-05-r3/logs/source-at-*.sha256`).
- Không gồm `src/app/(payload)/admin/importMap.js` (dev server tự sinh lại, chỉ đổi thứ tự dòng; đã khôi phục).
- Migration hiện hành: `20261105_085002_home_banners.ts` (142 cột, 60 enum, 40 khóa ngoại, 40 index, 282 câu lệnh). Migration `20261105_075648` đã rút. **Fingerprint là đề xuất chờ review, chưa duyệt. Chưa chạy trên `drphynex`.**
- Manifest cũ `home-banners-manifest-2026-11-05.*` là lịch sử (không còn khớp nguồn hiện tại).
- Bản máy kiểm tra được: `docs/home-banners-manifest-r3-2026-11-05.sha256`.

| File | Loại | Nhóm | SHA-256 | Git blob |
|---|---|---|---|---|
| `deploy/migrations.approved.json` | sửa | fingerprint ĐỀ XUẤT, chờ review | `5e20d0a6a87349f059f22d32b41e7bd1bdb3079bed2b42c1267c4be893015100` | `66759269d6ab9c2b6a0acd8bb2acdad60cfdabd7` |
| `docs/home-banners-approval-fix-2026-11-05.md` | mới | tài liệu | `3a90c21778332d83d774db2aadc02d31c627b7c6896fafcacca888cd232fc0c0` | `0c7122e176572863f264ca87df595d51d7f55fc6` |
| `docs/home-banners-cms-2026-11-05.md` | mới | tài liệu | `f6ea75d285394bef79b50f281470c9f8c393a02aca46589801e9849916da47c2` | `80d27fbcb9046733646e6fb1749b5a8233fa8c8f` |
| `docs/home-banners-migration-plan-2026-11-05.md` | mới | tài liệu | `9f656338624be30aee2f1167266bca711c7bf859e07b0fcddd8f2268030d7d8e` | `921f074b6da091194b9824dc58d31b39ab677579` |
| `src/app/(frontend)/[locale]/page.tsx` | sửa | frontend | `247aa90c47d5054428e00efa918aa2a3a0ab1abf63b2a9bccbe7f213ebdb939c` | `6f393f875c300ab096bfe7ffbd06d6adc94a2592` |
| `src/app/(frontend)/globals.css` | sửa | frontend | `d177c9549dbfddb75e8aa5e1e22fa78adc1b4e7bd5492ed95a5900fa78c5449d` | `ed2a8197b149e1a5d57d472068bbf67b90180479` |
| `src/components/home/BannerPicture.tsx` | mới | frontend | `3149f8ac94b2be973c0dd655f15ccb5c70cb19b03a790cc2b9b670dc0212d675` | `c1c779590144fdf62eb48275d66a2e65e7918e2b` |
| `src/components/home/HomeSlider.tsx` | sửa | frontend | `73044285052fa1697e11b760564d0e715ca231c72aa0a4f2d89ff497cbf7b507` | `c151dc2eb80149ae44218c2422427f85cf0e45c6` |
| `src/globals/bannerApprovalFields.ts` | mới | schema (trường duyệt) | `3d21daf462c8712f4124ce693c4d2c6e25d2a4f07fb956be020458cb54355d85` | `440cd043f606db161a715c612b3cb0daaa573b0a` |
| `src/globals/homeBanners.ts` | mới | schema | `fe6e7a4facc3ba0f1973148a2ac159aed954a1807ce2b436dace458cc20287aa` | `6b7356c9b69a620aaa0b782a6d1d4db90917650b` |
| `src/globals/index.ts` | sửa | schema | `5e8cf7e3d3e91cb69d010393ac2b73928a36afda1df3e2b473f8faef242574f3` | `821c68379aff3eb0544bd6cec09f98e1a4175258` |
| `src/hooks/guardHomeBannerApproval.ts` | mới | workflow duyệt (server) | `9e01c0242a5764965d1c6c3e648d6e6f4f197f5b4a9541f43bb6dabbe20ef7d0` | `2cce2df4eff8a0b9f4a0b608acc1646bb969bf58` |
| `src/lib/banner-revision.ts` | mới | workflow duyệt (revision) | `18ffeea13e057e0cbf32af2eef752deef40680314a2834554e64b4c1a8579e12` | `e77bf80f6b63445b48f7d29beed2d02467cb55df` |
| `src/lib/home-banners.ts` | mới | frontend | `0d31a2142c54182478c19ece14b4def362611af8ab3f429978381d18704f610c` | `ac482d0a5e4d1b2ec93e7141973dcdf09f0b1f37` |
| `src/migrations/20261105_085002_home_banners.json` | mới | migration snapshot | `fee64c006315fb7858136c6993743724b8767d3513f7657b385d828d426e69a1` | `6a21e0d1b581f7485bdc38e547413d7992841fae` |
| `src/migrations/20261105_085002_home_banners.ts` | mới | migration (MỚI, đề xuất) | `92e833a903647237ffa943f6ab23603db7dd72dafa3eac75a33234f685b215b7` | `7e02ffadd5f9ec621c795a37010d9602cc7c9c4b` |
| `src/migrations/index.ts` | sửa | registry | `65e213ab6180b59418096ae6464fe8918927f78abbe4cb2b81b9582df8d2f07c` | `a69803074c846bf71a1af0cfa5e2c01ad377105c` |
| `src/payload-types.ts` | sửa | types (sinh tự động) | `37fa183de72b765b0a1882e480a41883dad5bf5fe6b324088a711950b0ef494c` | `2bbdd222b544962aacb2734c06668793ce57a338` |
| `tests/int/home-banners-approval.int.spec.ts` | mới | test | `6e9897fb501847fc21733b68af4ad0ab563e1034ab3d9915ac60a1cce834a6dd` | `fffcf1e43c0607c257fd55c0ec82149d7db60e64` |
| `tests/int/home-banners.int.spec.ts` | mới | test | `415d061c6948f3b8f9d92214157fb94cfd45e3609f52ffcdcbbb4feb93edf1b6` | `f58dd8346fc4148c91d19d9fa79a3f730047318d` |
| `tests/int/storage.int.spec.ts` | sửa | test | `939156f7a4d7a76a72a6ca6a802155ed1889023dd52148574bc43b15192ddfe7` | `64cd0a9baad08109be6d5df11f68ecb79640c2c7` |
| `tests/unit/banner-revision.spec.ts` | mới | test | `753ef7423eff5113fed23e04a60279b3e6273f7897cf95904be0b852f1f5edcd` | `8e05fe616b6d7e26e038b6d649f53736b485cb02` |
| `tests/unit/home-banners.spec.ts` | mới | test | `852ca6e90b13a42dfd2f5e1900aff177ce0b92688ce6abea1513f6098a49c5fa` | `5b6569ac843f2f52003540118a68c8be2da3f354` |
| `tests/unit/sql-guard.spec.ts` | sửa | test | `46053c95f99f824425d05a414edecccdd11cfa3d6ca26dd3a3098bb168d636c7` | `a1d2d26802bd09dd7b28c4767627e1d66e868552` |
