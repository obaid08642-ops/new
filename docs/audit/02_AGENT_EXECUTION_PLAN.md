# NABD PLUS — AGENT EXECUTION PLAN (v1.0 · 2026-09-23)
> Source of truth for findings: `01_FINAL_AUDIT_REPORT.md` (IDs F01–F74).
> This file tells the implementing agent EXACTLY what to build. Do not re-plan. Do not skip. Do not invent scope.

---

## 0. RULES FOR THE AGENT (read before anything)

1. **Branch:** work ONLY on `fix/audit-2026-09`, created from latest `main`. Never push to `main`.
2. **One task = one commit.** Message format: `[P<phase>.<task>] <F-id> <short description>`.
3. **Per-task loop (mandatory, in this order):**
   1. Implement exactly the "Do" list.
   2. **Self-review:** re-read the task, compare against your diff, fix anything missing.
   3. Run the task's **Verify** commands. All must pass.
   4. If anything fails → fix → re-run Verify. Do not proceed while red.
   5. Commit. Append a line to `AGENT_PROGRESS.md`: `task | commit sha | verify result | notes`.
4. **Per-phase gate:** at phase end, re-run ALL Verify commands of that phase + `pnpm/npm test` of touched projects + the audit harness scripts listed in the gate. Record output in `AGENT_PROGRESS.md`. Push the branch. **Stop and wait for review** before the next phase.
5. **Forbidden:** mock data, placeholder values, `// TODO` instead of implementation, fake success responses, disabling tests, `--no-verify`, `any` in new DTOs, deleting a test to make CI green.
6. **If a task is impossible** (missing secret, ambiguous spec) → write `BLOCKED: <reason>` in `AGENT_PROGRESS.md`, skip ONLY that task, continue.
7. **Test DB:** use a real MongoDB 7 replica set (docker `mongo:7 --replSet rs0`) — NOT FerretDB. Geo + transactions must work.
8. **Audit harness** (`nabd-audit-harness.zip`, extract to `tools/audit/`): `routes.py`, `sweep.py`, `wsweep.py`, `admin.py`, `clients.py`, `screenapi.py`, `classify.py`. Gates below reference them.

---

## PHASE 0 — Foundation (must be green before any fix)

**P0.1 Rotate secrets** — BLOCKED for agent; owner does it. Agent only: add `gitleaks` step to CI (`.github/workflows/security.yml`) scanning full history; fail on findings.

**P0.2 Backend deps (F61)**
- Do: in `backend/package.json` align ALL `@nestjs/*` on **NestJS 11** (NestJS 12 is ESM-only and breaks Jest). Regenerate the lockfile **with npm 10** (the npm bundled with Node 20/22 used by Docker/CI).
- (Done by reviewer in REVIEW_P0: cqrs 11.0.3, terminus 11.1.1, platform-fastify 11.2.1.)
- Verify: `cd backend && rm -rf node_modules && npm ci && npx tsc --noEmit && npx nest build` → exit 0 without `--legacy-peer-deps`.

**P0.3 Web lockfile (F61)**
- Do: delete `patient-web/package-lock.json`; keep `pnpm-lock.yaml` (pnpm 10.4.1). Change every CI job touching patient-web (incl. Lighthouse workflow) to `corepack enable && pnpm install --frozen-lockfile`. Same for `admin/` (pick npm, delete `pnpm-lock.yaml` there).
- Verify: `cd patient-web && pnpm install --frozen-lockfile && pnpm check` exit 0.

**P0.4 Failing web tests (F62)**
- Do: `tests/login-design.test.ts`, `tests/articles-design.test.ts` → update expectations to the current token names in the CSS modules (do NOT weaken assertions; assert the real token vars used). `app/[locale]/consultations/specialties/specialties-ssr.test.ts` → mock `next-intl` translator with a `raw` method.
- Verify: `pnpm test` → 0 failed.

**P0.5 Boot must not crash without payment keys (F58)**
- Do: `backend/src/modules/payments/payments.module.ts` — `selectAdapter()` returns a `DisabledGatewayAdapter` (every method throws `ServiceUnavailableException('payment_gateway_not_configured')`) instead of throwing at construction. Log a single warning at boot.
- Verify: start backend with NO payment env → `/api/v1/health/liveness` = 200; `POST /payments/...` = 503 with that code.

**P0.6 Non-blocking seeds (F59)**
- Do: `location.service.ts` `onModuleInit`: run seeding in background (`setImmediate`), and change every `$set` upsert to `$setOnInsert` (never overwrite admin edits). Same pattern for `catalogs-seed`, `home-care`, `radiology`, `doctors` seeds.
- Verify: boot time to first 200 on liveness < 30 s on fresh DB; edit a location via admin, restart, value persists.

**P0.7 Fix seed chain abort**
- Do: `seed.service.ts` — wrap EACH seed step in its own try/catch so one failure doesn't abort the rest. Fix `seedFacilities` "slug not in schema" by adding `slug` to the facility schema OR removing it from the filter.
- Verify: fresh boot logs zero `Seed failed`; DB has lab (≥26) and radiology (≥21) catalog docs. Note: public `/labs/services` stays empty until an admin approves items (`medical_review_status='approved'`, `public_eligibility=true`) — by design; Phase 6 must provide that approval UI.

**Gate P0:** CI green on all 5 projects; `sweep.py - anon` runs without backend crash.

---

## PHASE 1 — Security: Broken Access Control (HIGHEST PRIORITY)

**P1.1 Deny-by-default guard**
- Do: create `backend/src/common/write-guard.ts`: a global guard that, for POST/PUT/PATCH/DELETE, rejects (403 `role_declaration_missing`) any handler lacking `@Roles`, `@RequirePermissions`, or an explicit `@Public()`/`@SelfService()` decorator. Add `@SelfService()` decorator for endpoints where the actor acts on their own resources (patient creating own order, etc.).
- Then go through every write route (list from `tools/audit/routes.py` live output) and add the correct decorator. Rule: admin/config/catalog/finance/kill-switch/surge/seed → `@Roles(ADMIN)`; provider ops → `@Roles(provider types)` + ownership check; patient own data → `@SelfService()` + ownership check.
- Verify: `python3 tools/audit/wsweep.py <patient_token> patient '^/(?!admin)'` → every route in F01–F08 returns 403.

**P1.2 Fix specific holes** (each = one commit, each with an e2e test in `backend/test/security/`):
| Task | Endpoint | File | Required decorator |
|---|---|---|---|
| F01 | `/nabd-extensions/wallet/credit`,`/debit` | `nabd-extensions.controller.ts:30` | `@Roles(ADMIN)` + audit log entry |
| F02 | `/kill-switches/:key` | `admin-governance.module.ts:244` | `@Roles(ADMIN)` |
| F03 | `/business-rules/config/surge` | `business-rules.module.ts:175` | `@Roles(ADMIN)` |
| F04 | `/pharmacy/broadcast/respond` | `nabd-extensions.controller.ts:152` | `@Roles(PHARMACY)` + verify pharmacy is a target of that broadcast; REMOVE the fake "log & return success" body and delegate to the canonical offer service |
| F05 | `/labs/samples/barcode-verify` | `nabd-extensions.controller.ts:163` | `@Roles(LAB)` + booking ownership; REMOVE fake body, implement real bind |
| F06 | `/provider/ops/doctor/*` | `provider-ops.module.ts:662` | `@Roles(DOCTOR)` + ownership |
| F07 | `/provider/insurance-matrix`,`/working-hours`,`/settings/pricing` | provider controllers | provider roles + ownership |
| F08 | `/service-catalog/admin/:type/:id/approve` | service-catalog module | `@Roles(ADMIN)` |
- Test for each: patient token → 403; correct role + own resource → 2xx; correct role + other's resource → 403.

