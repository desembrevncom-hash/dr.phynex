# Independent review remediation — 2026-10-29

> Đính chính sau review lần hai: các kết luận đóng toàn bộ binary/locale/restore tại fa51fd1 không đủ rộng. Xem [khắc phục P1 và giới hạn restore](independent-review-p1-followup.vi.md) trước khi dùng kết luận hoặc số test cũ bên dưới. Đây là báo cáo lịch sử, không thay kết quả xác minh ứng viên mới.

Status: implementation ready for independent re-review, **not launch approval**.
No push, deploy, external account, bucket connection, SMTP transmission or paid service.
One agent performed all edits sequentially. Clinical Label, CSS, brand assets and actual CMS content were retained; only pagination UI labels were added.

## Baseline and checkpoints

- Starting HEAD: 2c35a5261048b3fedf515518188b72a291c77827, branch phase-3-brand-design.
- Deployment changes seen during the earlier review had already been committed as b765ca6 and 2c35a52. No tracked application edits remained.
- Checkpoint: 30d896a; explicitly records incomplete deployment preparation.
- Untracked .agents/, .claude/, .codex/ were inventoried (380 files), preserved in the original checkout, and not added to application commits.
- Fix branch: fix/independent-review. Build checkout: C:/Users/THAI/.codex/worktrees/independent-review/website-demo.
- Tracked files were scanned for exact local secret values, private-key headers and AWS key patterns, without printing values. This is a scoped scan, not exhaustive detection.

## Findings, changes and evidence

| Finding | Verification | Minimal remediation | Evidence |
|---|---|---|---|
| S3 schema differs between Local and enabled adapter | Confirmed | Always insert plugin fields even with disabled Local adapter; migration adds prefix and _objectkey to media/source_documents; generated types and adapter snapshot included | Fresh database + upgrade of existing neutral upload rows; actual Payload read; enabled/disabled field comparison; schema drift check |
| Approved EN draft becomes public when KO is published | Confirmed before fix | Enforce Payload publishSpecificLocale and disable publishAllLocales in collection/global beforeOperation; translator draft returns to in-review | Red test exposed UNREVIEWED EN; green collection and global tests preserve approved EN and pending EN draft |
| Translator multipart replacement of released Media | Confirmed: HTTP 200 before fix | Reject non-editor binary writes in server hook; existing released binary cannot be overwritten even by editor; create separate unreleased Media and approve/swap it | Multipart REST regression now 403; original filename/release preserved; editor overwrite rejected; new replacement defaults private |
| Translator can change shared image relationships | Confirmed before fix | Editor field access on ProductLine.heroImage and Ingredient/Technology.image | Server-side Local API tests preserve images, slug, appearance and order; UI-only restrictions are not relied on |
| Content invalidation may race transaction commit | Original concurrent race not independently reproduced | Remove persistent guest data cache and obsolete invalidation hooks; keep request-local React deduplication and dynamic rendering | Public reads and real production HTTP verify publish, draft, unpublish, approval withdrawal and republish |
| Image cache may outlive release revocation | Prior warmed CDN/optimizer cache not reproduced | Disable Next image optimization for this site, reject historical /_next/image requests in proxy, serve uploads private/no-store through access-controlled Payload routes | Released original 200/no-store, revoked original 403, historical optimizer-shaped URL 410 before/after withdrawal |
| Form initialization outside catch | Confirmed | Include Payload initialization/rate limiting inside both action try/catch; log error class instead of form-bearing error objects | Injected initialization failure returns server FormState and preserves submitted fixture values for both forms |
| Journal truncates at 24 | Confirmed | Pagination with bounded integer page, topic-preserving links/switcher, target-locale and out-of-range clamp; stable sort | 25-article HTTP fixture reaches old article on page 2; KO with one article clamps to page 1; page 999 clamps to final page |
| Ingredient/Technology slug collision | Confirmed design flaw | Dedicated /technologies/[slug] using shared detail component; update product/list links and sitemap; redirect unambiguous legacy tech URLs | Same slug serves two distinct headings/URLs; product links, sitemap and legacy 308 verified over HTTP |
| Legal hreflang advertises unapproved locale | Confirmed | Metadata uses approvedLocalesFor just like content availability | Production HTML includes EN and excludes unapproved VI |
| Dependency counts in older report | Confirmed stale | No dependency upgrade; record current audit and reachable paths | npm audit: 19 packages flagged, 7 low / 5 moderate / 7 high / 0 critical |

