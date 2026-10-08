# Re-check of the P13–P19 reviews on tip `a2de0b44`

- Tip checked: **`a2de0b4457d2ac6e333ffc999213a3c379d12e67`** (`Merge r12/p22-c (Phase 22 platform) into oc/phase-audit`, 2026-10-08 11:57 +0300). `ea7f4720` is an ancestor. The range `ea7f4720..a2de0b44` has 32 commits, 361 files changed (+19 064 / −11 263).
- Date: 2026-10-08. Reviewer: independent review session, detached worktree. Nothing was posted, pushed or committed. No product code was patched. One temporary probe spec (`backend/src/common/zz-tip-probe.tmp.spec.ts`) was created and then deleted. `git status --short` is empty at the end. The local mongod (:27731) and redis (:6731) used here were shut down.
- Earlier reviews: P13–P18 were done on `ea7f4720` and P19 on `7ed3a378`. "file unchanged" means `git diff <old tip> a2de0b44 -- <file>` is empty.

## The most important fact

The range brings in two `[REVIEW-RESTORE]` commits: `5691122a` "Owner decision B: fix/audit-2026-09 back to the tree of 08420c11" and `e0bec75c` "Re-apply the reviewed work merged after 08420c11". It also brings in the `[merge-fix]` commits that "restore 443 files dropped by bad merge (origin a0df24b3 versions)". Together they put **pre-Phase-15/16/17 versions** back into many files.

- **Phase 15 is mostly undone.**
  - The resilient clients in all four apps are gone.
  - Breakers are gone from mail, AI, LiveKit, WhatsApp, S3, Stripe and Tap.
  - The kill-switch consumers and seeding are gone, and the merged idempotency protocol is gone.
  - The NaN guards, the Riyadh/Ramadan schedule code and the app-root error boundaries are gone. DeviceGate is no longer mounted.
  - The chaos journeys were removed from the gate scripts.
- **Phase 16 is partly undone.**
  - The production `SERVER_ERROR` envelope, `LogRetentionService` in `CommonModule`, the Phase 16 nginx headers, the invented action SHAs in four workflows and the abuse guards in `CommonModule` are gone.
  - The audit listeners, `AuditController` and `TracingMiddleware` are back.
- **Phase 17's layout mounts are gone.**
- **Phase 18's `LocaleMiddleware` is unregistered.**
- The older patient-app locale files are back.

Several earlier findings are therefore now false. Almost none of them were fixed by implementing the task. They disappeared because the code that carried the defect was removed. **No task is NOW PASS.**

## Tip-wide facts (real outputs on `a2de0b44`)

