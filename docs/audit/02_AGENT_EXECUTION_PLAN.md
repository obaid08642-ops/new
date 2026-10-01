# NABD PLUS — AGENT EXECUTION PLAN (v1.0 · 2026-09-23)
> Source of truth for findings: `01_FINAL_AUDIT_REPORT.md` (IDs F01–F74).
> This file tells the implementing agent EXACTLY what to build. Do not re-plan. Do not skip. Do not invent scope.

---

## ORDER OF WORK (owner decisions 2026-09-29 and 2026-10-01)
1. **X0** (urgent data leak), then **X11** and **X12**, then **X1–X10**. All are in `REVIEW_P7R_TO_P12.md`.
2. **7D** (reviewer-led security review), then **16** (security hardening), including C9 and C10 (admin on two devices; Cloudflare Access and Tunnel).
3. **7E**, then **7F**, then **21** (accounts, guests, email OTP).
4. **15** (resilience foundations): one API client per app, error boundaries, no double actions, chaos tests. Done before the screen rebuild so the new screens use them.
5. **12**:
   - first the stamps, ported from the canvas, then stop for review;
   - then the owner approves 12.C5 (information architecture);
   - then the screens are rebuilt together with Phase 8/9, **17** (UX essentials and accessibility) and **18** (languages and copy), so each screen is touched once.
6. **13**, then **23** (audit trail and legal records), then **22** (mature-platform features), then **14** (performance and capacity; X0, X11 and X12 are already done by then), then **20** (observability and operations).
7. **19** (Saudi compliance and integrations), as the owner's legal and business decisions arrive. The owner-side steps can start now.
8. **10** (the remaining gaps, X9), then **11** (final verification).

The reviewer's re-audit of Phases 1–11 (**PHASE R**) runs in parallel, on the owner's go. Its FAIL items go to the front of this order.

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
| C9 | **Owner decision 2026-10-01: the admin opens only on two devices**, the owner's MacBook and iPhone.<br>• Turn passkey enforcement on (`ADMIN_PASSKEY_ENFORCED=true`) as soon as both devices are enrolled; it is off on the server today to avoid a lockout.<br>• The allow-list holds exactly those two devices, plus the printed recovery codes (C6) for break-glass.<br>• The bootstrap path (email code without a passkey, X4) is closed once a passkey exists.<br>• The admin dashboard must be fully usable on the iPhone (7B-B5). | • Live: a third browser → 403.<br>• Password + email code without a passkey → 403 once enforcement is on.<br>• The 390×844 render test is green. |
| C10 | **Cloudflare in front of the admin and staging (replaces the header-injection idea).** The admin BFF already adds `x-admin-gate-token` server-side, so Cloudflare does not need to inject it.<br>• Cloudflare Access application on `admin.nabd.plus` and `staging.nabd.plus` (Zero Trust free plan): allow only the owner's email, require WARP/device posture, session 15 minutes.<br>• The admin BFF verifies the `Cf-Access-Jwt-Assertion` signature (team certs) on every request.<br>• Cloudflare Tunnel (`cloudflared`) for the admin, so it has no public origin port.<br>• A WAF rule blocks `/api/v1/admin/*` on `api.nabd.plus` from the internet; the BFF reaches the API internally.<br>• The origin firewall accepts 80/443 only from Cloudflare IP ranges (or only through the tunnel). Keep the TURN/LiveKit media ports open.<br>• Every gate token on production is a long random secret, never `live-gate-token`. | • From another device: `admin.nabd.plus` and `staging.nabd.plus` are blocked at the edge.<br>• A direct call to the origin IP is refused.<br>• `api.nabd.plus/api/v1/admin/...` from the internet → 403 at the edge. |

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
| N7 | **Manual campaigns (marketing). Do together with R7-7.** One admin page, "Notifications", with three tabs: Campaigns, Recurring (N8) and Behaviour (N10).<br><br>**Composer:**<br>• title and body per locale (6 locales, falling back to ar, then en);<br>• an image (uploaded to `/media/upload`);<br>• a deep link picked from real routes and validated server-side;<br>• channels: push and an in-app inbox row always; email and WhatsApp optional;<br>• saved **templates** (create, edit, duplicate) with variables such as `{name}` and `{city}`;<br>• send now, schedule a date and time, or A/B test (the existing 2 variants);<br>• before sending: the audience count and a sample of 20 users, then a confirmation.<br><br>**Audience builder.** Today segments filter only fields stored on `users`, and nothing maintains `orders_total`/`bookings_total`. Compute the audience from the real collections:<br>• user type: patients, providers, or a provider type (pharmacy, doctor, lab, radiology, nurse, hospital, ambulance, driver);<br>• age group and gender, from `date_of_birth`/`gender` in the profile, only for users who consented;<br>• city, language, platform (iOS/Android/web) and app version;<br>• ordered or never ordered, per service, in the last N days (pharmacy from `pharmacy_orders`; consultation, lab, radiology and nursing from their bookings);<br>• ordered a specific item (medicine id, category, lab test, specialty);<br>• inactive for N days (last app open or login), or new in the last N days;<br>• health interests the user opted into (chronic, pregnancy, family);<br>• rules combined with AND/OR, a segment to exclude, saving as a named segment, and a user-id CSV upload.<br><br>**History** per campaign: sent, delivered, opened and clicked (from `pushengagements`/`pushlogs`). | Live:<br>• the audience "patients in Riyadh, aged 25–40, ordered medicine in the last 60 days, no lab booking" has the same count as a direct DB query;<br>• sending creates inbox rows and pushes for exactly those users;<br>• a scheduled campaign goes out at its time, not before;<br>• the admin click test (R7-1 harness) covers compose → preview → send. |
| N8 | **Automatic recurring notifications, defined by the admin.** In the Recurring tab the admin creates rules with:<br>• an audience (the N7 builder);<br>• a frequency: daily, weekly (pick the day) or monthly (pick the date);<br>• a local send time, and start and end dates;<br>• text and an image per locale, and a deep link;<br>• enable/disable.<br>The server runs each rule on schedule (timezone Asia/Riyadh), sends it only once per period, and logs every run. Replace the stored-but-unused `notification_auto_rules` (compat `admin-spa.module.ts`) with these rules, or wire them to the rules.<br><br>**Built-in automatic notifications.** Each has an admin toggle, timing and editable text per locale:<br>• appointment reminders 24h and 1h before, for consultation, lab, radiology and nursing;<br>• a server-side backup for medication reminders, and refill reminders from the dispensed quantity;<br>• weekly maternity tips;<br>• re-engagement after 14 and 30 days inactive;<br>• abandoned cart (today it reads the legacy `orders`; use `pharmacy_orders` and carts);<br>• prescription renewal.<br><br>Remove `admin_broadcasts` if nothing executes it. | • Each job has a unit test, and the admin toggle stops it.<br>• Live: a daily rule set 2 minutes ahead sends once to its audience, not twice.<br>• Editing its text changes the next run.<br>• Disabling it stops it. |
| N9 | patient-web: notification list items are links (same route map) with mark-read. Web push via the existing VAPID backend (service worker + `/push/web/subscribe`). | Live: click → target page; web push received in Chromium |
| N10 | **Behaviour-triggered nudges (new).** When a user views or searches for something and leaves without ordering, send a relevant notification after a delay the admin sets.<br><br>**Tracking** (patient-app and patient-web; logged-in users only; respects consent):<br>• a `user_interest_events` collection with `user_id`, `kind`, `ref_id` or `query`, `locale` and `at`;<br>• `kind` is one of: medicine, category, doctor, specialty, lab test, radiology, nursing, pregnancy, ovulation, family, mental health, nutrition, or search query;<br>• one endpoint, `POST /engagement/events`, with a strict DTO and a rate limit;<br>• a TTL index (for example 30 days).<br><br>**Engine.** Each event schedules a delayed BullMQ job (the delay comes from the rule). When the job runs it **skips** the nudge if any of these holds:<br>• the user has since ordered or booked that kind (check the real collections);<br>• the user opted out;<br>• it is quiet hours;<br>• the user already had a nudge for this kind within the cooldown.<br><br>**Admin (Behaviour tab).** One rule per kind, with:<br>• enable/disable;<br>• a delay in minutes (for example 2, 5, 10 or 60);<br>• a cooldown and a daily cap per user;<br>• text and an image per locale, with variables (`{medicine}`, `{specialty}`, `{count}`, `{city}`);<br>• the deep link target: the viewed item, or its list.<br>Examples: "الأدوية اللي بتدور عليها متوفرة بعروض وتوصيل سريع"; "أطباء جلدية كثير متاحين 24 ساعة: أونلاين، زيارة منزلية أو في العيادة". `{count}` comes from real data (the available doctors in that specialty), never a made-up number.<br><br>**Report** per rule: triggered, skipped (with the reason), sent, opened, and converted (ordered within 24h). | • Unit tests: skipped when the user ordered, and for the cooldown, the daily cap, quiet hours and opt-out.<br>• Live journey: a patient views a medicine and does not order. After the rule's delay (1 minute in the test) exactly one push and one inbox row arrive, with a deep link to that medicine.<br>• The same flow with an order placed: nothing is sent.<br>• The admin changes the text: the next nudge uses it. |
| N11 | **User notification settings.** In the patient-app and web settings, each category can be turned on or off:<br>• orders and bookings;<br>• reminders;<br>• offers and campaigns;<br>• suggestions from my browsing.<br>Users can also set quiet hours. Campaigns (N7), recurring rules (N8) and nudges (N10) respect these settings; transactional notices always go out. The provider app gets the same setting, for campaigns only. Implement together with N6. | • "Suggestions" off → no N10 nudge.<br>• "Offers" off → no N7 campaign.<br>• An order-status push still arrives. |
| N12 | **Every notification in the user's language (6 locales).** Today the backend message dictionary (`i18n.service.ts`) has ar/en/ur only: **0 of 627 keys** exist in hi, bn and fil, and the default is Arabic. Hindi, Bengali and Filipino users therefore get Arabic pushes, emails and SMS.<br>Do:<br>• complete the dictionary for all 6 locales (18.1);<br>• fallback order: the user's chosen language → the device language if supported → English; Arabic only for users whose chosen or device language is Arabic (18.2);<br>• admin templates (N7/N8/N10) cannot be published while a locale is empty; an "AI draft" button (AI gateway, 13.R21) fills the missing locales as drafts for human review;<br>• SMS length rules per locale (GSM-7 or UCS-2). | • Key-coverage test: every key exists in 6 locales (fails today).<br>• A user with `locale=hi` gets the Hindi push; an unknown locale gets English.<br>• Publishing a template with an empty locale is blocked. |
| N13 | **Huawei and other phones without Google services.** Expo push uses FCM, which these phones lack, and Expo has no built-in Huawei (HMS) support.<br>Do:<br>• detect Google services at registration and store `push_channel` per device;<br>• add HMS Push Kit through an Expo config plugin, and have the server send through HMS for those tokens;<br>• fallback for any device without push: the in-app inbox fetched on open/resume, plus SMS or WhatsApp for critical messages (OTP, appointment reminders, order ready, emergency);<br>• the same in the provider app (a new order must never be missed). | • Unit test on channel selection.<br>• On a Huawei device (device farm, 15.10): a booking reminder arrives (HMS push or SMS). |

**D: Deep links**

