# Manifest r4 — sửa P1 system caller (2026-11-06)

Thay đổi so với manifest r3 (24 file, vẫn hiệu lực cho các file còn lại). SHA-256 tại thời điểm chạy r5:

```
349f7a2fc7aab25d9950da8dbacaabe8708a858032c71a0638962b49850dfc28 *src/hooks/guardHomeBannerApproval.ts
536c15630097d270f61b2e0b2a1adfa2fdbdab59c7a0b020135c8ee879b91462 *tests/int/home-banners-approval.int.spec.ts
ded23f777db513226c06618ca6802109f5af786ca0b45c767528178c76b5a95f *tests/int/review-p1.int.spec.ts
e3733f7547f1f4a33d18bfb65ebf0f9eccf8e627219c90c18c1bd4fbbff711cc *tests/int/review-rights.int.spec.ts
```

File mới trong manifest so với r3: tests/int/review-p1.int.spec.ts, tests/int/review-rights.int.spec.ts (chỉnh seed theo workflow).
Fingerprint đầy đủ 218 file: danh sách trong brand-assets/screenshots/home-banners-cms-2026-11-05-r5/logs/fingerprint-start.sha256.list (git-ignored); hash danh sách af99eb17…c0f7 trước = sau.
Báo cáo: docs/home-banners-system-caller-fix-2026-11-06.md
