# Manifest — sửa findings executor (2026-11-06)

Nguồn: commit `1e24f7eed538c76296dca85556b263be54c9f063` + thay đổi chưa commit dưới đây. Báo cáo: `docs/home-banners-executor-fixes-2026-11-06.md`.

## File mã/test (SHA-256 tại thời điểm chạy chuỗi kiểm tra)
```
edce6c534a8d2a9960c2006c0618e8102b62b1096170468011c440b138bd8b4b *scripts/lib/state-store.ts
48cbc11fddc4a378e70be37ca8c23e4dec17fb4e94afd60a8933398055037c3a *scripts/migration-anchor.ts
2578e0d67f94d25f4456ce4c3de9e49b65078b0f021e53830b11cc56f5e57440 *scripts/migrate-guarded.ts
5913e3ab238a7d3cdf696f5b8e80bbadf19c7f8accaf75bda803cf09fc124c13 *scripts/lib/migration-guard.ts
fdaf02086f9378cfead54b3e82d07cb8db85aa58f663e4bbd97c96e80b2a2f31 *tests/unit/state-store.spec.ts
bf591032aa991b4dba1bae8fe91c1e00426c47c53e52264a5b3fad9b03124efd *tests/unit/migration-identity.spec.ts
de6dd1ec6fcd1307604b30baee32f64cf674a983caa1b863dbf4b7bd0799bb40 *tests/unit/migration-guard.spec.ts
```

Không đổi: `deploy/migrations.approved.json` (5 mục), `deploy/migrations.proposed.json`, migration banner (`92e833a9…15b7`), SQL guard (`sql-guard.ts`), `migration-plan.ts`.

## Công cụ và cấu hình diễn tập (ngoài Git, trong `drphynex-b5-rehearsal`)
```
5e20d0a6a87349f059f22d32b41e7bd1bdb3079bed2b42c1267c4be893015100 root/deploy/migrations.approved.json
f1d105cc2d6a26f8c0ecd7bf871fef92e343f4067008fc3dbf7bb559b1691f2b root/deploy/migrations.proposed.json
d9e5f9e94692d72c997da2913ba787c0fe70494c64075be55ddd6972f576b42f tools/pg_restore_docker.cs
edd812d833a11decaaf1d0398335ef7d30f914436cfe11a82479131effc31fa7 tools/pg_restore_docker_r3.cs
fac64f6a16c2285266d75ded43e5e27666ca4fd0a8e78e7892dc3403cc0e15fa tools/pg_restore_docker_r3.exe
84f3015bd4b000b275ee581efa7c245d7e51ecf7fc530768621ad22de14170f4 table-hash.sql
d9ffc5b487548ebca78f46bad8686c9acf046dddf017b6b20f8c123656268275 rehearsal3/config/targets.json
a375f2e12549ec94b5507d09f925815371ddc0917368b6a00289ce007617ebb1 rehearsal3/manifest/manifest.json
45b04283be88991b9f8f68d6d04248168a5242b9588cc13b89cb636f6d9f592e rehearsal3/part-a.sh
772360487488195f3f7b734ecdf19601d4d9c361cd8f91082bbb76276dbf5084 rehearsal3/part-b.sh
8c7c90f0a8496d4cb8507932c58fae9522096e90493e75811805791e3fb6c553 rehearsal3/part-c.sh
abbb535c2ee77743e028eaa894fa7e2232ba10ab99996cd6053036f2ed269fad rehearsal3/vars.sh
4e1b837e05c61793fa55931af7c79e35688a2b80d22287c340bb36b63df37c0d root/check-identity.mts
4d59b1b90db8e115394b3bc545a3e5cc6422e1f9bee31fdde7d8c4cd6610e3d2 fp.sh
```

## Fingerprint đầy đủ (nguồn, cấu hình, test, allowlist thử, công cụ restore)
- Trước chuỗi diễn tập: `7ac295a6269bfd9a9d167355b5da7f77b6b163707a98809c1d3709c1ebd1fbc2` (235 file); sau chuỗi: `7ac295a6269bfd9a9d167355b5da7f77b6b163707a98809c1d3709c1ebd1fbc2` — giống hệt.
- Lượt test:guard: `9432f1f63df43ce2e0e0ea6df0e0af0a1960e1ec3e74590c54e516f4329f8700` trước = `9432f1f63df43ce2e0e0ea6df0e0af0a1960e1ec3e74590c54e516f4329f8700` sau (234 file).
- Danh sách chi tiết: `rehearsal3/evidence/fingerprint-*.list`.

## Lệnh và exit code
- `node tests/guard/run-integration.mjs` → 0, verdict pass, 12/12, 0 skip (`rehearsal3/evidence/guard-run/`).
- `vitest run --config vitest.unit.config.mts` → 0, 20 file, 586/586 (`rehearsal3/evidence/unit-final.log`).
- `tsc --noEmit --incremental false` → 0; ESLint `--max-warnings=0` → 0; Prettier `--check` → 0.
- `scripts/migrate-guarded.ts --local` (rehearsal3) → 0, COMPLETE (`rehearsal3/run1.log`, `state/state.json`).
- Drill D1–D8: `rehearsal3/drills-report.txt` và `drill-*.log`.

## Bằng chứng
- Danh sách hash 63 file bằng chứng rehearsal3 (không gồm file URL/mật khẩu cục bộ): `rehearsal3/evidence-files.sha256`, SHA-256 `e6f4821215fc6c695ab1bf0878b1f15a296fd1b595ca3dba981db917f1a680f6`.
- Bằng chứng cũ giữ nguyên: `drphynex-b5-rehearsal/{backup-20261106,manifest,rehearsal2,guard-run-1e24f7e,after,...}`, `brand-assets/screenshots/home-banners-cms-2026-11-05-r*`.
- `drphynex` sau chuỗi: 5 migration, 0 cột banner, role duy nhất `drphynex`.