| Task | Do | Verify |
|---|---|---|
| D1 | **Extends F35/F36** (F35 still needs `APPLE_TEAM_ID` and the Play signing fingerprint from the owner). One AASA/assetlinks source. The nginx static file shadows the Next route, and its appID is `com.nabd.patient` while the app bundle is `com.patient.nabd`. Use correct appIDs, all 6 locales, and only paths the app handles. Remove the fallbacks (F35). Remove the unreachable hosts `app.nabd.plus` and `app.nabdahplus.com` from `app.json` (they break Android autoVerify on ≤11), or create them. Move the custom scheme out of the autoVerify filter. **Ship together with D2** (otherwise links open the app to not-found). | `curl` both files in the prod nginx image; Apple/Google validators (owner) |
| D2 | patient-app `app/+native-intent.tsx` (`redirectSystemPath`): strip `/(ar\|en\|ur\|hi\|bn\|fil)`, map web paths to app routes (`/p/:slug`, `/medicine/:slug`, `/doctor/:slug[/:city]`, `/consultations/doctors/:id`, `/offers/:id`, `/orders/:id`, `/appointments/:id`, `/chat/:id`, `/family/join`, `/labs/…`, `/radiology/…`, `/services/…`, `/pharmacy/:slug`, …). Paths with no app screen open in the browser (`Linking.openURL`), never `+not-found`. | Table test over every sitemap URL pattern and every claimed prefix |
| D3 | Claim the high-value paths in AASA and intent filters once D2 maps them: offers, orders, appointments, chat, family/join, prescriptions, diagnostics, community. | Same table test |
| D4 | One share-link helper: `https://nabd.plus/{locale}/…` canonical URLs (no `app.nabdahplus.com`, `nabdahplus.app`, `nabdahplus.com`). Fix the family-invite QR. Web `/s/{type}/{slug}` returns 404 today: add a route that 301s to the canonical page. | Unit test on the helper; `/ar/s/doctor/x` → 301 |
| D5 | provider-app: associated domain `provider.nabd.plus` with its own AASA/assetlinks (today the SPA fallback returns HTML), a `linking` config, and handling for the operator-invite link (`/operators/accept?token=`). | Live: invite link opens the app to accept |
| D6 | Smart app banner with the **current page URL** as `app-argument`; drop the non-standard `google-play-app` meta; add an "Open in app" button on entity pages. | Rendered head check |
| D7 | **Deep links for every public page and every notification.** One coverage matrix (`docs/deeplinks/COVERAGE.md` plus a generated test), per entity type × 6 locales: web URL pattern → listed in the sitemap → app route (patient-app/provider-app) → claimed in AASA/assetlinks → which notification types open it.<br>Entity types:<br>• medicines: 20,990 × 6 = 125,940 product URLs. **This is the medicines alone.** The total is the sum of every entity type below × 6 locales, counted from the production sitemap (V1); every type is tested, not only medicines;<br>• categories;<br>• doctors, and doctor × specialty × city;<br>• hospitals and clinics; pharmacies;<br>• labs and lab tests; radiology centres and scans; nursing services;<br>• offers; articles;<br>• health hubs: pregnancy, ovulation, family, mental health, nutrition, symptom checker;<br>• orders, bookings, chats, prescriptions, reports.<br>One mapper serves web links, push taps (N1) and the in-app inbox. | • Table test over every pattern: web 200 and the app route exists.<br>• Each release: 500 random real sitemap URLs opened on an Android emulator and an iOS simulator (`adb shell am start -d`, `xcrun simctl openurl`) land on the right screen and item.<br>• Every notification type in the N1 table opens its target (cold and warm start). |

**Gate P7E:**
- the notification route table test is green;
- the deep-link table test is green;
- live: a new booking push creates the provider's notification for the right account;
- live: an admin campaign reaches exactly its segment.
- live: a recurring rule sends once per period, and the admin toggle stops it (N8);
- live: view → no order → a nudge after the admin-set delay; view → order → no nudge (N10);
- N12: 100% key coverage in 6 locales, and the fallback tests are green;
- N13: a Huawei device without Google services receives a booking reminder;
- D7: the deep-link coverage matrix test is green, and the 500-URL simulator run passes;
- the admin click test covers the three tabs of the Notifications page.

---

## PHASE 7F — Discovery: search engines and AI assistants (reviewer audit 2026-09-29)

Evidence: `docs/audit/04_DISCOVERY_ENGAGEMENT_AUDIT.md`. Order: after 7E.

Not repeated here because another task covers it: **page speed (LCP) is Phase 10 F82**.

**S: SEO (search engines)**

| Task | Do | Verify |
|---|---|---|
| S1 | Sitemaps list only indexable canonical URLs. Remove:<br>• robots-disallowed and noindex URLs (`static.xml` has `/reminders`, `/family`, `/health`, `/community`, `/nutrition`, `/maternity/tracker`, `/mental-health`);<br>• 404s (`locations.xml` → `/doctors/{slug}`);<br>• noindex-header pages (`/doctor/{slug}/{city}`).<br>Also:<br>• chunk every sitemap to ≤ 5,000 URLs (doctors/labs/radiology/services can exceed 50k);<br>• add `lastmod` everywhere;<br>• add eligibility filters (public + indexing + review) to doctors, facilities, conditions, entity-graph, ai-catalog and image sitemaps;<br>• add hreflang with per-locale URLs on every sitemap. | Crawler test: fetch every sitemap URL → 200, `index`, canonical = itself, not disallowed |
| S2 | No doorway pages: a city × test/service page is indexable only when real providers offer it in that city (show them and the price range). Otherwise noindex and leave it out of the sitemap. The lab page currently ignores `testSlug`. | Test: city with no provider → noindex |
| S3 | Medicine page completeness (per locale). Today only description, indications, dosage and warnings are visible. The owner's catalog has **30+ fields per medicine per language, and many are null in some rows** (for example `active_ingredient`).<br>Render every field that has a value: side effects, how to use, storage, package contents, more information, brand benefits, and contraindications/pregnancy/interactions. A null or empty field hides its section and its JSON-LD property: never show "null", "undefined", an empty heading or a placeholder, and never fall back to another language's text without marking it.<br>Other fixes on the page:<br>• FAQ questions translated (hard-coded Arabic today);<br>• HowTo name translated;<br>• MedicalDrug `contraindication` taken from contraindications, not warnings;<br>• `lastReviewed`/`reviewedBy`;<br>• AggregateRating/Review only from real reviews;<br>• links to alternatives with the same active ingredient and to the category;<br>• per-locale image alt;<br>• image sitemap on the web domain. | Snapshot test per locale, using real rows from the export: one row with all fields filled and one with many nulls. Every non-empty field is visible, and no empty section, "null" or "undefined" appears. Rich Results test (owner) |
| S4 | Doctor, condition, facility and category pages translated into all 6 locales: descriptions not hard-coded English, category titles not hard-coded Arabic. | Test: ur/hi/bn/fil pages contain no ar/en fallback where a translation exists |
| S5 | Articles: per-article title, description and OG `article`; include them in the sitemap; show author and medical reviewer. | Metadata test |
| S6 | **Extends F29** (public entity pages; offers were missed). Offers and home-care: public offer detail pages (no login redirect) with Offer JSON-LD. Remove `/offers` and `/home-care` from the robots Disallow list and add them to the sitemap. | Anonymous GET → 200 with price |
| S7 | Duplicates: `/medicine/[slug]` → 301 `/p/[slug]`; `/consultations/doctors/[id]` → 301 `/doctor/[slug]`. Align the proxy noindex regex with page metadata (`diagnostics/packages`, `clinics` and `nurses` currently say index but get a noindex header). | Crawler test |
| S8 | Structured data:<br>• Organization logo, sameAs and contactPoint;<br>• Pharmacy/MedicalClinic/Laboratory geo, openingHours and telephone;<br>• Offer and price on lab, radiology and nursing;<br>• WebSite SearchAction target = an indexable results page. | JSON-LD validation test |
| S10 | IndexNow: real key from env; ping product, article and offer canonical URLs on create/update/unpublish (not `/s/`). | Unit test on the listener |
| S11 | **F31 reopened**: it was logged as done "structural, no deletion", but the renderers are still live. Remove the legacy backend SEO renderers (`/api/v1/sitemap.xml`, `robots.txt`, `llms.txt`, `image-sitemap.xml`, `seo/:type/:id`), which emit `api.nabd.plus/s/...` URLs. Fix the route that shadows `seo/indexnow/submissions`. | `curl` → 404; served-route test |
| S12 | **Rich result like the leading pharmacies** (title + short use line + price + "in stock" + delivery + image in Google results). Product JSON-LD today lacks `brand` and `gtin13` (the barcode is in the data), sends a fixed shipping rate of 15 SAR (not the saved delivery fee / free-delivery rule), and always says `InStock` although a catalog item is not tied to pharmacy stock. Do:<br>• `brand` and `gtin13` from the catalog;<br>• `shippingDetails` from the platform pricing (free delivery when it applies) with `deliveryTime`;<br>• `availability` from real pharmacy stock or allocation (otherwise omit the Offer, never claim InStock);<br>• `hasMerchantReturnPolicy`;<br>• meta description template per locale: use/benefit first line, then form/strength/pack, then price, max ~155 characters, from the translated fields (not the first 160 characters of the description). | Rich Results Test and Merchant listing report (owner) on 20 random medicines × 6 locales; snapshot test of the JSON-LD |
| S13 | **Keywords and data QA on the full catalog (20,990 × 6 locales).** Write `tools/seo/catalog_qa.ts`, run against the DB, with a report committed to `docs/seo/`:<br>• for **every** field in the source (not only the fields the importer maps today): count of null or empty values per locale, and the rows that miss a required field (name, slug, price, image);<br>• duplicate titles or slugs;<br>• titles over 60 characters and descriptions over 160;<br>• untranslated text (Latin script in ar/ur/hi/bn pages and the reverse);<br>• banned or unsafe claims ("يشفي نهائيًا", "cure", "100%", "best", superlatives the SFDA forbids).<br>Use `search_aliases` (spelling variants: بنادول/بانادول, panadol/panadole) and the active ingredient on the page ("also known as"), as internal search synonyms and in structured data (`alternateName`). Never stuff keywords into titles, and never use hidden text. | Report shows 0 blocking problems; unit test on the title/description builder |
| S14 | **Public health tools and content hubs are indexable** (today several are disallowed or noindex): pregnancy week-by-week, due-date calculator, ovulation calculator, BMI/calorie and nutrition guides, mental-health info pages, and a symptom-checker landing page. Serve only public educational content (never user data), in 6 locales, with `MedicalWebPage` + `reviewedBy` + FAQ, and add them to the sitemap. The logged-in trackers stay private. | Anonymous GET → 200, `index`; listed in the sitemap |
| S15 | **Automatic publishing.** When a provider (doctor, hospital, lab, radiology centre, pharmacy, nurse) is approved, or a catalog item, offer or price changes:<br>• its public page is live and in the sitemap within minutes;<br>• IndexNow is pinged;<br>• the product feed row is updated;<br>• unpublishing removes all of them.<br>This covers doctor × specialty × city pages for multi-specialty doctors, and hospital pages with their departments. | Live: approve a provider → page 200 + sitemap entry + IndexNow call; suspend → 404/410 and removed |
| S16 | **The importer keeps every source field.** `scripts/import-catalog-v14.ts` reads about 13 translated keys and 22 top-level fields. The owner's export has 30+ fields per language, so any field it does not map is dropped silently. Do:<br>• build the field inventory from the real export file (every key, per locale, with its null rate);<br>• map every field into `medicines` (typed where known, the rest kept under `attributes`);<br>• null and empty stay null (no `""`, no `"null"` strings);<br>• the import report prints, per field and locale: imported, null, and dropped. Dropped must be 0.<br>• re-import idempotently (by `sku`/`barcode`), without losing admin edits. | Unit test on `mapV14Row` with a real row that has nulls. The import report on the full export shows 0 dropped fields, and the document count equals the export's row count (20,990). |
| S17 | **On-page technical SEO on every public page:**<br>• exactly one `<h1>`;<br>• headings in order (h2 → h3, no skipped levels);<br>• localized `alt` text on every image;<br>• descriptive link text;<br>• no broken internal links, and redirect chains of at most one hop;<br>• `dateModified` shown and in the JSON-LD on articles and medical pages.<br>A weekly crawler job reports broken links (internal and external) and 404s with their referrers. | Crawler test over the sitemaps:<br>• 0 pages with more or fewer than one h1;<br>• 0 images without alt;<br>• 0 broken internal links;<br>• 0 redirect chains over one hop. |
| S18 | **Authority and backlinks** (owner and marketing), with a guide in `docs/seo/AUTHORITY.md`:<br>• partner links from pharmacies, clinics and labs (the 13.R17 badge);<br>• health directories and Saudi business listings;<br>• Google Business Profile and Wikidata (C6.3);<br>• digital PR around real data (for example medicine-availability reports);<br>• no paid link schemes (search engines penalize them). | The guide is committed; the owner tracks referring domains in Search Console. |

**A: AI assistants and agentic commerce**

