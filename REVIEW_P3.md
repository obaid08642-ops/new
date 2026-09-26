# REVIEW: Phase 3 (fix/audit-2026-09, implementer commits aca77eba..1f6b9409) + P3.0a + P3.0b

Reviewer: Claude (independent review, 2026-09-25)
Review branch: `review/phase-3` = origin/main (38b739f) + P3.0a (3b7240b) + P3.0b (22917db) + aca77eb..1f6b940 (cherry-picked).
**Verdict: FAIL, not merged.** P3.1 is blocking (below). P3.0a, P3.0b, P3.3 and P3.4 are acceptable. P3.2 is partial.

## Verification run (on the review branch)

| Check | Result |
|---|---|
| 4 REVIEW_P1_P2 fixes (idempotency marker, provider-scope `tv`, ban revokes provider sessions, `users.id` index) | intact |
| backend `tsc --noEmit` / `nest build` | exit 0 / exit 0 |
| backend unit (`npm test -- --runInBand`) | 7/7 chunks, 135 suites, **731/731** passed |
| security + journey e2e (`jest.boot.config.js test/security test/journeys`) | 15 suites, **65/65** passed |
| Client payloads vs DTOs (`tools/audit/dtocheck.js`, import-aware) | **114 mismatches** on 272 client-matched routes (549 DTO routes) |
| DTO properties typed `any` with no type validator | **1275 of 1395** `any` props (97 files) |
| Remaining `@Body() x: any` | 71 (webhooks excluded: 1) |

Merge conflicts resolved: `users.controller.ts` keeps `ChangePasswordDto` **and** the P3.0a `x-device-id` header. `provider.controllers.ts` keeps the implementer's `ResetDto` **and** the P3.0b `POST /provider/auth/change-password`.

## FAIL list (implementer must fix)

### F-P3-1: CRITICAL: P3.1 DTOs reject fields that real clients send (functional regression)
Global `ValidationPipe({ whitelist, forbidNonWhitelisted })` rejects any property **without a class-validator decorator**, and any property not declared. Many generated DTOs have undecorated fields or are missing fields. The calls below fail with 400 today (proven by running the production pipe on the DTO class):

| Route | Sent by | Result |
|---|---|---|
| `POST /orders/:id/admin/transition` (`AdminTransitionDto.to` undecorated) | admin | `property to should not exist` on every call |
| `POST /orders/:id/delivery/update` (`DeliveryUpdateDto.state` undecorated) | provider-app | `property state should not exist` |
| `PATCH /admin/coupons/:id` (`UpdateDto`) | admin | `expires_at` rejected + `segments` wrongly required |
| `POST /admin/coupons` (`CreateDto.segments` `@IsDefined`) | admin | `segments` required, admin never sends it |
| `POST /admin/notification-center/campaigns` (`CreateCampaignDto`) | admin | `title`, `body`, `segment` rejected |
| `POST /insurance/companies` (`CreateCompanyDto`) | admin | `name_ar`/`name_en` rejected, `code` wrongly required |

The full list (114 mismatches: admin catalog, CMS publish, disputes resolve, rbac, ops, segments, provider approve, nursing assign, doctor sessions, KYC upload, hospital staff, labs collect/finalize/stage, approval-workflow, referrals, insurance decisions, …) is in `docs/audit/P3_DTO_MISMATCHES.txt`. Some rows come from dynamic client URLs matching several routes; verify each one, but most are real.

Additional red flags from generation-by-usage: DTOs contain non-body names scraped from service code (`actor`, `before`, `after`, `meta`, `ip`, `user_agent`, `findOne`, `model`, `isPrivilegedAdmin`, `isOwningDoctor`, `requests`), and sensitive fields such as `providers.dto.ts` `password`/`auto_approve`. These are undecorated today, so they are rejected. If someone "fixes" them by adding `@IsOptional()`, they become mass-assignment holes. Remove them.