| command | result |
|---|---|
| `cd backend && npm ci --no-audit --no-fund` (plain, once) | **EXIT 1** `npm error code ERESOLVE` … `While resolving: @nestjs/terminus@11.1.1` / `Found: @nestjs/axios@12.0.1` (unchanged; `backend/package.json` and the lockfile are unchanged in the range) |
| `npm ci --no-audit --no-fund --legacy-peer-deps` | EXIT 0, `added 1516 packages in 25s` |
| `npx tsc --project ../packages/shared-contracts/tsconfig.json` | EXIT 0 |
| `npx tsc --noEmit` | **EXIT 2, 37 errors, all in spec files.** This is new; it was EXIT 0 on `ea7f4720`. The Phase 15 specs no longer match the restored code: `resilience-chaos.p15.spec.ts` ×18, `circuit-breaker.service.spec.ts` ×5 (`Property 'getStatus' does not exist on type 'CircuitBreakerService'`), `feature-flags-killswitch.p15.spec.ts` ×4 (`no exported member 'KILL_SWITCH_FLAG_KEYS'`, no `ensureSeeded`), `killswitch-consumers.p15.spec.ts` ×3, `care-riyadh-mirror.p15.spec.ts` ×2, and 1 each in `appointments-buffer-race.p15`, `payments-refund-url.p15`, `media.controller.spec`, `pharmacy-order-manual-request.spec`, `storage.module.spec`. |
| `npx nest build` | EXIT 0 |
| `node dist/main.js` (NODE_ENV=development, mongod 8.2.6 rs0 :27731, redis :6731, PORT 8731, env as `tools/live/start-backend.sh`) | **Does not start, for a different cause:** `Nest can't resolve dependencies of the MediaService (?). Please make sure that the argument UploadSecurityService at index [0] is available in the MediaModule module.` Liveness never answered (`code=000`). The two earlier causes are gone: `LocaleMiddleware` (`@nabd/i18n`) is no longer registered (`app.module.ts:287-290`), and `LogRetentionService` is no longer in `CommonModule`. `node -e "require('@nabd/i18n')"` still fails with `ERR_UNSUPPORTED_DIR_IMPORT`. Nothing loads it at boot now. |
| `npx jest --config jest.boot.config.js --runInBand test/security test/journeys` | **EXIT 1** `Test Suites: 3 failed, 13 passed, 16 total` / `Tests: 3 failed, 59 passed, 62 total`. The same 2 `@nestjs/axios` ESM suites fail to load (`p3-provider-credential`, `p3-credential-rotation`). **New:** `test/security/f01-wallet.e2e-spec.ts` fails 3 tests (`POST /wallet/credit → 404 … expected 404 "Not Found", got 400`; `proto.auditAdminWalletAdjustment` still defined). The spec was restored to the R6 version, but the wallet routes are still in the code. |
| `python3 ../tools/audit/dtolint.py` | EXIT 0 (all four counters 0) |
| `node tools/audit/clientbodies.js > cb.json && node tools/audit/dtocheck.js cb.json` | **EXIT 0** `678 DTO routes checked, 342 matched by client calls, 0 mismatches`. This was 1 mismatch before; `ApplyDto.device_id`/`phone` are now `@IsOptional`. |
| `node scripts/run-acceptance.mjs oc-auth` (from `backend/`) | EXIT 1 `Tests: 2 failed, 1 passed, 3 total` (`@nestjs/axios` ESM; unchanged) |
| `… oc-phase21` | EXIT 1 `Tests: 4 failed, 2 passed, 6 total` (unchanged) |
| `… oc-security` | EXIT 1 **`Tests: 3 failed, 3 passed, 6 total`** (was 5 failed). Still failing: chaos switches not ignored in production; mock SCFHS labelled `scfhs_api`; wallet routes still declared. **Now passing:** the audit-trail/correlation test (`correlation.middleware.ts` reads and echoes `x-correlation-id` again, and `security.module.ts` has its listeners back). |
| `… oc-migrations` | EXIT 1 `Tests: 24 failed, 4 passed, 28 total` (unchanged) |
| `… oc-ci` | EXIT 1 **`Tests: 3 failed, 14 passed, 17 total`** (was 7 failed). Still failing: `supply-chain.yml`, `zap.yml`, and "no workflow lives where GitHub never runs it". codeql, lighthouse, live-gate and security now use tag pins (`@v3`, `@v12`, `@v5`, `gitleaks/gitleaks-action@v2`). |
| `npm audit --omit=dev --audit-level=high` (backend) | EXIT 1 `11 vulnerabilities (7 moderate, 4 high)` (unchanged) |
| Phase-area backend specs (pattern run, 76 suites) | `Test Suites: 25 failed, 51 passed, 76 total` / `Tests: 52 failed, 286 passed, 338 total`. Failing groups: (a) Phase 15 specs whose code was reverted (`resilience-chaos`, `killswitch-consumers`, `idempotency-merge`, `medicines-pagination-guard`, `care-pagination-guard`, `appointments-buffer-race`, `care-riyadh-mirror`, `schedule-ramadan`, `provider-production.ramadan-exposure`, `scheduling-engine-riyadh`, `chat-dedup-race`, `chaos-switches.p15`, `feature-flags-killswitch`, `payments-refund-url`, `circuit-breaker.service`); (b) media/storage (`media.contract`, `media-types.q98`, `media.controller`, `storage.module`); (c) **auth security specs, new:** `auth.guest-takeover` (Q91), `social-login.q107`, `disabled-account-tokens.r11`, `admin-alert-email.r11`, `auth-otp-channels` (DI). `orders.service.spec.ts` now **passes** (red on `ea7f4720`). |
| patient-web `npx -y pnpm@10.4.1 install --frozen-lockfile` | **EXIT 0** (was `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`) |
| patient-web `npx tsc --noEmit -p .` | EXIT 2, **42 errors**: Phase 17 components 15 (contact 6, content 5, search 3, trust 1); Phase 18 `lib/i18n/*` 13 (`TS2307 Cannot find module '@nabd/i18n'` ×8 and follow-ons); `tests/a11y.test.ts` 11 (`Cannot find module '@playwright/test'`, `'@axe-core/playwright'`); `settings/appearance/page.tsx` 1 (`no exported member 'useTheme'`); `admin/analytics/page.tsx` 1; `settings/delete-account/page.tsx` 1. `i18n/routing.ts` and `proxy.ts` no longer error. |
| patient-web `npx vitest run` (full, once) | EXIT 1 `Test Files 9 failed \| 196 passed \| 14 skipped (219)` / `Tests 18 failed \| 725 passed \| 23 skipped (766)`. Failing: `tests/a11y.test.ts` (collected Playwright file), `route-error.test.tsx` ×2, `segment-errors.test.tsx` ×2, `module-boundary.test.ts`, plus Phase 15 web code reverted: `optimistic-ui.test.tsx` ×2, `scan-upload-resume.test.ts` ×3, `video-room-fallback.test.tsx` ×2, `appointment-slots-provider-zone.test.tsx` ×4, `lib/datetime.test.ts` ×2. **Now green:** `design-system`, `premium-motion`, `self-hosted-fonts`, `metadata-indexing`, `auth-parity`, `login-form`. |
| `admin: npm ci --dry-run` | **EXIT 0** (was `Missing: webpack@5.111.1 from lock file`) |
| `node scripts/i18n/validate-coverage.js` | **EXIT 1** `❌ patient-app: 55.7% average coverage` (`hi/ur/bn: Missing 66 keys`, `fil: Missing 108 keys`). It was EXIT 0 "100%" before. |
| `tsx tools/content/brand-check.ts` | EXIT 1 (same single finding, `NABDAH` in `clinic-confirm.tsx:118`) |
| `tsx tools/content/claims-check.ts` | EXIT 1 `Scanned 2241 files`, `Errors: 57 \| Warnings: 84` (was 63/86) |
| `tsx tools/content/length-check.ts` | EXIT 0, `Errors: 0` |
| Probe (temp spec, real `SentryExceptionFilter`, `NODE_ENV=production`, deleted after) | `PROBE13R5 [[[400,{"code":"PRESCRIPTION_REQUIRED","message":"PRESCRIPTION_REQUIRED"}]],[[409,{"code":"slot_taken","message":"slot_taken"}]],[[404,{"code":"UNKNOWN_ERROR","message":"order_not_found"}]],[[429,{"message":"account_locked","code":"account_locked"}]],[[500,{"statusCode":500,"message":"Internal server error"}]]]` |