**P1.3 Session revocation on ban/suspend (F09)**
- Do: add `token_version` (int) to users and provider_accounts. JWT carries `tv`. `JwtAuthGuard` rejects if `tv !== current`. Increment on ban, suspend, password change, role change. Also make `/provider/auth/login` reject suspended accounts with 403 `account_suspended`.
- Verify: ban user → old token → 401 on any endpoint. Suspend provider → login → 403 `account_suspended`.

**P1.4 super_admin hierarchy (F44)**
- Do: delete `admin-web-core/guards/roles.guard.ts` `RolesGuard`; re-export the hierarchical check from `common/auth.guard.ts` (`roleSatisfies`) and register only that one as APP_GUARD.
- Verify: super_admin token → `GET /medicines/admin/catalog`, `/chat/admin/threads`, `/ai/admin/gateway`, `/finance/commissions` = 200.

**P1.5 Remove production seeders (F17)**
- Do: `POST /providers/admin/seed-demo`, `/admin/pharmacy/seed`, `/admin/pharmacy/seed/sample-order` → register only when `NODE_ENV==='test' && ALLOW_TEST_SEED==='true'`. Write migration `scripts/migrations/2026-09-purge-demo.ts`: soft-delete records with `user_id ^system-seed-`, `approved_by: 'system-seed'`, emails `@test.com`; print counts; `--dry-run` default.
- Verify: in production mode routes return 404; dry-run prints counts.

**P1.6 Prescription provenance (F19)**
- Do: add `PrescriptionState.UPLOADED_BY_PATIENT`. `uploadByPatient` uses it. Pharmacy flow must require a pharmacist verification step (`VERIFIED_BY_PHARMACIST`) before Rx items are fulfillable. Translate states in web/app UI (no raw enum shown — F32).
- Verify: patient upload → state `UPLOADED_BY_PATIENT`; Rx-required item cannot reach checkout until verified.

**P1.7 Phone OTP delivery (F34)**
- Do: `auth.service.ts` OTP send: if identifier is a phone → send via `SmsService.sendOtp` (Taqnyat) when `SMS_ENABLED=true`; also push; email only if user has email. If no channel available → 503 `otp_channel_unavailable` (not silent success). Registration (`/auth/register`, F63) must require verified OTP before issuing tokens.
- Verify: unit tests for channel selection; register without OTP → 400 `otp_required`.

**P1.8 Admin Next.js upgrade (F54)**
- Do: `admin/package.json` next → `16.3.6`+, run `npm audit fix`; rebuild.
- Verify: `npm audit --omit=dev` → 0 critical, 0 high.

**Gate P1:** `wsweep.py` with patient token → zero admin/provider write route returns 2xx. All security e2e tests green.

---

## PHASE 2 — Provider identity (fixes provider app end-to-end) — F10, F11, F12

**P2.1 Single provider identity**
- Do: canonical model = `users` (login identity, `role` = provider type) 1:1 `provider_accounts` (business record) with `provider_accounts.user_id = users.id` (SAME id, never a new uuid). In `provider-onboarding.module.ts` submit mirror (lines ~338–371): set `user_id: user.id` and `id: user.id` (or keep own id but ALWAYS store `user_id`). All lookups `findOne({user_id: user.id})`.
- Migration `scripts/migrations/2026-09-link-provider-accounts.ts`: for each provider_account, find user by phone/email, set `user_id`; report orphans.
- Verify: after migration, `db.provider_accounts.countDocuments({user_id:{$exists:false}})` = 0.

**P2.2 Role flip on approval**
- Do: admin `approve` (`provider-admin.service.ts:130`) sets `users.role = <provider_type>` and bumps `token_version`. `reject`/`suspend` keep role but set account status; `reactivate` (NEW endpoint `POST /admin/providers/:id/reactivate`) restores `approved`, bumps token_version, and also restores `provider_profiles` visibility flags (reuse logic from `admin.controller.ts` unban).
- Verify e2e: onboarding start→step2→step3→submit→admin approve→`/provider/auth/login`→`/provider/me`=200, `/provider/kyc/documents`=200, `/provider/profile/availability`=200 (doctor). Suspend→login 403. Reactivate→login 200.

**P2.3 One login path in provider app (F11)**
- Do: `provider-app/src/api/provider.ts:30` → use `/provider/auth/login`. `PendingDashboard.tsx:34,47` → use `/provider/auth/send-otp` / `verify-email`. Remove any `/auth/login` use in provider-app.
- Verify: `grep -rn "'/auth/login'" provider-app/src` → 0.

**P2.4 KYC null-safety**
- Do: `provider-profile.service.ts:126-127` — if account missing → 404 `provider_account_not_found` (never 500).
- Verify: guest token → 404, provider → 200.

**P2.5 Admin UI: provider actions (F80)**
- Do: `admin/src/pages/admin/users-management.tsx` provider file panel: add "إعادة تفعيل" button calling `/admin/providers/:id/reactivate` when status is `suspended`. Users-page "Reactivate" for a provider user must call the provider endpoint, not only `/unban`.
- Verify: manual + Playwright: suspend → button appears → click → status `approved`.

**Gate P2:** provider journey e2e test (pharmacy + doctor + lab + nurse) green in `backend/test/journeys/provider-onboarding.e2e.ts`.

---

## PHASE 3 — Input validation & error hygiene — F13, F14, F15

**P3.1 DTOs for every write endpoint**
- Do: for each `@Body() body: any` (445), create a DTO with `class-validator` (`@IsString`, `@IsNumber`, `@IsIn`, `@IsOptional`, …) matching EXACTLY the fields the admin/app/web send today (use `tools/audit/adminbody.py` output + frontend code as source). Global `ValidationPipe` already has `whitelist + forbidNonWhitelisted`.
- Order: admin catalogs → finance → users/providers → labs/radiology/nursing → pharmacy → community/family → rest.
- Verify: `wsweep.py` with admin & patient tokens and `{}` body → **zero 500**; all become 400 with a field-level message.

**P3.2 ID type consistency (F14)**
- Do: create `common/find-by-id.ts`: `findByAnyId(model, id)` → if `isValidObjectId(id)` query `_id`, else query `id`. Replace all 32 `findById*` and 33 `new Types.ObjectId(` usages on user-supplied ids.
- Verify: `classify.py` after wsweep → zero `Cast to ObjectId failed`.

**P3.3 Mass-assignment (F15)**
- Do: `labs.service.ts:489`, `radiology.service.ts:461`, `home-care.service.ts:145` → `$set: pick(dto, ALLOWED_FIELDS)`.
- Verify: unit test: sending `{id:'x', _id:'y', price:1}` changes only price.

