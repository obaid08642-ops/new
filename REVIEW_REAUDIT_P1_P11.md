# REVIEW — PHASE R: independent re-audit of Phases 0–11 and the Phase 12 foundations

Reviewer, 2026-10-01. Base: `fix/audit-2026-09` @ 636310e (= main b70f697 + nothing new from the implementer).
Method: no claim from `AGENT_PROGRESS.md` was taken on trust. Every result below was re-run by the reviewer on a fresh
local stack: Mongo replica set, Redis, moto S3, SMTP sink, fake Moyasar, admin BFF with the gate token, and a fresh
database per run.

**Verdict: CHANGES REQUIRED.** The FAIL list (R1–R8) is mandatory before Phase 12 screens (A11/C3/C4) continue.
The items marked *fixed by reviewer* are already in this PR. Do not revert them.

---

## Results per phase

| Phase | Result | Evidence (re-run by the reviewer) |
|---|---|---|
| P0 foundation | PASS | gitleaks in CI; NestJS 11; lockfiles committed; `DisabledGatewayAdapter`; seeds use `$setOnInsert` and run only on empty collections |
| P1 access control | PASS | F01–F08 decorators present; gate P1 0/370; test seeders gated; Rx states; `otp_channel_unavailable`/`otp_required`. Live: suspend → old token 401, login 403 `account_suspended`, reactivate → login OK. Ban covered by `j_admin_ops` |
| P2 provider identity | **FAIL → R1** | Approval does not require the documents (below) |
| P3 validation | PASS on 5xx, **FAIL → R2** | Empty-body sweep: 0 HTTP 500 (patient 891 routes, admin, approved pharmacy). Malformed-id sweep: patient 1,350 calls, admin 1,350 calls, **0 HTTP 500**. Fake success on missing ids: R2. `dtolint` exit 0 (`@Body any` = 0). `dtocheck`: 643 DTO routes, 0 mismatches |
| P4 no fabricated data | PASS, **FAIL → R3** | Fabrication sweep on an empty DB (`nabd_fab`): every non-zero number traced to a real source (Redis counters, the caller's own account, config, catalog seeds). Developer text shown to users: fixed by reviewer (3 web files). Raw enums: R3 |
| P5 single source | **FAIL → R4, R5** | `routes.py --dups` = 25 (gate requires 0). Legacy doctors booking module (second booking system and notification store) still served. Static catalogs JSON removed ✓ |
| P6 admin | PASS | 63 admin pages rendered signed-in: 0 broken, 0 4xx. `admin.py` (now modelling the real 1:1 BFF): 263 OK, 0 mismatches after the reviewer fixes below |
| P7 contracts / deep links / SEO | PASS after reviewer fixes | `clients.py`: provider-app 390/390 OK; patient-app and patient-web have 0 API mismatches (the NO_PATH rows are screen links, not API calls). F33 jobId ✓. F29 public pages ✓. Backend notification routes: all resolved by `translateBackendRoute` except `/wallet/hub` (R6). F35: fixed by reviewer |
| 7A no patient wallet | **FAIL → R6** | `/wallet/balance`, `/wallet/credit`, `/wallet/debit` still registered |
| 7B reports / monitoring | PASS | Reports and live ops endpoints return real aggregates on the empty DB |
| 7C admin hardening | PASS after reviewer fix | Device allow-list on every admin call ✓. Network gate covered only `/api/v1/admin/*`, while 96 admin routes live elsewhere (`/medicines/admin`, `/ai/admin`, `/bulk-upload`, …). Fixed by reviewer (below) |
| 8 journeys / parity | PASS | `nav.py`: provider-app 0 dead targets; patient-app 0 real dead targets (5 regex artefacts from template strings) |
| 9 provider app | PASS | F50: 0 string tokens; F51: all four split (≤189 lines); F52: Expo 57.0.14, `HttpClient.ts` gone; F78: gone |
| 10 payments / platform | PASS | F60: Moyasar webhook fails closed without `MOYASAR_WEBHOOK_SECRET` |
| 16.13 Swagger | PASS (config) | `main.ts:184`: Swagger is on in production only with `SWAGGER_ENABLED=true`; keep it unset on production |
| 12 foundations | PASS (debt frozen) | contrast 65/65 both themes; no-px-font-size 289 = baseline; no-raw-color 9,404 = baseline; no-emoji 47 = baseline; i18n coverage 100% (6 locales, 1,198 keys); token mirrors up to date; client-token-sync 950 = baseline. The baselines are debt that 12.A11 must clear |

---

## Fixed by the reviewer in this PR (do not revert)

1. **7C-C3 — admin network gate, all paths.** `AdminGateGuard` only checked `/api/v1/admin/*`. An admin JWT used directly against the API (without the BFF) could reach the 96 admin routes outside that prefix. `JwtAuthGuard` now requires the gate secret for every admin-role token on every path, compared in constant time (`adminGateSatisfied`). The BFF already sends it on every call.
   - Unit tests: `auth.guard.spec.ts` (4 new cases).
   - Live: BFF 200; direct call with the gate header 200; direct call without it **403 `admin_gate_required`**.
2. **Dead public SSE route removed.** `GET /realtime/booking/:type/:id` was `@Public()`, did no ownership check, and nothing emitted to it (`emitToBooking` had no callers). It was an anonymous, never-ending connection: a DoS vector and a latent IDOR.
3. **Three admin actions were broken (404 live).** All are now fixed and verified through the BFF:
   - Loyalty reward/challenge toggle → `/admin/admin/loyalty/...`
   - Insurance company edit: `PUT` → `PATCH` (the only verb the API has)
   - Catalog CSV import: `/api/admin/bulk-upload`. Multipart import verified: 201, 1 inserted.
   - `UploadDto.rows` is now `@IsArray` + `@IsObject({ each: true })`; the service already expected an array.
4. **F35 Android.** `assetlinks.json` fell back to Google's sample SHA-256 fingerprint. It now answers 503 `assetlinks_not_configured` until `ANDROID_SHA256_FINGERPRINT` is set.
5. **Developer text shown to users** (P4), replaced with user copy: `family-scan-client.tsx`, `settings/feedback`, `nutrition/log-meal` (2 strings).
6. **Boot security suites (part).** `test/security/harness.ts` stubbed no enrolled admin device, so every admin case got 403 `device_not_enrolled` after C2. The harness now sends `x-admin-device` and stubs an enrolled device; `f44-hierarchy` uses it. F01–F08 and F44 are green again.
7. **Audit tools.**
   - `tools/audit/admin.py` now mirrors `toBffUrl` plus the 1:1 BFF (R6-2). The old model predated R6-2 and produced 15 false mismatches while missing the 3 real ones.
   - New `tools/live/gate_ids.py`: the malformed-id and fake-success sweep that R2 must pass.

---

## FAIL list — mandatory (one commit per item: `[R-<n>] <summary>`)

**R1 (P2, security/legal) — a provider can be approved without its required documents.**
- `provider-admin.service.ts` `approve()` and the registration-wizard submit do not check `REQUIRED_DOCS_BY_PROVIDER_TYPE`. Only `submitForApproval` does (`provider-profile.service.ts:129/171`).
- Do: `approve()` refuses (400 `required_documents_missing`, listing the missing types) unless every required document exists and is not rejected. An explicit override needs a written `override_reason` (≥ 20 chars), is written to the audit log, and requires step-up (C4).
- Verify: unit tests, plus a live journey (approve without documents → 400; with documents → 200; override without step-up → 403).

**R2 (P3/P4) — writes report success on targets that do not exist.**
- `tools/live/gate_ids.py` lists them. Examples (admin):
  - `DELETE /users/:id` → `{ok:true}`
  - `PATCH|DELETE /admin/articles/:id` and `POST .../publish|unpublish` → 200 `null`
  - `POST /service-catalog/admin/:type/:id/approve` → `{ok:true, ownership:null}`
  - `POST /ai/admin/gateway/provider/:key` → stores an arbitrary key
  - `PATCH /service-catalog/schedule/:entity_type` → creates a schedule for any string
  - `POST /medicines/admin/catalog/:id/clear-shortage-badge`
  - `DELETE /bans/:id`
  - `DELETE /catalogs/admin/specialties/:id`
  - `DELETE /support/admin/faqs/:id`
  - `POST /admin/providers/:id/retry-image-jobs`
- Examples (patient/provider):
  - `POST /users/me/wishlist/:id` (wishlists a non-existent product)
  - `POST /provider/crm/:id` and `POST /provider/ops/doctor/blacklist/:id` (unknown patient)
- Do: 404 for an unknown target; validate enum-like path params (`entity_type`, AI provider key) against their lists.
- Idempotent deletes of the caller's *own* sub-items (cart line, allergy) may stay 2xx: list each one in `ALLOW_2XX` with its reason.
- Verify: `python3 tools/live/gate_ids.py` exits 0.

**R3 (P4/F32) — raw enums shown to users.**
- `patient-web/app/[locale]/orders/[orderId]/offers/negotiation/page.tsx` and `[threadId]/page.tsx` render `thread.status` and `senderRole` as-is.
- Do: translate them in all 6 locales.
- Verify: grep finds no raw enum render; i18n coverage stays 100%.

**R4 (P5.3) — 25 duplicate routes.**
- `python3 tools/audit/routes.py --dups` must print 0. Delete the dead copy in each pair: home-care compat, hospital-staff, insurance-engine vs insurance, pharmacy ops vs pharmacy controllers, compat `/commissions`, seo resolve, system-health, medical-programs, and the doctors-module `/notifications`.
- Verify: `routes.py --dups` exit 0; `clients.py` and `admin.py` still show 0 mismatches.

**R5 (P5) — the legacy doctors booking module is a second booking system.**
- `modules/doctors/doctors.module.ts` serves `POST /doctors/appointments` and a state machine on `doctor_appointments`, with no payment and outside the canonical consultation flow. No client calls it, but anyone with a patient token can.
- It also writes its notifications to a separate `NotificationItem` store that the patients' notification list never reads.
- Do: remove the booking, appointment, message and notification parts. Keep the public doctor list/detail/slots only if a client uses them (`patient-app/src/utils/prefetch.ts` calls `/doctors/:id`), reading the canonical providers.
- Also remove the remaining registered "disabled" 503 legacy routes, or document each one that must stay.
- Verify: `grep -rn doctor_appointments backend/src` → 0 outside a migration; `j_consultation` green.

**R6 (7A-A1) — patient wallet leftovers.**
- `nabd-extensions.controller.ts`:
  - `GET /wallet/balance`
  - `POST /wallet/credit` and `POST /wallet/debit` (an admin crediting their *own* wallet)
- `notifications.service.ts:1093/1120`: `action.route: '/wallet/hub'`, a screen that no longer exists.
- Do: remove them with their service methods and DTOs. The provider ledgers stay. Point those notifications at the provider earnings screen, or drop them.
- Verify: `python3 -c "…routes.json…"` shows no `/wallet/*`; a provider payout journey stays green.

**R7 (18.7, early) — brand.**
- `app.name` in the translations is "نبض" / "Nabd", and the admin header shows "نبض". It must be "نبض بلس" / "Nabd+" everywhere: translations, admin header, emails, and meta titles.
- Verify: grep finds no bare "نبض" brand string in UI.

**R8 (process, AGENTS.md gate) — the boot security/journey suites have been red since C2 and nobody noticed.**
- `npx jest --config jest.boot.config.js --runInBand test/security test/journeys`: 27 failed / 38 passed on 636310e, identical with or without this PR's changes. That command is in the push gate, so every push since C2 went out red. After the reviewer's harness fix (above), 3 suites still fail:
  - `p3-provider-credential` and `p3-credential-rotation`: test-module DI rot (`PdplService` not provided to `UsersController`, and similar).
  - `journeys/provider-onboarding`: the admin calls get 403. They need an enrolled admin device on that suite's DB.
- Do: fix all three, and add this command to CI (backend job) so it cannot rot again.
- Verify: 15/15 suites green locally and in CI.

---

## Gate run by the reviewer for this PR

```
backend  npx tsc --noEmit                       -> 0 errors
backend  npx nest build                         -> ok
backend  npm test -- --runInBand                -> [chunked-jest] done: 9/9 chunks passed (3031 tests)
backend  boot test/security test/journeys       -> 12 passed, 3 failed (R8; was 7 passed, 8 failed on 636310e)
         python3 tools/audit/dtolint.py         -> exit 0 (@Body any: 0)
         clientbodies + dtocheck                -> 643 DTO routes checked, 329 matched by client calls, 0 mismatches
         tools/audit/admin.py                   -> OK 263, NO_PATH 1 (reports/${tab}: dynamic, real routes exist), 0 real mismatches
admin    npx tsc --noEmit                       -> 0 errors
web      npx tsc --noEmit                       -> 0 errors
live     j_admin_ops 100/100, j_onboarding 113/113, j_loyalty 104/104, j_returns 118/118 (fresh DB nabd_fab)
live     malformed-id sweep: patient 1350 / admin 1350 calls, 0 HTTP 500
live     fabrication sweep on an empty DB: 0 fabricated metrics
live     admin token without the gate header on /medicines/admin/catalog -> 403 admin_gate_required; via BFF -> 200
```