Not run: PR #607 CI (not re-queried); live gate and journeys (the backend does not boot); patient-web `next dev`/build; provider-app and patient-app jest; mutation re-runs on unchanged files (an unchanged file means the earlier result stands).

### New defects seen in the range (outside the P13–P19 rows; brief, for the lead reviewer)

- `backend/src/modules/media/media.controller.ts:115-128`: `canReadAsset` returns `true` for **any** chat asset (`// Verified by … gateway`). `verifyChatUploadAllowed` returns `true` with no check. Any signed-in user can get a signed URL for any chat attachment and upload into any thread. The thread-membership and consultation-status checks were removed.
- `backend/src/modules/auth/auth.service.ts`: the Q91 guest-takeover guards, Q107 social-login audience checks and Apple JWKS verification, the R11 banned-account refusal on OTP, and the `escapeHtml` in the admin alert e-mails are all reverted. The matching specs are red (see above). `convertGuest` now merges a guest into **any** existing account that owns the given e-mail.
- `backend/src/common/audit-log.interceptor.ts` and `structured-logger.ts`: `email|phone|…medical` were removed from the redaction regexes. More PII now reaches the logs.
- Password-reset e-mail text now says "Nabdah Plus" (`auth.service.ts`, both reset paths). This matters for 18.7.

---

## Phase 13 (21 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 13.R1 staged geo-broadcast | FAIL | STILL FAIL | `pharmacy-broadcast.service.ts`, `pharmacy.schema.ts`, `pharmacy-offer.service.ts` and the staged-geo spec are unchanged (the spec still passes). |
| 13.R2 substitution | FAIL | STILL FAIL | `pharmacy-chat.service.ts` unchanged. |
| 13.R3 price-override audit | PARTIAL | STILL PARTIAL | `pharmacy.controllers.ts`: only the import line changed (`:1`). `admin/…/price-override-audit.tsx` unchanged. The CSV spec passes. |
| 13.R4 location privacy | FAIL | STILL FAIL | Broadcast and offer services unchanged. |
| 13.R5 error catalog | FAIL | CHANGED (still FAIL) | `sentry.filter.ts` lost the production `createErrorResponse` branch, so 4xx keep their catalog code in production (probe above). Still true: `error-catalog.ts:16,31` serve ar/en only; 404 → `UNKNOWN_ERROR`; `email` is sent to Sentry (`sentry.filter.ts:32-35`); the 6 unthrown codes. The `errorId` was removed entirely. |
| 13.R6 provider lifecycle | FAIL | STILL FAIL | `provider-admin.service.ts` and `seo-search/seo-indexing.listener.ts` unchanged (`:327` still force-sets `medical_review_status: 'approved'`). |
| 13.R7 search pipeline | FAIL | STILL FAIL | `search-intent.service.ts` unchanged. Only `SearchRateLimitGuard` was removed from the controller and module. |
| 13.R8 entity graph | PARTIAL | STILL PARTIAL | `seo.service.ts` unchanged. `auto-entity-seo-pipeline.spec.ts` passes. |
| 13.R9 dynamic ranking | FAIL | STILL FAIL | `product-ranking-r9.service.ts` only lost its kill-switch read. Module order is the same (`MedicinesModule` `app.module.ts:195`, `ProductRankingModule` `:222`). `recordEvent` callers are still the old service only. |
| 13.R10 analytics | FAIL | CHANGED (still FAIL) | New P22.10 writer: `POST /analytics/events` → `analytics-event.service.ts:33` writes `analytics_events`. Its default `denyAllConsentResolver` drops every event, `setConsentResolver` has 0 callers and no client posts there, so nothing is written in practice. The admin reports are still missing. |
| 13.R11 Saudi locations | FAIL | STILL FAIL | `geo-hierarchy-r11.ts` is still used only by its fixtures/spec. The new P22.16 `service-area`/`city-launch` code does not use it. |
| 13.R12 slugs | PARTIAL | STILL PARTIAL | `medicines.service.ts` changed only in kill-switch and NaN lines. The slug chain is unchanged and both slug specs pass. |
| 13.R13 observability | FAIL | CHANGED (still FAIL) | The premise of fix 4 is now false: `correlation.middleware.ts:10-12` reads and echoes `x-correlation-id` again, and that `oc-security` test passes. `ObservationModule`/`FailedPropagationLog`/reconciliation still have 0 users. |
| 13.R14 consultation outputs | FAIL | STILL FAIL | `cart.module.ts` and `rx-order/page.tsx` unchanged. The new P22.22.9 prescription PDF service does not fill the cart (no `from-prescription`). |
| 13.R15 medical content | FAIL | STILL FAIL | `articles.module.ts` and `articles/[slug]/page.tsx` unchanged. |
| 13.R16 cite-this / JSON-LD | PARTIAL | STILL PARTIAL | `cite-this.tsx` and `p/[slug]/page.tsx` unchanged. |
| 13.R17 website badge | FAIL | STILL FAIL | `verified-provider-badge.tsx` unchanged, 0 importers. |
| 13.R18 nabd:// links | FAIL | STILL FAIL | `nabd-links.ts` unchanged. |
| 13.R19 one product id | PARTIAL | STILL PARTIAL | The `adminCreateCatalog` merge lines are unchanged. `medicines.dto.ts` unchanged. |
| 13.R20 final report | MISSING | STILL MISSING | No report, no `طلب.md`. |
| 13.R21 AI gateway | FAIL | STILL FAIL | `ai-gateway.service.ts` lost the breaker wrapper and the AI kill switch (`:201-205`, `:366-404`). Plain-text keys, pin fallback and per-process limits are unchanged. |