**P3.4 Plain `throw new Error` → HttpException**
- Do: replace `throw new Error('order_not_found')` style with `NotFoundException`/`BadRequestException` across modules (grep `throw new Error\('`).
- Verify: grep count of `throw new Error('` in `modules/**/!(*.spec).ts` for request paths = 0.

**Gate P3:** `wsweep.py` admin+patient+provider → 0 × 500 (on real Mongo).

---

## PHASE 4 — Remove fake/static data — F16–F23, F45

| Task | Do | Verify |
|---|---|---|
| F16 | `seed.facilities.ts`: remove `rating`,`reviews_count`; set `status:'reference'`,`public_eligibility:false`. Migration: unset rating/reviews on those docs. | public facility API returns no rating for them |
| F18 | `auto-entity-seo-pipeline.service.ts:284-299`: omit `aggregateRating` when count=0; omit specialty/city when unknown. Import shared builder from one place (see P7.2). | JSON-LD test: no `reviewCount:1` |
| F20 | Hide wearables entry points (`health/wearables.tsx`, `wearables/hub.tsx`, any nav link) behind feature flag `wearables_enabled=false` until real HealthKit/Health Connect integration. | screen not reachable |
| F21 | AI endpoints: when no provider key → `ServiceUnavailableException('ai_provider_unavailable')`. Never 201 with empty result. Catch provider errors → 502 `ai_upstream_error`. | call without key → 503 |
| F22/F81 | provider-app: replace `SPECIALTIES`,`LAB_TESTS`,`NURSING_SVCS`,`INSURANCE` usages (11+6+4+3 files) with hooks calling `/catalogs/specialties`, `/labs/services`, `/nursing/catalog`, `/insurance/companies`. Delete the constants. Delete unused patient-app constants (`INSURANCE_COMPANIES`, `SPECIALTIES`, `MEDICINE_CATEGORIES`, `LAB_CATEGORIES`, `NURSING_SERVICES`). | grep → 0 usages |
| F23 | returns timeline from `order.status_history`; cancellation policy + loyalty tiers from `/system-config` & `/loyalty/config`; llms.txt count from DB. | no literal numbers in those files |
| F45 | `admin-config.controller.ts`: GET/PUT `sla` read/write `system_config` doc `key:'sla'`, with DTO + audit log. | PUT then GET returns new value; restart persists |

**Gate P4:** fabrication test (`fabsweep.py`) on EMPTY DB → no non-zero metrics; `grep -rniE "mock|dummy|lorem|fake" --include=*.ts* src app` (excluding tests) → 0.

---

## PHASE 5 — Single source of truth for catalogs & data — F39, F40, F43, F49, F12

**P5.1 Catalog unification (owner request)**
- Canonical collections (ONE each): `medicines`, `lab_services` (incl. packages via `is_package`), `radiology_services`, `nursing_services`, `insurance_companies` (+ embedded `networks`, `classes`), `specialties`.
- Do: every reader (admin, patient-app, patient-web, provider-app, SEO, MCP) reads ONLY these via `/catalogs/*` endpoints. Delete static JSON fallbacks in `backend/src/constants/catalogs/*.json` after migrating content into DB seeds (insert-only). Provider-specific price/availability lives in `provider_offerings {provider_id, catalog_type, catalog_id, price, available}` — never a copy of the catalog item.
- Verify: change a lab test name in admin → appears in patient app, web, provider app within one request (no cache > 60s).

**P5.2 Collection de-duplication**
- Do (migrations with dry-run + counts): `pharmacy_orders`→`orders` (or reverse—pick the one used by canonical flow, keep the other read-only then drop); `doctor_appointments`→`appointments`; `labcenterbookings`→`labbookings`; `radiologycenterbookings`→`radiologybookings`; `providerdeltas`→`provider_deltas`; audits → one `audit_logs`; notifications → one; chats → one. Update schemas/modules accordingly.
- Verify: `db.getCollectionNames()` has no duplicates; all e2e journeys green.

**P5.3 Module consolidation**
- Merge: `providers`→`provider`; `notification`→`notifications`; `seo`→`seo-search`; `home-care-compat`→`home-care`; `pharmacy_ops`→`pharmacy`; `booking-flow`+`booking-ops`→`unified-bookings`; `admin-*` → `admin` submodules. Delete `legacy`, `compat` after moving any live route (keep 301/alias for one release).
- Delete dead controllers (F38): `paymob.controller.ts` (keep service only if used), `care/doctor-integration.controller.ts`, `tour.controller.ts`, `insurance/insurance.controller.ts`.
- Nursing: single booking API `/nursing/bookings`; `/home-care/bookings` becomes alias → remove next release (F43).
- Provider-delta approval: ONE implementation in `provider` module (F49).
- Verify: `routes.py` live count drops; no route 404 that any client calls (`admin.py`, `clients.py` → 0 NO_PATH).

**P5.4 Auth endpoints (F41)** — keep `otp/request`, `otp/verify`, `password/reset`; old names become aliases logging deprecation.

**Gate P5:** full e2e suite green; contract scripts 0 mismatches.

---

## PHASE 6 — Admin dashboard completion — F46, F47, F48, + additions

| Task | Do | Verify |
|---|---|---|
| F46 | Implement admin nursing ops (list/assign/reassign/cancel) on canonical `/nursing/bookings`; remove 503 stubs. | assign flow e2e |
| F47 | `command-center.tsx`, `provider-moderation.tsx`: replace polling loops with one fetch + 30s interval with `AbortController`; stop on unmount. | page reaches network-idle < 10s |
| F48 | `security.tsx`: call `/auth/passkey/eligibility`; hide passkey section when not eligible. | no 403 shown |
| BFF | `admin/src/pages/api/admin/[...path].ts`: replace hand-written rewrite rules with 1:1 mapping `/api/admin/<x>` → `${ADMIN_BACKEND_URL}/api/v1/<x>`; update all admin callers to real backend paths. Add refresh flow: on 401 use `admin_refresh` cookie → `/auth/refresh` → retry once. | session survives > 1h; `admin.py` 0 mismatches |
| Online | Implement `POST /api/auth/heartbeat` in patient-web (F30) proxying to backend presence. | admin "online" count > 0 during test |

**P6.0 Catalog medical-review approval UI:** admin can approve/reject catalog items (labs, radiology, nursing, packages, medicines) setting `medical_review_status` + `public_eligibility`, with bulk approve and audit log. Verify: approve → item appears in public `/labs/services`.