## Test isolation

Dedicated database: drphynex_independent_review_test, created on the existing local PostgreSQL, with database comment drphynex-independent-review-disposable-v1. Before **every** dropDatabase, tests query current_database() and shobj_description(pg_database.oid) through the actual Payload connection and require both exact values. Merely naming an environment variable or suffix is insufficient. The explicit test URL gate also rejects drphynex. The marker survives public-schema resets.

Uploads from integration tests use freshly allocated temporary directories; production HTTP fixtures use the isolated checkout's media directory. Test accounts have random throwaway passwords and exist only in the marked database. No real accounts, translations, publication state, submissions or files were changed. No migration was run on drphynex.

Commands (from the source checkout):

- node scripts/review-provision.mjs — creates only the dedicated local disposable database, refuses an existing unmarked database.
- node scripts/review-test.mjs — explicit test URL, no automatic fallback to the live database.
- node --import tsx scripts/review-storage-snapshot.ts — generate adapter snapshot after checking actual test identity; no DB writes.
- node scripts/review-build.mjs C:/Users/THAI/.codex/worktrees/independent-review/website-demo — verifies test identity and builds via webpack in the separate checkout. Do not use build:vercel for Local validation.
- In the isolated checkout, start Next on 127.0.0.1:3015 and run node --import tsx scripts/review-http.ts. This writes neutral fixtures only after checking database identity. Do not run schema-reset tests concurrently with this HTTP check.

## Validation results

- Three initial rights regressions failed for the reported reasons, then passed after fixes.
- Integration suite: **38/38 tests passed in 6 files**; storage covers fresh/upgrade/field parity/schema drift; access covers collection and global revisions, multipart, private files and role boundaries; form tests inject initialization failure.
- TypeScript --noEmit --incremental false: passed. ESLint: passed.
- Isolated production webpack build at 16acd52: passed. Subsequent snapshot, tests and documentation do not change the runtime bundle. Existing .next directories were not used for build.
- Production HTTP: **17/17** checks passed. This includes an offset edge case discovered during HTTP validation and corrected before the passing run.
- Browser: Journal page 2 viewed at 390, 768 and 1440 pixels; no horizontal overflow measured. Previous clicked; EN to KO kept topic. This is not a claim of full-site WCAG or all-page/all-locale visual acceptance.
- Test server 3015 is stopped after verification. Existing servers were not stopped.

## Cache and withdrawal limits

Content: no persistent guest data cache. Each new request reads committed CMS state; React deduplication is request-local. Requests already in flight during withdrawal can finish with the state they read.

Images: originals require access checks and receive private/no-store headers. All historical Next optimizer URLs return 410 on the new application. There are no configured Payload imageSizes variants; the test addresses the Next optimizer URL surface. This deliberately trades automatic responsive transformations for stronger revocation. Resize/compress approved web assets before upload.

Storage: the bucket must remain private, and disablePayloadAccessControl must remain false. Local checks do not prove real R2/S3 ACL, CDN, CORS or signed-upload behavior. No real bucket was contacted. Public bucket URLs, previously cached third-party CDN responses, screenshots, already-loaded images and downloaded copies cannot be revoked by this application. Purge a previously configured external CDN separately when applicable; no such service was configured here.

## Dependencies and remaining release gates

Audit counts affected packages, not independent exploits. Official sources:
- graphql-scalars: https://github.com/graphql-hive/graphql-scalars/security/advisories/GHSA-x8rm-f576-gq67 — npm range is broad; advisory narrative introduces the regex issue at 1.24.1, installed version is 1.22.2; Payload imports DateTime/EmailAddress, and GraphQL POST is disabled. No reachable PhoneNumber exploit established.
- happy-dom: https://github.com/capricorn86/happy-dom/security/advisories/GHSA-834v-8h66-3h79 and https://github.com/capricorn86/happy-dom/security/advisories/GHSA-c8p4-j97h-3vg8 — installed 20.14.6 is affected, but no project path converting untrusted HTML was identified.
- esbuild: https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99 — affected dev-server behavior is not used by this application.
- deepmerge: https://github.com/advisories/GHSA-gcqx-w48m-w2h4 — low advisory; no untrusted merge exploit path established.

No audit fix --force or dependency installation was performed. Still required before launch: approved content/images, real storage/SMTP/serverless staging verification, restore rehearsal, complete visual/accessibility acceptance and launch approval. Keep noindex enabled.
