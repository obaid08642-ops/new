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