**P6.x Admin additions (owner request — APPROVED, build all):**
1. `/admin/reports`: revenue, orders, bookings by service/city/provider/day; charts (recharts); CSV/XLSX export. Backend: `GET /admin/reports/{revenue,orders,bookings,providers,patients}?from&to&group_by`.
2. Unified catalog manager (one page, tabs: medicines, labs, packages, radiology, nursing, insurance+networks+classes, specialties) with image upload, price history, bulk CSV import, activate/deactivate.
3. Unified audit log viewer (filter by actor/entity/action/date).
4. Commission & copay config per service & per provider.
5. Live ops: active orders map, SOS queue with 997 escalation button, 5xx rate, queue health (BullMQ).
6. AI medical content review queue (approve/reject before publish).
7. Notification templates (6 languages, preview, test send).
8. Provider lifecycle page: pending → approved → suspended → reactivated, with reasons and history.
9. Admin KPIs dashboard (home): today/7d/30d cards + charts for GMV, orders, bookings, new patients, new providers, cancellations, refunds, avg response time of providers, SLA breaches — all from live aggregates, no constants.
10. Reports per module: pharmacy (orders by status, fill rate, partial fills, avg quote time), consultations (by specialty/type, no-shows), labs/radiology (turnaround time), nursing (visits, cancellations), insurance (decisions full/partial/reject, copay collected), finance (commissions, payouts, refunds), users (growth, retention cohorts). Each: filters (date, city, provider, service) + chart + table + CSV/XLSX export.
11. Global search in admin (users, providers, orders, bookings by id/phone/name).
12. Role & permission manager for admin staff (RBAC editor) with per-screen permissions and audit.
13. Content control: banners/home sections, articles, FAQs, legal pages, app force-update version, maintenance mode per app.
14. Pricing controls: delivery fees, service fees, surge rules (admin-only), coupons/offers with usage caps.
15. Complaints & disputes center: patient ↔ provider disputes, refund decisions, SLA timers.
- Verify each: Playwright test clicks every button on the page and asserts backend state changed (see Phase 10 harness).

**Gate P6:** `adminshot.py` over all admin pages → 0 console errors, 0 4xx/5xx (except intended 403 for lower roles).

---

## PHASE 7 — API contracts, notifications, deep links, SEO — F24–F37

| Task | Do | Verify |
|---|---|---|
| F24 | `patient-app/app/ai-assistant.tsx:49` → `/ai/triage`. | `clients.py` 0 NO_PATH |
| F25 | `patient-web/app/api/insurance/requests/[requestId]/payment-capabilities/route.ts:21` → `/insurance/requests/:id/capabilities`. | copay pay flow e2e |
| F26 | `provider-app/.../BlueprintScreens.tsx:856` → `/nursing/notes`. | save note works |
| F27 | Generate `openapi.json` from Nest Swagger at build; delete hand-written paths. | every path resolves |
| F28 | facility back link → `/consultations`. | no 404 |
| F29 | `patient-web/app/[locale]/medicines/page.tsx`: remove `requirePatientAccess`; public SSR; personalize client-side only. Same audit for all public entity pages (doctor, pharmacy, lab, radiology, service, condition). | anonymous GET → 200 with product content; Google Rich Results test passes |
| F31 | Single SEO source: backend serves data, web renders sitemap/robots/llms.txt; remove backend duplicates. | one sitemap index |
| F33 | `notifications.service.ts:65` jobId → `deliver-${id}`. | queue processes jobs; retry on failure |
| F35 | AASA/assetlinks: require `APPLE_TEAM_ID`, `ANDROID_SHA256_FINGERPRINT` envs — **remove fallbacks**; route returns 503 if missing. | BLOCKED until owner provides values |
| F36 | `patient-app/app.json` intentFilters: explicit `pathPrefix` list = same list as AASA `entityPaths`. | links outside list open in browser |
| F37 | Calls: when LiveKit env missing → hide call buttons in apps (feature flag from `/config/features`). | no dead call button |
| F32 | Remove developer-facing strings from web UI; translate all state enums (ar/en/ur/hi/tl/bn). | grep checks + visual |

**Gate P7:** `clients.py` + `admin.py` → 0 mismatches; `webauth.sh` crawl → 0 console errors, 0 404 on internal links.

---

## PHASE 7A — Owner scope change (2026-09-27): no patient wallet, loyalty limits — Task A

Owner decision. Do it after Gate P7, before Phase 8. Where this conflicts with older tasks or with `docs/audit/03_LIVE_JOURNEY_FINDINGS.md`, this phase wins (see the notes).

| Task | Do | Verify |
|---|---|---|
| A1 | **Remove the patient money wallet.** Remove every patient-wallet route and UI: `/wallet/*` topup, transfer, balance, transactions and saved cards for patients; the `wallet` and `wallet_split` payment methods (capabilities, intents, checkout pickers); admin credit/debit on patient wallets; all wallet screens and entries in patient-app (`app/wallet/*`, menus, checkout) and patient-web. **Keep** the provider earnings ledgers (`platformledgerentries`, provider wallet/payouts). | `grep` shows no patient wallet route or screen; payment capabilities never list `wallet`/`wallet_split`; provider balance/payout journeys still green |
| A2 | **Refunds go to the original payment method only.** Card: Moyasar refund. Cash: a ledger record (`refund`, method `cash`, who and when) and **no wallet credit**. Keep the admin approval flow and the maker-checker for large refunds. `RefundExecutor` loses its wallet branch. | Refund of a card payment → Moyasar refund + ledger; refund of a cash order → ledger row `method: cash`, no `wallets`/`wallet_transactions` write; a large refund needs a second admin |
| A3 | **Migration** `scripts/migrations/<date>-patient-wallet-report.ts`, dry-run by default and report only: patients with a non-zero wallet balance (count, total, per-patient id + balance, no PII beyond ids). Deletes nothing; the owner decides what happens next. | Dry-run prints the report; no `--apply` path that deletes |
| A4 | **Loyalty redemption cap.** Points are redeemed only as an order discount. Default `max_redeem_percent = 10`. The cap is computed on the **server's** order total, never a client value. | A client that sends a higher discount or a fake total gets the capped discount; unit test on the cap |
| A5 | **Loyalty fully configurable in the admin UI:** `max_redeem_percent`, `point_value_sar`, `redeem_enabled`, every per-activity earning value, and daily/monthly caps on non-purchase earning (reviews, vitals, referrals…). Every change is written to the audit log (who, old → new, when). No hardcoded loyalty values left in code. | Change each value in the admin UI → the next earn/redeem uses it; audit log shows each change; caps stop earning past the limit |

**Notes:**
- A2 supersedes `03_LIVE_JOURNEY_FINDINGS.md` LJ-05 item 4 and the reviewer's interim fix that made `RefundExecutor` create a wallet. Drop that branch.
- A5 supersedes LJ-08 item 2. The rest of LJ-08 (rewards/challenges admin, wishlist add) stays open unless the owner removes it.

**Gate P7A:** journeys `j_returns` (card + cash refunds, no wallet), `j_loyalty` (earn, redeem within the cap, config change audited) and the payment capability checks are green; the migration dry-run output is attached to the PR.

---

## PHASE 7B — Admin reports, live monitoring, full control — Task B

