# REVIEW — PHASE R: independent re-audit of Phases 0–11 and the Phase 12 foundations

Reviewer, 2026-10-01. Base: `fix/audit-2026-09` @ 636310e (= main b70f697 + nothing new from the implementer).
Method: no claim from `AGENT_PROGRESS.md` was taken on trust. Every result below was re-run by the reviewer on a fresh
local stack: Mongo replica set, Redis, moto S3, SMTP sink, fake Moyasar, admin BFF with the gate token, and a fresh
database per run.

**Verdict: CHANGES REQUIRED.** The FAIL lists (R1–R22, and round 4: R23–R40) are mandatory before Phase 12 screens (A11/C3/C4) continue.
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

