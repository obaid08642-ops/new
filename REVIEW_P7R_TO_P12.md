# Review: R7, 7A–7F, 9, 10, 11 and the early Phase 12 work (reviewer, 2026-10-01)

**Scope:** `fix/audit-2026-09` at `e0a257c`, the 71 commits after the last review (`bbf401a`). They cover:
- R7-1..R7-8;
- 7A, 7B and 7C;
- part of 7E/7F, pushed as three large `fix(7E/7F)` commits;
- Phase 9 (F52), Phase 10 and Phase 11;
- the start of Phase 12.

Everything below was run by the reviewer on a fresh database. The agent's notes were not taken as evidence.

## Verdict
**Merged with reviewer fixes, so `main` stays green. Only R7, 7A and Phase 9 are accepted. 7B, 7C, 7E, 7F, 10, 11 and 12 are NOT complete:** see "FAIL — mandatory" below.

## The agent's claims that were not true
- **"Gate fully green, 3023/3045 backend, the 22 failures are environmental and pass individually."** False. At `e0a257c`, 10 tests failed every time, alone or in the suite:
  - **6 disk-alert tests:** the spec tests `backend/scripts/disk-alert.sh`, which was never committed.
  - **4 dispute refund-cap tests:** the spec describes a cap read from admin config, but the controller still used a fixed env constant.
- **"N8 recurring, N10 nudges and C6.4 AI referral tracking: done."** All three files are **registered in no module**: the endpoints do not exist and nothing runs. N10 also has:
  - a DTO with no validators, so every request is rejected;
  - a check on the legacy `orders` collection;
  - a cooldown based on events instead of sent nudges;
  - a queue with no processor.
- **"D2 deep links: `+native-intent.tsx`."** The file does not export `redirectSystemPath` (the function Expo Router calls), so the mapping never runs. 9 of its target routes do not exist in the app: `condition`, `doctors`, `home-nursing`, `pharmacies`, `labs`, `radiology`, `c`, `chat`.
- **"S16 importer: every field kept, dropped = 0."** The working importer (`backend/scripts/import-catalog-v14.ts`, which writes to `medicines`) was **deleted**. Its replacement `src/scripts/import-catalog-v14.ts` only maps rows and builds a report: it never writes. The "7/7 import spec" it cites is not in the repo.
- **"Still open: 7B-B5 needs a browser."** The browser exists here and in CI: the R7-1 click tests use it. That is a deferral, which AGENTS.md forbids.
- **The CI builds would have been red:**
  - patient-web's lockfile was regenerated with another pnpm version (patch hash changed), so CI's `pnpm install --frozen-lockfile` fails;
  - patient-app imports `packages/ui-native`, which needs `phosphor-react-native`, which the app did not declare, so `expo export` fails;
  - the CI mobile job never installed the design packages;
  - the live-gate job started the admin BFF without `ADMIN_GATE_TOKEN`, so every admin call through the panel returned `device_not_enrolled`.
- **`REVIEW_P10_P11.md` was written by the agent.** `REVIEW_*.md` files are reviewer verdicts. It is moved to `docs/audit/AGENT_NOTES_P10_P11.md`.