| Task | Do | Verify |
|---|---|---|
| B1 | **Reports for every domain**, filterable by date range and exportable as CSV: patients; providers (by type); orders/bookings (all 5 domains); payments; refunds; commissions and VAT; payouts; loyalty (earned, redeemed, discount value, top earners); insurance; disputes; admin actions (audit log). Server-side aggregation and pagination. The CSV comes from the same query as the screen. | Each report matches a seeded dataset; the CSV row count equals the on-screen total for the same filter |
| B2 | **Drill-down everywhere:** from any report row open the patient, provider or order and see its full history (state history, payments, refunds, chat/support links, audit entries). | Click-through from each report reaches the detail with its full history |
| B3 | **Live monitoring dashboard:** who is online now (patients and providers), live orders/bookings with status, who is requesting what, provider availability, and alerts on stuck orders and payment failures. Realtime (existing gateway) with polling fallback. | Create a booking/order in a journey → it appears live; a stuck order past the threshold raises an alert; a failed payment raises an alert |
| B4 | **No hardcoded business values:** move every business setting (commissions, VAT, settlement delays, payout minimum, SLA/stuck thresholds, refund windows and percentages, delivery fees, loyalty (see A5), feature flags) into admin-editable config, validated and audited. Include a `grep` inventory in the PR of each value that was moved. | Changing each setting in the admin UI changes behavior without a deploy; audit log entry per change |
| B5 | **Admin UI fully responsive and usable on an iPhone screen** (tables become cards or scroll correctly, actions reachable, no horizontal page scroll). | Playwright at 390×844 over every admin page: no horizontal overflow, primary actions visible (extend `tools/live/web_render.mjs`) |

**Gate P7B:** every B1 report plus its CSV is verified against seeded data; the B5 mobile render test passes; the B4 inventory is attached.

---

## PHASE 7C — Admin hardening, owner-only control — Task C

| Task | Do | Verify |
|---|---|---|
| C1 | **Passkey/WebAuthn required for admin roles, in addition to the password.** Platform authenticators: the owner's MacBook (Touch ID) and iPhone (Face/Touch ID). Only registered credentials are accepted. Registering a **new** credential requires an existing passkey **plus** an email confirmation. Build on the existing `auth/passkey.service.ts` (today limited to one designated email). | Login with password only → 403; with an unregistered passkey → 403; registering a new passkey without an existing one → 403 |
| C2 | **Admin device allow-list:** the owner's MacBook, the owner's iPhone, and one offline backup hardware key (break-glass). Any other device is rejected at login **and on every admin API call** (server-side check bound to the passkey credential/device record, not a client header alone). | An admin API call from an unregistered device → 403 (test) |
| C3 | **Network gate** in front of the admin UI and every `/admin/*` API: Cloudflare Access (device posture/identity) or an mTLS client certificate held only by the owner's devices. Write `docs/deploy/ADMIN_NETWORK_GATE.md` with step-by-step setup for the owner (both options, recommended one first). The backend also rejects `/admin/*` that did not come through the gate (header/cert check). | Request to `/admin/*` without the gate credential → blocked at the edge and 403 at the backend |
| C4 | **Step-up re-authentication** (a fresh passkey assertion, Touch/Face ID) for sensitive actions: refunds, payouts, financial and loyalty config, role/permission changes, deletions. Short-lived step-up token bound to the action. | Each sensitive action without step-up → 403 (test per action); with step-up → 2xx |
| C5 | **Admin session idle timeout 15 minutes**; **instant alert** (email + push to the owner) on every admin login and on every failed admin login attempt (with device, IP and time). | Idle 15 min → next call 401; login and failed attempt each produce an alert (smtp sink in tests) |
| C6 | **Recovery:** 10 single-use printed recovery codes, stored hashed. A recovery code can restore access only together with an email code. **An email code alone never grants access.** Regenerating the codes requires step-up. | Recovery code + email code → access; email code alone → 403; a used code → 403 |
| C7 | **Tests (required):** unregistered device → 403; no passkey → 403; sensitive action without step-up → 403; email-only recovery → 403. Add them to the backend e2e tests and to the live gate. | Tests green in CI |
| C8 | Write **`docs/SECURITY_OWNER_CHECKLIST.md`**: 2FA on GitHub, the hosting provider, the database provider, the domain/DNS registrar and the email account; **2FA on the Apple ID (passkeys sync through iCloud)**; SSH keys only (no passwords); the break-glass key and the printed recovery codes stored offline; who to call if a device is lost. | File present and reviewed by the owner |

**Gate P7C:** C7 tests green; the owner confirms the network gate and passkeys on their MacBook and iPhone; the checklist has been delivered.

---

## PHASE 7D — Focused security review (after 7A–7C are merged)

| Task | Do | Verify |
|---|---|---|
| S1 | Reviewer-led security review of payments, refunds, loyalty (earn/redeem/caps), payouts and admin access (passkeys, device allow-list, network gate, step-up, recovery). Threat-model each flow; try client-controlled amounts, replay, IDOR, race conditions and privilege escalation. The implementer fixes the findings. | Written review with findings and fixes; the live gate is extended with the new negative tests |

---

## PHASE 7E — Engagement: notifications and deep links (reviewer audit 2026-09-29)

Evidence and what the reviewer already fixed: `docs/audit/04_DISCOVERY_ENGAGEMENT_AUDIT.md`. Order: after R7-1..R7-8 and 7A–7D, then 7E, then 7F.

These items were checked against the rest of this plan. Only work that no other phase covers is listed. Where an item extends an existing task, that task is named. Every "Verify" must be a test or a live-harness step, not a claim.

**N: Notifications**

| Task | Do | Verify |
|---|---|---|
| N1 | patient-app: **one** tap router for push data (cold start + warm). Map every backend `type`/`screen` to a real app route, with the id in the param the screen reads: order/lab/radiology/nursing/consultation `service.*`, booking, payment, payment_failed, report, emergency, call_missed, chat (`thread_id`), prescription (id), insurance, refund, loyalty, campaign. Use `translateBackendRoute` for backend routes. Remove the dead `usePushNotifications.ts` router and `src/navigation/DeepLinking.ts`. Remove routes that don't exist (`/wallet/hub`, `/loyalty`). | Unit test: each type → route + params; every route file exists |
| N2 | provider-app: tap routing (cold + warm) and bell-item navigation (`related_type`/`related_id` → job/order/booking/chat/payout screen). Add a NavigationContainer `linking` config. | Unit test on the mapping; e2e: new booking push → job screen |
| N3 | One provider inbox: every provider-facing notice goes through `notifyProviderAccount` (push + bell). Covers: doctor new appointment, pharmacy allocation/broadcast, payout approved/paid/rejected, inventory expiry, KYC/bank/approval, radiology doctor notify, lab technician assigned. Replace role-topic sends (`n.role`), which no device subscribes to, with per-account sends. | Live journey: each event → a `provider_notifications` row + push attempt for the right account |
| N4 | Wire the dead events (listed in the audit): `patient.notify` (radiology prep, nursing), `doctor.notify`, `medication.missed`, `call.missed`, `report.ready`, `refund.requested`/`decided`/`execution_failed`, lab reassigned/cancelled, radiology rescheduled/scan_aborted, insurance resubmitted/appeal/copay paid, `pharmacy.bid_*`, `emergency.resolved`, `provider.approved`. Ambulance: give the patient dispatch/ETA/arrived/resolved notices. | One test per event → notification created for the right user |
| N5 | Hygiene: email sent twice; `payment.completed` and chat pushed twice; missing i18n keys (`notif.service.*`, `pharmacy.*`) show raw keys; direct `collection('notifications').insertOne` writers skip delivery (route them through `create()`); compat direct send stores no `title_key`, so the title is blank. | Unit tests; i18n key-coverage test (every key used exists in 6 locales) |
| N6 | Respect user notification settings, quiet hours and a per-user frequency cap in `deliverById` and `PushService` (transactional notices bypass quiet hours). | Tests: opted-out category → no push; quiet hours → deferred |
| N7 | **Do together with R7-7** (templates for push). Admin campaigns: also write an in-app inbox row; localize to the user's language (template per locale); optional email/WhatsApp channel. Targeting: saved segments in the UI (`segment:<id>`), user-id list / CSV upload, city, language, last activity, orders/bookings history, health-interest opt-ins (chronic, pregnancy). Age/gender only if collected with consent. Deep link: pick from real routes, validated server-side. | Live: campaign to a saved segment → inbox rows + pushes for exactly that segment |
| N8 | Automatic notifications, each admin-configurable (enable/disable, timing, template text):<br>• appointment reminders 24h + 1h for consultation, lab, radiology and nursing;<br>• server-side medication-reminder backup and refill reminders from dispensed quantity;<br>• maternity weekly tips;<br>• re-engagement after 14/30 days inactive;<br>• abandoned cart (fix: uses the legacy `orders`);<br>• prescription renewal.<br>Either execute the stored `notification_auto_rules`/`admin_broadcasts` or delete them. | Each job: unit test + admin toggle stops it |
| N9 | patient-web: notification list items are links (same route map) with mark-read. Web push via the existing VAPID backend (service worker + `/push/web/subscribe`). | Live: click → target page; web push received in Chromium |