Counts: unchanged 18 · changed 3 · now pass 0.

## Phase 14 (28 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 14.1 edge caching | FAIL | STILL FAIL | `workers/api-cache-worker.js` unchanged. `[locale]/layout.tsx:64` still reads `cookies()`. The Phase 17 mounts were removed, but caching is unaffected. |
| 14.2 k6 | MISSING | STILL MISSING | Nothing added. |
| 14.3 hot paths | FAIL | STILL FAIL | Same 4 limits. `notifications.service.ts` changed only in breaker code. |
| 14.4 write-path resilience | PARTIAL | CHANGED (now FAIL) | The idempotency merge is undone. `idempotency.interceptor.ts` is again a separate class (no longer `extends IdempotencyKeyInterceptor`), and it replays hashless legacy records with no hash check (`cached?.request_hash && …`). `IdempotencyKeyInterceptor` has 0 users. `idempotency-merge.p15.spec.ts` is red. The outbox still has 0 callers. |
| 14.5 scaling runbook | MISSING | STILL MISSING | — |
| 14.6 WAF rules | MISSING | STILL MISSING | — |
| 14.7 cache policy | FAIL | STILL FAIL | Still 0 `@PublicCache(` uses (2 comment lines). The interceptor is still registered (`app.module.ts:285`). |
| 14.8 purge by tag | FAIL | STILL FAIL | `purge-bus.ts` unchanged. |
| 14.9 edge HTML | MISSING | STILL MISSING | — |
| 14.10 Next on >1 instance | MISSING | STILL MISSING | — |
| 14.11 nginx micro-cache | FAIL | STILL FAIL | The nginx diff only removes Phase 16 headers. Cache directives are unchanged (`proxy_cache_use_stale error timeout updating`, no `background_update`). |
| 14.12 Fastify | FAIL | STILL FAIL | `main.ts:28,30` still `require('@fastify/compress'/'helmet')`, which are not in `package.json` (unchanged). |
| 14.13 cluster-safe | FAIL | STILL FAIL | `realtime.gateway.ts` unchanged (`:176 if (!shared)`, `:181` logs the full URL). |
| 14.14 two Redis roles | FAIL | STILL FAIL | `deploy/redis/redis.conf:12-13` (`noeviction`) and the compose file are unchanged. The X12 spec passes by early return, as before. |
| 14.15 MongoDB | FAIL | STILL FAIL | — |
| 14.16 Meilisearch | MISSING | STILL MISSING | — |
| 14.17 load shedding | FAIL | STILL FAIL | `shedding/` unchanged, 0 callers. |
| 14.18 kill switches | FAIL | CHANGED (still FAIL) | The server-side half that worked is undone: `isKilled(` has **0 callers** (it was 6 consumers). `connectionFlagSource` was deleted. `feature-flags.service.ts:11-13` `isEnabled` is fail-closed again (`flag ? flag.enabled : false`), with no `ensureSeeded`/`onModuleInit`. `killswitch-consumers` and `feature-flags-killswitch` specs no longer compile. Per-module switches are still absent. |
| 14.19 waiting room | MISSING | STILL MISSING | — |
| 14.20 media | PARTIAL | CHANGED (now FAIL) | `storage.module.ts` no longer uses `UploadSecurityService`, so the base64 path no longer strips EXIF/GPS and only checks a mime allow-list and 8 MB. `MediaService` still injects `UploadSecurityService`, but no module provides it, so the backend cannot start. The presigned route is still there (`media.controller.ts:77`). The media specs are still red. |
| 14.21 realtime at scale | FAIL | STILL FAIL | Gateway and clients unchanged. |
| 14.22 calls | FAIL | STILL FAIL | `livekit.yaml`/coturn unchanged. |
| 14.23 web performance | FAIL | CHANGED (still FAIL) | The fabricated Lighthouse SHA is gone (`lighthouse.yml:53 treosh/lighthouse-ci-action@v12`). Still 3 URLs (`:56-58`), no RUM, no speculation rules, no size-limit. |
| 14.24 app performance | FAIL | STILL FAIL | — |
| 14.25 lean APIs | FAIL | STILL FAIL | `main.ts:224 app.use(compression())`. |
| 14.26 background work | MISSING | STILL MISSING | — |
| 14.27 capacity report | MISSING | STILL MISSING | — |
| 14.28 scale-out | MISSING | STILL MISSING | — |

Counts: unchanged 24 · changed 4 · now pass 0. Regression 1 from P14 changed: the backend still does not start, but now because `MediaService` cannot be built (see above).