## Reviewer fixes in this merge (each verified)
| Item | Problem | Fix |
|---|---|---|
| R7-3 | `GET /labs/team/technicians` read `provider_accounts.facility_id`, which nothing writes for a lab. The real team is invited through `provider/operators` (`provider_operators`), so the list was **always empty**. The unit test passed only because it mocked the wrong collection. | Reads active `provider_operators` of the lab (and keeps the hospital `parent_provider_account_id` link); `$eq` on ids; new test for the operator flow. |
| R7-2 | Return photos were stored as **15-minute presigned URLs**, so the evidence was dead before an admin reviewed the return. | Stored as `media:<assetId>`, accepted only for media the patient owns; every reader (patient, provider, admin) gets a fresh signed URL. Raw URLs are rejected. App and `j_returns` updated: the journey downloads the stored image and checks it is a PNG. Unit tests added. |
| R7-7 | Templated pushes were always resolved in **Arabic**, whatever the user's language. There were no tests. | Uses the recipient's `locale`/`language` (6 locales, `tl` → `fil`). Tests: built-in text in the user's language, an admin template wins, Arabic fallback. |
| R7-6 | The states sweep was mechanical. 14 screens were wrapped in `ScreenState` with `error={null} empty={false}`. On submit-only screens (login, OTP, register, reset password, welcome, reviews, wearables, log meal) the **whole form turned into a skeleton while sending**; others were no-ops (`loading={false}`). | Wrapper removed from those 14 screens. Screens with a real initial load keep it. |
| 7B-B4 | The dispute refund cap ignored the admin setting (`system_configs.dispute_config`). | Read per request (admin value → env → 2000); the spec's admin object fixed (`role`, not `roles`). 4/4 tests pass. |
| Phase 10 | The disk alert at 80% did not exist; `monitor.sh` alerted at 85%. | `backend/scripts/disk-alert.sh` added (exit 1 at or above the threshold, 2 when it cannot check); `monitor.sh` alerts at 80%. 6/6 tests pass. |
| S16 regression | No working catalog importer. | `backend/scripts/import-catalog-v14.ts` restored from `main` (writes `CATALOG_COLLECTIONS.medicines`). |
| CI | See the claims above. | Restored the lockfile patch hash; added `phosphor-react-native` to patient-app; added a CI step that installs `packages/ui-native` and `packages/ui`; set `ADMIN_GATE_TOKEN` for the admin BFF in CI and in the handover guide. |
| Idempotency | The web account-erasure call had no idempotency key. | Added. `idemcheck` now reports 0. |

## Evidence (reviewer, on the merged tree)
- **Backend:** `tsc` 0; jest **3027/3027** (193 suites).
- **Apps:**
  - admin: `tsc` 0 + `next build`;
  - patient-web: `tsc` 0, vitest 412 passed;
  - patient-app: `tsc` 0, jest 139/139, `expo export` (all platforms) OK;
  - provider-app: `tsc` 0, jest 22/22.
- **Live gate on a fresh DB:**
  - P1: 370 admin/provider write routes tried with a patient token, 0 answered 2xx;
  - accounts 42/42, onboarding 113/113, pharmacy 144/144, lab 133/133, radiology 105/105, nursing 93/93, consultation, ambulance, facility 186/186, support 32/32, loyalty 104/104;
  - **admin click tests in Chromium 17/17**;
  - extra journeys: insurance 124/124, returns 118/118 (including the new photo-evidence steps), chat 74/74, admin ops 100/100.
- **Static checks:** dtocheck 0 mismatches (328 calls checked); idemcheck 0; schemadrift 0. **dtolint 12 violations** (FAIL item X1).

## Accepted
- **R7-1, R7-4, R7-5, R7-8:** done; proven by the gate and click tests above.
- **R7-2, R7-3, R7-6, R7-7:** accepted with the reviewer fixes above.
- **7A:**
  - the patient wallet routes and screens are gone, and `wallet`/`wallet_split` are rejected;
  - refunds go to the original method;
  - the loyalty cap and config are in place;
  - `j_returns` and `j_loyalty` are green.
- **Phase 9:**
  - F50 and F78 done; F51 splits done; F52 is Expo SDK 57, with `tsc` and tests green.

## FAIL — mandatory for the agent (do these before anything else, in this order: X0, X11, X12, then X1–X10)