**D: Deep links**

| Task | Do | Verify |
|---|---|---|
| D1 | **Extends F35/F36** (F35 still needs `APPLE_TEAM_ID` and the Play signing fingerprint from the owner). One AASA/assetlinks source. The nginx static file shadows the Next route, and its appID is `com.nabd.patient` while the app bundle is `com.patient.nabd`. Use correct appIDs, all 6 locales, and only paths the app handles. Remove the fallbacks (F35). Remove the unreachable hosts `app.nabd.plus` and `app.nabdahplus.com` from `app.json` (they break Android autoVerify on ≤11), or create them. Move the custom scheme out of the autoVerify filter. **Ship together with D2** (otherwise links open the app to not-found). | `curl` both files in the prod nginx image; Apple/Google validators (owner) |
| D2 | patient-app `app/+native-intent.tsx` (`redirectSystemPath`): strip `/(ar\|en\|ur\|hi\|bn\|fil)`, map web paths to app routes (`/p/:slug`, `/medicine/:slug`, `/doctor/:slug[/:city]`, `/consultations/doctors/:id`, `/offers/:id`, `/orders/:id`, `/appointments/:id`, `/chat/:id`, `/family/join`, `/labs/…`, `/radiology/…`, `/services/…`, `/pharmacy/:slug`, …). Paths with no app screen open in the browser (`Linking.openURL`), never `+not-found`. | Table test over every sitemap URL pattern and every claimed prefix |
| D3 | Claim the high-value paths in AASA and intent filters once D2 maps them: offers, orders, appointments, chat, family/join, prescriptions, diagnostics, community. | Same table test |
| D4 | One share-link helper: `https://nabd.plus/{locale}/…` canonical URLs (no `app.nabdahplus.com`, `nabdahplus.app`, `nabdahplus.com`). Fix the family-invite QR. Web `/s/{type}/{slug}` returns 404 today: add a route that 301s to the canonical page. | Unit test on the helper; `/ar/s/doctor/x` → 301 |
| D5 | provider-app: associated domain `provider.nabd.plus` with its own AASA/assetlinks (today the SPA fallback returns HTML), a `linking` config, and handling for the operator-invite link (`/operators/accept?token=`). | Live: invite link opens the app to accept |
| D6 | Smart app banner with the **current page URL** as `app-argument`; drop the non-standard `google-play-app` meta; add an "Open in app" button on entity pages. | Rendered head check |

**Gate P7E:**
- the notification route table test is green;
- the deep-link table test is green;
- live: a new booking push creates the provider's notification for the right account;
- live: an admin campaign reaches exactly its segment.

---

## PHASE 7F — Discovery: search engines and AI assistants (reviewer audit 2026-09-29)

Evidence: `docs/audit/04_DISCOVERY_ENGAGEMENT_AUDIT.md`. Order: after 7E.

Not repeated here because another task covers it: **page speed (LCP) is Phase 10 F82**.

**S: SEO (search engines)**