## Phase 15 (12 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 15.1 one API client | FAIL | CHANGED (still FAIL) | Both proven defects are gone, because the clients were reverted. `patient-web/lib/api/upstream.ts:13-24` `callPatientApi` uses plain `fetch` again (a 401 reaches the BFF refresh). provider-app login/refresh/toggle use `fetch` + `res.json()` (`context/index.tsx:388-395, 420-432, 512-521`). But now **no app uses the 15.1 policy client**: the patient-app `src/utils/api.ts` no longer imports `services/http/client`, and the admin and provider-app client headers for 15.1 were removed. |
| 15.2 no double actions | PARTIAL | CHANGED (still PARTIAL) | The server lock stays (the global `idempotency.interceptor.ts:62-67` → 409). The partial unique index `transaction.schema.ts:37` stays. The F2 fix is reverted: a hashless record replays without a body check. `j_rapid_tap` is removed from `run_gate.sh`/`gate_run.sh`. The app still mints a new key per tap (`payment-idempotency.ts` unchanged). |
| 15.3 optimistic only where safe | FAIL | CHANGED (still FAIL) | The reminder defect is gone: `medication-reminder-list.tsx:50` cancels alarms only after a successful PATCH. But `useOptimisticMutation`/`useCommittedMutation` now have **0 screen users**. The payment failure is still a fixed Arabic string (`payment.tsx:25`). |
| 15.4 weak network | FAIL | CHANGED (still FAIL) | The patient-app outbox has 0 users outside its own file, so the queue defects are inert, but offline queueing is gone. The patient-app `OfflineBanner` is mounted (`_layout.tsx:92`). The web banner, NetworkPolicy and OldBrowserNotice are still unmounted. Web `scan-upload-resume` and `video-room-fallback` tests are red (the code was reverted). |
| 15.5 nothing crashes blank | FAIL | CHANGED (still FAIL) | The web reload-forever loop is gone: `[locale]/error.tsx` is now the `RouteState` fallback. It has no support link and no report, so `route-error` 2/2 are still red, and `segment-errors` 2/2 are red. **App-root error boundaries were removed** from `patient-app/app/_layout.tsx` and `provider-app/App.tsx` (only `order-tracking.tsx` has one). The admin lockfile is fixed (`npm ci --dry-run` EXIT 0). `patient-web/sentry.client.config.ts` no longer sets `release` at all. The admin CSP still has no Sentry host. `crash.ts:235` still sends e-mail. |
| 15.6 bad/empty data | FAIL | CHANGED (still FAIL) | The NaN guards were reverted (`medicines.service.ts:532-533`, `:590` use raw `limit/page`). `medicines-pagination-guard` and `care-pagination-guard` specs are red. Schemathesis was never run (the backend does not boot). |
| 15.7 slow dependencies | PARTIAL | CHANGED (now FAIL) | `CircuitBreakerService` is now used only by `sms.service.ts`, `paymob.service.ts` and `moyasar.module.ts`. The breakers on mail, AI, LiveKit, WhatsApp/notify, S3 (`b4be10eb`), Stripe and Tap are removed. `circuit-breaker.service.ts` lost its API (`getStatus`, `reset`). `resilience-chaos.p15.spec.ts` no longer compiles, so the S3 mutation result no longer applies. SPL is unchanged. |
| 15.8 recovery | PARTIAL | CHANGED (still PARTIAL) | `j_app_killed_payment` was removed from both gate lists. Still no app launch reconciliation. |
| 15.9 clocks/time zones | FAIL | CHANGED (still FAIL) | The reschedule strip now uses the **device** clock and UTC keys (`consultations/cancel-reschedule.tsx:69`); `serverTime.ts` has 0 app users. The backend Ramadan/special hours were removed (`provider-profile.schema.ts` lost `ramadan_hours`/`special_hours`). The Riyadh/Ramadan specs are red (`care-riyadh-mirror`, `schedule-ramadan`, `scheduling-engine-riyadh`, `provider-production.ramadan-exposure`, `appointments-buffer-race`). |
| 15.10 devices/browsers | FAIL | CHANGED (still FAIL) | The endless-spinner lockout is gone: `DeviceGate` is mounted nowhere (0 hits in `_layout.tsx`/`App.tsx`). Both `DeviceGate.tsx` files still read `platformVersion` (`:62`, `:44`). The web notice is still unmounted. `provider-app/app.config.js` no longer passes `authToken` (that finding is now false). There is still no device-farm report. |
| 15.11 chaos drills | FAIL | CHANGED (still FAIL) | `sms.service.ts`/`livekit.service.ts` no longer call `isChaosFail`, so a stray env var no longer disables SMS/LiveKit. `chaos-switches.ts:24-25` is still unguarded: `oc-security` is still red, and the `chaos-switches.p15` spec is red. `j_chaos`, `j_rapid_tap`, `j_app_killed_payment`, `j_throttled_network` and `j_killswitches` were removed from `run_gate.sh`/`gate_run.sh`. The `fake_moyasar.py` failure mode was removed. |
| 15.12 ship fixes fast | FAIL | CHANGED (still FAIL) | The OTA scripts are unchanged and still wrong. The kill-switch half is gone as well (see 14.18). |

Counts: unchanged 0 · changed 12 · now pass 0.