**Added 2026-10-01 after this merge.** X0, X11 and X12 were found while researching the scale plan (`docs/perf/SCALE_ARCHITECTURE.md`). X0 is a live data leak in the production configuration and comes before everything else.
| # | Phase | Problem | Do |
|---|---|---|---|
| **X0** | **URGENT: private data served from a shared cache** | `CacheControlInterceptor` marks every GET under `/api/v1/medicines`, `/radiology`, `/lab-services`, `/care/services`, `/home-care/services`, `/service-catalog`, `/health` and `/articles` as `public, s-maxage=300`, including private routes:<br>• `radiology/bookings/mine`, `radiology/bookings/:id`, `radiology/bookings/:id/tracking` and `radiology/reports/mine`;<br>• `radiology/provider/inbox`, `radiology/admin/*` and `medicines/admin/*`;<br>• `medicines/me/recently-viewed` and `medicines/search/recent`.<br>The production Nginx (`deploy/nginx/conf.d/nabd.plus.conf`, api.nabd.plus) caches `^/api/v1/medicines` for 5 min and `^/api/v1/(lab-services\|radiology\|care/services)` for 15 min, with the key `$uri$is_args$args` and no bypass for `Authorization`.<br>**Reproduced** with that exact location block: anonymous → backend 401; patient A → Nginx 200 `MISS`; anonymous → Nginx **200 `HIT` with A's data**. | 1. Backend: the default for every response is `Cache-Control: private, no-store`. `public` is allowed only on routes explicitly marked with a new `@PublicCache(ttlSeconds, tags?)` decorator (only on `@Public()` read routes), and only when the request carries no `Authorization` header and no session cookie. Remove the URL-prefix lists.<br>2. Nginx: cache only an explicit allow-list of public locations, and in each one add `proxy_cache_bypass $http_authorization $cookie_access_token;` and `proxy_no_cache $http_authorization $cookie_access_token;` (use the real cookie names). Purge `/var/cache/nginx/api` on deploy.<br>3. Tests:<br>&nbsp;&nbsp;• a unit test on the interceptor/decorator;<br>&nbsp;&nbsp;• a CI job that runs `deploy/nginx` in Docker in front of the backend and calls **every authenticated GET** as patient A, then anonymously and as patient B. Each must get 401 or its own data, never A's.<br>4. Report in `AGENT_PROGRESS.md` which production routes were affected.<br>5. **Cloudflare (owner action, 2026-10-01):** the zone has Cache Rules "Eligible for cache" on `/api/v1/medicines`, `/api/v1/radiology`, `/api/v1/lab-services`, `/api/v1/care/services`, and on every patient-web page `/ar/ … /fil/`. These turn the same leak on at the edge, and the last one can cache personal pages (orders, profile, cart).<br>&nbsp;&nbsp;• Disable the medicines, radiology and patient-web rules now.<br>&nbsp;&nbsp;• Recreate them only in 14.9, for routes marked `@PublicCache`, with a bypass when the session cookie or `Authorization` is present. |
| **X11** | **The production cluster breaks process-local state** | Production runs one Node worker per CPU (`main.ts`, cluster mode on when `NODE_ENV=production`), but this state lives in one process:<br>• Socket.IO has **no Redis adapter**, so an emit from worker A never reaches a client connected to worker B (order status, chat, tracking, call signals);<br>• `realtime.gateway` keeps `connectedUsers`, `userSockets` and `doctorQueues` (the doctor waiting queue) in memory;<br>• `chat.gateway` keeps `activeUsers`;<br>• `notifications/sse.controller` keeps `subjects`;<br>• `step-up` keeps its token store (X3);<br>• `unified-bookings` keeps `writeBehindLocks`.<br>The live gate runs one process, so it never sees this. | • Add `@socket.io/redis-adapter` (or the Redis streams adapter).<br>• Move presence, doctor queues and step-up tokens to Redis; SSE over Redis pub/sub; locks with `SET NX PX`.<br>• Add a **cluster mode to the live gate** (`NODE_ENV=production CLUSTER_MODE=true CLUSTER_WORKERS=2`, run in CI), with journey steps that prove a realtime event, a chat message and a doctor-queue position reach a client connected to the other worker. |
| **X12** | **Queue durability** | One Redis (`deploy/redis/redis.conf`: 512 MB, `maxmemory-policy volatile-lru`) holds both the cache and BullMQ. BullMQ documents `noeviction` as the only safe policy: under memory pressure, queue keys with a TTL (locks, rate limiters) can be evicted. | • Two Redis roles in `deploy/`:<br>&nbsp;&nbsp;• queue Redis: `noeviction`, AOF `everysec`, a memory alert at 80%;<br>&nbsp;&nbsp;• cache Redis: `allkeys-lru`, no persistence.<br>• `REDIS_QUEUE_URL` and `REDIS_CACHE_URL` in the backend, falling back to `REDIS_URL` for local runs.<br>• Test: filling the cache Redis to its limit never touches queue keys. |
| X1 | DTO rules | dtolint shows 12 violations in new code: `@Body() body: any` in admin-config (dispute and orders-console config), insurance decide, and loyalty rewards/challenges/config; non-class bodies in admin-recovery (×2), step-up and payments `:567`. The gate requires `dtolint` exit 0. | Real DTO classes with validators for each. |
| X2 | 7C-C4 | Step-up is missing on most sensitive actions: admin refunds (`admin-orders :kind/:id/refund`, returns `adminDecide`, disputes `resolve`), payout approve/reject, commission config (`admin-finance commissions/config`, `legal admin/finance/commissions`), RBAC role and permission changes (`rbac/roles`, `rbac/users/:userId/roles`, `compat permissions`), and loyalty `config`. | Add `@StepUp()` to every one, with one test per action (without → 403, with → 2xx), as the plan says. |
| X3 | 7C-C4 | Step-up tokens live in a `Map` in one process. The production API runs one worker per CPU, so a token issued by one worker fails on another (`step_up_invalid` at random). | Store the token in Redis (TTL 120 s, single use with `GETDEL`), and add a test with two service instances. |
| X4 | 7C-C1/C2 | Any admin account with **no passkey** gets a full admin session from password + email code, and the BFF auto-enrolls that browser as a trusted device. The step-up guard also skips accounts with no passkey. So the passkey requirement is optional for any admin without one, which is exactly the account an attacker would target. | A bootstrap session (no passkey yet) may only call passkey enrollment and the device endpoints; every other admin route answers 403 `passkey_enrollment_required`. Enroll a device only after a passkey assertion, and bind it to that credential. Live-gate step: bootstrap session → command-center 403. |
| X5 | 7B | B2 drill-down is only one console link per tab, not per row with full history. B5 (iPhone width) has no test. There is no B4 inventory in the PR or docs. | Build B2 per row; add the 390×844 Playwright render over every admin page to `tools/live/web_render.mjs`; commit the B4 inventory (`docs/audit/7B_BUSINESS_VALUES.md`). |
| X6 | 7E | N8, N10 and C6.4 are dead code (see above). N1 not done: `usePushNotifications.ts` and `src/navigation/DeepLinking.ts` still exist and there is no single router. N3, N4, N6, N7, N9 and N11 are not done or only partly done. | Implement 7E task by task, **one commit per task** (`[7E.N1] …`), each with its Verify. Register every new service/controller in a module and prove it live (a journey step per task). |
| X7 | 7E-D2..D6 | `+native-intent.tsx` does not export `redirectSystemPath`; 9 targets do not exist. | Export `redirectSystemPath`; map only to existing routes and open the browser for the rest; add the table test over every sitemap URL pattern. |
| X8 | 7F | S16 is a mapper with no writer; the S13 and A5 scripts were never run against a DB; S1–S12, S14, S15, A1–A4, A6 and V1–V5 are not done. | Do 7F task by task. For S16, extend `backend/scripts/import-catalog-v14.ts` (the one that writes) instead of replacing it, and keep its tests. |
| X9 | 10 | No Tap adapter (the plan names Tap and Moyasar); no payment sandbox e2e (success, fail, refund) or account-deletion e2e in `tools/live` (Gate P10); F82 LCP still over budget. | Add the adapter behind `PAYMENT_PROVIDER`, the two journeys, and the F82 work. |
| X10 | Process | Phases were again done out of order (9, 10, 11 and 12 before 7B–7F were reviewed). 7E/7F were pushed as three mixed `fix(…)` commits. A `REVIEW_*` file was written by the agent. Results were claimed without real output. | Follow AGENTS.md: one phase at a time, one task per commit, real output pasted, never write `REVIEW_*` files. |

**Phase 12** is paused at its current state (A0, A1, A2, A3, A5, A6, A7 and A8–A10 tokens). Under the owner's decision of 2026-10-01 (plan, Phase 12):
- the implementer builds the stamps, **ported exactly from `docs/design/canvas/`**, with a pixel check against the canvas;
- the implementer then stops for review;
- screens are rebuilt only after the owner approves 12.C5 (`docs/ux/ia.md`).

Do not continue Phase 12 until X1–X10 are done.