| Task | Do | Verify |
|---|---|---|
| S1 | Sitemaps list only indexable canonical URLs. Remove:<br>• robots-disallowed and noindex URLs (`static.xml` has `/reminders`, `/family`, `/health`, `/community`, `/nutrition`, `/maternity/tracker`, `/mental-health`);<br>• 404s (`locations.xml` → `/doctors/{slug}`);<br>• noindex-header pages (`/doctor/{slug}/{city}`).<br>Also:<br>• chunk every sitemap to ≤ 5,000 URLs (doctors/labs/radiology/services can exceed 50k);<br>• add `lastmod` everywhere;<br>• add eligibility filters (public + indexing + review) to doctors, facilities, conditions, entity-graph, ai-catalog and image sitemaps;<br>• add hreflang with per-locale URLs on every sitemap. | Crawler test: fetch every sitemap URL → 200, `index`, canonical = itself, not disallowed |
| S2 | No doorway pages: a city × test/service page is indexable only when real providers offer it in that city (show them and the price range). Otherwise noindex and leave it out of the sitemap. The lab page currently ignores `testSlug`. | Test: city with no provider → noindex |
| S3 | Medicine page completeness (per locale). Today only description, indications, dosage and warnings are visible out of ~21 translated fields. Render: side effects, how to use, storage, package contents, more information, brand benefits, and contraindications/pregnancy/interactions when present.<br>Other fixes on the page:<br>• FAQ questions translated (hard-coded Arabic today);<br>• HowTo name translated;<br>• MedicalDrug `contraindication` taken from contraindications, not warnings;<br>• `lastReviewed`/`reviewedBy`;<br>• AggregateRating/Review only from real reviews;<br>• links to alternatives with the same active ingredient and to the category;<br>• per-locale image alt;<br>• image sitemap on the web domain. | Snapshot test per locale: every non-empty field visible; Rich Results test (owner) |
| S4 | Doctor, condition, facility and category pages translated into all 6 locales: descriptions not hard-coded English, category titles not hard-coded Arabic. | Test: ur/hi/bn/fil pages contain no ar/en fallback where a translation exists |
| S5 | Articles: per-article title, description and OG `article`; include them in the sitemap; show author and medical reviewer. | Metadata test |
| S6 | **Extends F29** (public entity pages; offers were missed). Offers and home-care: public offer detail pages (no login redirect) with Offer JSON-LD. Remove `/offers` and `/home-care` from the robots Disallow list and add them to the sitemap. | Anonymous GET → 200 with price |
| S7 | Duplicates: `/medicine/[slug]` → 301 `/p/[slug]`; `/consultations/doctors/[id]` → 301 `/doctor/[slug]`. Align the proxy noindex regex with page metadata (`diagnostics/packages`, `clinics` and `nurses` currently say index but get a noindex header). | Crawler test |
| S8 | Structured data:<br>• Organization logo, sameAs and contactPoint;<br>• Pharmacy/MedicalClinic/Laboratory geo, openingHours and telephone;<br>• Offer and price on lab, radiology and nursing;<br>• WebSite SearchAction target = an indexable results page. | JSON-LD validation test |
| S10 | IndexNow: real key from env; ping product, article and offer canonical URLs on create/update/unpublish (not `/s/`). | Unit test on the listener |
| S11 | **F31 reopened**: it was logged as done "structural, no deletion", but the renderers are still live. Remove the legacy backend SEO renderers (`/api/v1/sitemap.xml`, `robots.txt`, `llms.txt`, `image-sitemap.xml`, `seo/:type/:id`), which emit `api.nabd.plus/s/...` URLs. Fix the route that shadows `seo/indexnow/submissions`. | `curl` → 404; served-route test |
| S12 | **Rich result like the leading pharmacies** (title + short use line + price + "in stock" + delivery + image in Google results). Product JSON-LD today lacks `brand` and `gtin13` (the barcode is in the data), sends a fixed shipping rate of 15 SAR (not the saved delivery fee / free-delivery rule), and always says `InStock` although a catalog item is not tied to pharmacy stock. Do:<br>• `brand` and `gtin13` from the catalog;<br>• `shippingDetails` from the platform pricing (free delivery when it applies) with `deliveryTime`;<br>• `availability` from real pharmacy stock or allocation (otherwise omit the Offer, never claim InStock);<br>• `hasMerchantReturnPolicy`;<br>• meta description template per locale: use/benefit first line, then form/strength/pack, then price, max ~155 characters, from the translated fields (not the first 160 characters of the description). | Rich Results Test and Merchant listing report (owner) on 20 random medicines × 6 locales; snapshot test of the JSON-LD |
| S13 | **Keywords and data QA on the full catalog (20,990 × 6 locales).** Write `tools/seo/catalog_qa.ts`, run against the DB, with a report committed to `docs/seo/`:<br>• missing or empty fields per locale;<br>• duplicate titles or slugs;<br>• titles over 60 characters and descriptions over 160;<br>• untranslated text (Latin script in ar/ur/hi/bn pages and the reverse);<br>• banned or unsafe claims ("يشفي نهائيًا", "cure", "100%", "best", superlatives the SFDA forbids).<br>Use `search_aliases` (spelling variants: بنادول/بانادول, panadol/panadole) and the active ingredient on the page ("also known as"), as internal search synonyms and in structured data (`alternateName`). Never stuff keywords into titles, and never use hidden text. | Report shows 0 blocking problems; unit test on the title/description builder |
| S14 | **Public health tools and content hubs are indexable** (today several are disallowed or noindex): pregnancy week-by-week, due-date calculator, ovulation calculator, BMI/calorie and nutrition guides, mental-health info pages, and a symptom-checker landing page. Serve only public educational content (never user data), in 6 locales, with `MedicalWebPage` + `reviewedBy` + FAQ, and add them to the sitemap. The logged-in trackers stay private. | Anonymous GET → 200, `index`; listed in the sitemap |
| S15 | **Automatic publishing.** When a provider (doctor, hospital, lab, radiology centre, pharmacy, nurse) is approved, or a catalog item, offer or price changes:<br>• its public page is live and in the sitemap within minutes;<br>• IndexNow is pinged;<br>• the product feed row is updated;<br>• unpublishing removes all of them.<br>This covers doctor × specialty × city pages for multi-specialty doctors, and hospital pages with their departments. | Live: approve a provider → page 200 + sitemap entry + IndexNow call; suspend → 404/410 and removed |

**A: AI assistants and agentic commerce**