## Phase 16 (13 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 16.1 secrets | FAIL | CHANGED (still FAIL) | gitleaks is fixed: `security.yml:24 gitleaks/gitleaks-action@v2`. Still true: no `env_ignore_check.sh` in any workflow; AI keys in plain text; no TURN record. |
| 16.2 passwords | FAIL | STILL FAIL | `password-security.service.ts` and `auth.controller.ts` (`@MinLength(6)`) unchanged. In `auth.service.ts`, the login lockout/no-hash branch (`:580-628`) and `HttpService` injection (`:45`) are unchanged. |
| 16.3 bots/OTP | FAIL | STILL FAIL | `auth.controller.ts`, `turnstile.service.ts` and `auth/sms-fraud-protection.service.ts` unchanged. `sendOtp` still calls `checkAndRecord` (`auth.service.ts:1033`). |
| 16.4 transport/headers | FAIL | CHANGED (still FAIL) | All Phase 16 nginx headers were removed: HSTS, COOP/CORP, Permissions-Policy, security.txt, `autoindex off`. So the camera/mic/geolocation block on the web is gone. helmet's explicit HSTS-preload/COOP/CORP options were also removed (`main.ts:219-223`). There is now **no HSTS in any nginx conf**. No header test. |
| 16.5 uploads | FAIL | CHANGED (still FAIL) | The base64 path no longer runs `UploadSecurityService` (see 14.20). The multipart path's service has no provider, so the backend cannot start. `media.controller.ts` now runs `verifyUpload` (Q98) on multipart. The presigned route is still there (`:77`). **New:** chat-media read/upload authorization was removed (`:115-128`). The ClamAV/temp-file code (`upload-security.service.ts`) is unchanged but is now reachable only through the unbuildable `MediaService`. |
| 16.6 errors/logs | FAIL | CHANGED (still FAIL) | The production 4xx code is kept (probe). The `errorId` is gone entirely. `LogRetentionService` is no longer provided, so it does not delete rows (dead code). The append-only hooks and TTL index were removed from `audit-log.schema.ts`, so updates are now allowed. `email`/`phone`/medical were removed from the redaction regexes (`audit-log.interceptor.ts`, `structured-logger.ts`). Sentry still gets e-mail (`sentry.filter.ts:34`). |
| 16.7 supply chain | FAIL | CHANGED (still FAIL) | Invalid pins went from 12 to 5: `supply-chain.yml:96,111,182`, `zap.yml:54` (41 chars), `zap.yml:64`. Trivy is still a tag (`:130,159`). `oc-ci` has 3 failed. `npm audit` is unchanged (4 high). |
| 16.8 ZAP | FAIL | STILL FAIL | `zap.yml` and `.zap/rules.tsv` unchanged. |
| 16.9 health data | FAIL | STILL FAIL | `PdplComplianceModule`/`CryptoModule` are still imported nowhere. |
| 16.10 servers | MISSING | STILL MISSING | `docker-compose.observability.yml` unchanged. |
| 16.11 mobile apps | MISSING | STILL MISSING | `useSocialLogin.ts` unchanged. |
| 16.12 business-logic abuse | FAIL | CHANGED (still FAIL) | `ApplyDto` makes `device_id`/`phone` `@IsOptional` (dtocheck 0). The phone is now stored as `sha256('ref:'+digits)` (`referral.service.ts:149-153`), not raw, but it is unsalted and still taken from the body. The audit listeners, `AuditController` and `TracingMiddleware` are back (`security.module.ts:58-97, 103, 134`). `orders.service.spec.ts` is green. `checkLoyaltyPointsExpiry`/`AbusePreventionService` are no longer in orders. All abuse guards and services (`CouponAbuseGuard`, `SearchRateLimitGuard`, `AIRateLimitGuard`, stock/review/referral-fraud) have 0 providers. `UploadRateLimitGuard` is still `@UseGuards` on `media.controller.ts:78` without a provider. **The Rx exclusion (amendment) is still missing**: `orders.service.ts:178-206` discounts the full `preTotal`. |
| 16.13 DNS/email | MISSING | STILL MISSING | `mail.module.ts` changed only in breaker code. Swagger gate `main.ts:253` unchanged. |

Counts: unchanged 7 · changed 6 · now pass 0.

