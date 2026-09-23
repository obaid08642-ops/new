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
- Do: in `backend/package.json` align ALL `@nestjs/*` to the same major (12.x) incl. `common`, `core`, `platform-*`, `cqrs`, `terminus`, `testing`, `mongoose`, `config`, `schedule`, `throttler`, `swagger`. Regenerate lockfile.
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
- Verify: fresh boot logs zero `Seed failed`; `GET /labs/services` returns >0 items.

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

**P6.x Admin additions (owner request — build all):**
1. `/admin/reports`: revenue, orders, bookings by service/city/provider/day; charts (recharts); CSV/XLSX export. Backend: `GET /admin/reports/{revenue,orders,bookings,providers,patients}?from&to&group_by`.
2. Unified catalog manager (one page, tabs: medicines, labs, packages, radiology, nursing, insurance+networks+classes, specialties) with image upload, price history, bulk CSV import, activate/deactivate.
3. Unified audit log viewer (filter by actor/entity/action/date).
4. Commission & copay config per service & per provider.
5. Live ops: active orders map, SOS queue with 997 escalation button, 5xx rate, queue health (BullMQ).
6. AI medical content review queue (approve/reject before publish).
7. Notification templates (6 languages, preview, test send).
8. Provider lifecycle page: pending → approved → suspended → reactivated, with reasons and history.
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