| Task | Do | Verify |
|---|---|---|
| A1 | AI checkout must complete. MCP `prepare_transaction` returns `/{locale}/checkout?id=` and ai-commerce returns `/{locale}/checkout/session/:id`; **both 404 on the web and have no app route.** Build the page: load the session → login/OTP → cart prefilled → pay. Also:<br>• use the same total as the site (don't add 15% VAT on top of medicine prices; most medicines are zero-rated in KSA, confirm with the accountant);<br>• add eligibility filters;<br>• remove fabricated fallbacks (price 20, `priceRange '150 SAR'`, default insurers, hard-coded InStock). | Live: MCP prepare → open URL → pay → order exists |
| A2 | MCP to the current spec: streamable-HTTP transport with protocol-version negotiation; notifications return 202 with no body; OAuth 2.1 for write tools (the `.well-known/oauth-*` docs exist); consistent server card. Then list it in MCP registries. | MCP inspector/conformance run |
| A3 | `llms.txt`: one source (the `public/llms.txt` and the route conflict); accurate (it says there is no MCP). `llms-full.txt` should cover all eligible products (paginated, or link the sitemaps); today it has at most ~1,050 items with empty columns. | Test: counts match the eligible catalog |
| A4 | Discovery docs (`ai-catalog`, `agent-card`, `ucp`, `acp`, `x402`) must point to real hosts (`api.nabd.plus`, `mcp.nabd.plus`). Remove or mark disabled anything not implemented. | Test: every URL in them returns 2xx |
| A5 | Product feeds from the eligible catalog: Google Merchant Center, Microsoft Merchant and the OpenAI product-feed format, per locale (at least ar and en). Include GTIN (barcode), brand, availability, the site price, image and canonical link. Regenerate daily. Add an admin exclusion list (Rx categories are never advertised). | Feed validator; count = eligible OTC products |
| A6 | **AI-friendly pages and access for every assistant** (ChatGPT, Gemini/AI Overviews, Claude, Perplexity, Copilot, Apple):<br>• robots names and allows `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `Google-Extended`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Bingbot`, `Applebot`/`Applebot-Extended` on public pages;<br>• each entity page starts with a short answer block in plain language (what it is / what it is used for / price / where to get it), then details, sources, `reviewedBy` and `lastReviewed`;<br>• link entities to shared identifiers (`sameAs` to Wikidata/Wikipedia for active ingredients and conditions; SFDA registration number when available);<br>• the same facts in HTML, JSON-LD, `llms.txt`, MCP and the product feed (no contradictions);<br>• all public content present in the server HTML (no client-only rendering, no login wall). | Test: robots contains each agent; per-page check that answer block, JSON-LD and HTML agree |

**Gate P7F:**
- the crawler test over all sitemaps is green (every URL returns 200, is indexable, is its own canonical and is not disallowed);
- the per-locale medicine page snapshot test is green;
- every URL in the AI discovery docs returns 2xx;
- live: MCP prepare → checkout → paid order;
- the product feed validates;
- the catalog QA report (S13) shows 0 blocking problems on the full catalog;
- live: approving a provider publishes its page, sitemap entry and IndexNow ping (S15);
- the Rich Results Test passes on 20 random medicines × 6 locales (owner runs it once the site is live) (S12).

---

## PHASE 8 — Patient journeys & web parity — F69–F74

| Task | Do |
|---|---|
| F69 | Web settings/profile/reminders: add edit forms using the same endpoints as the app. |
| F70 | Web family: on 404 show "create family" CTA → `POST /family/create`. |
| F71 | Web search: wire to `/search/intent` + results list. |
| F73 | Pharmacy draft: add `fulfillment: 'delivery'|'pickup'` and `payment_mode: 'cash'|'insurance'` fields end-to-end (app + web + backend DTO). Pickup → 15 km radius filter. |
| F74 | Diagnostics checkout: create ONE parent order containing lab+radiology lines, pay once for the total; clear cart only after payment success; rollback bookings on failure (transaction). |
| F75 | `patient-app/app/(auth)/otp.tsx:198`: resend button → call the same send-OTP endpoint used on first send (`/auth/otp/request` or patient OTP route), then reset timer; disable while pending; show error on failure. | resend triggers backend call (network log) |
| F76 | `patient-app/app/returns/new-request.tsx:212`: use `expo-image-picker` (camera + library) → upload via `/media/upload` → store returned URLs in `attachments[]` sent with the return request. | return request stored with real image URLs |
| F77 | `consultations/prescription-from-doctor.tsx:167`: `addAllToReminders` → POST each medication to the reminders API (same endpoint used by the single "add reminder" flow). | reminders appear in reminders screen after reload |
| F79 | `provider-app/src/screens/lab/LabDashboard.tsx:511`: hide cash-confirm button unless booking payment state allows it. | button absent in WAITING_COPAY |
| Merge screens | Patient app: merge `health/family-hub` + `family/hub`; `profile/edit` + `health/edit-profile`; insurance `hub`+`claim-tracking`+`refund-status` into one screen with tabs. Delete the 59 redirect-stub screens after updating all links (`nav.py` must show 0 dead targets). |
| States | Add loading/error/empty states to the 22 + 12 screens listed by `screens.py`. |

**Journey e2e tests (must all pass, both app API + web):**
Pharmacy {cash, insurance} × {delivery, pickup} × {Rx, no-Rx}; Consultation {online, clinic, home} × {cash, insurance}; Lab {home, center} × {cash, insurance}; Radiology {cash, insurance}; Nursing {hour, shift}. Insurance flow = patient enters insurance → provider sees details → provider enters decision (full/partial/reject/pending + amount + copay + ref + attachment) → patient pays copay / self-pay / cancels. **No NPHIES integration.**

**Gate P8:** all journey tests green on real Mongo with geo + transactions.

---

## PHASE 9 — Provider app UI — F50–F53

| Task | Do | Verify |
|---|---|---|
| F50 | Replace every `'tokens.xxx'` / `"tokens.xxx"` string (349) with `tokens.xxx` import; `'tokens.success' + '20'` → `withAlpha(tokens.success, 0.12)`. | `grep -rnE "[\"']tokens\." provider-app/src` → 0 |
| F51 | Split `DoctorDashboard.tsx`, `SharedScreens.tsx`, `FacilityDashboard.tsx`, `BlueprintScreens.tsx` into one file per screen (≤ 400 lines). No behavior change. | tsc + tests green |
| F52 | Upgrade provider-app to Expo SDK 57 (same as patient). Delete dead constants (`API.BASE`, `BROADCAST_*`) and `services/HttpClient.ts`. | app builds (EAS dev build) |
| F78 | Delete `provider-app/src/screens/shared/PharmacyChatResponder.tsx` (dead, fake socket invoice). | file gone, tsc green |
| F53 | Hide `promotions`/`crm` entries for provider types that are not allowed, based on `/provider/me` capabilities. | no 403 screens |

**Gate P9:** `screenapi.py` for each provider type → 0 broken calls, 0 unexpected 403.

---

## PHASE 10 — Payments, compliance, platform — F60, F64–F68

- **Payments:** single `PaymentGateway` interface; adapters: Tap, Moyasar, (HyperPay). Choose via `PAYMENT_PROVIDER` env. Sandbox first. Webhook signature REQUIRED in all envs (F60). Callback → redirect to `patient-web /payments/result?status=` + deep link, after syncing status server-side.
- **Compliance:** PDPL consent + data export + account deletion (app + web, Apple requirement); ZATCA e-invoice + VAT 15%; forced-update check endpoint.
- **Performance (F82):** Lighthouse CI shows LCP /ar 3.6s, /ar/c 5.1s, /ar/consultations/doctors 3.1s (budget ≤3.0s). Do: SSR the above-the-fold content (no client-only fetch for hero/first list), `next/image` with `priority` + correct `sizes` for LCP image, preconnect to API/CDN, cut client JS on these routes (dynamic import heavy widgets), cache catalog API responses (ISR/`revalidate`). Verify: Lighthouse CI green on all three URLs.
- **Platform:** daily Mongo backup + weekly restore drill script; disk usage alert at 80%; CSP fix (nonce for style or move inline styles to CSS modules) (F68).
- **Medical safety:** 997 escalation in triage; disclaimers; AI content review queue (Phase 6).

**Gate P10:** payment sandbox e2e (success, fail, refund); account deletion e2e.

---

## PHASE 11 — Final verification (agent runs, then hands over)
1. Full CI green (build + typecheck + unit + e2e) for all 5 projects.
2. Harness on staging (real data): `sweep.py` (all roles), `wsweep.py` (all roles), `admin.py`, `clients.py`, `nav.py`, `adminshot.py`, `webauth.sh`, `screenapi.py` → attach outputs to `AGENT_PROGRESS.md`.
3. `gitleaks` full history clean; `npm/pnpm audit` 0 critical/high (runtime deps).
4. Push branch; open PR `fix/audit-2026-09 → main` with checklist of all F-ids and their commit SHAs.

---

## APPENDIX A — Environment variables the owner must provide (staging first)
`APPLE_TEAM_ID`, `ANDROID_SHA256_FINGERPRINT`, `RESEND_API_KEY` (or SES_*), `SMS_ENABLED`+`TAQNYAT_API_KEY`, `FCM_PROJECT_ID`+`FCM_CLIENT_EMAIL`+`FCM_PRIVATE_KEY`, `APNS_*`, `LIVEKIT_URL`+`LIVEKIT_API_KEY`+`LIVEKIT_API_SECRET`, `COTURN_*`, `GEMINI_API_KEY` or `OPENAI_API_KEY`, payment sandbox key (`TAP_API_KEY` or `MOYASAR_API_KEY` test), `*_WEBHOOK_SECRET`, `S3_*`/`CLOUDFLARE_R2_*`, `SENTRY_DSN`, `ALLOWED_ORIGINS` (single var — delete `CORS_ORIGINS`), `ADMIN_BACKEND_URL`.

## APPENDIX B — Review protocol (reviewer = Claude)
After each phase push, the reviewer: (1) reads the diff per task vs this plan, (2) re-runs the gate scripts, (3) writes `REVIEW_P<n>.md` with PASS/FAIL per task. FAIL items go back to the agent as a new task list; small fixes the reviewer may commit directly. Only after all phases PASS → merge to `main` → deploy.