## Phase 17 (10 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 17.1 navigation | FAIL | CHANGED (still FAIL) | `[locale]/layout.tsx` no longer mounts SkipLink, MobileMenu, ToastProvider, LayoutExtras or UtmTracker, so the raw-key text is not rendered because nothing renders it. The keys are still missing in all 6 locales. `error.tsx` is the RouteState fallback (no reload loop, no hex colours) but has no support link or report (`route-error` red). `not-found.tsx` no longer has `onMouse*` handlers or hex colours. `offline.tsx` is still unrouted, and Breadcrumbs are still a comment only. `route-state-ssr.test.tsx:11` passes `error` again, so mutation 2's premise is gone. `design-system`/`premium-motion` tests are green. |
| 17.2 interaction feedback | FAIL | CHANGED (still FAIL) | `ToastProvider` is no longer mounted. ConfirmDialog/Copy/PasswordToggle/Skeleton are still unmounted. `addresses.tsx:66` still deletes with no confirmation. The `window.confirm` sites are unchanged. |
| 17.3 search everywhere | FAIL | STILL FAIL | `search/*` unchanged (tsc: `search-bar.tsx` + `search/index.ts` 3 errors). |
| 17.4 content helpers | FAIL | STILL FAIL | `content/*` unchanged (5 tsc errors). |
| 17.5 contact/engagement | FAIL | CHANGED (still FAIL) | The `utm_data` 400 regression is gone: neither `pharmacy-request-form.tsx` nor `pharmacy-broadcast-submit.tsx` sends `utm_data`. The campaign route was removed from `analytics.module.ts`, and `campaign-attribution`/`campaign-report` services are unwired. FloatingContact/Newsletter are still unmounted with placeholder numbers, and the `/api/contact`/`/api/newsletter` endpoints still do not exist. |
| 17.6 consent | FAIL | CHANGED (still FAIL) | `UtmTracker` is no longer mounted, so UTM/click ids are no longer stored without consent (that finding is now false). ConsentBanner is still unmounted with the stub. |
| 17.7 theme toggle | PARTIAL | CHANGED (still PARTIAL) | The header `ThemeToggle` is mounted (`layout.tsx:84`). The appearance page is now **unlinked** (`settings/page.tsx` has no link). It still reads `Settings.Appearance` (missing in all 6, and top-level `Appearance` is gone too), and it fails tsc (`useTheme` not exported). |
| 17.8 accessibility | FAIL | CHANGED (still FAIL) | The frozen pnpm install now passes. `@playwright/test` and `@axe-core/playwright` are no longer dependencies, so `tests/a11y.test.ts` cannot compile (tsc 11 errors) and vitest still collects it and fails. Both `a11y.yml` copies are still there. There is still no screen-reader record. |
| 17.9 phone-friendly forms | FAIL | CHANGED (still FAIL) | The Batch 0 forms were restored. Login (`login-form.tsx:65`) and OTP (`otp-screen.tsx:21`) now strip non-ASCII digits (`\D`), so Arabic digits are dropped, not normalised. The reset token is posted raw with no filter (`password-reset-form.tsx`). `otp-screen` imports `./auth/auth.module.css`, so the missing-CSS-module finding is false. Still no test per form. |
| 17.10 trust signals | FAIL | STILL FAIL | Doctor pages and `verified-badge.tsx` unchanged. |

Counts: unchanged 3 · changed 7 · now pass 0.

## Phase 18 (7 tasks; old tip `ea7f4720`)

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 18.1 coverage | FAIL | CHANGED (still FAIL) | The older patient-app locale files were restored. `pd.add_to_cart` exists in ar/en (115 keys) and ur/hi/bn/tl (49 keys), so the "raw `pd.*` keys in 5 locales" finding is now false. Coverage is now visibly short: the validator exits 1 (`Missing 66 keys` hi/ur/bn), and the Arabic fallback fills the gaps. `fil.json` (94 keys) is still unused. Backend `i18n.service.ts` and the provider-app/admin files are unchanged. |
| 18.2 fallback | FAIL | CHANGED (still FAIL) | `LocaleMiddleware` is no longer registered (backend start no longer blocked by it). patient-web `i18n/routing.ts:3` is back to `defaultLocale: "ar"`, so the one part that matched the Do is gone. The rest is unchanged. |
| 18.3 workflow | FAIL | STILL FAIL | Glossary and admin translation tool unchanged. |
| 18.4 formatting | FAIL | STILL FAIL | `packages/i18n` unchanged. `lib/i18n/*` still 13 tsc errors, with 0 consumers. |
| 18.5 copy guide | PARTIAL | STILL PARTIAL | `COPY_GUIDE.md` unchanged. |
| 18.6 content QA | FAIL | CHANGED (still FAIL) | claims-check is now `Errors: 57 \| Warnings: 84`. `validate-coverage.js` now fails (EXIT 1), so the "passes while broken" premise has flipped. The workflows are unchanged. |
| 18.7 one brand name | FAIL | CHANGED (still FAIL) | brand-check is the same (1 finding). New banned text: "Nabdah Plus" in both password-reset e-mails (`auth.service.ts`). SMS sender `'Nabdah'` (`sms.service.ts:72`). |

Counts: unchanged 3 · changed 4 · now pass 0.

## Phase 19 (12 tasks; old tip `7ed3a378`)

`git diff --stat 7ed3a378 a2de0b44` over `compliance/`, `geo/`, the five `j_insurance_*.py`, `legal-terms.tsx`, `terms`, `paymob.service.ts`, `user.schema.ts` and `PharmacyDashboard.tsx` is empty. Changed files that matter: `provider-profile.schema.ts` (only the removal of `ramadan_hours`/`special_hours`; the `license_status` enum is unchanged), `insurance.module.ts` (+`@StepUp()` only), `billing.module.ts` (pdfkit fix), `legal.module.ts` (+`@StepUp()` only), and `run_gate.sh`/`gate_run.sh` (journeys removed; `j_insurance_*` still absent).