### F-P3-2: HIGH: P3.1 does not validate types (plan: "@IsString, @IsNumber, @IsIn …")
1275 properties are `field?: any` with only `@IsOptional()` (or no decorator). Only field **names** are filtered: `{ current_password: 1, new_password: { $gt: '' } }` passes `ChangePasswordDto`, and `{}` passes it too. The plan's Verify step ("`{}` body → 400 with a field-level message") is not met for these DTOs. Each field needs its real validator (`@IsString`/`@IsNumber`/`@IsBoolean`/`@IsIn([...])`/`@IsArray`/`@ValidateNested` + `@Type`), and fields the handler requires need to be non-optional.

### F-P3-3: MEDIUM: 71 `@Body() x: any` handlers remain
Top files: `compat/admin-spa.module.ts` (14), `medical-profile` (5), `users.controller` (4), `radiology.controller` (4), `provider.controllers` (4, including the P3.0b change-password handler), `health` (3). Only the third-party webhook bodies (signature-verified) may stay untyped.

### F-P3-4: MEDIUM: P3.2 only partly done
Plan: `common/find-by-id.ts` `findByAnyId` and replace **all** 32 `findById*` + 33 `new Types.ObjectId(` on user-supplied ids. Done: an error filter mapping Cast/BSON errors to 404, plus `findByAnyId` in `id.utils.ts`, used in 1 file. 32 `findById*` and 33 `new Types.ObjectId(` remain. The 404 filter stops the 500s, but ids in `id` (uuid) form still return 404 on those paths instead of being found. Either finish the replacement or state per call site why the id is never user-supplied.

## Accepted
- **P3.0a** (credential revocation on password change/reset): reviewed in main's fix/audit-p3. Tests `p3-credential-rotation`.
- **P3.0b** (users.password_hash is the only provider credential): login/reset/change read and write `users` only. Legacy register creates the linked users row and refuses an email already on `users`. The migration is dry-run by default, users hash wins, orphans are listed and never invented. Tests: `provider-credential.spec.ts`, `p3-provider-credential.e2e-spec.ts`. Follow-up (low): restrict the email fallback in `findLinkedUser` at login to email-verified accounts.
- **P3.3** (F15): `pick(body, *_CATALOG_FIELDS)` on create **and** update in labs/radiology/home-care, with `labs.catalog-pick.spec.ts`.
- **P3.4**: the 8 remaining `throw new Error('` are boot-time config checks, a WS auth reject and internal invariants, none on a request path.

## How to verify the fix (implementer)
```
node tools/audit/clientbodies.js > /tmp/clients.json
node tools/audit/dtocheck.js /tmp/clients.json          # must print 0 mismatches
```
Plus a table test that runs the production `ValidationPipe` for every DTO: `{}` → 400 per required field, a real client payload → accepted, an unknown field → 400.

---

# Round 2 (implementer fix 1c79338c): **FAIL, not merged**

Reviewed on a checkout of `origin/fix/audit-2026-09` @ 1c79338c. Everything was re-run by the reviewer; the implementer's claims were not relied on.

