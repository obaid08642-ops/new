# REVIEW — PHASE R: independent re-audit of Phases 0–11 and the Phase 12 foundations

Reviewer, 2026-10-01. Base: `fix/audit-2026-09` @ 636310e (= main b70f697 + nothing new from the implementer).
Method: no claim from `AGENT_PROGRESS.md` was taken on trust. Every result below was re-run by the reviewer on a fresh
local stack: Mongo replica set, Redis, moto S3, SMTP sink, fake Moyasar, admin BFF with the gate token, and a fresh
database per run.

**Verdict: CHANGES REQUIRED.** The FAIL lists (R1–R22, round 4: R23–R65, round 5: R66–R83) are mandatory before Phase 12 screens (A11/C3/C4) continue.
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

## Round 2 — owner-requested deep check (admin, catalogs, every screen and button)

The owner reported that before the plan almost every admin screen had problems: catalogs whose edits did not apply, suspend/reactivate and delete not working, missing admin control and reports, and no live "who is online / who is requesting what". Everything below was re-tested live on a fresh database (`nabd_cat`) seeded only by real journeys.

### What was tested this round (live, by the reviewer)

| Area | How | Result |
|---|---|---|
| Admin, every page and button | `tools/live/admin_buttons.py`: Chromium opens all 61 admin pages and clicks every distinct non-destructive button (255 clicks). Destructive actions are tested through the API (users below) | 8 failing buttons → R17, plus the reports race (fixed) |
| Admin, existing click flows | `j_admin_clicks.py` (needs `CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) | 17/17 |
| Catalogs, admin edit → every client read | For each catalog: admin create → (hidden before approval) → approve → visible → edit → change visible → delete → gone. Read through **every** endpoint the patient app, website and provider app call | Labs, packages, radiology, nursing: green after reviewer fixes. Medicines, specialties, insurance: R9–R11 |
| Users | Suspend → old token/login refused → reactivate → login; delete; for a patient and an approved provider, exactly as `users-management.tsx` calls | Patient OK, provider suspend/reactivate OK. Provider delete leaves an orphan (R13); admin-created provider cannot sign in (R12) |
| Online and live monitoring | A patient connects a socket the way the app does; the admin reads `analytics-suite/online` and `ops/overview` | Was wrong (0 pharmacy orders, `null` emergency state, no names). Fixed by the reviewer |
| Reports vs database | Each report total compared with direct Mongo counts | Orders 12=12, bookings 22=22, payments 16=16, patients 19=19, providers, insurance, disputes, loyalty: correct. Missing domains → R18 |
| Website, all pages signed in | `web_render.mjs` over all 226 static pages as a patient | 0 broken (heartbeat 503s were backend restarts during the run). The only real error, `/insurance/submit-claim` calling 2 missing routes, is fixed |
| Provider app, every screen's data calls, all 7 provider types | `screenapi.py` with a real approved account per type | 0 broken data calls. 3 real 403/503 screens → R15 |
| Patient app, every screen's data calls | `screenapi.py`, 148 screens | 0 broken |
| Journeys | pharmacy 144, lab 133, radiology 86, nursing 93/76, insurance 124, support 32, chat 74, consultation 110, ambulance 67, facility 186, admin_ops 100, onboarding 113, loyalty 104, returns 118 | All green |

### Not tested, and why (honest list)

- **Mobile UI on a device** (taps, layout, gestures, camera, push): the apps' API calls are verified screen by screen, but nothing here renders React Native. Needs a device/emulator run (Maestro or Detox) on an EAS dev build. Added to Phase 17.
- **The 21k-medicine catalog, and dynamic product/doctor pages at scale:** the fresh DB has no catalog import. Must run on staging after the import.
- **Real payment gateway, Apple Pay, real SMS/push:** local doubles only.
- **The other 5 locales rendered visually:** key coverage is 100%, but only `/ar` was rendered.
- **Load/performance:** Phase 14.

### Fixed by the reviewer in round 2 (do not revert)

1. **Radiology:** the admin could not add a radiology item at all (`POST /radiology/admin/catalog` had no `@Roles` → 403 `role_declaration_missing`).
2. **Labs/radiology/nursing delete:** deleting a catalog item did not clear the cache, so the patient kept seeing the deleted test or package. Delete now invalidates it like create/edit/approve.
3. **Medicine edit:** the edit was saved but the admin got 404 `catalog_source_not_found:medicine:undefined` (a spread mongoose document lost `id`).
4. **Live monitoring** (`ops/overview`):
   - It read the empty legacy `orders`/`pharmacyorders` collections and used `status` where bookings and emergencies use `state`, so the board showed 0 pharmacy orders and `null` emergencies.
   - It now reads `pharmacy_orders`, `labbookings`, `radiologybookings`, `homecarebookings` and `emergency_requests` with the right field.
   - "Late" = older than 24 h and not final.
5. **Who is online:** the online list now carries name and phone/email, and the command center shows the table (name, contact, role, platform, last seen).
6. **Reports:** switching tabs sent the previous tab's `group_by` (400 on insurance/payments). Fixed.
7. **`GET /home-care/bookings/my`** answered 404 for every patient (`bookings/:bookingId` registered first). The patient's nursing bookings were missing from the app's orders screen, the claim screens and the nursing insurance status (app and web).
8. **`/care/appointments/mine` does not exist:** consultations were missing from the app's orders screen and from claim submission (app and web). Clients now call `/care/appointments`.
9. **Missing translations:** the `NursingVisits` namespace and `facilityVisit` showed raw keys. Added in all 6 locales.
10. **Insurance report never opened by default:** its first grouping `state` was rejected by the DTO (400), and "day" silently grouped by state. Both now work; `day` and `state` are explicit.
11. **New tool:** `tools/live/admin_buttons.py`.

### FAIL list, round 2 (mandatory)

**R9 — medicines catalog (owner's main complaint).**
- a) `GET /medicines` (search/list) returns items that are not approved/public; the public filter is missing there.
- b) A medicine the admin creates and approves never gets `public_eligibility`/`indexing_eligibility`. As a result:
  - `/medicines/:id` and `/medicines/:id/details` → 404, so the product page is dead;
  - it never appears in `/public/products/search` or barcode lookup.
- c) Owner expectation: **an admin edit applies immediately everywhere.** Today every admin edit resets the item to "pending review" and hides it until someone approves it again. An edit by an admin who holds the catalog approve permission must publish immediately (price history + audit log kept). Provider-suggested changes stay reviewed.
- d) After an edit the patient search served the old name for a while (cache). Invalidate the list caches on every catalog write.
- e) `/drugs/:id` for a missing id answers 200 `{"error":"not_found"}` → must be 404.
- f) Two admin medicine editors: `medicines-catalog.tsx` (full form) and the medicines tab in `catalog-manager.tsx` (7 fields). Keep one full editor.
- **Verify:** extend the reviewer's round-trip (scratch `cat_med.py` → `tools/live/j_catalog_sync.py`). Every step must pass for patient app, website, provider drug index, public search and barcode.

**R10 — six languages in every catalog.**
- Medicines, labs, packages, radiology, nursing, specialties and insurance are edited in Arabic and English only.
- Medicines keep ur/hi/bn/fil in `translations`, which nothing can edit.
- Do: the admin edits all 6 languages for every catalog field shown to patients, and the read endpoints return the requested locale.

**R11 — single source for specialties, insurers and degrees.**
- `/care/specialties` (patient app and web) reads the hard-coded `SPECIALTY_MASTER`, while the admin edits the `specialties` collection (read by the provider app). An admin-added specialty never reaches patients.
- `/care/insurance` and `/care/degrees` are also hard-coded.
- Do: read the DB everywhere and delete the constants.

**R12 — insurance companies.**
- The admin cannot deactivate or delete a company: there is no route, and `PATCH` rejects `catalog_status`/`is_active`.
- A new company is visible to patients immediately, while every company is `pending_review`, so the field means nothing.
- The public `/catalogs/insurance` served a stale name after an edit.

**R13 — admin creates a provider.**
- `POST /admin/providers/create` writes only a `users` row. That provider cannot sign in to the provider app and does not appear in the moderation list. No admin screen calls it.
- Do: build it on the same records as onboarding (account + profile + documents), send an invite email to set a password, and add a form in the admin.

**R14 — deleting a provider user leaves its provider account and profile behind** (still listed in admin providers). Delete must cascade, or be refused with a clear reason.

**R15 — provider-app screens that cannot load for their own provider type:**
- `SosDispatchScreen` → `/emergency/active` is admin-only;
- `HospitalDispatchScreen` → `/home-care/bookings/nursing/all` refuses hospitals;
- pharmacy refills → `/pharmacy/orders/refills` is a deliberate 503.
- Do: fix each permission, or hide the entry.

**R16 — provider presence.** The provider app opens the realtime socket only on 3 doctor screens, so pharmacies, labs, radiology, nurses, hospitals and ambulances never appear online. Add app-wide presence like the patient app.

**R17 — admin UI honesty.**
- `theme-control` saves to localStorage and its server call fails silently while showing "saved and applied to all screens": remove it (Phase 12 tokens are the source).
- Show the backend reason when an action is refused: loyalty add with empty fields, segment preview without rules, disabling a region with active children.
- Hide "cancel" on appointments that are already in a final state.

**R18 — reports: all domains, exact money.** Add ambulance/emergency and surgery reports (B1). Round every money aggregate to 2 decimals (`net: 2016.3600000000001` today).

**R19 — delivery fee has three sources:**
- a constant `15` in `orders.service.ts`;
- `business-rules` platform fees;
- `delivery_config.base-fees` (served by `/delivery/check`, no admin screen).
- Do: one admin-editable setting used by checkout and by `/delivery/check` (B4).

**R20 — i18n check gap.** `i18n-coverage.mjs` compares locales with `en.json` but not code with `en.json`, so missing namespaces reach users. Add a check that every `t()`/`getTranslations(namespace)` key used in code exists in `en.json`.

Also under R4: `GET /home-care/packages` has three handlers and the served one returns `[]`, so the nursing tab's packages are always empty. After de-duplication it must list real, admin-managed packages.

---

## Round 3 — field-by-field trace of provider registration (owner's example)

Method (`tools/live/field_trace.py`, new):
- For each of the 7 provider types, replay the exact step2/step3 payloads of the registration screen, with a **unique value per field** (types and limits taken from `Step2Dto`/`Step3Dto` by `tools/audit/dto_fields.py`) and the **screen's own literals** for fixed choices.
- Submit, then look for every value (a) in the stored records in Mongo, (b) in the admin API, and (c) **on the admin screen** (Chromium opens provider-moderation and the provider's file).

Results (reviewer, live):

| Type | Fields traced | Stored + in admin API | On the admin screen |
|---|---|---|---|
| Pharmacy | 33 | 33 | 18/20 (missing: MOH license no., SFDA license no.) |
| Doctor | 42 | **0 with the screen's real values** (step 3 rejected); 42 with corrected values | 25/27 (missing: gender, clinic schedule) |
| Lab | 38 | 38 | 29/33 (missing: equipment list, equipment text, MOH license no., radiation-safety license) |
| Radiology | 32 | 32 | 27/28 (missing: MOH license no.) |
| Nursing | 28 | 27 (services list: see R21c) | 17/21 (missing: gender, MOH license no., nursing services, SCFHS license no.) |
| Hospital | 19 | 19 | 16/17 (missing: MOH license no.) |
| Ambulance | 21 | 21 | 14/15 (missing: MOH license no.) |

**R21 — registration values the backend rejects (critical: a real doctor cannot finish registration).**
- a) The doctor screen sends `gender: 'M' | 'F'` (`DoctorRegistration.tsx:257-258, 1050`). The backend accepts only `male`/`female`; anything else gets a bare 400 `Bad Request`. Gender is required, so **every doctor's step 3 is rejected**, and with it specialty, degree, years, consultation modes, all prices, durations, all three schedules, insurance, national ID and vacation.
- b) The doctor screen sends `insurance_clinic/online/home` as booleans (Switch); `Step3Dto` declares them `@IsString` → 400 for the whole step.
- c) The nursing screen sends each service as `{ key: id, name_ar: id, price: 0 }`: the id as the name, and price always 0.
- d) A bare `400 Bad Request` with no message must not exist; every rejection names the field.
- e) `j_onboarding.py` used "valid" values (`male`), which is why the gate never caught (a). Journeys must use the screen's literal choice values.
- **Verify:** `python3 tools/live/field_trace.py` → every type `submit 201`, 0 LOST.

**R22 — the admin cannot see what the provider entered.**
- The provider file in the admin (`ProviderFullDetail`) does not show:
  - the MOH license number (6 types);
  - the SFDA license number (pharmacy);
  - the SCFHS license number, gender and nursing services (nursing);
  - the equipment list, equipment text and radiation-safety license (lab);
  - gender and clinic schedule (doctor).
- The admin approves without seeing the licenses it is approving (see also R1).
- **Verify:** `UI=1 python3 tools/live/field_trace.py` → every field `SHOWN`.

**Method note for the agent.** Apply the same trace to every form in every client, not only registration:
- provider settings and profile edits;
- patient profile, medical profile, addresses, family, insurance, booking and checkout forms;
- every admin form.

The rule: every value a user can enter is stored, comes back on the screen that shows it, and is visible to whoever reviews it. Build it as a generic `tools/live/form_trace.py` driven by the same screen payload extraction (`clientbodies.js --types`) plus the DTOs.

---

## Round 4 — review of the agent's 20 commits + system-wide field/button audit (2026-10-01)

Full report, inventory, coverage matrix and evidence: `docs/review/AUDIT_2026-10-01.md`, `docs/review/inventory/`, `docs/review/evidence/`.
Agent tip reviewed: `fix/audit-2026-09` @ 0d8890b (20 commits since main).

**Do these first, in this order. They are regressions introduced by the last commits.**

**R23 (Critical, regression from ca16fa7 X4 + 6c78a80 X2) — admin sensitive actions are dead.**
- The "no passkey → no step-up" exemption was removed, but the admin UI has no step-up flow: no `x-step-up-token` anywhere in `admin/src`.
- So suspend/reactivate, refunds, payouts, commissions, RBAC, loyalty and dispute resolution all return 403 `step_up_required`.
- Do one of:
  - (a) build the step-up UI (passkey enrol + challenge, then retry with the header); or
  - (b) restore the exemption until (a) exists.
- **Verify:** `j_admin_ops` 100/100 on a fresh DB; `admin_buttons.py` shows no 403 on those pages.

**R24 (Critical, regression from 9d87a78 X1) — 12 operations broken by invented DTO names.**
Each DTO must match what the screen sends and what the service reads:
- claims submit (app + web);
- OCR: `image_base64` vs `image`;
- web reschedule: `new_slot_id`;
- admin SLA: `reason`;
- insurance networks and coverage rules;
- loyalty rewards/challenges/config: the service uses `title_ar` and `points_required`, not `name`/`points_cost`.
- **Verify:**
  - `python3 tools/audit/route_dto.py && python3 tools/audit/typecheck_contracts.py` → 0 TYPE mismatches on these routes;
  - `dtocheck` → 0 mismatches;
  - live replay of each screen payload → 2xx and stored.

**R25 (High, process) — a red gate was pushed.**
- Unit tests: `review-p3-dto-types.spec.ts` broken (refund `transaction_id`; SLA `reason`).
- dtolint exit 1 (3 non-class bodies); dtocheck 12 mismatches.
- Never push red. Paste the real gate output.

**R26 (High)** Patient avatar is never saved: `UpdateProfileDto` lacks `avatar_url`.
- **Verify:** upload a photo in the app, re-open the profile, and the photo is shown; `users.avatar_url` is set.

**R27 (High)** Admin notification templates return 400: the page sends `title`/`body` strings, while the DTO expects per-locale objects.
- Align one side with the other. **Verify:** create and edit a template from the admin page in a browser.

**R29 (High)** Admin segments return 400: `rules[].operator/value` are forbidden by the DTO.
- **Verify:** create a segment from the page; preview count works.

**R30 (Medium)** Medicine `brand` and `storage_conditions` are silently dropped: they are missing from `schemas/medicine.schema.ts`.
- Add them to the schema and the admin detail. **Verify:** create, then read back both.

**R31 (Medium)** Drug-shortage reports with `DRUG_SHORTAGE` are stored as `GENERAL`.
- Add the category to the enum and to the admin filter.

**R32 (Medium)** Patient app: three API base-URL sources.
- `services/HttpClient.ts` (19 call sites) reads only `EXPO_PUBLIC_API_URL`.
- Use one config module. **Verify:** a build with only `EXPO_PUBLIC_API_BASE_URL` sends no request to another host.

**R33 (Medium)** Tasks reported done but incomplete:
- C6.4: no caller; behind auth + gate;
- N8: no admin UI;
- N10: no client events;
- N1: dead routes remain;
- X5-B2: generic link, not a drill-down;
- S16: partial.

Complete each one to its plan "Do" and "Verify".

**R34 (Low)** Nginx cache bypass cookie `access_token` ≠ website cookie `nabd_access`.

**R35 (Suspected)** Nursing check-in sends `{lat,lng}`; confirm against the DTO live and fix if it returns 400.

**R36 (High)** Duplicate route `GET /admin/finance/commissions` (legal module + finance suite). The finance-suite page gets the legal document.
- Give each a distinct path and update the callers.
- **Verify:** the finance-suite page shows `config_used` and `by_vertical`.

**R37 (High)** Commission settings have two schemas in one document:
- the finance page writes `rates`/`vat_rate`;
- every settlement path reads `service_types[x].percent`/`tax.vat_percent`.

Make one schema the single source, migrate the other, and point both admin pages at it.
- **Verify:** change the pharmacy rate on the finance page → `GET /finance/commission-for?service_type=pharmacy` returns the new value → the next settled order uses it.

**R38 (High)** Provider app: the connectivity probe `HEAD https://1.1.1.1` decides "offline". When it fails, the app shows the **pending-review** screen.
- Use `@react-native-community/netinfo` (or the backend `/config` response) for connectivity.
- Add a real offline screen with retry; never show "under review" for a network problem.

**R39 — fixed by the reviewer in this PR (do not revert).** `provider/auth/login` replaced `meta` with ip/ua, dropping the app's `device_identifier`.
- Every session was bound to `unknown`.
- The first refresh failed as "device mismatch" → the provider was signed out on every app start.
- Fix: `provider.controllers.ts` login keeps `meta.device_identifier` (or the `X-Device-ID` header). Test: `provider-login-device.spec.ts`.

**R41 — fixed by the reviewer in this PR (do not revert).** Nursing registration creates `home_care` accounts, but `App.tsx` routed only `nursing`/`nurse` to the nursing dashboard, so every home-care provider got the generic portal. `home_care` is now routed to `NursingDashboardNavigator`.

**R42–R45, R49 — fixed by the reviewer in this PR (do not revert).** These were white screens and runtime crashes in the patient app:
- 22 missing or wrong imports, and a variable read before its declaration;
- insurance hub without a policy;
- loyalty hub before its config loads;
- nutrition goal labels;
- `absoluteFillObject`, which does not exist on native.

Details are in `docs/review/AUDIT_2026-10-01.md` §6.

**R46 (High)** Remove `// @ts-nocheck` from all 186 patient-app files and fix the 265 type errors this exposes.
- Add `python3 tools/audit/nocheck_tsc.py patient-app` and `provider-app` to your gate. It must exit 0 with 0 nocheck files.
- **Verify:** paste its output.

**R47 (High)** The insurance hub shows hard-coded coverage percentages, an annual limit of 500,000 and a deductible of 50.
- Show only what the policy record or the insurer network actually holds. Otherwise show "not available"; never show invented numbers.
- **Verify:** a patient whose policy has no coverage data sees no percentages.

**R48 (Low)** Family permission request: handle "no group" with a message, not an unhandled rejection.

**R50 (High)** Notification preferences cannot be changed in the app or on the website.
- Both send flat keys, while the server accepts only nested `channels`/`categories`.
- Choose one shape, then make both clients and the DTO/service agree.
- GET must return what the screens read.
- The app must show the error instead of `.catch(() => {})`.
- **Verify:** toggle each of the 9 settings in the app and on the website, then reopen: the value persists. Paste the DB document.

**R51, R52 — fixed by the reviewer in this PR (do not revert):**
- maternity `is_regular` is now `@IsBoolean`;
- the active-programs empty state no longer crashes.

**R53 (Low)** Website nutrition goals:
- translate the goal/activity labels;
- style the form;
- name the rejected field in server errors.

**R54 (High)** Website addresses:
- route the form through a real handler (`lib/api/addresses-server.ts` already exists);
- use the backend fields `street/building/floor/notes/lat/lng`, with a map pin like the app;
- never treat 405 as success.
- **Verify:** add an address on the website, reopen, delete it; the app shows the same list.

**R55 (High)** `POST /support/feedback` must store the rating/type/message (with a DTO) where the admin can read it, and the admin must have a screen for it. Remove the fake "thank you".
- **Verify:** submit from the app and from the website; the admin sees both texts.

**R56 (Medium)** `blood_type` must be one of A+/A-/B+/B-/AB+/AB-/O+/O- in the backend DTO and the website schema.

**R57 (Low)** The app address list must not show `city` (not in the model), or the model must add it end to end.

**R58, R59, R60, R62 — fixed by the reviewer in this PR (do not revert).** These were provider-app crashes:
- drug suggest-change form;
- doctor availability exceptions;
- nursing checklist and supplies;
- lab home-collection tile.

Add `python3 tools/audit/ctx_props.py` to your gate (exit 0): R58/R59 came from the P9 screen split.

**R61 (Medium)** Nursing supplies:
- show the nurse's real requests, read back from the server, separately from the catalog;
- never append local placeholder items.

**R63 — fixed by the reviewer in this PR (do not revert).** Added the website routes `/api/diagnostics/orders`, `/api/payments/intent/diagnostics` and `DELETE /api/diagnostics/cart`; the checkout also clears the local cart.

**R64 (High)** Diagnostics order (F74):
- send and store the home-collection address (structured, like the app) and the insurance company;
- the lab must see the address;
- keep `location_type`, `payment_method` and each line's `booking_id/price/status` on the parent;
- the parent stays unconfirmed until paid (card) or approved (insurance);
- one price field on the child booking.
- **Verify:** website checkout as home + card; the lab's order screen shows the address and the price.

**R25 (addendum)** `main` itself fails dtolint on `auth/step-up.controller.ts:23` and `payments.module.ts:567` (inline body types, from f2dd8f9/832e84d). Give both real DTOs in your branch.

**R65 (High, process)** Make CI green on `main`.
- Rename the `wallet_payment_removed` error so the PAY-001 guard passes, or exempt that exact line in the guard.
- Regenerate the brand, icon, token and renderer artefacts.
- Align the two component renderers.
- Bring LCP under 3 s on the three Lighthouse pages.
- Do not weaken any check.

**R40 (Low)** "Remember me" (تذكرني) on the provider login is written but never read. Implement it or remove it.

**For every item:**
- one commit `[R-<n>] <summary>`;
- re-run the matching tool from `tools/live/` or `tools/audit/` and paste its real output.

UI crawls (react-native-web exports, see `tools/live/rn_web_crawl.py` and `tools/live/rn_nav_crawl.py`) must show no JS_ERROR on the screens you touch.

---

## Round 5 — the remaining untested areas (2026-10-02)

Full report: `docs/review/AUDIT_2026-10-02.md`.

**Fixed by the reviewer in this PR (do not revert):**
- R66: website booking route rejected every booking;
- R70: the payment result page no longer trusts `?status=`;
- R71: `/provider/seed` is test-mode only;
- R72: admin medicine edit sent the whole document;
- R73: no invented slots;
- R74: doctor page notice (ar/en).

**Mandatory (agent):**

**R66b (Medium)** Booking for someone else.
- The website collects the patient's name and phone; today they travel in the notes.
- Add real fields if booking for a family member is intended, or remove the inputs. Do the same in the app.

**R67 (High)** One clinic timezone (Asia/Riyadh) for slot generation, lead time, "today", reminders and display.
- Store UTC instants; render in the clinic timezone on the website, the patient app, the provider app and the admin.
- **Verify:** doctor opens 08:00–18:00 → first slot 08:00 Riyadh in all four clients; book 11:00 → all four show 11:00 (browser with `timezone_id=Asia/Riyadh`).

**R68 (Medium)** The doctor must see the patient's booking notes:
- in the queue item;
- on the appointment and consultation screens.

**R69 (Medium)** When the patient cancels: notify the provider, and store and show the reason (website + app).

**R70 (High)** Add `POST /payments/verify-by-gateway/:gatewayId`:
- resolve the gateway id to our transaction;
- check ownership;
- verify with the gateway.

The website result page uses it with `?id=`. Never trust the query `status`.
- **Verify:** pay on the website → the return page shows paid and the booking is CONFIRMED; a forged `?status=paid&id=pay_x` shows "processing".

**R74 (Low)** Translate the corrected `Doctors.detailNotice` into bn/fil/hi/ur.

**R75 (Low)** No raw codes for patients:
- status labels;
- specialty names;
- local-time confirmation;
- English payment labels.

**R76 (Medium)** The patient app home must render the admin home curation (`/content/home`) like the website.

**R77 (Low)** Admin pages must show readable errors (broadcast 400, step-up).

**Round 5 addendum — fixed by the reviewer (do not revert):**
- R78: orders hub crash on address objects;
- R79: loyalty claim and award are atomic (balance went to −280 with parallel claims);
- R80: points history in the app (crash) and the website (empty);
- R81: orders hub and insurance claim include `pharmacy_orders`, plus status labels;
- R82: `apiFetch` returns null for an empty 2xx body.

**R79b (High)** Loyalty duplicate and cap races.
- `awardPoints` checks for a duplicate with find-then-create, and `loyalty_transactions` has no unique index. Two events for the same completion (`booking.completed` and `service.completed`) at the same time can both award.
- The daily and monthly caps and the vitals 5-per-day check are count-then-insert.
- Add a unique partial index on `(user_id, reason, ref_type, ref_id)` where `ref_id` exists, and handle the duplicate-key error as `duplicate: true`. Make the cap checks atomic (e.g. a per-user-per-day counter document with a conditional `$inc`).
- **Verify:** 10 parallel awards with the same ref → 1 transaction; 10 parallel vitals awards → at most the cap.

**R83 (Medium)** Persist the clinic name and address from doctor registration step 3.
- Expose them on `/care/doctors/:id`, in the list, and through the location.
- Show them on the website doctor page, on the patient app doctor screen, and in the booking confirmation.
- **Verify:** register a doctor through the provider app with a clinic address → admin approves → the website and app doctor pages show it.

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

Round 2 gate (reviewer, same stack):
```
backend  tsc 0 errors · nest build ok · unit 9/9 chunks, 3031 tests · dtolint exit 0 · dtocheck 0 mismatches
backend  boot suites: 12/15 (the 3 failing are R8, unchanged)
admin    tsc 0 · admin.py OK 263, 0 real mismatches · admin_buttons.py 61 pages, 257 clicks: remaining failures = R17 items + theme (R17)
web      tsc 0 · vitest 412 passed · web_render 226 pages signed in: 0 broken · i18n-coverage ok
app      patient-app tsc 0
live     j_nursing 76/76 after the home-care route-order fix; catalog round-trip green for labs/packages/radiology/nursing
```



## Round 6 — gate failure on the agent tip (2026-10-02)

**FAIL (mandatory before anything else):**
- The agent tip `22a5ced` does not pass `npx tsc --noEmit` (4 errors).
- Commit `d5b36a4` ("[R4] remove duplicate routes — packages, shortage, seo, pharmacy stubs") removed `acceptOrder`, `submitBasket`, `evaluateInsurance` and `orderDispatch` from `ProviderPharmacyController`, but `src/modules/pharmacy/tests/pharmacy-governance.controllers.spec.ts` (lines 12–17) still references them.
- This was pushed red, against the AGENTS.md gate.

Fix:
- If these routes were real duplicates, update the spec to test the surviving routes.
- If the provider app still calls them, restore them. Check with `grep -rn "accept\|submit-basket\|dispatch" provider-app/src`.

Paste the full gate output in AGENT_PROGRESS.md.

The 18 commits `7560513..22a5ced` (R1–R8) are queued for the reviewer's per-commit review.

### Round 6 — per-commit review of `7560513..38b1b04` (28 commits, tip `38b1b04`), tested live

**Verdict: CHANGES REQUIRED.** Two working patient features were deleted (insurance policy, nursing address), and a document-free approval path is still open.

**Gate at the tip** (AGENTS.md gate; pushed red):
- tsc: 4 errors (`pharmacy-governance.controllers.spec.ts`).
- Unit tests: 3 failing tests plus 1 suite that does not compile, out of 2,180. New since `b283822`: pharmacy governance (compile), medicines publication, specialties delete, Gate P3 nursing address. Already red at `b283822`: REVIEW-P3 refund, REVIEW-P4 SLA.
- Boot suites: `f01-wallet` 3 failing (it still expects the deleted wallet routes).
- `dtolint`: 4 (already 4 at `b283822`).
- `dtocheck`: 14 mismatches. 12 already existed at `b283822`; the 2 new ones are `save-policy` (F2).

Mandatory, in this order:

**F1 — Gate green (every item above).**
- Do not change a test's expectation unless the behaviour change was requested.
- Requested changes (update the test): R9c (an admin edit publishes), R6 (wallet routes deleted: assert 404), R4 pharmacy stubs (assert the canonical 503 on the surviving routes).

**F2 (Critical regression) — R4 `53b43dc` deleted the working insurance handlers.**
- It removed `POST /insurance/save-policy`, `GET /insurance/my-policy` and `GET /insurance/benefits-summary` from insurance-engine and kept the strict `insurance.module` `SavePolicyDto`.
- Live results:
  - the app payload (`provider`, `expiry_date`, `member_name`, `verified`, `ocr_extracted`) → 400;
  - the website payload (`member_name`, `expiry_date`) → 400;
  - `my-policy` and `benefits-summary` → 404.
- Clients still calling them: `patient-web/lib/api/insurance-server.ts` (both), `patient-app/src/components/views/InsuranceBenefitsView.tsx`, the add-policy screens.
- `j_insurance.py` would catch this.
- Fix: keep one handler that accepts what the clients send and serves `my-policy` and `benefits-summary`.
- **Verify:** `j_insurance` green; `dtocheck` has no `save-policy` row.

**F3 (High regression) — R4 `dbb1ace` deleted the home-care compat `createBooking`.**
- That handler resolved `address_id` to the patient's own saved address (line, city, lat/lng) and refused another user's id.
- The surviving `patient-home-care.controller.ts:48` stores `{address:{address_id}}` only, so the nurse gets no address and no coordinates.
- The website nursing route (`patient-web/app/api/nursing/bookings/route.ts`) sends `address_id`.
- **Verify:** `gate-p3-live.spec.ts` "nursing booking resolves address_id…" passes against the surviving handler.

**F4 (High, security) — R1 is incomplete: a second approve route skips the document check.**
- Live: `POST /api/v1/providers/:id/approve` on a pharmacy with **0 documents** → 201.
- The profile became `active`, `license_verified: true`, `public_eligibility: true` and is listed in public `GET /providers`, while the account stayed `pending_admin_approval`.
- Delete this route or route it through `ProviderAdminService.approve`.
- **Verify:** this call → 400 `required_documents_missing` (or 404 if deleted).
- The probe accounts were deleted by the reviewer after the test (10 accounts, profiles and users).

**F5 (High) — the R1 override cannot be used, and the claims are not true.**
- `ApproveDto` has no `override_reason`: live 400 `property override_reason should not exist`.
- No `@StepUp()` is on `POST admin/providers/:id/approve`, although the comment and commit say it is.
- `provider-admin.approve.spec.ts` tests 2 and 3 use `.catch(() => ({ ok: true }))` plus `toBeDefined()`, so they pass even when `approve` throws. Make them assert the real outcome.
- **Verify** at the HTTP level:
  - override without step-up → 403 `step_up_required`;
  - with step-up and a reason of 20+ characters → 201 and an audit row;
  - a short reason → 400.

**F6 (Medium) — R79b is half done.**
- Done: the unique index `uniq_user_reason_ref` exists in the DB.
- Not done: the daily/monthly cap and vitals 5-per-day races. There is no regression test.
- **Verify** as written in R79b: 10 parallel awards → 1 row; 10 parallel vitals → at most the cap.

**F7 (Medium) — R83 is partial.**
- Done: the backend persists and exposes the clinic address; the app clinic-confirm reads `clinic_address`.
- Not done: the website doctor page does not show it.

**F8 (Medium) — R9c permission.**
- An edit publishes for any admin with `CATALOG_UPDATE` and `CATALOG_PRICE_WRITE`.
- R9c said only an admin who **holds the catalog approve permission**; other edits must still go to review.

**F9 (Low) — R11: delete the constants.**
- `care.service.ts:58` still falls back to `SPECIALTY_MASTER`; the same applies to insurers and degrees.

**F10 (Low) — R7 is not "everywhere".**
- About 70 user-visible "Nabdah"/"نبضة" brand strings remain in `patient-app/src/i18n/*`, `patient-app/app/(auth)/provider-info.tsx` and provider-app doctor screens.
- Keep the generic word "نبضة" (pulse) where it is not the brand.

**Passed this round (verified live or in code):**
- R2: unknown ids → 404 (articles, medicines, radiology services, catalog items).
- R4 pharmacy stubs: still 503 via the governed controller.
- R5 and R6: removed routes have no client callers.
- R9a: the medicines list returns only public items.
- R11: `/care/specialties` count equals the DB.
- R12: deactivate/reactivate routes added; new companies are pending.
- R83: backend.

## Round 7 — full-ecosystem QA (2026-10-02)

Register with reproduction, evidence and root cause: `docs/review/QA_DEFECTS.md` (Q1–Q29). Performance: `docs/review/PERFORMANCE.md`. Coverage: `docs/review/COVERAGE_MATRIX.md`.
- Reviewer-fixed on `review/qa-full` (do not revert): Q2, Q10, Q11, Q12, Q13, Q14, Q17, Q20, the icon font (PERFORMANCE §1 A), and tooling Q6, Q7, Q18, Q19, Q26, Q27.
- Still open from Round 6, and still the largest live blockers:
  - **F2**: insurance; 36 journey steps fail on it across `j_insurance` / `j_lab` / `j_radiology` / `j_consultation`.
  - **R23**: step-up; 10 steps across `j_admin_ops` / `j_loyalty` / `j_nursing`, and every sensitive admin button.
- Do those first, then the items below, one commit each: `[Q<n>] <summary>`.

**Q25 (High) — admin price-override audit crashes, and real overrides are invisible.**
- Add an admin endpoint over `pharmacy_price_override_audit` (paging, search, catalog vs override price, computed difference, pharmacy, reason, time).
- Map `price-override-audit.tsx` to it, with null-safe numbers.
- **Verify:** `crash_sweep.py` APP=admin shows 0 crashes; a journey that submits an offer with an override sees it on the page.

**Q16 (High) — reorder is legacy-only (404 for every current order).**
- Implement a governed reorder: a new draft from the previous `pharmacy_orders` items through the patient draft flow. Wire it on the website and in the app, or hide the button.
- **Verify:** reorder on a delivered governed order → a draft with the same items.

**Q5 (High) — `financial-ledger.tsx:61`.**
- Call `/admin/finance/ledger/commissions` (R36) or send `from` / `to`.
- **Verify:** the page loads with no 400.

**Q29 (Medium) — pharmacy unique indexes exist only in manual scripts.**
- Create them idempotently at startup or in `deploy/mongo/init-indexes.js`.
- Fail the health check when one is missing.
- **Verify:** fresh DB → `getIndexes()` lists the 6 named indexes; recipient upsert uses IXSCAN.

**Q21 (High, performance) — `packages/ui-native/src/Icon.tsx` `import * as phosphor`.**
- This bundles every icon: 5.74 MB, 42 % of the app entry.
- Use per-icon imports from `phosphor-react-native/src/icons/<Name>`. The prototype measured 16.19 → 10.39 MB.
- Coordinate with the design (phase 12) track, which owns `ui-native`.
- **Verify:** entry JS gzip ≤ 2.4 MB; icon screenshots unchanged.

**Q22 (Medium, performance) — livekit bundled twice (ESM + UMD) and loaded at start.**
- Use one import style and lazy-load the call screens.
- **Verify:** a single livekit source in the source map, and not in the entry chunk.

**Q23 (Medium) — signed-out home calls 7 private endpoints and shows a load-error banner.**
- Skip private calls without a session and show the guest state; treat 401 as signed out.
- **Verify:** signed-out home makes no 401 calls and shows no banner.

**Q4 (Medium) — radiology `order_detail` / `reporting` white-screen without their param.**
- Guard the params, fetch by id, and add an error boundary per dashboard navigator.
- **Verify:** opening either screen without the param shows "not found" + back.

**Q15 (Medium) — website prescriptions list rows do not link to `/prescriptions/[id]` (orphan page).**
- **Verify:** a row opens its detail.

**Q24 (Low) — admin public directory pages are always empty** (relative `fetch` in `getServerSideProps`).
- Remove them from the admin app (the website owns them), or use `API_BASE`.

**Q9 + Q1 + Q28 (Medium, accessibility).**
- 128 patient-app and 41 provider-app icon-only controls have no accessible name.
- Admin `medicines-catalog` labels are not bound to their inputs.
- **Verify:** `ui_inventory.js` shows 0 unlabeled controls; Playwright `getByLabel` finds every medicine field.

### Round 7 — addendum (same QA run, later findings)

Also reviewer-fixed on `review/qa-full` (do not revert):
- Q32: website article pages always 404.
- Q35: website search and pharmacy chat blocked by the proxy allowlist.
- Q40: app medicine compare sent GET and invented ids.

Mandatory, one commit each:

**Q36 (High) — a slot hold does not protect the slot.**
- Refuse a booking while another patient holds an unexpired lock on that provider and slot.
- **Verify:** `tools/live/j_concurrency.py` A–D all pass.

**Q30 (High) — website order tracking 404s for every governed pharmacy order.**
- Same cause as Q16: it reads the legacy `orders` collection.
- Track from `pharmacy_orders`, and keep the `?pay=1` hand-off.

**Q38 (High) — app notification switches never save.**
- The app sends a flat body; the API takes nested `channels` / `categories`. Agree the key mapping with the owner (including marketing consent).
- Revert the switch and show the error on failure.
- **Verify:** flip → reload → same state.

**Q45 (Medium) — ambulance profile save always 400.**
- `contact_phone` and `coverage_cities` are not in the service's `allowed` list.

**Q42 (Medium) — screens offered to roles the API refuses.**
- `sos_dispatch` (doctor, hospital, home_care) and `hospital_dispatch` answer 403.
- Show them only where the API allows.

**Q44 (Medium) — provider pharmacy `chronic` calls the retired `/pharmacy/orders/refills` (503).**

**Q37 (Medium, product decision first) — slot list vs 5-minute buffer.**
- The slot just before any booking is offered but cannot be booked.
- Use one shared availability function for the list and the booking check.

**Q31 (Medium) — website map lab and hospital cards link to 404.**
- The map uses provider-profile ids; the detail pages read other collections.

**Q33 (Medium) — services sitemap.**
- 13,500 URLs; most render the 404 page, and riyadh renders a generic list.
- Emit only real service × city pairs, and return a real 404 when empty.

**Q41 (Medium, performance) — doctor list N+1 next-availability.**
- p50 1.1 s at 25 users.
- **Verify:** p50 ≤ 20 ms at c=1 (`tools/perf/api_load.py`).

**Q39 (Medium) — `@ts-nocheck` in 186 patient-app files.**
- Remove it file by file, starting with screens that call `apiFetch`, and fail the gate on new ones.

**Q34 + Q43 (Low).**
- Missing `.catch`; undefined-param calls; profile-image 404 treated as an error.

Still open from earlier rounds, re-confirmed live in this run:
- **R29:** segments DTO forbids `operator` / `value`.
- **R17:** theme-control saves without CSRF and shows a fake "saved".
- **R23:** step-up.
- **F2:** insurance.

### Round 7 — owner decisions (2026-10-02, delegated to the reviewer by the owner)

These replace "agree with the owner" in the items above. Implement exactly this.

**Q38 — notification key mapping.** The app keeps its switches; the client maps them to the API body below (no new flat keys in the DTO):

| App switch | API field | Default |
|---|---|---|
| `general` | `channels.push` | on |
| `appointments` | `categories.appointments` | on |
| `orders` | `categories.orders` | on |
| `medications` | `categories.health` | on |
| `doctorMessages` | `categories.chat` | on |
| `offers` | `categories.marketing` | **off** (explicit opt-in: marketing consent, PDPL) |
| `emergency` | none: always on, shown as a locked switch with a one-line reason | on |
| `sound`, `vibration` | none: device-local (stored on the device, applied to the local notification channel) | on |

- On load, the screen reads `GET` settings and maps back with the same table.
- On failure, the switch reverts and the error is shown.
- **Verify:** flip each switch → reload → same state, for both the app and the website settings page. A Jest test covers the mapping both ways.

**Q37 — slot list vs buffer.** Keep the doctor's 5-minute buffer.
- The slot list and the booking check must call **one** shared availability function.
- A slot that the booking check would refuse is listed `available: false`.
- **Verify:** `tools/live/j_concurrency.py`, step "the previous slot is either not listed as available or bookable", passes. A unit test covers the slot directly before and after a booking.

**Q42 — dispatch screens.** Do not widen API permissions; dispatch stays with ambulance operations.
- Show `sos_dispatch` and `hospital_dispatch` only to the provider types whose API calls answer 2xx today.
- **Verify:** a provider crawl of all 7 types shows no 403 from those screens.

**Q3 / test data.**
- The QA-window cleanup was applied: 5,350 documents, 130 test users (`docs/review/evidence/qa_cleanup_applied_20261002T224103.json`).
- Older crawler records from before that window still need deleting: 4 insurance companies, 3 meal logs, 2 articles, 4 medicines with their price history. That delete was blocked by the session's permission rules and is left for the owner. The agent does not touch QA data.

**Q18 — COD policy.** `platform-cod` is `active: true` again (re-enabled by the admin journey at 17:41). Nothing to do.

**Native CI.** The reviewer recommends adopting `NATIVE_CI_PROPOSAL.md`, Android (Linux runner) first and iOS second. Nothing is enabled until the owner gives explicit approval for the CI change.

## Round 8 — everything the live QA did not prove, plus the owner's follow-ups (2026-10-02)

Owner rule: anything that was **not** proven by a real click or call (failed, partial, unreachable, no permission, native-only) is **checked in code**, and a fix follows if the code is wrong. Nothing stays unlisted.

**R8-1 — code check of every unproven screen and control.**
- List: `docs/review/UNVERIFIED_CONTROLS.md` / `.json`, generated by `tools/audit/unverified_controls.py`. It holds 585 screens that are not PASSED and 1,860 controls the crawler could not prove (NO_EFFECT, TAP_FAILED, CRAWLER_TARGET_MISSING, NOT_TESTED, SKIPPED_DESTRUCTIVE).
- **Do**, per screen:
  - open the source file;
  - for each listed control, follow its handler to the end and record a verdict in `docs/review/UNVERIFIED_CONTROLS_VERDICTS.json`:
    - `file:line` of the handler;
    - what it does: navigate / API call / local state;
    - the backend route and the collection it writes or reads;
    - one of `works` / `broken` / `unwired` / `fake-data` / `dead-control`.
- Then fix every verdict that is not `works`, one commit per screen group.
- **Verify:**
  - every row has a verdict;
  - each fixed control, re-crawled, shows an effect;
  - the reviewer re-checks a random 20 % of the `works` verdicts independently, and any wrong verdict sends the whole group back.

**R8-2 — native-only features, checked in code** (the web build cannot run them). The reviewer does this check; the agent fixes what it finds.
- Features: maps, camera/scanner, push (permission, token registration to the API, tap → deep link), biometrics/passkeys, LiveKit calls (token endpoint, permissions, reconnect), background sync, file/image upload, payment hand-off, deep links.
- Checklist per feature:
  - config and plugins in `app.json`;
  - iOS usage strings and Android permissions;
  - the API endpoint exists and the body matches its DTO;
  - permission-denied and offline paths;
  - no hard-coded keys.
- **Verify:** the checklist is filled with `file:line` evidence. Each defect is a Q item with a fix.

**R8-3 — sensitive admin operations** (refund, ban/unban, payouts, commissions, loyalty, RBAC grant/revoke, impersonation, GDPR).
- Code check now: `@Roles`, `@StepUp`, idempotency, audit-log write, DB effect, UI error handling.
- Live test after R23 (step-up) is fixed: the reviewer runs each operation through the admin UI and the API, then checks the DB and the audit log.
- **Verify:** `tools/live/j_admin_sensitive.py` is green, and every operation leaves an audit row.

**R8-4 — slow screens** (crawl `time_to_ready_ms`; local web build).
- **Never-ending spinner (fix):** opening these patient-app screens without, or with a wrong, id loads forever:
  - `insurance/approval-pending`
  - `nursing/nurse-profile`
  - `consultations/appointment-detail`
  - `returns/detail`
  - `(auth)/otp`

  Show an error or empty state with a way back. **Verify:** within 3 s.
- **About 8 s:** `diagnostics/booking-confirm`, `(tabs)/diagnostics`.
- **About 15 s:** provider `hospital:attendance`, `home_care:supplies`.
- **Website:** `orders/[orderId]/offers` never settles (15 s). Next prefetches of `/ar/map`, `/ar/articles` and `/ar/support` stay open for more than 10 s on 17 pages.
- **Admin:** `/admin/security` 3.2 s.
- Profile each one, fix the cause, and re-measure.
- **Verify:** every screen is ready in ≤ 3 s on the local build, and `PERFORMANCE.md` has a before/after row for each.
- The general speed work stays as already listed: Q21/Q22 bundle, per-type lazy screens in the provider app, Q41 doctor list, Q29 indexes, and `@PublicCache` on public catalogs (14.7).

**R8-5 — duplicate and orphan screens: UX backlog. Do not implement until the UX review is done.**
- Duplicates:
  - `health/family-*` vs `family/*`;
  - `pharmacy/manual-order`, `custom-item` and `drug-not-found` all land on `/pharmacy/request`;
  - `settings/notifications` vs `notifications-settings`;
  - four booking end screens (`booking-confirm`, `booking-status`, `booking-success`, `booking-pending`).
- Orphans: `medicine-compare`; prescription detail (Q15).
- Admin public-directory pages (Q24).

**Q46 (Medium) — enumerated fields accept any text.**
- The 10-01 contract replay stored values such as `blood_type="blood_type-10452"`, `severity="severity-7651"` and `consultation_type="consultation_type-4750"`, plus surgery bookings with a non-existent `patient_id`.
- These fields have only `@IsString` (for example `medical-profile.dto.ts:5`, `users.dto.ts`, `users.settings.dto.ts`, `emergency.dto.ts:13`).
- **Do:** `@IsIn` for every closed list (blood types, severity, consultation type, platform, kind, ...) and an existence check for every foreign id.
- **Verify:** replaying the generated values gives 400 for each field, and `dtolint` flags a closed-list field that has only `@IsString`.

**Test data (owner-approved).**
- Deleted:
  - the QA-window data (5,350 documents);
  - 13 older crawler records;
  - 3 placeholder records (`saved_diagnoses`, `facility_resources`, `provider_capabilities_pharmacy`).
- Restored from its seed: the Bupa insurance company, whose names a test had overwritten.
- Still present in the QA DB, waiting on owner approval for the delete: generated values in about 60 documents across 23 collections. Evidence: `evidence/qa_cleanup_*`.

## Round 9 — single source for every catalog, video calls, code hygiene (owner decisions, 2026-10-03)

**Owner rule (mandatory):** every read of insurance companies/plans, lab tests, radiology, nursing, specialties, medicines, doctors and providers, anywhere in the four clients, comes from **one** backend source (one collection behind one module, through `CATALOG_COLLECTIONS`). No static lists, no fallback arrays, no second collection, no invented numbers. When the API fails, the screen shows an error or empty state.

**Do, one commit each:**
- **Q53 first (security).** Remove the committed LiveKit secret, and add gitleaks to CI. The owner rotates the key.
- **Q47, Q48, Q49** (website nurse and lab pages read empty collections; parallel lab catalog).
- **Q50, Q51, Q52** (hard-coded insurance and radiology lists).
- **Q54, Q55, Q56** (TURN hardening, IPv4, stale configs).
- Replace the 3 direct `collection('medicines')` reads with `CATALOG_COLLECTIONS.medicines`.

**Verify:**
- `tools/audit/catalog_sources.py` (reviewer, next): 0 static catalog lists in client code, and every catalog read on the backend goes through `CATALOG_COLLECTIONS`.
- An admin edit to each catalog is visible on the website, the patient app and the provider app (`j_catalog_sync.py`).

**Code hygiene (store-readiness).** One commit per app. Run, commit the reports, and act on them:
- `knip` (dead files and exports) and `depcheck` (unused packages). The estimate: patient-web 56 of 69 dependencies look unused (an unused UI kit), patient-app 19 of 78, provider-app 20 of 52, backend 6 of 64. Confirm each with the tools before removing it.
- `jscpd` (duplicated code).
- `gitleaks` (secrets in the code and in history).
- `semgrep` (security patterns).
- Remove process comments from shipping code: about 173 files carry `// P6.x-…`, `R12:`, `Gate P4`. Remove the stale configs.
- Q39 (`@ts-nocheck` in 186 patient-app files).

**Store-readiness checklist** (what Apple and Google actually reject):
- placeholder or demo content;
- buttons that do nothing;
- "coming soon";
- test accounts in the build;
- crashes;
- missing permission usage strings;
- for medical and AI features: a disclaimer, and no diagnosis claims.

**Native E2E (owner approved Maestro, Android first).** The reviewer builds it:
- a GitHub Actions workflow, built and run on Linux runners with the Android emulator;
- a generated smoke flow per screen from `inventory/screens.json`;
- hand-written journeys, including multi-actor ones (patient on the emulator, the pharmacies/providers driven by the API journey scripts in the same run);
- screenshots for every step, and a report;
- a failed step fails that flow only; other flows continue.

iOS: a smoke run of the core journeys before each store release.

**Video calls (self-hosted LiveKit and coturn on the OVH VPS).**
- The config was code-checked (Q53–Q56).
- A live check (token, ICE servers, TURN relay on UDP/TCP/TLS, a two-party call, reconnect) needs staging or server access.

### Round 9 — addendum: everything told to the owner on 2026-10-03, so nothing lives only in chat

**Agent tasks (one commit each, with Verify):**
- **R9-A — testIDs.**
  - Add a stable `testID` and `accessibilityLabel` to every pressable and input in both apps. This extends Q9 and is needed for native E2E.
  - **Verify:** `ui_inventory.js` reports 0 controls without an id.
- **R9-B — navigation speed.**
  - Prefetch the next screen's data.
  - Client cache (stale-while-revalidate) for catalogs and lists.
  - Skeletons instead of spinners.
  - `@PublicCache` on public catalog reads (14.7).
  - **Verify:**
    - in-app navigation on cached data ≤ 250 ms (p90), measured with `perf_web.py` on the web builds and with Maestro timings on Android;
    - first load ≤ 1.5 s on 4G (CDP).
- **R9-C — capacity target.**
  - k6 load test on staging, as in plan 14.x: 2,000 req/s of the read mix with p95 ≤ 150 ms and 0 % 5xx, plus a booking/order write mix.
  - **Verify:** the k6 report is committed. The doctor list (Q41) and indexes (Q29) are fixed first.
- **R9-D — security testing on staging.** OWASP ZAP baseline plus an authenticated scan. Every High is fixed or explained.
- **R9-E — iOS store specifics.**
  - Every permission has a usage string in `app.json` (`ios.infoPlist`).
  - Sign in with Apple stays available wherever Google sign-in is shown (present in `login.tsx` / `register.tsx`; keep it working).
  - The medical AI features carry a disclaimer.
  - **Verify:** the iOS smoke flow passes.

**Reviewer tasks:**
- Finish `CATALOG_AUDIT.md` §3, then write `tools/audit/catalog_sources.py`.
- R8-2: native features in code. R8-3: sensitive admin operations in code.
- **Maestro:**
  - build the pipeline now;
  - a baseline Android smoke now, for native-only crashes;
  - the full run after the agent closes the High items and Rounds 8–9, then on every agent push as a regression gate.
- Video calls live (token, ICE, TURN relay, a two-party call, reconnect), once staging or server access exists.
- Re-test against the real 20,990-medicine catalog on staging, or with the owner's export: search, pages, 6 locales, admin edit propagation.

**Owner actions (not code):**
- Rotate the LiveKit key (Q53).
- Make the repository private.
- Provide staging access: a Cloudflare Access service token in the environment secrets, and `staging.nabd.plus` in the allowed hosts.
- Provide the medicine catalog: staging copy, or the export file in the environment.
- Cloudflare: the message to the Cloudflare session (origin lock, Full strict, rate-limit paths, no challenge on `/api`, `/api/v1/admin` rule, DNSSEC).

## Round 10 — per-commit review of the 152 unmerged commits (tip `bb97c87`, 2026-10-04)

**Verdict:** Phase 13 **NOT APPROVED** (`REVIEW_P13.md`), Phase 14 **NOT APPROVED** (`REVIEW_P14.md`). 152 commits, **3 PASS, 149 FAIL**, each with a nine-point row and its evidence. Nothing is merged into `main`. **Do not start any new phase or task until every item below is closed.** Phase 12 stays frozen (owner): no new design work; do not revert its commits.

### Status after the reviewer's own fixes (Round 2, 2026-10-04) — read this first

The owner changed the rule after PR #239: the reviewer fixes the small defects in your code personally. Those fixes are merged into this branch as `[REVIEW-FIX]` commits (PR #240 → `1b12107`, PR #248). **Never revert or redo them.** Every row was re-checked personally; the result per sha is in `REVIEW_P13.md` / `REVIEW_P14.md`, section "Round 2".

**Done by the reviewer — remove from your list:** A1 Q81 (`27a709a`, plus Q100 refund path) · A2 Q82 (`f9dfef6`) · A4 Q80 (`1695362`) · A5 Q87 (`d949b6d`; key rotation is the owner's) · A6 Q84 (`eb1026d`) · A7 Q83 (`089922e`; the Q89 part stays below) · A8 Q85 (`7388102`) · A10 guest lifecycle (`9559886`, `5546104`) · B11 Scenario 20 (`37f54f2`) · B12 patient-web parity (`66578b5`) · B14 CodeQL (`1f625c2`, `c35a221`, `422744b`; CodeQL green on PR #240) · B15 Q58 (`9df7b9e`; plain `npm ci` passes in the native strict run) · Q90 (`e717d1b`) · Q101 (`6f6b876`) · Q105 (`0ecba09`) · Q47/Q48 (`12163e1`) · Q69 (`d47c599`, `0605147`) · wishlist 404 and its allow-list entry (`4999f10`) · F8 bulk-approve (`af6cca1`) · R7 brand (`7edc44e`) · and the rows marked "fixed by reviewer" in the Round 2 tables.

**Still yours, in this order (each is large: UI + API, a design decision, or money):**
1. **Q79** registration creates no typed documents (A3). Large: every registration screen of 7 provider types must upload typed documents through the KYC API, and the journey's own upload must go. Verify: j_onboarding, j_nursing, j_ambulance, j_facility green with only screen payloads.
2. **Q86 + Q104** payments (A9). Large (money, design): one payment path instead of `payments.module` + `MoyasarService`, one webhook receiver that authenticates Moyasar's `secret_token` field (Moyasar sends no HMAC header) and accepts the documented body. Do it together with Round 11 Q99.
3. **Q102** the patient-web service booking modal fakes a booking. Wire the real booking API (or remove the modal), and fix the copay crash from `bdcdcb6`.
4. **Q89 + R23** step-up on the remaining admin routes **and** the admin step-up UI, so the live harness and admins can pass it (j_loyalty).
5. **F2** coverage-check: the app's add-policy screen must send network and class (or coverage must work without them). Verify: j_lab, j_radiology, j_consultation.
6. **B13** `npx expo install --check`: waiting on the owner's decision (asked by the reviewer). Do not change CI until then.
7. **Q103** demo seed data out of `backend/src`.
8. **`31b1a1e`** second availability engine without the 5-minute buffer: one shared availability function (owner rule).
9. **`82830cb`** Fastify path without its dependencies; **`16be643`** purge-bus unwired; then C17–C27 below, unchanged.
10. D28 below, for every row marked "reproduced, agent" in the Round 2 tables. Notables: `d0b9ce9` (R83 clinic address is never sent by any screen), `7790744` (each report row needs its own filtered link, which means the target pages must accept a date filter), `973d08c` (insurer chips have no loading/empty/error state), `e64ec70` (an edit without approval keeps a medicine public), `9464055` (`/doctors/:id` 404 for real doctors), `/care/degrees` returns `[]`, `2ef3a3e` (engagement events 403, processor checks broken), `b4d1d98` (hard-coded facility names), `8e1e303` (testIDs), `a7596c8` (importer report).

The A/B/C/D numbering below is kept for reference; where it disagrees with this block, this block wins.

**Rules for this round (AGENTS.md, restated because they were broken):**
- One item = one commit: `[R10-<n>] <id> <summary>`. Run the full gate before every push and paste the **real** output for each item in `AGENT_PROGRESS.md`. The gate on `bb97c87` was red (unit, patient-web, CI), so the branch was pushed red.
- "Deferred", "wiring deferred", "follows", "out of scope" are not allowed. For each item: do it fully and wire it, or write `BLOCKED: <exact external reason>` in `AGENT_PROGRESS.md` and stop. The only external reasons the reviewer accepts are listed per item.
- Do not edit a verification tool (`tools/live/*`, `tools/audit/*`, the tests' assertions) to make it pass. A journey must send what the screens send.
- Do not mark your own items "Fixed"/"verified" in `docs/review/QA_DEFECTS.md`: revert those rows from `c53b9d3` and later to "Open — fix in `<sha>`, awaiting review".
- Every behaviour change ships with a test that fails when the change is reverted (the reviewer runs a mutation on each).

### A. Critical — first, in this order ([re-verified] = the reviewer re-checked it personally)
1. **Q81 refunds hit the wrong payment** (`1c01b92`) [re-verified]. Verify: two-refund spec; fake Moyasar serves `/refunds`; a journey refunds two payments.
2. **Q82 AI cache leaks one patient's OCR to another** (`094122c`) + TTL typo [re-verified]. Verify: two-patient spec.
3. **Q79 no app-registered provider can be approved** (`4fd448e`, `7560513`) — registration must upload typed documents for every required doc_type of all 7 types (including ambulance). Remove the journey's own KYC upload. Verify: `j_onboarding` 7/7 types approved with only screen payloads; RNTL test per registration screen.
4. **Q80 second approve route bypasses the document gate**; lowercase status mismatch (`7f5c299`) [re-verified]. Verify: both cases 400, tests.
5. **Q87 LiveKit key injection leaves a known key** (`82f96d0`, `deploy.sh:44-46`) [re-verified].
6. **Q84 emergency/call/payment pushes show raw keys** (`f8141c3`) [re-verified].
7. **Q83 RBAC weakened by duplicate decorators** (`49648b5`) [re-verified]; **Q89** step-up still missing on `PUT /system/permissions`, `PUT /admin/legal/commissions-policy`, impersonation start, refund/return decide, insurer writes; the **Q66 route-list spec** (every money/privilege route has `@StepUp` + its exact permissions; fails when one is removed).
8. **Q85 `/care/insurance` lists pending/disabled insurers with internal fields** [re-verified].
9. **Q86 Moyasar webhook rejects real payloads** (`9d87a78`).
10. **9537426 guest lifecycle**: `$unset` PII (no nulls on sparse unique indexes), per-guest try/catch, linkage across every collection PdplService knows. Verify: 2+ guests on a real Mongo test, bookings/payments protect the guest.

### B. Gate back to green (before any other push)
11. Unit: `auto-entity-seo-pipeline.spec.ts` Scenario 20 (broken by `3f222a0`). The code follows 13.R8; update the fixture with a real `entity_id` + source row and add the negative case. Do not weaken the assertion.
12. patient-web `translation-key-parity.test.ts`: the 28 `Errors.*` keys in ur/hi/bn/fil (`04a1544`).
13. CI `npx expo install --check` (your `458c7b8`, a CI change made without owner approval): replace with a **major-version** alignment check (as in `tools/native/build_android.sh`), or ask the owner through the reviewer. Patch drift must not fail CI.
14. CodeQL: the 7 new High alerts (list in `REVIEW_P13.md`) — fix (`String()`/`$eq`, bounded input length before the regexes) or dismiss each with a written reason.
15. **Q58** provider-app `package-lock.json` in sync: plain `npm ci` (no `--legacy-peer-deps`) must pass, in CI and in the native strict run.
16. Live gate green with journeys that send only what the screens send (remove the tool edits rejected below): j_onboarding, j_nursing, j_ambulance, j_facility (Q79), j_lab/j_radiology/j_consultation (F2), j_loyalty (R23), j_payments (the `SKIP` step must run: success, decline, refund).

### C. Deferred / unwired commits — wire it or `BLOCKED`
17. `6ca29c4` 14.4/14.18: delete the duplicate idempotency interceptor (or merge it into the global one); real outbox (schema, same-transaction writes at order create / payment captured, relay worker, failure test); kill switches: absent flag = **on**, seed the 6 flags, call `isKilled` in the 6 consumers, live toggle test each. No BLOCKED accepted.
18. `59e0d6b` 14.20: strip metadata on every upload path (multipart, base64 `StorageService.upload`, presigned via a confirm step), GPS-fixture spec; resizing + the ≤ 60 KB / LCP report. BLOCKED accepted only for the Cloudflare dashboard step.
19. `13f560c` 14.15: schema indexes, synthetic seed (21k medicines × 6 locales, 1M orders), CI explain job failing on COLLSCAN, p95 report, WiredTiger size in compose, TTL indexes; remove the silent 20-token push cap. No BLOCKED.
20. `b20ecd3` 14.14 + **X12**: two Redis roles in `deploy/` and the backend (queue `noeviction`+AOF, cache `allkeys-lru`), BullMQ on the queue URL; Redis-backed SWR with a cross-worker lock on home/categories/ranking; the "one DB query per refresh" proof. No BLOCKED.
21. `cffbab5` 14.17: factory provider (boot must not crash), windowed p99 + `heap_size_limit`, real low-priority routes, Retry-After honoured. BLOCKED accepted only for the staging k6 run.
22. `909fed4` 20.1/20.3: one request-id (merge into `CorrelationMiddleware`), JSON logger as the app logger, OpenTelemetry with propagation to BullMQ and outbound HTTP. BLOCKED accepted only for hosted log storage.
23. `094122c` 13.R21 "live proofs deferred": key encryption (AES-GCM), admin live status, medical-safety rules, exclusive pin, one gateway instance. BLOCKED accepted only for live provider failover (needs real keys on staging).
24. `0505115` 13.R11: real import pipeline into `locations` used by coverage/search/delivery. BLOCKED only if the owner's official data file is not available (name it).
25. `7d27a4e` 13.R18: wire the `nabd` scheme into the apps and web, with a test. BLOCKED only for the device/simulator proof.
26. `3c1eb45` + `105e0e0` 13.R13: persisted failed-propagation log, retries, admin list, scheduled reconcile with a 0-drift report. No BLOCKED.
27. Other unwired Phase 13 code (no "deferred" in the message, same rule): R9 `recordEvent` has 0 callers and `GET /medicines/ranking-r9` is shadowed by `@Get(':id')`; R10 nothing writes `analytics_events`; R6 nothing emits `provider.reactivated`; R17 component has 0 importers; R3 CSV has no UI; R5 client helpers unused. Each: wire it and prove it live.

### D. Every other FAIL row
28. Each FAIL row in `REVIEW_P13.md` / `REVIEW_P14.md` has an "agent must do" cell. Close every one, one commit per row (or per group of rows on the same file), with the row's sha in the commit message. Notables: R12 `permanentRedirect` inside try/catch and multi-hop 301 → 404; R5 error filter drops `statusCode`/`details` and maps 404 to `UNKNOWN_ERROR`; Q90 `tl` vs `fil`; R15 false "Pending human review" badge and developer text shown to users; R3 CSV formula injection; R2 substitution accept/reject do not change totals/items; Q88 `/home-care/services` 401; Q47/Q48 public 401 and profile over-exposure; Q50 website modal crash and fake booking; Q69 maps must survive a missing key; R7 brand leftovers ("Nabdah Plus" in password-reset email and OTP SMS, PDFs, provider-app terms, admin titles, web meta); `bece53a` `.env.*` ignores the tracked `*.example` templates; `1c01b92` breakers + fallbacks for mail, WhatsApp, S3, LiveKit, AI, maps with one chaos spec each; `5d1528c` `@PublicCache` on the public catalog reads + `stale-if-error` + a strict route-table gate; X0 nginx-in-Docker CI leak job (needs owner approval as a CI change — propose it through the reviewer).

### Reviewer decisions on the agent's tool edits
- `tools/live/gate_ids.py` ALLOW_2XX: the eight own-sub-item DELETE / mark-read / lock-release entries are **accepted**. `POST /users/me/wishlist/:itemId` is **rejected**: fix the route (404 for an unknown item) and remove the entry.
- `tools/live/j_onboarding.py` `upload_required_docs`: **rejected** (hides Q79). Remove it with the Q79 fix.
- `tools/live/j_insurance.py`: the admin network/contract setup is accepted as test setup **only** once the app's add-policy screen sends network and class (or coverage works without them); the assertion change `eligible` → `covered` is accepted. Make every caller (j_lab, j_radiology, j_consultation) pass the same setup.

### Verify for the whole round
- The reviewer re-runs the nine-point review on every new commit, the full gate, the full CI on a review copy, the live gate, and the native strict run (`review/maestro-*`, workarounds off). Round 10 closes only when all of them are green and every row above is PASS or an accepted BLOCKED.

## Round 11 — security audit with Trail of Bits skills (2026-10-04)

Source: `docs/audit/SECURITY_SKILLS_REPORT.md`. Every item below was reproduced live on the local stack (synthetic data); evidence in `docs/review/evidence/security_skills_2026-10-04/`. Round 10 comes first; these follow it in this order. Rules of Round 10 apply (one item = one commit `[R11-<n>] <Q-id> <summary>`, full gate, a test that fails when the change is reverted, no "deferred").

Already fixed by the reviewer on `main` (reach this branch through the main → agent sync; never revert): Q91 (`78e23175`), Q92 (`4f3b1898`), Q93 (`a35cb6f2`), Q94 fail-closed part (`16baba9f`).

1. **Q96 refund requests** (`insurance-engine.module.ts` `RefundService.request`). Look up the booking by `booking_kind` + `booking_id`; 404 if missing, 403 unless `patient_id` is the caller; take the paid amount, payment id and schedule from the booking/transaction, never from the body; scope the duplicate check to `{booking_id, patient_id}` and never return another patient's document. **Verify:** spec with B → A's booking = 403 and a fake booking = 404; live replay of `probes/chat_refund.py` shows both refused.
2. **Q95 medical reports** (`medical-reports.service.ts` `create`; same pattern in `POST /home-care/care-plans/:patientId`). The caller must be the provider on an appointment / lab booking / radiology booking / admission of that patient, or an admin; verify the referenced id; derive `doctor_id`/`doctor_name` from the caller. **Verify:** spec (unrelated doctor → 403, treating doctor → 201); live replay of `probes/medrep.py` → 403.
3. **Q99 Moyasar webhook** (`webhooks.service.ts` `verifyMoyasar`). Fail closed in every environment; the local stack sets a test secret and `tools/live/fake_moyasar.py` signs with it; make the replay mark atomic (`SET NX` before processing). **Verify:** unsigned POST → 400 on a development build; the payment journeys stay green.
4. **Q98 presigned uploads** (`media.controller.ts` `POST /media/presigned`, `media.service.ts`). Allow-list `mimetype` against the extension; sign `Content-Type` and a maximum `Content-Length` (or a POST policy with `content-length-range`); serve reads with `Content-Disposition: attachment`; check magic bytes on finalize. **Verify:** `probes/media_ct.py` → 400 for `text/html`; a real PDF still uploads.
5. **Q97 group chat** (`chat.service.ts` `createGroupThread`, `addParticipant`). Apply the LJ-06 relationship rule to every participant of a new group and to each added participant; no participant changes on `direct` threads. **Verify:** `probes/chat_refund.py` → group with a stranger 403; family chat still works.
6. **Q94 follow-up — TURN** (`coturn.controller.ts`/`coturn.service.ts`). Credentials only for a party of an active call session (appointment/booking id in the request, checked), TTL about 10 minutes, never for guests. **Verify:** spec; a guest token → 403; a call party → 200 with `ttl ≤ 600`.
7. **Q91 follow-up — guest merge.** If merging a guest into an existing account is still wanted, add a flow that first authenticates as the existing account (password or OTP to its verified contact) and only then migrates the guest data. Until then convert-guest with someone else's email stays 409. **Verify:** spec for both branches; live: merge without proof → 409, with proof → data moved, token for the existing account.
8. **Reproduce and close or refute each lead in §5 of the report** (payments `verifyPayment`/`RefundExecutor`/sync owner check, consultation `total_price`, provider privacy inboxes and nursing pool, `ChatGateway` token type and membership, `/calls/initiate`, AI limits and `copilot/suggest` role, patient-web CSRF, admin BFF gate token, the agent's `AdminDeviceService.revoke` id type, and the two functional regressions). For each: a failing test or live proof, then the fix — or a written reason why it is not a defect.


## Round 12 — release split (owner, 2026-10-05)

The owner split the remaining work into two phases. **Phase A blocks the next production deploy; Phase B comes after it.** This is the owner's decision, so Phase B items are not "deferred" by the agent: they are scheduled.

**Who does what** (HANDOFF §2): large items go to the implementing agent, with acceptance tests the reviewer writes first. The reviewer reviews, fixes small defects and approves.

### Phase A (before the deploy, in this order)
1. Round 11 PR #255 (reviewer's, in review) merged.
2. **Q79:** every provider registration screen (7 types) uploads the typed documents through the KYC API; remove the journey's own upload. Verify: j_onboarding, j_nursing, j_ambulance, j_facility green with screen payloads only.
3. **Q86 + Q104 + Q99:** one payment path and one Moyasar webhook receiver that authenticates `secret_token` in every environment (staging included).
4. **Q102:** the web service booking modal books for real (or is removed); fix the copay crash from `bdcdcb6`.
5. **Q89 + R23:** step-up on every remaining money/privilege admin route, a usable admin step-up UI, and the Q66 route-list spec.
6. **F2:** coverage-check works with what the add-policy screen sends. Verify: j_lab, j_radiology, j_consultation.
7. **Q103:** demo seed data out of `backend/src`.
8. **`31b1a1e`:** one shared availability function (5-minute buffer).
9. **Design checks green on this branch:** no-raw-color in 7 files and no-emoji in 2 admin files (see the main sync `5ef60110`).
10. The owner's answers of 2026-10-05:
    - **e64ec70:** a pending revision until approval.
    - **X4:** passkey enforcement, switched on only after the owner registers passkeys and the recovery path is tested.
    - **N7:** individual providers' public pages show no phone, home address or internal IDs.

Phase A closes when the gate, CI, the live gate and the native strict run are green on the tip, and every Phase A row is PASS. Then `fix/audit-2026-09` merges into `main` and the reviewer runs the rehearsed deploy.

### Phase B (after the deploy)
C17–C27 above:
- 14.4/14.18 outbox and kill switches;
- 14.20 media;
- 14.15 indexes and the load seed;
- 14.14 Redis roles and X12;
- 14.17 load shedding;
- 20.x observability;
- 13.R21 AI gateway;
- 13.R11 locations;
- 13.R18 deep links;
- 13.R13 propagation log;
- the other unwired Phase 13 code.

Until each is wired, it must be off (not called, or behind a flag that is off by default) in the Phase A deploy, and it must not change behaviour.