| task | old status | status on a2de0b44 | what changed |
|---|---|---|---|
| 19.1 hosting (CHANGED) | NOT-NOW | STILL NOT-NOW | — |
| 19.2 sector rules (CHANGED) | REMOVED-OK | STILL REMOVED-OK | — |
| 19.3 SCFHS | FAIL | STILL FAIL | `scfhs-license.service.ts`/`compliance.module.ts` unchanged. `oc-security` "mock … official source" still red. The enum is unchanged, so the onboarding `ValidationError` stands. |
| 19.4 Nphies | NOT-NOW | STILL NOT-NOW | `insurance.module.ts`: only `@StepUp()` added. |
| 19.5 Wasfaty | NOT-NOW | STILL NOT-NOW | — |
| 19.6 Nafath | NOT-NOW | STILL NOT-NOW | — |
| 19.7 SPL | FAIL | STILL FAIL | `spl-integration.service.ts`/`geo.module.ts` unchanged, 0 importers. |
| 19.8 ZATCA | NOT-NOW | STILL NOT-NOW | `billing.module.ts`: only the pdfkit require fix. |
| 19.9 payment methods | MISSING | STILL MISSING | — |
| 19.10 app stores | MISSING | STILL MISSING | — |
| 19.11 insurance flow | FAIL | STILL FAIL | Scripts unchanged and still in no gate. Live runs are still impossible, but the cause changed: the backend now fails on `MediaService`/`UploadSecurityService`, not on `@nabd/i18n`. |
| 19.12 legal documents | MISSING | STILL MISSING | `legal.module.ts`: only `@StepUp()` added. `pendingAcceptances` is unchanged. |

Counts: unchanged 12 · changed 0 · now pass 0.

---

## Findings that are now false on a2de0b44

1. P13–P19 tip facts: "backend does not start because of `@nabd/i18n` (ERR_UNSUPPORTED_DIR_IMPORT)" and "… then `LogRetentionService` `AuditLogModel`". Both causes are gone; the start now fails on `MediaService` → `UploadSecurityService`.
2. "tsc --noEmit EXIT 0" (all reviews). It is now EXIT 2 with 37 spec errors.
3. "dtocheck 1 mismatch `POST /referrals/apply`" (P13–P16). Now 0 mismatches.
4. "oc-security 5 failed" → 3 failed (the correlation/audit test passes). "oc-ci 7 failed" → 3 failed.
5. "boot suites: 2 failed" → 3 failed (new: `f01-wallet`).
6. 13.R5 / 16.6: "in production every error becomes `SERVER_ERROR`". False (probe).
7. 13.R13 fix 4 / 16.12: "correlation middleware no longer reads/echoes `x-correlation-id`" and "`AuditService` listeners / `AuditController` / `TracingMiddleware` gone". Both are back.
8. 14.18 / 15.12: "six heavy-feature switches wired server-side and tested (mutation caught)". False now: 0 `isKilled` callers.
9. 14.4: "idempotency merged into one interceptor (mutation caught)". False now (reverted).
10. 14.20 / 16.5: "EXIF stripped on the base64 path (proven)". False now.
11. 14.23 / 16.1 / 16.7 / oc-ci: invented SHAs in `lighthouse.yml`, `security.yml` (gitleaks), `codeql.yml` and `live-gate.yml`. Now tag pins. supply-chain and zap are still invented.
12. 15.1: "patient-web client turns 401/404/409 into 503 in the BFF" and "provider-app reads `.access_token` off an AxiosResponse". Both false now (code reverted).
13. 15.3: "reminder alarms cancelled although the server refused the stop". False now.
14. 15.5 / 17.1: "web `error.tsx` reloads forever". False now. "Admin lockfile broken". False now (dry-run EXIT 0). "Browser Sentry release `…@dev+dev`". False now (no release is set).
15. 15.7: "S3 behind `storage:s3:put` breaker (mutation caught)" and breakers on mail/AI/LiveKit/WhatsApp. False now.
16. 15.10: "every real phone stays on a spinner forever". False now (the gate is unmounted). "provider-app passes Sentry `authToken` in app.config". False now.
17. 15.11: "one stray env var in production turns off every OTP SMS and LiveKit room control". False now (no consumer). The unguarded `chaos-switches.ts` itself stands.
18. 16.4: "nginx Permissions-Policy blocks camera/mic/geolocation (SOS)". False now (header removed, together with HSTS etc.).
19. 16.6: "daily retention job deletes audit rows older than 30 days". False now (service not provided). "`deleteOne` on the append-only log". Moot: the update hooks are gone too.
20. 16.12: "referral DTO requires deviceId/phone, so every apply is 400" and "raw phone stored". False now. "`orders.service.spec.ts` red (13)". False now (green). "`checkLoyaltyPointsExpiry` inside order creation". False now.
21. 17.1: "skip link and mobile menu render raw keys". Not rendered any more (unmounted). The keys are still missing.
22. 17.5: "web pharmacy orders with UTM and every manual request get 400 (`utm_data`)". False now.
23. 17.6: "UTM/click ids stored for 30 days without consent". False now (tracker unmounted).
24. 17.8 / 18.x: "`pnpm install --frozen-lockfile` fails (patchedDependencies hash)". False now.
25. 17.9: "login OTP keeps Arabic digits and sends them raw". False now; they are stripped instead. "`otp-screen.tsx` imports a deleted `otp-screen.module.css`". False now.
26. 17 regressions: "`design-system`, `premium-motion`, `self-hosted-fonts`, `metadata-indexing` (Tajawal), `auth-parity`, `login-form` tests red". All green now.
27. 18.1: "raw `pd.*` keys on the app product page in ar/en/ur/hi/bn" and "the validator says 100% and exits 0". Both false now.
28. 18.2: "patient-web `routing.ts` uses `DEFAULT_LOCALE` (`en`)" and "imports `@nabd/i18n` (TS2307 in `routing.ts`/`proxy.ts`)". False now; it is `defaultLocale: "ar"`, and only `lib/i18n/*` still has TS2307.