| Check | Result |
|---|---|
| `dtocheck.js` (implementer's version) | 0 mismatches / 285 matched routes |
| `dtocheck.js` (reviewer's version, 444dcc2) | 31: all traced to dynamic client URLs (`/labs/bookings/${action}/${id}`); the implementer's exact-route rule is correct, and the 3 downgraded "?" rows target other literal routes (confirm/cancel, submit-report/approve-report) that accept the body. **Accepted.** |
| Production `ValidationPipe` probes on DTO classes | **still failing, see R2-1/R2-2** |
| `tools/audit/dtolint.py` (new, reviewer) | 61 undecorated props · 524 `any` props with no type check · 55 `@Body() any` |
| tsc / unit / security+journeys | exit 0 / **734/734** (7/7 chunks) / **65/65** (15 suites): all green, but none of these exercise client payloads through the pipe |

`dtocheck` can only see client calls whose URL and body it can resolve statically. The failures below sit on routes it cannot see, which is why the gate needs `dtolint.py` too.

## FAIL list (round 2)

### R2-1: CRITICAL: 61 DTO properties still have no decorator, so every request that sends them gets a 400
Proven with the production pipe (`whitelist + forbidNonWhitelisted`):
- `POST /orders/:id/admin/transition` `{to}` → `property to should not exist`
- `POST /orders/:id/delivery/update` `{state}` → `property state should not exist`
- same pattern on live routes: `POST /provider/availability` (`SetAvailDto.status`), `PUT` system-config (`UpdateConfigDto.value`), pharmacy item action (`ItemActionDto.action`), provider-jobs `act`, unified-bookings `kind`, operations-safety `kind`, maternity `last_period_date`, community `scheduled_at`, recruitment job fields, compat admin-spa coupon/offer fields.
Full list: `python3 tools/audit/dtolint.py`.

### R2-2: HIGH: fields still have no type validation, including on auth
524 `any` props carry only `@IsOptional()`. Example on an auth endpoint: `ChangePasswordDto` accepts `{}` and `{ current_password: 1, new_password: { $gt: '' } }`. The plan requires real validators (`@IsString/@IsNumber/@IsBoolean/@IsIn/@IsArray/@ValidateNested`). Genuinely free-form JSON (config `value`, approval `change_data`) is allowed with `@IsObject()`/`@Allow()` plus a `// free-form:` reason.

### R2-3: MEDIUM: 55 `@Body() x: any` remain (plan: every write body gets a DTO)
"Not called by clients today" is not an exemption: the routes are live and reachable. Either type them or delete the dead routes. Webhooks: type the body as `Record<string, unknown>` (the signature check stays intact).

### R2-4: MEDIUM: P3.2 deferral not accepted
The plan's Do is to replace all 32 `findById*` and 33 `new Types.ObjectId(` on user-supplied ids with `findByAnyId`. The 404 filter removes the 500s, but the apps address records by the uuid `id`. On those 65 call sites a uuid now gets a 404 instead of the record: the F14 bug itself, only quieter. A call site may stay only with a one-line comment stating why its id is never user-supplied or is always an ObjectId.

### Decision on "651 any + 55 @Body any left on purpose"
Not acceptable under the plan (P3.1: "for each `@Body() body: any` … create a DTO with class-validator …"). `dtocheck` reporting 0 is necessary but not sufficient.

### Gate for round 3 (all must hold)
1. `python3 tools/audit/dtolint.py` → exit 0.
2. `node tools/audit/dtocheck.js` → 0 mismatches.
3. The ValidationPipe table test covers every DTO class (not a sample), including `{}` → 400 for required fields.
4. `findById*` / `new Types.ObjectId(` on request paths → 0 (or justified inline).
5. tsc, unit, `jest.boot.config.js test/security test/journeys` green.

---

# Round 3 (implementer fix 9b4ea75f): **FAIL, approval withdrawn after CI** (5 reviewer fixes kept; see R3-1)

Branch reviewed and merged: `review/phase-3` = main + P3.0a + P3.0b + Phase 3 (aca77eb..1f6b940) + round-2 fix (1c79338) + round-3 fix (9b4ea75), cherry-picked. Phase 4 and P5 are **not** included. The two fix commits were written on top of P4/P5; each of their 7 conflict hunks was resolved to keep Phase 3 behavior and take only the typing. For example, SLA update keeps the Phase 3 echo typed as `SlaDto`; persistence comes with F45 in Phase 4.

## Verification run (reviewer, on `review/phase-3` final state)
| Check | Result |
|---|---|
| `python3 tools/audit/dtolint.py` | 0 / 0 / 0, exit 0 |
| `dtocheck.js` | 604 DTO routes, 301 matched, **0 mismatches** |
| backend `tsc --noEmit` / `nest build` | exit 0 / exit 0 |
| backend unit (`npm test -- --runInBand`) | 7/7 chunks, 137 suites, **2543/2543** |
| security + journeys (`jest.boot.config.js`) | 15 suites, **65/65** |
| provider-app `tsc --noEmit` | exit 0 |
| 4 REVIEW_P1_P2 fixes | intact |
| admin / patient-web | no Phase 3 changes |

## Round-2 items

| Item | Result |
|---|---|
| R2-1: undecorated props | **0** (`dtolint.py`) |
| R2-2: untyped `any` props | **0**. Types were assigned with a name heuristic (`tools/audit/heuristic-type.py`), so the reviewer cross-checked them (below). |
| R2-3: `@Body() any` | **0** (webhooks typed `Record<string, unknown>`). One remained on the Phase-3-only branch (`admin rejectDelta`): fixed in review. |
| R2-4: P3.2 | 24 `findById*` + 33 `new Types.ObjectId(` remain, and every one is acceptable. Hospital-enterprise, doctor referrals and doctor integration are justified inline and enforced by `@IsMongoId()` on the DTO. Procurement has no uuid `id`, so `_id` is its only identifier (documented ID contract). Admin user/withdrawal lookups try `findOne({id})` first. Maternity schema defaults and the generic `mongo.repository` are not request-path lookups. |
| Checker integrity | `dtocheck.js`/`clientbodies.js`/`dtolint.py` unchanged since round 2. |

## Reviewer cross-checks beyond the gates
1. **Client value type vs DTO validator** (literal values sent by all 4 apps): 5 real mismatches, all the same bug (labs `reason` typed as array). Numeric fields fed from variables were traced: `parseFloat`/`Number`/server data, so no string-typed numbers. Note that the pipe has no implicit conversion.
2. **DTO type vs service/schema usage:** found `FinishAppointmentDto` (schema stores text, DTO demanded arrays, and `prescription` was required though optional in the service) and provider-ops `PutCrmDto` (`tags` a required string, while the app and service use an array).
3. **Enums vs clients:** order transition, delivery state and provider availability enums match what the clients send.
4. **patient-app reset-password** now sends the OTP `code`. The backend already required and verified it on main, so this is a client fix and never was a vulnerability.

## Fixes applied in this review (test `src/common/review-p3-dto-types.spec.ts`, 5 tests, all failed before the fix)
| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | HIGH | `labs.dto.ts` `RescheduleDto.reason` | array; the lab app sends text, so every reschedule got a 400 | `@IsOptional() @IsString()` |
| 2 | HIGH | `labs.dto.ts` `DeclareEmergencyDto.reason` | array; `PATIENT_ABSENT`/`WRONG_LOCATION` → 400 (safety flow) | `@IsOptional() @IsString()` |
| 3 | MEDIUM | `appointments.generated.dto.ts` `FinishAppointmentDto` | diagnosis/notes/recommendations arrays vs string schema; `prescription` required | strings; `prescription` optional array of objects |
| 4 | MEDIUM | `provider-ops.dto.ts` `PutCrmDto` | `tags` required string, `notes` required; app sends partial updates with a tags array | both optional arrays |
| 5 | LOW | `admin.controller.ts` `rejectDelta` | `@Body() body?: any` | `RejectDeltaDto { reason?: string }` |

## Process notes for the implementer
- Commit prefix `[REVIEW-*]` is reserved for the reviewer. Use `[P3-fix]` / `[P<n>.<t>]` (see AGENTS.md).
- Heuristic typing by field name is not evidence. Every type must come from the client payload or from the service/schema that consumes the field.
- Phase 4 and P5 work were started before Phase 3 was approved. That is not allowed from now on (AGENTS.md).

## Follow-ups (not blocking)
- The P3.0b email fallback in `findLinkedUser` at login should be limited to email-verified accounts.
- `@IsArray()` fields holding objects are validated only as arrays of objects. Add `@ValidateNested` + `@Type` where the element shape matters (money, prescriptions).


---

## Round 3 addendum: approval withdrawn (CodeQL on PR #199)

CodeQL failed on PR #199 (84 new alerts, 2 critical). CodeQL passed on the last review PR (#193). The two alerts posted inline led to a gap that `dtolint.py` did not cover. The reviewer's tool now does.

### R3-1: HIGH: 36 `@Body()` parameters are still not validated at all
`ValidationPipe` validates only **class** metatypes. A body typed as an inline object (`{ amount?: number }`), a `type`/`interface` alias (`RuleContext`, `CreateCheckoutSessionDto` is an interface), `Record<...>`, or a primitive `@Body('key') x: string` gets **no** whitelist and **no** type check. Any JSON, including objects like `{ $ne: null }`, reaches the service. `python3 tools/audit/dtolint.py` now lists all 36. Examples:
- `POST /business-rules/validate` (`ctx: RuleContext`, SelfService): `ctx.provider.user_id` goes into `providers.findOne(...)`, so `{ "provider": { "user_id": { "$ne": null } } }` is a NoSQL injection (CodeQL alert 185 pattern; alert 184 is the same handler).
- Money: `provider.controllers.ts:425` payout `{ amount, iban }`, `payments.module.ts:561` `{ amount, reason }`, `moyasar.module.ts:386` payment creation `{ booking_id, amount, … }`.
- Auth/identity: `passkey.controller.ts:26/46`, `hospital-staff.module.ts:123` `{ password }`, `auth.controller.ts:231`.
- Push, media, search-intent, location, seo, tour, b2b, facility-ops, medicines overrides, slot-locks, feature-flags, provider upload/transfer.

Fix: a validated class DTO for each, following the AGENTS.md DTO rules. For `@Body('key')`, replace it with a DTO for the whole body. Only the three signature-verified webhooks stay `Record<string, unknown>` (allow-list in `dtolint.py`).

### R3-2: CodeQL must be green on the Phase 3 PR
After R3-1, re-check PR #199's CodeQL run. Every remaining alert in code this phase touched must be fixed. Flagging a false positive is not enough: use `{ $eq: value }` for user values in Mongo filters. The review session cannot read the code-scanning alert list (403), so the implementer must paste the remaining alert ids and resolutions in AGENT_PROGRESS.md.

Reviewer note: the round-3 run proved the gates green, but the gate itself was incomplete. That is corrected now, and the round-3 fixes (labs `reason`, appointment finish, CRM, rejectDelta) stay.

---

# Round 4 (implementer fix cd925fa): **FAIL on CodeQL** (reviewer fixes below kept; see R4-1/R4-2)

Ported onto `review/phase-3` as `[P3-fix]` (3 conflict hunks; the P5.1 offering overlay in `service-catalog.module.ts` was left out, since it belongs to P5).

## Verification run (reviewer, final `review/phase-3` state)
| Check | Result |
|---|---|
| `dtolint.py` | 0/0/0/0, exit 0 |
| `dtocheck.js` | 634 routes, 311 matched, **0 mismatches** |
| `tsc` / `nest build` | exit 0 / exit 0 |
| unit | 7/7 chunks, 139 suites, **2666/2666** |
| security + journeys | 15 suites, **65/65** |
| 4 REVIEW_P1_P2 fixes | intact |

## R3 items
| Item | Result |
|---|---|
| R3-1: non-class `@Body()` | 35 → **0**. The single leftover (`tour.controller.ts`, P5-deleted on the implementer branch but present in Phase 3) was typed by the reviewer. |
| R3-2: NoSQL/XSS hardening | `$eq` pinning on user-derived equality filters. Echo-free write responses: surge `{ok:true}`, address `{id}`, insurance `{success, verified}`, and the claim no longer spreads the input. Contract-PDF signature loading is bounded to 1 MB with image types only. |
| Checker integrity | `tools/` unchanged by the implementer |
| Commit prefix | `[P3-fix]`, correct |

## Reviewer checks
- Attack probes through the production pipe: `{ $ne: null }` rejected on business-rules `provider.user_id`, passkey `identifier`, staff `password`. Refund `"50"` rejected.
- Moyasar payment creation: the amount comes from the booking server-side and is required to be > 0, so a client amount can't underprice.
- Cross-check of DTO type vs client literal: **0**. DTO type vs service usage: **0**.
- Response-shape changes traced to their clients (see fix 3).

## Fixes applied in this review (tests in `src/common/review-p3-dto-types.spec.ts`, each failing before its fix)
| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | **CRITICAL** | `moyasar.module.ts` webhook | Typed as class `WebhookDto {id, data}` since round 1 (a648415). Moyasar also sends `type`, `created_at`, `secret_token`, `account_name` and `live`, so `forbidNonWhitelisted` returned 400 on every webhook and paid bookings were never confirmed. The reviewer missed it in rounds 1–3. | `Record<string, unknown>` (signature-verified, the pipe skips it); allow-listed in `dtolint.py`; `WebhookDto` removed |
| 2 | MEDIUM | `payments.dto.ts` `RefundPaymentDto`, `moyasar.dto.ts` `RefundDto` | `amount: -5` or `0` passed and went to the gateway | `@IsPositive()` |
| 3 | MEDIUM | patient-app `shared/location-picker.tsx` | Address create now returns `{id}` only, and the screen stored that as the selected delivery address (label, street and coordinates lost) | store `{ ...payload, id }`. No test: patient-app deps not installed in the review env; one-line change, reviewed by hand. |
| 4 | LOW | `tour.controller.ts` | `@Body('stepId')` primitive (module unreachable, but the gate must be 0) | `CompleteTourStepDto` |


## Round 4 addendum: CodeQL on PR #199 head 5599173: 20 high (was 84 incl. 2 critical)

### R4-1: HIGH: approval-workflow mass-assignment (real, not a CodeQL false positive)
`POST /approval-workflow/requests` stores free-form `change_data` (`@IsObject`) and a caller-chosen `entity_id`. On admin approval, `approval-workflow.module.ts` ~L106–150 does `$set: { ...change_data, ...edit_data, … }` onto the medicine/provider/facility/lab/radiology/home-care record with that id. There is **no field allowlist** and **no check that the requester owns the target**. So any field, e.g. `verified`, `status`, `commission_*`, `owner/account ids`, `rating`, can be written onto any record the moment an admin clicks approve.
Fix: (1) a per-entity allowlist (medicine: `MedicinesService.EDITABLE_FIELDS`; provider/facility/service: the fields their own edit DTOs allow) applied **both** at request creation (reject unknown keys, 400) **and** at approval; (2) when `entity_id` is set, require the requester to own it (or be admin); (3) build `$set` from the allowlisted keys only. Test: a request carrying `verified:true` / `status` / an id is rejected, and a foreign `entity_id` is rejected.

### R4-2: HIGH: fix every remaining CodeQL alert on PR #199
CodeQL cannot see class-validator whitelisting, so it flags whole-object `$set` sinks (`articles.update` `rest`, `service-catalog.updateService` `patch`, system-config `{ value }`, …). For each, build the update from explicit allowlisted keys: `$set: pick(dto, FIELDS)` with a const `FIELDS`, or per-field assignment. Free-form JSON (system-config `value`) goes under an explicit `$set: { value }` with a size limit. The implementer can read the alert list via the API (the reviewer session gets 403), so paste each alert id → resolution into AGENT_PROGRESS.md. The gate is **CodeQL green on PR #199**.

Reviewer fix: `tools/audit/dtocheck.js` module filter is now a path substring, not a regex built from argv (CodeQL #186).

---

# Round 5 (implementer fix 0188092): **APPROVED in review, pending CodeQL/CI on PR #199**

Ported onto `review/phase-3` (5 conflict hunks). Adjusted by the reviewer to keep Phase 3 free of P5 code: `approval-workflow` imports `../providers/providers.service` (P5.3 moved it), and the P5.3 module rewrite `admin/enterprise/admin-enterprise.module.ts` and 7 test-file import paths to P5.3 locations were not taken. The P5.1 offering overlay stays out of `service-catalog`.

| Item | Result |
|---|---|
| R4-1 approval-workflow | Per-entity allowlists (medicine = `MedicinesService.EDITABLE_FIELDS`, provider = `PROVIDER_CONFIG_EDITABLE_FIELDS`, facility/lab/radiology/home-care explicit lists); unknown keys → 400 `uneditable_fields` at create; ownership (medicine creator / provider user / facility link / `ServiceOwnership`) → 403 `not_entity_owner`, admin bypass; approval `$set` = allowlisted keys of change_data + edit_data only. Tests: governance keys rejected, foreign record rejected, owned accepted, admin bypass, `$set` has no `verified`/`status`. |
| R4-2 CodeQL | `$eq` per-id lookups, explicit `$set: { value }` with a 64 KB cap on system-config, `pick` of allowlisted keys on update sinks. Final word = CodeQL on PR #199. |
| Tools | Only the reviewer's own dtocheck/dtolint edits (identical). |
| Gates (reviewer run) | dtolint 0/0/0/0 · dtocheck 634/311/**0** · tsc + build exit 0 · unit **2671/2671** (139 suites) · security+journeys **65/65** |
| Process | **Violation:** 18 more P4/P5 commits pushed before Phase 3 approval (AGENTS.md "one phase at a time"). |

---

# Addendum: Gate P3 run live (2026-09-26, reviewer)
Phase 3 had been approved on static gates plus unit tests. Its own gate says "every write endpoint rejects bad bodies with 400, 0×500". The reviewer ran that live: backend from `main` on a real MongoDB replica set and Redis, with `wsweep.py` sending `{}` to every write route (851) as admin, patient and provider, before and after the fixes. Result: **0×500**. The client payloads were then replayed live.
The sweep and the replay found the following, all fixed on `review/gate-p3-live`. Each has a test in `src/common/gate-p3-live.spec.ts` (9 of the new tests fail on the old code) or `patient-web/lib/api/upstream.test.ts`.

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| G1 | CRIT | `api-security` | Anyone could skip every rate limit with the fixed header `x-bypass-rate-limit: nabd-load-test` | `loadTestBypass()`: never in production, only with the secret `LOAD_TEST_BYPASS_TOKEN` |
| G2 | CRIT | `provider.controllers` `/provider/seed`, `/seed/reset` | Test-data seeding was reachable outside tests | 404 unless `NODE_ENV=test` and `ALLOW_TEST_SEED=true` |
| G3 | HIGH | `moyasar` create/refund | The sandbox branch (no gateway key) "succeeded" in production: refunds were marked done without money moving | 503 `payment_gateway_not_configured` in production, nothing saved |
| G4 | HIGH | provider delta submit, score recompute | Patients could call provider-only routes | 403 unless provider role |
| G5 | HIGH | patient-app **and** web reminders (`RcDto`) | P3.1 DTO omitted `times`/`time_zone`/counts, which the service requires, so **every new medication reminder got a 400 (mobile included)**. The web form also sent no `time_zone` or idempotency key | DTO fields added; web form sends `time_zone` and a key |
| G6 | HIGH | patient-web → API (`callPatientApi`) | A string body went out as `text/plain`, which the API's JSON parser ignores, so 22 web routes reached the handler with `{}` | `content-type: application/json` for string bodies |
| G7 | HIGH | `patient_profiles` schema | Strict sub-schemas silently dropped fields: the web address (`line1`, `district`, `region`, `notes`…) saved as 201 but came back empty; the saved insurance lost `company_id`, `company_name`, `member_id`… | Fields added to the schema; `street` and `line1` mirrored so both apps show the address |
| G8 | HIGH | provider insurance decision, provider jobs | Read the non-existent collection `patientprofiles`, so the insurance decision always failed and job cards never showed **allergies and chronic diseases** | `patient_profiles` |
| G9 | MED | checkout (`cash`), nursing booking (`address_id`, `notes`) | Web payload rejected (400) | DTO fields added; `address_id` resolves to the caller's own saved address only (`address_not_found` otherwise) |
| G10 | MED | empty-body creates (address, insurance, delivery rule, legal policy, shortage report) | `{}` created empty records | 400 with a specific message |

Tools: `clientbodies.js` now resolves zod `input.data`, `useState` form bodies and `cond ? PATCH : POST` calls (that is how G5 and G9 surfaced). `dtocheck.js` does not block when a duplicate route has one accepting declaration. `routes.py` is now portable and has `--dups`.
**33 METHOD+path pairs are declared in two or three files** (for example `POST /insurance/save-policy`, `POST /home-care/bookings`, `POST /patient/pharmacy/orders`). Only the first registered handler runs, so the other copy is dead code that looks alive. P5.3 must end with `python3 tools/audit/routes.py --dups` = 0, keeping the behavior of the handler that is served today (checked live for save-policy = insurance-engine and home-care bookings = home-care-compat).

Gates (reviewer): tsc 0 · nest build 0 · unit **2703/2703** · security+journeys **65/65** · dtolint 0/0/0/0 · dtocheck **0** · patient-web `pnpm check` 0, vitest 337 passed. Live: all the payloads above now return 201 and read back intact.

Follow-ups (not fixed here):
- patient-app `consultations/prescription-from-doctor.tsx` "add to reminders" sends no times or time_zone, so it always fails, and the UI marks the item added anyway (pre-existing). It should open the reminder form prefilled instead.
- About 110 client bodies remain statically unresolvable (the "?" lines in dtocheck). The live replay covered the main patient flows, but the admin console bodies (`var:body`) still need a pass. This goes into Gate P5 "contract scripts 0 mismatches".