| Task | Do | Verify |
|---|---|---|
| A1 | AI checkout must complete. MCP `prepare_transaction` returns `/{locale}/checkout?id=` and ai-commerce returns `/{locale}/checkout/session/:id`; **both 404 on the web and have no app route.** Build the page: load the session → login/OTP → cart prefilled → pay. Also:<br>• use the same total as the site (don't add 15% VAT on top of medicine prices; most medicines are zero-rated in KSA, confirm with the accountant);<br>• add eligibility filters;<br>• remove fabricated fallbacks (price 20, `priceRange '150 SAR'`, default insurers, hard-coded InStock). | Live: MCP prepare → open URL → pay → order exists |
| A2 | MCP to the current spec: streamable-HTTP transport with protocol-version negotiation; notifications return 202 with no body; OAuth 2.1 for write tools (the `.well-known/oauth-*` docs exist); consistent server card. Then list it in MCP registries. | MCP inspector/conformance run |
| A3 | `llms.txt`: one source (the `public/llms.txt` and the route conflict); accurate (it says there is no MCP). `llms-full.txt` should cover all eligible products (paginated, or link the sitemaps); today it has at most ~1,050 items with empty columns. | Test: counts match the eligible catalog |
| A4 | Discovery docs (`ai-catalog`, `agent-card`, `ucp`, `acp`, `x402`) must point to real hosts (`api.nabd.plus`, `mcp.nabd.plus`). Remove or mark disabled anything not implemented. | Test: every URL in them returns 2xx |
| A5 | Product feeds from the eligible catalog: Google Merchant Center, Microsoft Merchant and the OpenAI product-feed format, per locale (at least ar and en). Include GTIN (barcode), brand, availability, the site price, image and canonical link. Regenerate daily. Add an admin exclusion list (Rx categories are never advertised). | Feed validator; count = eligible OTC products |
| A6 | **AI-friendly pages and access for every assistant** (ChatGPT, Gemini/AI Overviews, Claude, Perplexity, Copilot, Apple):<br>• robots names and allows `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `Google-Extended`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Bingbot`, `Applebot`/`Applebot-Extended` on public pages;<br>• each entity page starts with a short answer block in plain language (what it is / what it is used for / price / where to get it), then details, sources, `reviewedBy` and `lastReviewed`;<br>• link entities to shared identifiers (`sameAs` to Wikidata/Wikipedia for active ingredients and conditions; SFDA registration number when available);<br>• the same facts in HTML, JSON-LD, `llms.txt`, MCP and the product feed (no contradictions);<br>• all public content present in the server HTML (no client-only rendering, no login wall). | Test: robots contains each agent; per-page check that answer block, JSON-LD and HTML agree |

**V: Verification on real data (not samples)**

Samples are not enough. The reviewer's 2026-09-29 test used 3 synthetic medicines, and the other entities were reviewed from the code only. These tasks run against the real catalog and a staging copy of production.

| Task | Do | Verify |
|---|---|---|
| V1 | **Full-catalog crawl on staging.** A script (`tools/seo/crawl_catalog.ts`) goes through every medicine × 6 locales (about 126k pages). For each page it checks: status 200, `lang`/`dir`, canonical, hreflang (6 + x-default), title and description in the page's language, JSON-LD parses, price equals the DB, image loads, no "null"/"undefined"/raw i18n keys, and every non-null DB field appears on the page. Run it with concurrency and resume support, and write a CSV of failures. | The report is committed to `docs/seo/` with 0 failures (or each failure has a data fix) |
| V2 | **The same crawl for every other public entity:** doctors (and doctor × specialty × city), hospitals and clinics, pharmacies, labs and lab tests, radiology centres and scans, nursing services, insurance companies and networks, offers, articles, and the health hubs (pregnancy, ovulation, family, mental health, nutrition, symptom checker, from S14). | Same report, 0 failures |
| V3 | **Search on real data:** 200 real queries per locale (brand names, spelling variants from `search_aliases`, active ingredients, symptoms, specialties, lab tests), taken from `query_analytics` where it exists. Check that the expected item is in the top 3, and report zero-result queries. Include the patient-app, web and MCP `search_medicines`. | Top-3 hit rate ≥ 95%; the zero-result list is reviewed |
| V4 | **Deep links on real URLs:** take 500 random sitemap URLs across all types and locales and run them through the D2 mapper and an Android/iOS simulator (`adb shell am start -d` / `xcrun simctl openurl`). Each opens the right screen with the right item, or the browser. Never `+not-found`. | Table report, 0 failures |
| V5 | **AI on real data:** an MCP conformance run on staging; for 50 random medicines and 20 providers, `get_entity_detail` gives the same facts as the page and the feed (name, price, availability, canonical); `prepare_transaction` → checkout → paid order (A1); the AI symptom check answers in all 6 locales with safe wording and a doctor or specialty suggestion that exists. | Report, 0 mismatches |

**C6: Additions from the owner (2026-09-29).** Full text: `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` Part C6. The answer block, robots and sameAs are already in A6, and the feeds in A5; these tasks add only what is missing.

| Task | Do | Verify |
|---|---|---|
| C6.1 | **ASO:** store listings in 6 languages with keyword research per locale; screenshots from the new design (after Phase 12); an app preview video; an in-app review prompt at success moments; a workflow in admin for replying to store ratings. | Listings text committed per locale; the review prompt fires once per success moment (test); the admin reply page click test |
| C6.2 | **Answer-ready content, extends A6:** besides A6's answer block (what it is, price range, availability, who provides it, how to order), every public entity page has FAQs with `FAQPage` schema. | Schema test on each entity type |
| C6.3 | **Brand entity:** Google Business Profile and a Wikidata item (owner actions); in code, the same name, address and phone everywhere and `sameAs` links in Organization JSON-LD (extends S8). | JSON-LD test: Organization NAP equals the config |
| C6.4 | **Measurement:** track AI referrals (utm and referrer for chat.openai.com, perplexity.ai, gemini, copilot, claude.ai) in analytics and an admin report; a monthly check script of how assistants answer 50 target questions (which pages they cite), with the result stored. | Referral from each host is recorded (test); first monthly report committed |

**Gate P7F:**
- the crawler test over all sitemaps is green (every URL returns 200, is indexable, is its own canonical and is not disallowed);
- the per-locale medicine page snapshot test is green;
- every URL in the AI discovery docs returns 2xx;
- live: MCP prepare → checkout → paid order;
- the product feed validates;
- the catalog QA report (S13) shows 0 blocking problems on the full catalog;
- the importer report shows 0 dropped fields and 20,990 documents (S16);
- the V1–V5 reports on staging show 0 failures;
- live: approving a provider publishes its page, sitemap entry and IndexNow ping (S15);
- the Rich Results Test passes on 20 random medicines × 6 locales (owner runs it once the site is live) (S12);
- C6.1–C6.4 Verify steps are green;
- the S17 crawler test is green.

---

## PHASE 8 — Patient journeys & web parity — F69–F74

| Task | Do | Verify |
|---|---|---|
| F69 | Web settings/profile/reminders: add edit forms using the same endpoints as the app. | — |
| F70 | Web family: on 404 show "create family" CTA → `POST /family/create`. | — |
| F71 | Web search: wire to `/search/intent` + results list. | — |
| F73 | Pharmacy draft: add `fulfillment: 'delivery'\|'pickup'` and `payment_mode: 'cash'\|'insurance'` fields end-to-end (app + web + backend DTO). Pickup → 15 km radius filter. | — |
| F74 | Diagnostics checkout: create ONE parent order containing lab+radiology lines, pay once for the total; clear cart only after payment success; rollback bookings on failure (transaction). | — |
| F75 | `patient-app/app/(auth)/otp.tsx:198`: resend button → call the same send-OTP endpoint used on first send (`/auth/otp/request` or patient OTP route), then reset timer; disable while pending; show error on failure. | resend triggers backend call (network log) |
| F76 | `patient-app/app/returns/new-request.tsx:212`: use `expo-image-picker` (camera + library) → upload via `/media/upload` → store returned URLs in `attachments[]` sent with the return request. | return request stored with real image URLs |
| F77 | `consultations/prescription-from-doctor.tsx:167`: `addAllToReminders` → POST each medication to the reminders API (same endpoint used by the single "add reminder" flow). | reminders appear in reminders screen after reload |
| F79 | `provider-app/src/screens/lab/LabDashboard.tsx:511`: hide cash-confirm button unless booking payment state allows it. | button absent in WAITING_COPAY |
| Merge screens | Patient app: merge `health/family-hub` + `family/hub`; `profile/edit` + `health/edit-profile`; insurance `hub`+`claim-tracking`+`refund-status` into one screen with tabs. Delete the 59 redirect-stub screens after updating all links (`nav.py` must show 0 dead targets). | — |
| States | Add loading/error/empty states to the 22 + 12 screens listed by `screens.py`. | — |

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

## PHASE 12 — Brand, design system and UI rebuild (owner decision 2026-09-29)

Full specification: `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` **Part A** and **C1–C4**. The approved design is in `docs/design/canvas/` (`.dc.html` sources: `System`, `Palette`, `IconSet`, `Icon`, `Home`, `HomeDark`, `WebHome`, `Product`, `Checkout`, `Booking`, `Doctor`, `Success`, and the logo studies `NoonPulse`/`HeartPlus`/`PulsePlus`; `Main` and `canvas.json` index them). Text in brackets in the designs ([السعر], [اسم الطبيب]…) is always filled from real API data.

**Who builds what (owner decision 2026-10-01, replaces 05 C2).** The **implementer builds everything in Phase 12**, including the design stamps (`packages/design-tokens`, `packages/ui`, `packages/ui-native`, the icon wrapper, illustrations, motion helpers), under these rules:
1. **Port, never redraw.** The logo, the illustrated icons and every visual in `docs/design/canvas/` are copied from the canvas sources exactly (same SVG paths, colors, radii, spacing). The implementer never draws a new icon or illustration. Anything the canvas does not contain (onboarding/empty/error illustrations, extra service icons) is requested in `AGENT_PROGRESS.md` as `NEEDS_ASSET: <name>` and produced by a design session; until then the screen uses the `EmptyState` without art, never an emoji or a stock icon.
2. **Pixel check against the canvas.** Each stamp has a preview page; a Playwright test renders it next to the matching canvas frame and fails above a small pixel difference (light and dark, ar and en).
3. **Stop after the stamps.** When 12.A2, A5–A9 and C2 are done, push and stop. The screens (A11, C3, C4) start only after the reviewer approves the stamps.
4. **Review every part after building it:** run its Verify, paste the real output, fill the C3 row table; no screen is "done" without loading/empty/error/success states and real API data.

| Task | Built by | Do (spec in 05) | Verify |
|---|---|---|---|
| 12.A0 | — | The principle: one central design system, no hard-coded color, size, radius, spacing, shadow, icon or animation in any screen of the 4 clients. | Enforced by the lints in 12.A2, 12.A6 and 12.C2 |
| 12.A1 | Implementer (port from the canvas) | Logo "Noon Dot" in `packages/brand/` (SVG master, PNG sizes, favicon, maskable/adaptive icons, splash). The implementer replaces every old logo in the 4 clients, store metadata, emails, PDFs and OG images. | No old logo file referenced (grep); OG and email renders |
| 12.A2 | Implementer | Color tokens (`tokens.json` → CSS vars, TS module, theme preset), semantic names only; `tools/design/contrast-check.ts` in CI. | `contrast-check` green in both themes |
| 12.A3 | Implementer | Light and dark theme: device default, live update, user override synced to `preferences.theme`, no flash on web. | Theme tests |
| 12.A4 | Implementer | Language from the device, 6 locales, fallback rules, root `/` 302 (never overrides a locale in the URL), override synced to `preferences.locale`. **Extends F37 and the 7F hreflang/`x-default` work; does not change canonical URLs.** | Tests for each of the 6 device languages and an unsupported one |
| 12.A5 | Implementer | Typography: Readex Pro + per-locale Noto fallbacks, type-scale tokens. | No px font size in components (lint) |
| 12.A6 | Implementer | Illustrated icon set (one style, 48 grid), service tiles, Phosphor for small UI icons in one `<Icon>` wrapper, illustrations for onboarding/empty/error/success in `packages/brand/illustrations/`; `no-emoji-in-ui` lint. | Lint green; preview page |
| 12.A7 | Implementer | Components in `packages/ui` and `packages/ui-native` (same API): the list in 05 A7, with light/dark, RTL/LTR, states, keyboard and screen reader. | Preview page per component; a11y test |
| 12.A8 | Implementer | Liquid glass only on tab bar, scrolled app bar, sheets/modals and floating surfaces, with solid fallbacks and a scrim. | Contrast check on glass |
| 12.A9 | Implementer | Motion helpers: stagger, press, skeletons, success celebration, pulsing dot loader, reduce-motion. | Reduce-motion test |
| 12.A10 | Implementer | Responsive web at all breakpoints; no horizontal scroll. **Extends F82 (Phase 10) for layout only.** | Playwright screenshot suite 375/768/1280/1920 × ar/en × light/dark, with overflow and overlap checks |
| 12.A11 | Implementer | Rebuild **every** screen of patient-app, patient-web, provider-app and admin on the stamps. Merge duplicate screens. **Done together with Phase 8 "Merge screens"/journeys, Phase 9 (provider app UI) and 7B (admin on iPhone width), so each screen is touched once.** | 12.C3 rows complete; reviewer visual pass |
| 12.A12 | Implementer | Brand colors are not editable in admin; admin can enable and schedule pre-designed seasonal themes (token overrides, contrast-checked). | Toggle test; contrast check on each theme |
| 12.C1 | — | The canvas in `docs/design/canvas/` is the visual contract: match its tokens, spacing, hierarchy and components. | Reviewer visual pass |
| 12.C2 | Implementer | Lints in all 4 clients: `no-raw-color`, `no-emoji-in-ui`, and an import rule that screens take visual primitives only from `packages/ui*`. | Lints green in CI |
| 12.C3 | Implementer | For each rebuilt screen, `docs/audit/screens/<app>/<screen>.md`: one row per interactive element → API endpoint → DB collection → test id; loading/empty/error/success present; no mock data. **Extends R7-6 (states).** | Reviewer spot-checks with the live harness |
| 12.C4 | Implementer | Step budget: entity → confirmation in ≤ 3 screens (returning) / ≤ 4 (first time): Buy now/Book now → one-page checkout/booking with smart defaults, inline prescription upload, non-blocking insurance with a "Pay copay" notification. Deliverable `docs/ux/journeys.md` for every service × scenario. **Extends Phase 8 "Merge screens" and the R7-5 journey matrix.** | Journeys doc complete; journey e2e tests updated and within the budget |
| 12.C5 | Implementer drafts · owner approves | **Information architecture and content, before any screen is rebuilt.** A real redesign, not a re-skin of today's screens. Deliverable `docs/ux/ia.md` with: (1) the new app/site map: bottom tabs (count, names, order), header contents (search, location, cart, notifications, profile), web header and side menu; (2) the home page sections and their order, from real data only; (3) for each screen: its purpose, the information shown and its order, the primary action, what is removed or merged; (4) a content style guide: tone, short labels, button verbs, error and empty messages, in all 6 locales. Screens are rebuilt from this document, not from the old screens. | The owner approves `docs/ux/ia.md` in writing before 12.A11 starts; each rebuilt screen links to its section |
| 12.C6 | Design session | **Reference designs for the main screens not in the canvas** (about 15–20): search and results, medicine list/category, doctors list, labs, radiology, nursing, my orders, my bookings, order tracking, profile, family, pregnancy, notifications, login/onboarding, empty states. Added to `docs/design/canvas/` after the owner approves them. The implementer builds these screens from them; the remaining screens follow the same patterns. | Canvas files present; the owner approves |

**Gate P12:** the owner approved `docs/ux/ia.md` (12.C5) and the reference designs (12.C6); the stamps pass the pixel check against the canvas; `contrast-check`, `no-emoji-in-ui` and `no-raw-color` green in all 4 clients; the screenshot suite has no overflow or overlap across breakpoints × ar/en × light/dark; theme and language detection tests green; `docs/ux/journeys.md` complete with every journey within the step budget; the reviewer's visual pass on the 20 main screens of each client.

---

## PHASE 13 — Owner requirements not covered by any other phase

Full specification: `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` **Part B** (R1–R20). The task ids there are prefixed **13.** to avoid a clash with the review items R6-x/R7-x. Where a task extends an existing one, it is named; do the extension, not a second copy.

| Task | Summary | Extends |
|---|---|---|
| 13.R1 | Pharmacy staged geo-broadcast 3 → 5 → 8 km, offers kept, no duplicates; distinct delivery modes and radii | Phase 8 F73 |
| 13.R2 | Item-level substitution proposed by the pharmacy, accepted or rejected by the patient | — |
| 13.R3 | Price override audit (`price_overrides`) + admin history and CSV | — |
| 13.R4 | Location privacy before acceptance (approximate distance and district only) | — |
| 13.R5 | One error-code catalog for backend, apps, web and MCP, localized in 6 locales | Phase 3 error hygiene (F15) |
| 13.R6 | Provider `legal_name`/`display_name` and lifecycle; status changes propagate to search, sitemap, cache and MCP | 7F S15 |
| 13.R7 | Search pipeline (normalization, aliases, transliteration, intent/entity extraction, category scope) | F71, 7F V3 |
| 13.R8 | Entity graph; internal links only from real edges | — |
| 13.R9 | Dynamic product ranking service (events, windows, modes, category scope, pharmacy vs global, anti-abuse, one API) | — |
| 13.R10 | Ranking and search analytics in admin | 7B reports |
| 13.R11 | Saudi location hierarchy from verified official data | — |
| 13.R12 | Slug system with history and 301 on rename | — |
| 13.R13 | Observability, failed-propagation list, reconciliation job | — |
| 13.R14 | Consultation outputs (prescription, recommendations, referral) linking straight to booking/ordering | — |
| 13.R15 | Medical content trust (author, reviewer, references, human review of AI content) | 7F S5, A6 |
| 13.R16 | "Cite this" block and JSON-LD by page type | 7F S8 |
| 13.R17 | Provider "Verified on Nabd+" website badge | — |
| 13.R18 | `nabd://` fallback and deferred deep links | 7E D1–D6 |
| 13.R19 | One product id with 6 localized field sets, no per-language duplicates | 7F S13, S16 |
| 13.R20 | Final report per requirement of `طلب.md` (PASS/PARTIAL/FAIL/MISSING/MOCK/BLOCKED + evidence) | Phase 11 |
| 13.R21 | **AI gateway: test live and harden.** The gateway exists but was never tested live: `ai-gateway.service.ts` (7 providers, auto/manual mode, per-feature pin, daily quotas, usage log) and the admin page `ai-control`. A second service, `ai-provider.service.ts`, duplicates it.<br>Do:<br>• merge them into one service;<br>• limits per provider: requests per minute, requests per day, tokens per day (free tiers also limit per minute);<br>• on 429, 5xx or a timeout, move to the next provider with a cooldown, and return to the higher-priority provider when its window resets;<br>• manual pin, global and per feature, keeps working;<br>• the admin page shows live status, remaining quota, error rate, latency and usage per feature;<br>• API keys encrypted at rest (AES-GCM, key from env), masked in the UI, with a "test key" button;<br>• a timeout on every call;<br>• strip names, phone numbers and IDs before sending text to a provider;<br>• medical safety rules and disclaimers on health answers;<br>• cache identical requests (for example translations).<br>**Verify (live):** disable provider 1 → the next request uses provider 2; exhaust a quota → switch; pin → only that provider is used; no API ever returns a key. | AI features; Phase 10 medical safety |

Each task's Do and Verify are in 05 Part B. **Gate P13:** every Verify green; the 13.R9 test proves the ranking is not frozen; 13.R6 propagation proven live on staging; 13.R13 reconciliation shows 0 drift.

---

## PHASE 14 — Performance, capacity and resilience at scale

**Sources for this phase:**
- Full specification: `docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` **Part C5** (14.1–14.6).
- Research, layered design (L0–L12) and sources: **`docs/perf/SCALE_ARCHITECTURE.md`**.

**The goals:**
- anonymous browsing is served from the edge, so hundreds of thousands to millions of visitors barely touch the server;
- transactions (cart, checkout, booking, payment, chat, calls) are measured and then scaled step by step;
- nothing falls over under pressure: it degrades by priority.

Numbers come from load tests, not guesses. **X0, X11 and X12 must be done first.**

| Task | Summary | Extends |
|---|---|---|
| 14.1 | Edge caching of public pages (ISR, Cloudflare rules, image formats, purge on entity change) | F82 (Phase 10), 7F S15, 13.R6 |
| 14.2 | k6 load tests on staging with a copy of production data; report the real ceilings | — |
| 14.3 | Backend hot paths: Redis caching, indexes (no COLLSCAN), pools, pagination, N+1, rate limits | — |
| 14.4 | Write-path resilience: idempotent API, queue for side effects, outbox | F33 queue |
| 14.5 | Horizontal scaling runbook (`deploy/SCALING.md`); 2 backend nodes behind an LB on staging | — |
| 14.6 | Cloudflare WAF, bot and rate-limit rules in the repo; alerting | — |
| 14.7 | **Cache policy set per route, not by URL prefix** (follows X0).<br>• Default: `private, no-store`.<br>• `@PublicCache(ttl, tags)` on public read routes sends `public, s-maxage, stale-while-revalidate, stale-if-error` and a `Cache-Tag` header.<br>• Language-dependent responses carry the locale in the URL or `Vary: Accept-Language`.<br>**Verify:** a route-table test where every GET route is either private or explicitly public; CI fails if a public route reads the user. | X0 |
| 14.8 | **Instant purge by tag on every change** (price, stock, provider status, content). One invalidation event updates:<br>• Cloudflare: purge by Cache-Tag, now on every plan, about 150 ms;<br>• Nginx: a short TTL or a purge;<br>• Redis tags;<br>• Next.js `revalidateTag`.<br>**Verify:** change a price → the product page and the API show it everywhere within 5 s. | 7F S15, 13.R6 |
| 14.9 | **Edge-cached HTML for anonymous visitors.**<br>• Cloudflare Cache Rules cache public pages, with a bypass when the session cookie exists.<br>• Next.js 16 Cache Components/PPR keep the page shell static; personal parts (cart badge, name, insured prices) load on the client.<br>• `stale-if-error`, plus a branded "we're busy" page when the origin is down.<br>**Verify:** anonymous home, product and doctor pages are served with `cf-cache-status: HIT` ≥ 90% of the time; with the origin stopped, pages are still served. | 14.1, F82 |
| 14.10 | **Next.js on more than one instance.**<br>• A shared Redis cache handler for ISR and `use cache`.<br>• Invalidation is consistent across instances.<br>• Check the known Cache-Control issue with shared handlers, and pin a version that works.<br>**Verify:** two web instances behind Nginx serve the same revalidated content with the same Cache-Control. | 14.5 |
| 14.11 | **Safe Nginx micro-cache.**<br>• Only an allow-list of public routes is cached.<br>• `proxy_cache_lock`; `proxy_cache_use_stale updating error timeout http_500 http_502 http_503 http_504`; `proxy_cache_background_update on`.<br>• Public JSON is cached for 1–10 s, bypassed on `Authorization` or a session cookie.<br>• Static assets get long immutable caching.<br>• `limit_req`/`limit_conn` per route group: auth, OTP, search, checkout.<br>**Verify:** 1,000 identical requests in 1 s cause at most 2 upstream requests; the X0 leak test stays green. | X0, 14.6 |
| 14.12 | **Fastify by default.** The code already supports `USE_FASTIFY=true`.<br>• Run the whole live gate, click tests and contract tests under Fastify, and fix what breaks.<br>• Measure with k6, then make Fastify the default; keep the Express flag for rollback.<br>**Verify:** the gate is 100% in both modes; the RPS gain is reported. | — |
| 14.13 | **Cluster-safe by design** (follows X11). Any new shared state goes to Redis, and the gate runs in cluster mode in CI. | X11 |
| 14.14 | **Two Redis roles** (follows X12), with these cache rules:<br>• TTL with jitter;<br>• singleflight (exists);<br>• stale-while-revalidate for hot keys;<br>• hot data precomputed: home sections, categories, ranking.<br>**Verify:** a cold-cache spike of 500 RPS on one key causes 1 database query per refresh. | X12, 14.3 |
| 14.15 | **MongoDB.**<br>• Size the WiredTiger cache to the server: 0.5 GB today; start at 50–60% of the RAM left after the other services.<br>• Index every hot query, checked in CI with `explain()` on a production-size seed (21k medicines × 6 locales + 1M synthetic orders/bookings): 0 COLLSCAN on hot paths.<br>• `maxTimeMS` on every query; projections; pool size matched to the workers.<br>• Alert on the slow-query log.<br>• Dashboards and reports read precomputed collections (`$merge` jobs), never raw collections at peak.<br>• TTL indexes for events and logs.<br>**Verify:** the explain report is committed; the top 20 queries run in p95 < 20 ms on the seed. | 14.3 |
| 14.16 | **Search engine: Meilisearch.**<br>• Arabic normalization, typo tolerance, synonyms from `search_aliases`.<br>• Filters by locale, category and availability.<br>• Fed from the outbox or a change stream; Mongo text search is the fallback when it is down.<br>**Verify:** the V3 query suite finds the right item in the top 3 ≥ 95% of the time in 6 locales; p95 < 50 ms; with Meilisearch stopped, search still answers. | 13.R7, 7F V3 |
| 14.17 | **Load shedding by priority.**<br>• When event-loop delay or memory crosses a threshold, low-priority routes (recommendations, analytics events, nudges, admin reports) answer 503 + `Retry-After`.<br>• **Never shed:** auth, checkout and payment webhooks, SOS/ambulance, active calls, provider order acceptance.<br>• Clients honor `Retry-After` (15.1).<br>**Verify:** under a k6 stress test, checkout and SOS keep p95 < 1 s while low-priority routes are shed. | 15.1 |
| 14.18 | **Kill switches and degraded modes.**<br>• Admin toggles per heavy feature (AI, recommendations, nudges, live map, analytics ingestion, search suggestions) take effect within seconds, without a deploy.<br>• A read-only/maintenance banner per app (exists from R6-5).<br>**Verify:** each toggle is tested live. | 7B-B4 |
| 14.19 | **Waiting room for extreme spikes** (campaign launches, Ramadan offers).<br>• Cloudflare Waiting Room needs the Business plan.<br>• Otherwise, a lightweight edge queue (a Cloudflare Worker + token) in front of checkout only.<br>The owner decides the plan.<br>**Verify:** a spike above capacity queues users instead of failing them. | — |
| 14.20 | **Media.**<br>• Images resized on the fly (self-hosted imgproxy, or Cloudflare image resizing), served as AVIF/WebP with `srcset`/`sizes`.<br>• Lazy loading below the fold; placeholders.<br>• Originals kept in object storage; EXIF/GPS stripped on upload (16.5).<br>**Verify:** product and doctor images ≤ 60 KB on mobile; the LCP image is preloaded. | F82 |
| 14.21 | **Realtime at scale.**<br>• Socket.IO + Redis adapter (X11).<br>• Reconnect with backoff, and a full state resync on reconnect.<br>• A documented threshold (about 50–100k concurrent connections) for moving to Centrifugo (Go).<br>**Verify:** 10k simulated sockets on staging with < 1% message loss; a reconnect-resync test. | X11 |
| 14.22 | **Calls.**<br>• LiveKit and coturn on their own server.<br>• Simulcast, dynacast and adaptive stream.<br>• Audio-only fallback when bandwidth drops, then chat.<br>• TURN over TLS 443 for strict networks.<br>• Measure per-node capacity with LiveKit's load tester; LiveKit Cloud as overflow (owner decision).<br>**Verify:** a capacity report; a call survives a switch from Wi-Fi to 4G and degrades to audio on a throttled link. | Phase 10 |
| 14.23 | **Web performance.**<br>• Cache Components/PPR on entity pages; server components to cut client JS.<br>• `next/image` with `priority` and `sizes` for the LCP image.<br>• Fonts subset per script (Arabic/Latin/Devanagari/Bengali) with `font-display: swap`.<br>• Speculation Rules: prefetch on hover and prerender likely next pages, never cart or checkout links; pages safe for the back/forward cache.<br>• Third-party scripts load after interaction.<br>• CI budgets (size-limit + Lighthouse CI) on mobile: LCP ≤ 2.0 s, INP ≤ 200 ms, CLS ≤ 0.1, JS ≤ 170 KB gzip on entity pages.<br>• Real-user monitoring (web-vitals) per page type.<br>**Verify:** Lighthouse CI green on the 20 main pages; the RUM dashboard is live. | F82, 12 |
| 14.24 | **App performance.**<br>• New Architecture + Hermes.<br>• FlashList v2 for every long list (medicines, doctors, orders).<br>• `expo-image` with memory/disk cache and placeholders.<br>• A persisted query cache, so the app opens with data; prefetch the next screen's data.<br>• Avoid re-renders (memoized selectors).<br>• Budgets: cold start ≤ 2 s on a mid-range Android; 60 fps scrolling; memory < 300 MB; bundle size tracked.<br>• Always measure release builds on a low-end device.<br>**Verify:** a performance report per release on a low-end Android. | 15.10 |
| 14.25 | **Lean APIs.**<br>• Cursor pagination with caps on every list; field projection.<br>• One composite endpoint for the home screen instead of many calls.<br>• ETag/304 for cacheable resources.<br>• Compression at the edge or Nginx, not in Node.<br>• Keep-alive pools (`undici`) for outbound calls.<br>**Verify:** the home screen makes ≤ 3 API calls; no list endpoint lacks a cap. | 14.3 |
| 14.26 | **Background work isolated.**<br>• Queue workers and cron jobs run as separate processes/containers, scaled on their own, never inside the API workers.<br>• Campaign fan-out is batched and rate-limited per channel (push, SMS, email, WhatsApp), so 1M recipients never slow the API.<br>**Verify:** a 100k-recipient campaign during a k6 load test leaves the API p95 unchanged. | N7, N8 |
| 14.27 | **Capacity report** (extends 14.2).<br>• k6 load, stress, spike and soak scenarios over the real traffic mix: browse, search, product, doctor, add to cart, checkout + payment webhook, booking, chat, call join, campaign fan-out.<br>• Targets from `SCALE_ARCHITECTURE.md` §5.<br>• Publish the measured ceiling of each scenario, the first bottleneck and the next step.<br>• Re-run after each scale step. | 14.2 |
| 14.28 | **Scale-out steps** (extends 14.5): the five steps and trigger metrics in `SCALE_ARCHITECTURE.md` §6, each with a runbook in `deploy/SCALING.md`, plus a staging rehearsal of step 3 (2 API nodes + a load balancer + a 3-node replica set). | 14.5 |

**Gate P14:**
- the X0 leak test, the cluster-mode gate and the Redis split are green;
- the load-test report is committed with the measured ceilings;
- edge cache hit ≥ 90% on anonymous pages;
- Core Web Vitals pass on the 20 main pages (lab tests + real users);
- 1,000 identical requests reach the origin at most twice;
- checkout and SOS keep p95 < 1 s under stress;
- the app performance report on a low-end Android is attached.

---

## PHASE 15 — Resilience: expect the worst (owner decision 2026-10-01)

Real users have weak or dropped networks, old and low-end phones, Huawei phones without Google services, slow servers, double taps and empty or broken data. One visible failure makes the whole product look broken. Every task needs a test or a live-harness step, not a claim.

| Task | Do | Verify |
|---|---|---|
| 15.1 | **One API client per app** (patient-app, provider-app, patient-web BFF, admin BFF):<br>• a timeout on every request: 15 s by default, 60 s for uploads, 45 s for AI. Today the patient-app `apiFetch` has **no timeout**, so on a weak network it waits forever;<br>• retries only for safe requests or requests with an idempotency key, with exponential backoff + jitter, honoring `Retry-After`;<br>• the request is cancelled when the screen closes;<br>• offline detection;<br>• every error mapped to the error catalog (13.R5), with a localized message and a next step ("retry", "check your connection", "contact support"). | Unit tests per client:<br>• the timeout fires;<br>• a retry honors `Retry-After`;<br>• no retry for a non-idempotent POST without a key. |
| 15.2 | **No double actions.**<br>• Every button that writes is disabled while sending and shows progress.<br>• Every write carries an idempotency key (idemcheck = 0) and the server deduplicates.<br>• One in-flight payment per order; one booking per slot per patient. | Live: tapping "pay", "book", "order" or "send" 10 times quickly creates exactly one record and one charge. |
| 15.3 | **Optimistic UI only where it is safe.**<br>• Optimistic: cart add/remove/quantity, wishlist, reminders on/off, mark as read, likes. On failure, roll back and show a toast.<br>• **Never** optimistic: payment, booking, prescription, emergency. Show a clear "processing" state instead. | Tests:<br>• a forced 500 → the UI rolls back and explains;<br>• payment shows "processing" until the server confirms. |
| 15.4 | **Weak and no network.**<br>• Cached data stays visible offline, with an "offline" banner and a "last updated" time.<br>• Safe actions are queued and replayed in order on reconnect (outbox; never payments).<br>• Uploads can resume.<br>• Lower image quality on slow networks.<br>• Calls fall back to audio, then to chat. | Live with network throttling (Playwright/Detox or `tc netem`) at 3G, 1% loss and offline: the app stays usable and recovers. |
| 15.5 | **Nothing crashes to a blank screen.**<br>• Error boundaries at the app root and per screen (React Native), and `error.tsx`/`global-error.tsx` per route segment (web), each with "try again" and "contact support".<br>• Crash and error reporting (Sentry) for the backend, web and both apps, with releases and source maps.<br>• Target: ≥ 99.5% crash-free users. | A thrown render error shows the fallback, not a white screen, and Sentry receives it with the release. |
| 15.6 | **Bad or empty data never breaks a page.**<br>• Every screen handles null, empty, very long, mixed RTL/LTR and unexpected values.<br>• The backend never returns 500 for bad input: fuzz the OpenAPI spec with Schemathesis in CI.<br>• Empty states everywhere (R7-6, 12.C3). | • The Schemathesis run finds 0 server errors.<br>• Screen snapshot tests with null-heavy fixtures. |
| 15.7 | **Slow or failing dependencies.**<br>• A timeout and a circuit breaker on every external call: payment, SMS, email, WhatsApp, AI, maps, S3, LiveKit.<br>• Fallbacks: SMS → email or WhatsApp; AI → the next provider; maps → a typed address.<br>• The user always sees what happened and what to do next. | Chaos tests (15.11), one per dependency. |
| 15.8 | **Recovery from interruptions.**<br>• If the app is killed or the phone switches off during checkout or payment, on reopening the user lands on the order's real state from the server (pending, paid, failed).<br>• When a payment returns with no network, the reconciliation (exists) runs and the UI updates once online.<br>• A push opened days later shows the current state. | Live: kill the app after "pay" → reopen → the correct state, and no duplicate charge. |
| 15.9 | **Clocks and time zones.**<br>• Server time is used for OTP expiry, slots and reminders, so a wrong device clock changes nothing.<br>• Times are shown in the user's time zone; providers use Asia/Riyadh.<br>• Ramadan and holiday hours are supported in provider schedules. | Tests with the device clock ±1 day. |
| 15.10 | **Devices and browsers.**<br>• The minimum OS is documented: iOS 16.4+ and Android 7+ (Expo SDK 57). Older devices get a clear message pointing to the website.<br>• A device-farm run per release (Firebase Test Lab, BrowserStack or AWS Device Farm), covering:<br>&nbsp;&nbsp;– small and large phones, and tablets;<br>&nbsp;&nbsp;– a low-end Android (2–3 GB RAM) and a Huawei without Google services;<br>&nbsp;&nbsp;– iPhone SE and Pro Max;<br>&nbsp;&nbsp;– dark mode, font scale 200%, Arabic and English.<br>• Web on Safari iOS 16+, Chrome Android, Samsung Internet and desktop browsers (Playwright WebKit/Firefox/Chromium in CI). | A device-farm report per release with 0 blocking issues. |
| 15.11 | **Chaos and failure drills in the live gate.** Each failure has an asserted behavior (degrade, retry, message) and never loses data:<br>• Redis down;<br>• MongoDB primary step-down;<br>• a slow API (+2 s);<br>• payment gateway 500;<br>• SMS provider down;<br>• LiveKit down. | The gate steps are green. |
| 15.12 | **Ship fixes fast and safely.**<br>• OTA updates for JS fixes (EAS Update), with staged rollout and instant rollback.<br>• Remote feature flags (kill switches, 14.18).<br>• Force-update (exists, R6-5) verified on both apps. | A test OTA rolls out to 5%, then rolls back. |

**Gate P15:**
- every Verify is green;
- the throttled-network, rapid-tap and app-killed-during-payment journeys are in the live gate;
- the device-farm report is attached.

---

## PHASE 16 — Security hardening (owner decision 2026-10-01; after 7D)

| Task | Do | Verify |
|---|---|---|
| 16.1 | **Secrets.**<br>• `.gitignore` ignores every `.env` and `.env.*` (except `.env.example`) in every app. Today only `.env*.local` and `deploy/.env.production` are ignored.<br>• gitleaks on every PR.<br>• Rotate the TURN secret found in the history (Phase 11 notes).<br>• Secrets live only in env vars or a secret store.<br>• AI provider keys are encrypted at rest and masked (13.R21). | • gitleaks in CI is green on the full history.<br>• A `git check-ignore` test for `.env` in each app. |
| 16.2 | **Passwords.**<br>• At least 10 characters, checked against a breached-password list (a k-anonymity API or a local top list); no low maximum.<br>• Review the argon2id or bcrypt cost.<br>• Progressive delays and a lockout after failed attempts.<br>• The same answer on login and "forgot password" whether or not the account exists (no account enumeration). | • Unit tests.<br>• Live: 10 wrong passwords → slowed or locked.<br>• A known and an unknown email get the same answer. |
| 16.3 | **Bots, CAPTCHA and SMS fraud.**<br>• Cloudflare Turnstile (free) on register, login, OTP, password reset, contact, review and support forms on the web. The apps use App Attest / Play Integrity, or Turnstile in a WebView.<br>• **SMS pumping protection:**<br>&nbsp;&nbsp;– at most 3–5 OTPs per number per hour;<br>&nbsp;&nbsp;– at most 10–20 numbers per IP per hour;<br>&nbsp;&nbsp;– an allow-list of the country codes served;<br>&nbsp;&nbsp;– a daily SMS budget with an alert. | Live:<br>• the 6th OTP for a number within an hour → refused;<br>• a country code not on the list → refused;<br>• a web form without a Turnstile token → refused. |
| 16.4 | **Transport and headers.**<br>• HSTS with preload; TLS rated A+ on SSL Labs.<br>• CSP (exists, F68) audited.<br>• `Permissions-Policy`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`.<br>• Cookies `Secure; HttpOnly; SameSite`.<br>• `security.txt`.<br>• `autoindex off` set explicitly in Nginx (no directory listing). | • A header test on every host.<br>• SSL Labs A+. |
| 16.5 | **Uploads.**<br>• Check the file type by its magic bytes; size limits per purpose.<br>• Re-encode images and strip EXIF/GPS: a photo of a prescription can reveal the patient's home location.<br>• Sanitize PDFs; scan documents with an antivirus (ClamAV).<br>• Random file names, private buckets, short signed URLs (as fixed in R7-2). | Tests:<br>• a renamed `.exe` → refused;<br>• an uploaded photo has no GPS tag afterwards. |
| 16.6 | **Errors and logs.**<br>• Production errors return a generic message and an error id, never a stack trace or internal detail.<br>• Logs mask phone, email, national ID and medical data.<br>• A log retention policy.<br>• The admin audit log is append-only. | • A forced 500 shows only the error id.<br>• A log scan finds no unmasked phone or email. |
| 16.7 | **Dependencies and supply chain.**<br>• Dependabot or Renovate weekly for every app.<br>• `npm audit`: 0 high/critical runtime issues, as a CI gate.<br>• Lockfiles enforced.<br>• GitHub Actions pinned by commit SHA.<br>• An SBOM (CycloneDX) per release.<br>• Docker images scanned with Trivy.<br>• CodeQL (exists). | The CI jobs are green. |
| 16.8 | **Dynamic testing.**<br>• OWASP ZAP baseline against staging in CI.<br>• An external penetration test before launch (owner).<br>• Later, a bug bounty. | • A ZAP report with 0 high findings.<br>• The pentest report (owner). |
| 16.9 | **Health data protection** (PDPL "sensitive" data).<br>• Field-level encryption at rest for diagnoses, reports, prescriptions and insurance documents.<br>• Encrypted backups.<br>• An access log of who viewed which medical record (patient, provider, admin), visible to the admin and, on request, to the patient.<br>• Retention and deletion schedules. | Tests:<br>• the raw DB field is ciphertext;<br>• every read of a medical record writes an access-log row. |
| 16.10 | **Servers.**<br>• SSH keys only; fail2ban (exists); a firewall allow-list; automatic security updates.<br>• Containers run as non-root, with read-only file systems where possible.<br>• MongoDB and Redis are never exposed publicly (bind, auth, TLS between hosts); Redis ACLs. | A port scan of the server shows only 80/443 (plus the TURN ports). |
| 16.11 | **Mobile apps.**<br>• Tokens only in SecureStore/Keychain; no secrets in the bundle.<br>• App Attest / Play Integrity on sensitive endpoints (OTP, payment).<br>• Screenshot protection on medical-record screens (Android `FLAG_SECURE`; blur on app switch on iOS). | A test per item. |
| 16.12 | **Business-logic abuse.**<br>• Limits on coupon and loyalty abuse.<br>• Referral fraud checks: one device/phone per referral.<br>• Reviews only from completed orders or bookings.<br>• Server-side prices and totals (exists).<br>• Atomic stock reservation.<br>• Per-user rate limits on expensive actions (AI, search, uploads). | A test per rule. |
| 16.13 | **DNS and email** (checked against the owner's Cloudflare records on 2026-10-01):<br>• **`turn.nabd.plus` is missing.** Coturn is configured for it (`deploy/coturn/turnserver.conf`). Add an A record, **DNS only** (grey); calls behind strict networks need it.<br>• `live.nabd.plus` is proxied. LiveKit signaling works through Cloudflare, but prefer DNS only, as `deploy/DNS-RECORDS.md` says, and confirm the media ports.<br>• **SPF:** the root domain has none (only the `send` subdomain has one). Add one SPF record covering every sender used: Brevo, SES/Resend.<br>• Use **one** transactional email provider for OTP and notifications; three are configured today (Brevo, Resend, SES).<br>• **DMARC:** move from `p=none` to `quarantine` after two weeks of clean reports.<br>• Add **CAA** records (Let's Encrypt + Cloudflare).<br>• Fix the corrupted TXT name `xn--_a2a-zk7a._agents`: it should be `_a2a._agents` (the SVCB record already uses the right name).<br>• `app.nabd.plus` now exists: serve the AASA/assetlinks there or remove it from `app.json` (D1).<br>• Keep the Swagger docs (`/api/v1/docs`) closed on production. | • `dig` checks for each record.<br>• mail-tester score ≥ 9/10 for the OTP email.<br>• SSL Labs + DMARC reports clean.<br>• `/api/v1/docs` on production → 404/403. |

**Gate P16:**
- every Verify is green;
- gitleaks, npm audit, Trivy and ZAP run in CI;
- the OTP-abuse journey is in the live gate.

---

## PHASE 17 — UX essentials and accessibility (owner decision 2026-10-01; done with the Phase 12 screens)

| Task | Do | Verify |
|---|---|---|
| 17.1 | **Navigation.**<br>• A sticky header (web) and a mobile menu.<br>• Breadcrumbs.<br>• A back-to-top button on long pages; a scroll progress bar on articles.<br>• A "skip to content" link.<br>• Clean 404, 500 and offline pages with search and popular links. | • A render test per item.<br>• Keyboard only: the main content is reached with one Tab. |
| 17.2 | **Interaction feedback.**<br>• Hover, focus-visible and pressed states on every control.<br>• Loading skeletons (not spinners) for content.<br>• A confirmation dialog before every destructive action: cancel an order, delete an address, remove a family member, delete the account.<br>• A password visibility toggle.<br>• Copy-to-clipboard for order and booking numbers, coupons and referral codes.<br>• Toasts for results. | The click tests (R7-1 harness) cover each pattern. |
| 17.3 | **Search everywhere.**<br>• Full-site search in the web header and at the top of the app home.<br>• Instant suggestions; recent and trending searches; barcode and voice where supported.<br>• A helpful no-results page: "did you mean", categories, "ask a pharmacist". | The V3 query suite plus a UI test. |
| 17.4 | **Content helpers.**<br>• Expandable FAQ sections (with FAQPage schema).<br>• "Updated on" dates on articles and medical pages.<br>• A print stylesheet for prescriptions, invoices, orders and reports.<br>• Share buttons that use canonical URLs (D4). | • Render tests.<br>• A print-preview check. |
| 17.5 | **Contact and engagement.**<br>• A floating contact/WhatsApp/support button that never covers a primary action and is hidden on checkout.<br>• Newsletter signup with consent and double opt-in.<br>• UTM parameters on every campaign link (N7), with orders attributed to campaigns. | • Tests.<br>• The campaign report shows the attributed orders. |
| 17.6 | **Consent.**<br>• A simple cookie/consent banner, only if non-essential cookies or analytics are used (PDPL), with real choices.<br>• A privacy center (data export and deletion exist, Phase 10). | Without consent, no analytics request is sent. |
| 17.7 | **Theme toggle:** a dark-mode toggle in settings and in the web header (12.A3). | Covered by 12.A3. |
| 17.8 | **Accessibility (WCAG 2.2 AA).**<br>• Keyboard access and visible focus.<br>• A label on every control; alt text (S17).<br>• VoiceOver and TalkBack tested in Arabic and English.<br>• Text scaling to 200% without breaking layouts.<br>• Touch targets ≥ 44 px; contrast (12.A2); reduced motion (12.A9); captions on videos. | • axe-core in CI: 0 serious issues on the 20 main pages.<br>• A manual screen-reader pass per release. |
| 17.9 | **Forms that are easy on a phone.**<br>• Correct `autocomplete`/`textContentType`.<br>• Numeric keypads for phone numbers, OTPs and amounts.<br>• OTP autofill: iOS one-time-code and Android SMS Retriever.<br>• Arabic and Latin digits both accepted.<br>• Inline validation with clear, localized messages.<br>• The input is kept after an error. | A test per form. |
| 17.10 | **Trust signals.**<br>• Verified-provider badges and license numbers (SCFHS).<br>• Pharmacist availability.<br>• Secure-payment marks.<br>• Clear delivery and refund policies.<br>• Ratings only from real orders. | Render tests on the entity pages. |

**Gate P17:**
- axe-core is green;
- the click tests cover 17.1–17.5;
- the screen-reader pass is recorded.

---

## PHASE 18 — Languages, content and copy (owner decision 2026-10-01; done with the Phase 12 screens)

| Task | Do | Verify |
|---|---|---|
| 18.1 | **100% translation coverage in the 6 locales**, for:<br>• every UI string on the web, in both apps, and in the user-facing parts of the admin;<br>• every backend message: push, in-app, email, SMS, PDF and error messages.<br>Today the backend dictionary has 0 of 627 keys in hi, bn and fil. | A key-coverage test in CI per app and for the backend: 0 missing keys, 0 raw keys rendered. |
| 18.2 | **Language fallback rules:** the user's chosen language → the device language if supported → English. Arabic only when the user chose it or the device is in Arabic, so Urdu, Hindi, Bengali and Filipino users no longer get Arabic silently. This applies to the UI, notifications (N12), emails and SMS. | Tests per locale and for an unsupported locale. |
| 18.3 | **Translation workflow.**<br>• Source strings in one place per app.<br>• A medical glossary per locale.<br>• Patient-facing medical text reviewed by a qualified person for each locale.<br>• AI translation only as a draft, through the AI gateway (13.R21), marked "needs review" until approved. | • The glossary is committed.<br>• The review flag is enforced in the admin content tools. |
| 18.4 | **Locale formatting.**<br>• ICU MessageFormat for plurals and gender.<br>• Numbers in Arabic-Indic or Latin digits, by locale and the user's preference.<br>• Gregorian dates, with an optional Hijri display.<br>• Currency (SAR / ر.س) and phone numbers.<br>• Bidi isolation for Latin medicine names inside Arabic sentences. | Snapshot tests per locale. |
| 18.5 | **Copy guide** (`docs/content/COPY_GUIDE.md`). Applied to home, product, doctor, service, checkout, onboarding, notifications and emails.<br>**Do:**<br>• benefit before feature;<br>• one idea per section, with 1–3 bullets;<br>• specific headlines; short, scannable paragraphs;<br>• a clear CTA = verb + outcome ("اطلب الآن ويصلك اليوم");<br>• answer objections before the CTA (delivery time, licensed pharmacist, refund, insurance);<br>• proof next to every claim (ratings count, license, delivery time from real data);<br>• the first screen says what it is, the price and how fast;<br>• write to one person.<br>**Never:**<br>• fabricated or superlative medical claims (SFDA);<br>• generic openers;<br>• em dashes, aphorisms or "not X but Y" formulas. | • A content lint in CI: banned phrases per locale, length limits per component.<br>• The owner reviews the key pages. |
| 18.6 | **Content QA automation.**<br>• The S13 banned-claims list applied to all user-facing text, not only the catalog.<br>• Length checks per component.<br>• Screenshots per locale in the 12.A10 suite, to catch overflow in long languages. | CI is green. |
| 18.7 | **One brand name: "نبض بلس / Nabd+"** (owner decision 2026-10-01).<br>• Never "نبضة", "Nabdah", "تطبيق/موقع/منصة المريض" or "patient app" in anything a user sees: store listings, app names, page titles, emails, SMS, PDFs, invoices, notifications, legal texts.<br>• The provider app is "نبض بلس للأعمال / Nabd+ Business" (the owner may rename it).<br>• Internal names (containers, server paths, bundle IDs) stay as they are.<br>• Today the patient-facing code has "نبضة" in 19 files, "Nabdah/nabdah" in about 90 and "تطبيق/موقع المريض" in 3. | A CI check fails on the banned names in user-facing strings and translation files. |

**Gate P18:**
- 100% coverage in the 6 locales;
- the fallback tests are green;
- the owner approves the copy guide.

---

## PHASE 19 — Saudi compliance and national integrations (owner decisions; implemented as each decision is made)

| Task | Owner decision / Do | Verify |
|---|---|---|
| 19.1 | **Hosting location and PDPL** (owner + lawyer).<br>• Health data is "sensitive" under the PDPL.<br>• The PDPL does not require hosting inside Saudi Arabia by default. Moving personal data outside the Kingdom needs SDAIA's conditions: adequacy, or safeguards such as standard contractual clauses; a transfer risk assessment; only the minimum data.<br>• OVHcloud lists no Saudi region.<br>• **Decide:** keep OVH with the transfer safeguards, or move personal and health data to a Saudi cloud.<br>• Also: register with SDAIA where required, appoint a DPO, keep a records-of-processing register, and have a 72-hour breach notification procedure. | • The written decision and documents (owner).<br>• The implementer adds the processing register and the breach runbook. |
| 19.2 | **Sector rules** (owner):<br>• MOH licensing for telemedicine and pharmacy e-commerce;<br>• the NCA cybersecurity controls, if they apply;<br>• SFDA rules for online medicine listings (no advertising of prescription drugs), and a link for adverse-event reporting. | The owner's checklist. |
| 19.3 | **Professional license checks.** The SCFHS license number and status for doctors, nurses and pharmacists, checked at onboarding and periodically, and shown on profiles (17.10). | • An onboarding test.<br>• An expired license → the provider is hidden. |
| 19.4 | **Future, after licensing (owner 2026-10-01): not now.** **Nphies (CCHI) for insurance.** Eligibility, pre-authorization and claims through Nphies (HL7 FHIR R4), directly or through a licensed clearing house. The existing insurance flows (P8, R7-4) are mapped to Nphies messages. | • Sandbox certification (the owner registers).<br>• Integration tests. |
| 19.5 | **Future, after licensing (owner 2026-10-01): not now.** **Wasfaty e-prescriptions** (NUPCO) for partner pharmacies, if the owner wants government prescriptions dispensed through the platform. | Owner decision, then integration tests. |
| 19.6 | **Future, after licensing (owner 2026-10-01): not now.** **Nafath identity verification** for providers (KYC) and, where required, for patients (prescriptions, insurance). | Owner decision, then integration tests. |
| 19.7 | **Saudi National Address (SPL).** Address capture by the short address code, with validation, used for delivery and nursing visits. | An integration test against the SPL API sandbox. |
| 19.8 | **ZATCA e-invoicing Phase 2** (Fatoora integration), when the business is called to its wave. The Phase 1 QR exists. | The owner confirms the wave; integration tests. |
| 19.9 | **All payment methods** (owner decision 2026-10-01):<br>• Visa, Mastercard and mada;<br>• Apple Pay, Google Pay and STC Pay;<br>• cash on delivery (with the limits in 21.5);<br>• instalments with Tabby and Tamara ("buy now, pay later").<br>Check per method what the gateway (Moyasar) enables. Tabby and Tamara are separate integrations, each with its own merchant approval; check with each whether medicines and prescription items are allowed. | A sandbox journey per method (success, failure, refund). |
| 19.10 | **App stores.**<br>• Apple's medical-app rules and privacy labels.<br>• Google Play's health-apps declaration and Data safety form.<br>• A Huawei AppGallery listing, for phones without Google services (N13). | The store submissions (owner). |
| 19.11 | **Insurance flow as it works today** (owner, 2026-10-01). The platform does **not** connect to Nphies or the insurers. Keep and verify this flow for every service (pharmacy, consultation, lab, radiology, nursing):<br>1. The patient saves the insurance details and documents in the profile (or adds them at checkout).<br>2. The patient orders "with insurance". The provider receives the request with the patient's and the insurance details: company, class, iqama/ID, documents.<br>3. The provider submits it on **its own** system (Nphies or the insurer's portal), using the details shown in its app.<br>4. The provider enters the outcome in its app: approved, partly approved or rejected, and the patient's copay.<br>5. The patient gets a notification and pays the copay.<br>6. The provider gets a notification, and the service continues normally. | A live journey per service type covering full approval, partial approval and rejection, each with copay payment and both notifications. |
| 19.12 | **Legal documents, versioned and accepted.**<br>• **Patient Terms of Use, Privacy Policy, medical disclaimer and telemedicine consent**, in 6 locales. They make clear, in a calm and non-defensive tone, that:<br>&nbsp;&nbsp;– Nabd+ connects users with licensed, independent providers (doctors, pharmacies, labs, radiology centres, nursing);<br>&nbsp;&nbsp;– medical decisions and services are the providers' responsibility;<br>&nbsp;&nbsp;– Nabd+ is not an emergency service (call 997);<br>&nbsp;&nbsp;– how data is shared with providers and insurers for an order;<br>&nbsp;&nbsp;– the user's PDPL rights; guest data; family accounts and minors; payments, refunds and cancellations; limits of liability; Saudi law and venue.<br>• **Provider agreement and provider privacy/data-processing terms:**<br>&nbsp;&nbsp;– valid licenses (SCFHS/MOH) and professional liability insurance;<br>&nbsp;&nbsp;– responsibility for the care given; indemnity;<br>&nbsp;&nbsp;– patient-data confidentiality and PDPL duties;<br>&nbsp;&nbsp;– service levels, pricing and commission, prohibited conduct;<br>&nbsp;&nbsp;– audits, suspension and termination.<br>• **One source:** the existing `legal_policies`/`legal_acceptances` store. Today the web terms page uses a static component and the app reads `system-config`; both must read this store.<br>• Each acceptance stores the version, time, device and IP. A new version asks for re-acceptance, for guests too.<br>• The reviewer drafts the texts; **a Saudi lawyer approves them before publishing.** | • A test: a new version → the next login asks for acceptance, and the acceptance row is stored.<br>• Web and app show the same text per locale. |

**Gate P19:**
- each owner decision is written down;
- each chosen integration passes its sandbox tests.

---

## PHASE 20 — Observability, reliability and operations (owner decision 2026-10-01)

| Task | Do | Verify |
|---|---|---|
| 20.1 | **Tracing.** OpenTelemetry across web/BFF → API → MongoDB/Redis/queues → external calls, with one request id end to end (extends 13.R13). | A trace of a checkout shows every hop. |
| 20.2 | **Metrics and dashboards** (Prometheus + Grafana, or equivalent):<br>• RPS; p50/p95/p99; errors per route;<br>• event-loop delay and heap;<br>• MongoDB latency and cache hit; Redis memory and evictions;<br>• queue depth and age;<br>• edge and Nginx cache-hit ratios;<br>• open sockets; LiveKit rooms, CPU and bandwidth;<br>• push, SMS and email success rates. | The dashboards are kept in the repo as code. |
| 20.3 | **Logs.** Structured JSON, collected centrally (for example Loki), searchable by request id, with PII masked (16.6) and a set retention. | A search by request id works. |
| 20.4 | **Errors.** Sentry (or equivalent) for the backend, web and both apps, with releases and source maps (15.5). | A test error is visible with its stack and release. |
| 20.5 | **SLOs and alerts.**<br>• API availability 99.9%, checkout success rate, and p95 per route group.<br>• Alerts to the owner (email + push/WhatsApp/Telegram), each with a runbook link. | Each alert fired once in a drill. |
| 20.6 | **Uptime.** External checks from several regions, and a public status page. | The status page is live. |
| 20.7 | **Synthetic journeys in production**, every 5–15 minutes: open home, search, open a product, add to cart (no payment), list doctor slots, log in as a test patient. | An alert fires when a journey fails twice. |
| 20.8 | **Backups and disaster recovery.**<br>• Nightly backups (exist), plus point-in-time recovery from the oplog; encrypted and copied off-site.<br>• The weekly restore drill (exists).<br>• Targets: RPO ≤ 15 min, RTO ≤ 1 h.<br>• A written DR runbook. | The drill report meets the targets. |
| 20.9 | **Safe deployments.**<br>• Zero-downtime rolling or blue-green deploys, with health checks and automatic rollback.<br>• Database migrations in expand/contract steps.<br>• Feature flags for risky changes. | A deploy during a k6 run shows 0 failed requests. |
| 20.10 | **Capacity and cost reviews**, monthly, from the dashboards. A scale-out step is triggered by the metrics in `SCALE_ARCHITECTURE.md` §6. | A monthly note in `docs/perf/`. |

**Gate P20:**
- the dashboards, alerts, status page and synthetic journeys are live;
- the DR drill meets the RPO/RTO targets.

---

## PHASE 21 — Accounts, guests and verification (owner decision 2026-10-01)

**Facts checked in the code on 2026-10-01:**
- **Guest conversion is not called by the app.** `POST /auth/guest` and `POST /auth/convert-guest` exist, but only the web calls `convert-guest`. A guest who signs up in the **app** starts an empty account and loses their history.
- **`migrateGuestData` moves only part of the data:** `orders` (the legacy collection), `carts`, `appointments`, push tokens, notifications, search queries, product views and storage objects.
- **It misses most of the real data:** `pharmacy_orders`, lab, radiology, nursing and consultation bookings, prescriptions, reminders, addresses, insurance cards, returns, payments, `media_assets`, loyalty, chat and support.
- **It is not atomic:** each step is "best effort", so a failure halfway leaves the data split between two accounts.
- **Social sign-in from a guest device does not merge.**

| Task | Do | Verify |
|---|---|---|
| 21.1 | **Guest identity.**<br>• A real server-side guest account (UUID, `is_guest`).<br>• Its token is kept in SecureStore/Keychain (app) or an httpOnly cookie (web), together with a device id.<br>• The IP address is never used as identity: it changes and is shared. | Reinstalling the app without signing in creates a new guest; a reopen keeps the same guest. |
| 21.2 | **Guest → account merge for every sign-up or sign-in method:** email, phone, Google, Apple, Snapchat and X.<br>• Every collection that holds the guest's data is moved (the list above, generated from the schemas so new collections are not forgotten).<br>• The move runs in **one MongoDB transaction**, with clear rules for conflicts (two carts → merged; duplicate addresses → deduplicated).<br>• One audit row records what moved.<br>• The patient app calls it. | • Live in the app and on the web: as a guest, order from the pharmacy, book a lab test and add an address. Sign in with Google → everything is in the account.<br>• A failure injected halfway → nothing is moved. |
| 21.3 | **What a guest may do** (a permission matrix the admin can edit).<br>**Default — a guest may:**<br>• browse, search and use the cart;<br>• order from the pharmacy;<br>• book consultations, labs, radiology and nursing, paying by card or cash.<br>**A full account is required for:**<br>• insurance;<br>• family;<br>• medical records and reports;<br>• prescription refills;<br>• loyalty points;<br>• saved cards;<br>• chat history after the order is closed.<br>The screen explains why and offers a one-tap sign-up that keeps the history (21.2). | A test per row of the matrix; an admin change takes effect without a deploy. |
| 21.4 | **OTP by email by default** (no SMS cost at the start).<br>• Sign-up, sign-in and password reset use an email code. The channels already exist in `auth.service.ts` (SMS → push → email).<br>• SMS is a per-country feature flag, off by default. WhatsApp authentication codes are an option for later: Meta charges per message, usually less than SMS.<br>• **Email provider chain with automatic failover** (owner 2026-10-01). The code supports Resend and SES today; add Brevo. Per provider: a daily and monthly quota (the free tiers have caps), a health state and a cooldown. Order: Resend → Amazon SES → Brevo. The chain switches on an error, a timeout or a used-up quota, and goes back to the first provider when its window resets. The admin sees which provider sent each code and the remaining quota. API keys live only in the server env.<br>• Email delivery: SPF, DKIM and DMARC for each provider (16.13). The code email is short, branded and in the user's language.<br>• Rate limits (16.3) apply to email codes too. | • Live: sign-up and sign-in with an email code only.<br>• With SMS off, no SMS is sent.<br>• mail-tester ≥ 9/10. |
| 21.5 | **Contact phone and address at checkout, without SMS.** Every order or booking (guest or account, including Google/Apple/Snapchat/X users who gave no phone) asks for:<br>• the location and address, saved to the profile;<br>• a contact phone in **one** field: country code +966 by default, validated with libphonenumber, stored as E.164, shown back formatted ("is this right?"). No double-entry field.<br>Risk controls for unverified phones:<br>• cash on delivery is limited for new, unverified customers (a cap on value and on open orders); card payment is not limited;<br>• the provider can call before dispatch;<br>• the phone is marked "verified" later, if it is ever confirmed (WhatsApp/SMS when enabled, or by the provider). | • Tests for formats (05…, 5…, +9665…) and Arabic digits.<br>• A COD cap test for an unverified new customer. |
| 21.6 | **Account linking.**<br>• The same verified email across providers (Google, Apple, email) offers to link to one account, after confirmation.<br>• Apple "hide my email" relay addresses work for codes and receipts. | Live tests with each provider (sandbox). |
| 21.7 | **Sessions.** A list of signed-in devices, with "sign out other devices"; rotating refresh tokens; sign-out removes the push token. | Tests. |
| 21.8 | **Guest data lifecycle.**<br>• Account deletion (Phase 10) also covers guest data.<br>• Inactive guests with no orders are deleted after 12 months (configurable).<br>• Orders and invoices are kept for as long as the law requires, without identity data where possible.<br>• The legal texts cover guests (19.12). | A scheduled-job test. |

**Gate P21:**
- the guest → account merge journeys (every sign-in method, app and web) are green;
- the permission-matrix tests are green;
- email-only OTP works end to end.

---

## PHASE 22 — What mature platforms have (owner request 2026-10-01: Amazon/noon/Vezeeta-level practices)

**First:** take an inventory of what already exists (loyalty, referral, coupons, chat, family, etc. exist in some form) and **build only what is missing or incomplete**. One task = one commit, each with a live proof.

| Task | Do | Verify |
|---|---|---|
| 22.1 | **Repeat and refill.**<br>• "Order again" on past orders.<br>• Auto-refill subscriptions for chronic medicines, respecting prescription validity, with a reminder before each refill. | Live: subscribe → the next refill order is created on the date, after a reminder. |
| 22.2 | **Back-in-stock and price-drop alerts** on products; shareable wishlists. | Live: restock → the alert arrives. |
| 22.3 | **"Frequently bought together" and alternatives** (same active ingredient), with pharmacist-safe rules: no cross-selling of prescription items, interaction warnings shown. | Tests on the rules. |
| 22.4 | **Delivery promise.**<br>• ETA by location on product pages; delivery slots.<br>• Live courier tracking on a map.<br>• Proof of delivery: a photo, or a code given to the courier.<br>• A cold-chain flag on items that need it. | Live journey. |
| 22.5 | **Order changes.**<br>• Cancel within a window; edit before the pharmacy accepts.<br>• Partial refunds; split orders when one pharmacy cannot fill everything. | Live journeys. |
| 22.6 | **Appointment quality.**<br>• Self-service reschedule.<br>• A no-show policy (deposit or fee, configurable).<br>• A waitlist for full slots.<br>• "Doctor running late" notices.<br>• A visit summary afterwards. | Live journeys. |
| 22.7 | **Reviews done right.**<br>• Only from completed orders and bookings; photos allowed.<br>• Provider replies, moderation and "helpful" votes. | Tests. |
| 22.8 | **Help center and support.**<br>• Searchable help articles.<br>• An AI assistant (through the AI gateway) that hands over to a human.<br>• Tickets with SLA timers, a "call me back" option, and support linked to the order. | Live: ticket SLA breach → alert. |
| 22.9 | **Documents.**<br>• Prescriptions as PDFs with a QR code that verifies them.<br>• Downloadable e-invoices and visit reports. | Scan the QR → the verification page. |
| 22.10 | **Experiments and analytics.**<br>• A/B tests and % rollouts on the feature flags.<br>• A product analytics event pipeline (privacy-respecting, with consent) with funnels and retention cohorts.<br>• A separate analytics store (e.g. ClickHouse/BigQuery), so reports never load the production DB. | A test experiment with a reported result. |
| 22.11 | **Fraud and risk.**<br>• Scoring for fake orders, COD abuse, account farms, promo abuse and payment fraud (3-D Secure).<br>• A risk dashboard in the admin. | Seeded fraud patterns are flagged. |
| 22.12 | **Provider quality.**<br>• Scorecards: acceptance rate, time to accept, cancellations, ratings, complaints.<br>• The scores feed ranking and admin alerts.<br>• Mystery-shopper checks. | Scorecard numbers match the DB. |
| 22.13 | **Release discipline.**<br>• Beta channels: TestFlight, Play internal/closed testing.<br>• Staged store rollouts with crash-free gates.<br>• In-app rating prompts at success moments, and a store-review reply workflow (C6.1). | Release checklist per version. |
| 22.14 | **Safety.**<br>• SOS/ambulance flows drilled monthly.<br>• Red-flag symptoms in chat or AI triage always show "call 997" first. | Drill report; red-flag tests. |
| 22.15 | **Growth tools.**<br>• A coupon rules engine; referral and affiliate links.<br>• Campaign landing pages (indexable only when useful). | Tests. |
| 22.16 | **City operations.**<br>• Service-area management and city launch switches.<br>• Provider coverage maps for the admin. | Admin click tests. |

**Gate P22:** each built item has its live proof; the inventory of existing vs built items is committed.

---

## PHASE 23 — Audit trail and legal records (owner decision 2026-10-01)

**Today:** the logs are split across about ten stores:
- `audit_logs`, `admin_audit_log`, `provider_audit_logs`, `facility_audit_logs`;
- `mcp_audit_log`, `pharmacy_price_override_audit`, `impersonation_sessions`;
- `state_history` inside each booking.

Patients have **no login history**: only `last_login_at` is kept, and it is overwritten on every login. There is no single place to answer "who did what, when, from which device".

| Task | Do | Verify |
|---|---|---|
| 23.1 | **One audit trail for every actor** (patient, guest, provider, provider staff, admin, system/job, AI agent through MCP). Each event records:<br>• **who:** actor id, role, and the impersonator if any;<br>• **what:** action and entity, with a before/after diff of the changed fields;<br>• **when:** server time;<br>• **where:** IP, device id, user agent, platform and app version;<br>• **why:** a reason for admin and financial actions;<br>• the request id (20.1).<br>The existing stores feed into it (or are replaced), with no gap in history. | A test per actor type: an action → one event with every field filled. |
| 23.2 | **Covered events**, at least:<br>• sign-up, login and logout (success and failure), OTP requests, password changes, device and session changes;<br>• every order and booking event: create, change, cancel (by whom), accept, reject, dispatch, deliver, complete;<br>• payments, refunds, copay;<br>• insurance decisions;<br>• prescriptions and reports issued, viewed and downloaded (16.9);<br>• consent and policy acceptance (19.12);<br>• admin changes to config, prices, users and providers;<br>• data exports and deletions (PDPL). | Live journey: one pharmacy order and one booking produce the full, ordered chain of events. |
| 23.3 | **Tamper-evident and separate storage.**<br>• Append-only (no update or delete through the app); each event carries the hash of the previous one, so any gap or edit is detectable.<br>• Written through the queue, so a slow log never slows the user.<br>• Copied daily to separate storage (object storage with object lock / write-once). | A test: editing or deleting an event breaks the hash chain, and a check reports it. |
| 23.4 | **Admin views.**<br>• A timeline per user, per order/booking and per provider.<br>• Search by user, phone, email, order id, IP, device or date; export to CSV/PDF for a legal request.<br>• Reading the audit trail is itself logged.<br>• Only the owner (and named roles) can see full details; PII is masked for everyone else. | Admin click tests; the export matches the stored events. |
| 23.5 | **Retention by type.** The owner and the lawyer set the periods, and a scheduled job applies them:<br>• e-invoices and tax records as ZATCA requires;<br>• medical records as MOH requires;<br>• authentication and security logs for a fixed period;<br>• everything else under the PDPL "no longer than necessary" rule.<br>After the period, records are deleted or anonymized; legal holds pause deletion. | Job test with a short test period; a legal hold blocks deletion. |
| 23.6 | **User-facing history.**<br>• Patients and providers see their own login and device history ("active sessions", 21.7).<br>• They see the status history of their own orders and bookings.<br>• On request (PDPL), the export includes their audit events. | Tests. |

**Gate P23:**
- every covered event is logged with all fields;
- the hash-chain check is green;
- admin timelines and exports work;
- the retention job is tested.

---

## PHASE R — Reviewer re-audit of Phases 1–11 and the Phase 12 foundations (reviewer work, starts on the owner's go)

The reviewer re-checks every task of Phases 1–11 against this plan, independently of earlier notes:
- **For each task:** what the plan asks → the code that does it → the test that proves it → a live proof (a journey, a click test or a device check) → PASS or FAIL.
- **Edge cases sampled in each phase:** empty and bad data, double taps, weak networks, roles and IDOR, cluster mode.
- **Flows checked end to end:** the insurance flow for every service type (19.11), and guest → account for every sign-in method (21.2).
- **The Phase 12 foundations** (tokens, components, icons, lints) checked against the canvas and the rules of 2026-10-01.

The result is `REVIEW_REAUDIT_P1_P11.md`. Its FAIL items are mandatory for the implementer and go to the front of the order of work.

---

## APPENDIX A — Environment variables the owner must provide (staging first)
`APPLE_TEAM_ID`, `ANDROID_SHA256_FINGERPRINT`, `RESEND_API_KEY` (or SES_*), `SMS_ENABLED`+`TAQNYAT_API_KEY`, `FCM_PROJECT_ID`+`FCM_CLIENT_EMAIL`+`FCM_PRIVATE_KEY`, `APNS_*`, `LIVEKIT_URL`+`LIVEKIT_API_KEY`+`LIVEKIT_API_SECRET`, `COTURN_*`, `GEMINI_API_KEY` or `OPENAI_API_KEY`, payment sandbox key (`TAP_API_KEY` or `MOYASAR_API_KEY` test), `*_WEBHOOK_SECRET`, `S3_*`/`CLOUDFLARE_R2_*`, `SENTRY_DSN`, `ALLOWED_ORIGINS` (single var — delete `CORS_ORIGINS`), `ADMIN_BACKEND_URL`.

## APPENDIX B — Review protocol (reviewer = Claude)
After each phase push, the reviewer: (1) reads the diff per task vs this plan, (2) re-runs the gate scripts, (3) writes `REVIEW_P<n>.md` with PASS/FAIL per task. FAIL items go back to the agent as a new task list; small fixes the reviewer may commit directly. Only after all phases PASS → merge to `main` → deploy.
