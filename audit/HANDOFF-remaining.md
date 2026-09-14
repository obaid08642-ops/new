# HANDOFF — Remaining work for the next agent (2026-09-14)
> Everything below was verified live. Code references are main-branch paths.

## 0. URGENT: production backend is BEHIND main
- `GET /api/v1/public/sitemaps/products-count` → **404 live**, exists in main (`seo-search.module.ts`).
- Conclusion: backend container was NOT redeployed after recent merges.
- Action: redeploy backend from `origin/main`, then re-verify:
  `curl https://api.nabd.plus/api/v1/public/sitemaps/products-count` must return `{"total":20990,...}`.
- Same redeploy also ships: cron outage-quiet guard — BUT that branch is NOT merged yet (see §1).

## 1. Unmerged branch — merge + deploy (verified: tsc clean, jest green)
- `fix/cron-db-outage-quiet` (`f347ece3`): `common/db-outage.ts` + guards in
  `provider-image-processor.service.ts`, `chat-lifecycle.scheduler.ts`,
  `radiology-reminder.cron.ts` + `db-outage.spec.ts` (2 passed).
- Effect: DB outages no longer spam Sentry every 10s; real bugs still throw.

## 2. Mongo outage 2026-09-14 12:14–12:27 UTC (~260 Sentry events) — ROOT CAUSE OPEN
- Evidence: `ENOTFOUND mongodb` + `MongoNotConnectedError`, all from
  `ProviderImageProcessorService.processPendingJobs` (10s cron, unguarded fetch).
- Ruled out: NOT a deploy (no pushes/workflows at that time), NOT code (services retry correctly).
- Diagnosis = the `mongodb` container itself was down ~13 min. On the server run:
  ```
  docker ps -a --filter "name=mongo" --format "{{.Names}} {{.Status}}"
  docker logs --since 2026-09-14T12:00 --until 2026-09-14T12:35 <mongo-container> 2>&1 | tail -30
  dmesg | grep -i "oom\|killed process" | tail -5
  ```
- OOM killed → raise container memory limit. Restart loop → send logs back for analysis.
- Sentry issues NABD-BACKEND-3..9,A,B,C intentionally LEFT OPEN as recurrence signal. Resolve them only after the cause is fixed.

## 3. N+1 Query (NABD-BACKEND-D) — benign, no code needed
- `getMore` batches on `medicines_master` from ONE legitimate 5000-doc sitemap read
  (`publicProductSitemapPage` + `publicProductCount`). Cursor pagination, not a bug.
- Leave open for monitoring; do NOT "fix" by shrinking pages.

## 4. Ops items (need human/dashboard access — no code)
- Cloudflare Cache Rule for `/api/v1/(catalogs|mcp|seo)*` (Edge TTL 5 min). Code headers already live.
- staging backend container + `nabd_staging` DB; staging web still targets PROD api (verified via CSP header) — DO NOT run write-tests on staging until isolated.
- App-store metadata (R76), Apple Team ID in AASA (currently `APPLE_TEAM_ID_PENDING`), Search Console sitemap submission.
- DO NOT merge: PR #160 (nestjs 12 alone breaks peers), #155–157 (actions majors — merge one by one after green main).

## 5. Audit totals (evidence-backed, sum = 82)
- PASS 55 · PARTIAL 20 · UNCERTAIN 1 (R56) · FAIL 0 · BLOCKED 1 (R76).
- R56 (AI discovery) + R50/R51 (live pen-test) + R5/R6/R13–R19/R25/R58–R63/R71 staging execution await an isolated staging backend.
