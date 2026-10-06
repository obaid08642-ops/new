# Review: OpenCode commits on fix/audit-2026-09 (08420c11..6c0ed5bf, 97 commits)

Reviewer: Claude, 2026-10-05. Rules: AGENTS.md, docs/audit/02_AGENT_EXECUTION_PLAN.md, REVIEW_P*.md.
Backup of the work: `opencode/phases-13-21-snapshot`. Per-group detail (commands, file:line, patches): the
sections below are the reviewers' full tables.

## Owner decision 2026-10-06 (B) — done
`fix/audit-2026-09` was restored with normal commits (no force-push): 5691122a = tree of 08420c11, then
e0bec75c = the reviewed line 8fbb9358 (no OpenCode commit; PRs #279 #285 #287 #288 #289 #290 #291 + main).
Gate on e0bec75c: tsc 0, build ok, unit 2165, boot 74, dtolint 0, dtocheck 0 mismatches. OpenCode's work stays
on `opencode/phases-13-21-snapshot` (6c0ed5bf) and comes back as reviewed PRs: P15 first (green up to 00334901),
then 16–21, each with A–K fixed and the `oc-*` acceptance passing. Item F (CI pins) is closed by the restore:
`acceptance/oc-ci` passes 9/9 on e0bec75c.

## Verdict: FAIL — tip 6c0ed5bf is broken

| check at tip | result | base 08420c11 |
|---|---|---|
| backend tsc | does not parse (shell residue `EOF` / `wc -l` at the end of auth.service.ts); 103 errors once stripped | 0 |
| admin / patient-web / provider-app / patient-app tsc | 30 / 46 / 3 / 59 errors | 0 / 0 / 0 / 53 |
| backend auth jest | 9/15 suites fail, 33 tests run | 14/14 suites, 74/74 |
| admin `npm ci` | fails (lockfile out of sync since f23734a2) | ok |
| Phase A acceptance (q79 q86 q89 f2 q103 31b1a1e e64ec70 n7) | none passes; q103 0 tests run, q86/q89 suites no longer compile | (open items) |

**Totals: 97 commits — PASS 57, FAIL 38, needs-OpenCode 2.** No Phase A row closes (no commit claims a Phase A id, and
no Phase A acceptance passes at tip). P15 at 00334901 (merged with the reviewer fixes) was green (backend 2636/2636,
patient-web 701, provider-app 147); later OpenCode commits (52dc3644, 6180cdf1, aa753710, 6242f179, e87b626e) broke it.

## Phase 3 / Phase 5 (approved phases) — regressions, no reason given (FAIL)
- Phase 3: `sentry.filter.ts` answers every production 4xx/5xx with `SERVER_ERROR` (error catalog codes erased);
  referral `ApplyDto` now requires `deviceId`/`phone` (web sends `{code}` → 400); pharmacy `CreateDto` rejects the
  `utm_data` the web sends (→ 400).
- Phase 5: the 2026-10 "consolidate" migrations drop source collections on `--apply` (7/8), re-merge
  `doctor_appointments` against the approved script, target `audits` instead of `auditlogs`, drop the live
  `chat_sessions`/`chat_threads`, default to a local Mongo URI, always report `writes_performed:false`.

## For OpenCode (each with an acceptance test it may not edit)
| id | work | acceptance |
|---|---|---|
| A | Restore auth.service.ts from 08420c11 and ADD Phase 21 on top; all 14 auth suites of 08420c11 green unchanged; socialLogin kept (Q107 review fix) | `acceptance/oc-auth` + `npx jest src/modules/auth` |
| B | Phase 21 rework: linking needs proof + ownership (no placeholder emails), guest merge (correct filters, no swallowed errors in the transaction, proof of target), atomic session rotation + family revoke on reuse, OTP hashed + capped + opaque + CSPRNG, DTO classes, `guest/cleanup` admin-only, permission matrix stored and enforced, tests for every Verify | `acceptance/oc-phase21` |
| C | Delete/realign the 2026-10 migrations with REVIEW_P5 (no drop, explicit URI, honest report) | `acceptance/oc-migrations` |
| D | Restore the audit-log event writers and `/security/audit`, tracing and correlation id (`x-correlation-id`, `req.correlationId`) removed by 6180cdf1 | `acceptance/oc-security` |
| E | Remove the re-added admin wallet routes and restore `test/security/f01-wallet.e2e-spec.ts` (81955522) | `acceptance/oc-security` |
| F | Workflows: real action pins (invented SHAs like `8b8b…`), no workflow under `patient-web/.github` — **CI change, owner approval** | `acceptance/oc-ci` |
| G | Fake data: SCFHS mock relabelled `scfhs_api` and used on error; SPL hard-coded addresses; contact button placeholder numbers and missing endpoints; `your-org` runbook links; synthetic journeys to non-existent ids | `acceptance/oc-security` (+ review) |
| H | patient-web API client throws on every non-2xx (BFF refresh-on-401, 404/409 handling and messages lost) — return the response, throw only on transport/timeout/offline | review g4 (client.test/install.test must change) |
| I | patient-app offline outbox: allowlist, stable Idempotency-Key per entry, no head-of-line block, clear on logout (both apps) | review g4 |
| J | OTA 5% rollout/rollback is not real (no rollout percentage, wrong rollback target, no updates channel) | 15.12 Verify |
| K | Dead code never wired: field encryption + medical access log (16.9), SCFHS (19.3), SPL (19.7), stock reservation + review validation (16.12); Phase 18 deleted 108 patient-app locale keys still used | review g2 |

Small fixes are done by the reviewer in a separate PR (DeviceGate `osVersion`, chaos switches off in production,
provider-app login token, medication reminder cancel, error.tsx loop, rapid-tap check, sentry filter, DTOs, etc.).


---

# g1-auth review: auth, sessions, guest merge, Phase 21, Phase 4/5 claims, "TypeScript fixes"

Reviewer worktree: `scratchpad/ocrev/wt-g1-auth-tip` (6c0ed5bf, with only the shell residue removed from `auth.service.ts` lines 330-331 so that tsc gives real errors).

Commands I ran:
- `npx tsc --noEmit` at tip (residue stripped) gave **103 errors** (full list: `ocrev/g1-tsc.txt`). 23 are in auth.controller.ts and 4 in nabd-extensions.controller.ts. Others: auth.module.ts (`@nestjs/axios` missing), passkey.controller.ts (`completePasskeyLogin`), users.service.ts (`rotateSessionsAfterPasswordChange`) and admin-recovery.controller.ts (`verifyOtp`; `sendOtp` returns void).
- `npx jest --runInBand src/modules/auth`:
  - base 08420c11: **14/14 suites, 74/74 tests pass**.
  - tip: **9 of 15 suites FAIL**, 33 tests run, 2 fail. The 2 are C6 recovery start (`admin-security.spec.ts`).
  - The failing suites are auth.service, auth-otp-channels, patient-web-auth.contract, admin-security, otp-server-clock.p15, social-login.q107, auth.guest-takeover, disabled-account-tokens.r11 and admin-alert-email.r11.

Note on `lost-by-oc.txt`: every auth line there is attributed to `REV 27dd312f` ("remove node_modules symlink"). That commit re-added the whole tree, so the attribution is a blame artefact. I attributed the real review commits with `git log -S` on the 08420c11 history (see section 1).

## Per-commit table

| commit | claimed item | verdict | evidence | Phase 3/5 touch |
|---|---|---|---|---|
| 4a0612ca | "Critical TypeScript fixes and security implementations" (no task id) | **FAIL** | • Not one task per commit: 30 files and +1939 lines. It adds 4 admin report pages, 2 patient-web pages (data-export, delete-account) and 2 P5 migration scripts (`2026-10-consolidate-pharmacy-orders.ts`, `-chat-sessions.ts`), none of them in the message.<br>• It creates two conflicting helpers, `common/find-by-id.ts` (`findByAnyId(model,id)`) and `common/find-by-id/find-by-id.ts` (`findByAnyId(id)`); the import `../../common/find-by-id` resolves to the first.<br>• It removes helmet `permissionsPolicy` from main.ts:225. nginx confs still send Permissions-Policy, so this is no real loss.<br>• The ObjectId refactors in admin.controller, finance, doctor-referrals and procurement are behaviourally equivalent; I read them and the procurement ownership filter `pharmacy_id` is kept.<br>• It adds `any` (`toObjectId(): any`). | P5: adds migration scripts without a reason; see 6242f179 for the conflict. |
| f2b285e6 | "Critical TypeScript fixes" (no id) | **FAIL** | • `compliance/scfhs-license.service.ts:254` relabels the **mock** SCFHS verification result from `source:'mock'` to `source:'scfhs_api'`. `mockScfhsVerification` marks any license of ≥6 characters as `active`, with an invented name and a 1-year expiry. It is used when the API key is missing **and** when the API fails (fail-open). The relabel hides fake data in the audit trail.<br>• Typed returns are replaced with `Promise<any[]>` (medical-access-log, scfhs).<br>• It commits the binary `packages/i18n/nabd-i18n-1.0.0.tgz` and a 1971-line lockfile. | no |
| 81955522 | "Inline findByIdAndUpdateByAnyId" (message names only procurement.service) | **FAIL** | • Mislabeled: 23 files changed.<br>• **Re-adds the admin `POST /wallet/credit` and `/wallet/debit` routes** (`nabd-extensions.controller.ts:58-108`, still there at tip). These were removed by `[REVIEW-FIX] b56c5718 R6` and R6.F1.<br>• It **rewrites the guard spec `test/security/f01-wallet.e2e-spec.ts`** from "404 for any role, no admin backdoor remains" to "admin gets 2xx". That deletes a review security test.<br>• At tip, `CreditWalletDto`, `DebitWalletDto` and `auditAdminWalletAdjustment` do not exist (4 tsc errors).<br>• Adds junk files `run_adminbody.py` and `aud/admin_writes.json` at the repo root.<br>• Changes the jest `transformIgnorePatterns`.<br>• The `throw new Error` to `InternalServerErrorException` swaps (JWT_SECRET, LiveKit, chat-rt) still fail closed; not weakened. | Indirect: the f01 test is a security regression. |
| ca8df120 | Phase 21 (21.1-21.8 services) | **FAIL** | • No tests for any 21.x Verify.<br>• `guest.service.ts:58-60` filters with `{user_id: g, patient_id: g}` (both fields must match), so most collections never match.<br>• `carts` and `addresses` are bulk-moved before the "merge carts / dedupe addresses" logic runs, so that logic is dead.<br>• Per-collection `try/catch` swallows errors inside the transaction.<br>• The list is hard-coded, not "generated from the schemas".<br>• `permission-matrix.service.ts` is a static array: not admin-editable and not used by any guard.<br>• guest-lifecycle deletes `users` where `orders_count` is missing. No code maintains `orders_count`, so guests **with orders** qualify, and their data is orphaned.<br>• The Phase 21 work started although no REVIEW_P15..P20 approval exists (the latest is REVIEW_P14). | no |
| 6242f179 | Phase 21 atomic merge, email OTP, linking + 6 P5 migrations | **FAIL** | • **auth.service.ts goes from 1263 to 187 lines.** The file ends with the literal placeholder `// ... rest of existing auth.service.ts methods` (line 186).<br>• Deleted: login, verify2fa, completePasskeyLogin, refresh rotation, revokeAfterCredentialChange, patient OTP, reset, guest/convertGuest, socialLogin and admin alerts. See section 1 for the list and the review commits behind each.<br>• The controller now calls methods that do not exist.<br>• It adds 6 destructive P5 migration scripts (section 3). | P5: **regresses** (conflicts with the approved P5.2 decisions). P3: new controller bodies use inline types with no DTO (`{method; token}`, `address: any`), against the DTO rules. |
| 0e5ff93d | "Complete Phase 21.4-21.7 + Phase 4 F4/F5 + Phase 5 migrations" | **FAIL** | • Several defects make the "Complete" claim false:<br>  – `email-otp.service.ts:72-74`: `createProvider` reads `providerStates.get()` **before** the state is set, so `state` is undefined. Every `isHealthy()` call throws, and email OTP can never send.<br>  – `auth.service.ts:256-268` `verifyExternalToken` returns the hard-coded `'user@gmail.com'` and `'user@icloud.com'` ("placeholder").<br>  – OTP codes use `Math.random` (auth.service:151, email-otp:245), are stored in **plaintext** in `email_otps`, verification has no attempt limit and is not atomic, and SMS-path codes are never stored, so they can never be verified.<br>  – `POST /auth/guest/cleanup` has no `@Roles(ADMIN)`: any logged-in user, including a guest, can trigger mass deletion.<br>  – Email branding is "نَبْض" (regresses R7 `7edc44e9` "نبض بلس / Nabd+").<br>• The "Phase 4 F4/F5" in the subject are not Phase 4 ids.<br>• Phase 4 statements are claims only, with no code; see section 4. | P3: endpoints with no DTO. |
| e87b626e | "Complete Phase 21.4-21.8 + Phase 4 + Phase 5" | **FAIL** | The only diff swaps the placeholder comment for shell residue `EOF` and `wc -l backend/src/modules/auth/auth.service.ts` (auth.service.ts:330-331). The backend no longer parses. "Phase 4 … COMPLETE" is a claim only. | no |
| 221cbbaf | Phase 4 F18 + F23 | **FAIL (minor)** | • F18: a no-op refactor. `aggregateRating` was already omitted at count=0, approved in REVIEW_P4. It adds a `const` in a `case` without braces.<br>• F23: a new `GET /pharmacy/returns/timeline/:orderId` that duplicates the approved F23 (REVIEW_P4 says the returns timeline already uses real timestamps). It reads only the legacy `orders` collection, not `pharmacy_orders`. It uses `Promise<any>`, `as any` and `(h:any)` in new code, and has no test. | no |
| 6e95f331 | "TypeScript fixes for security services" | **FAIL** | • The type changes (abuse-prevention, stock-reservation) are fine: no guard removed.<br>• It also **adds an undisclosed CI workflow** `.github/workflows/a11y.yml` (57 lines, still at tip). That is a CI change without owner approval, and the message does not mention it. | no |
| 206f1fff | "Replace 'any' with proper types; all security services pass TS strict" | **FAIL** | • It puts `interface ReservationItem` and `interface ActiveReservation` **inside the class body** (stock-reservation.service.ts ~l.320). That is a syntax error at this commit, so "pass TS strict checks" is false. 4a0612ca later moved them to top-level `export interface`.<br>• The `catch (error: unknown)` changes are fine; no guard weakened. | no |
| b0f2f0f4 | "Replace console.log/error with eslint-disable" | **FAIL (low)** | It only adds `eslint-disable-next-line no-console` above 5 `console.*` calls in production components. This silences the checker rather than fixing the code (AGENTS: "making a checker pass is not the goal"). It includes a debug `console.log('Analytics consent granted')`. | no |

**Totals: PASS 0 / FAIL 11 / needs-OpenCode: the auth restore (section 1) and the Phase 21 rework (section 2) are needs-OpenCode-sized and are listed below.**

## 1. Auth behaviour at 08420c11 versus tip

At tip, AuthService has none of the methods below. The controller still routes to them (tsc TS2339).

| behaviour (base method) | at tip | introduced / last hardened by |
|---|---|---|
| `login` incl. admin 2FA, **passkey bootstrap C1** (`passkey_bootstrap`) | GONE | f2dd8f96 (bind admin devices to passkey, step-up, recovery start); base import 648e423f |
| `verify2fa` `passkey_required`; disabled account refused | GONE | f2dd8f96; **[REVIEW-FIX] 724b316f** R11 (disabled account) |
| `completePasskeyLogin` + admin device binding **C2** (`adminDevices.enroll`) | GONE (passkey.controller.ts:57 broken) | f2dd8f96 |
| `refreshToken` rotation, **reuse detection** (`refresh_token_reused_or_revoked`, family revoke), device binding (`refresh_token_device_mismatch`) | GONE | 648e423f import |
| `logoutAllDevices`, `revokeAllUserSessions` | GONE | 648e423f |
| `revokeAfterCredentialChange` / `rotateSessionsAfterPasswordChange` (P3.0a) | GONE (users.service.ts:410 broken; password change no longer revokes sessions) | P3.0a |
| `requestPatientOtp` / `verifyPatientOtp` / `exchangePatientSession`: `randomInt`, bcrypt-hashed code, attempt counter, 3/10-min Redis limit, `opaqueOtpResponse` | GONE. otp/request now calls `sendOtp`, which throws distinguishable errors (`sms_not_enabled_for_country`, `otp_delivery_failed`, plain `Error` for rate limits, which gives a 500), so the response is **not opaque** | 648e423f; F34/F63 |
| `forgotPatientPassword` / `resetPatientPassword` / `resetPassword` | GONE (forgot now sends a code that no endpoint verifies) | 648e423f; brand **[REVIEW-FIX] 7edc44e9** R7 |
| `guest` device-binding protections; `convertGuest` refuses another account's phone/email | GONE; convert-guest now calls `migrateGuestData(guestId, dto)` (TS2345) | **[REVIEW-FIX] 78e23175** Q91 |
| `socialLogin`: verified Google/Apple tokens, patient-only, banned refused | GONE; replaced by a placeholder `verifyExternalToken` | **[REVIEW-FIX] 51a7a8a0** Q107; **[REVIEW-FIX] 3ad58803** R11 |
| admin login alerts **C5** (`adminLoginAlert`, `sendNewDeviceAlert`) with HTML escaping | GONE | 648e423f; **[REVIEW-FIX] 4be7005a** R11 §5 |
| trusted devices (`listTrustedDevices`, `revokeTrustedDevice`, `deviceHeartbeat`, `onlineDevices`) | GONE | 648e423f |
| `me`, `publicUser`, `register`, `registerPatientContract`, `recordComplianceConsent`, `sendOtp` / `verifyOtp` (admin recovery C6) | GONE / changed (C6 recovery tests fail) | 648e423f; f2dd8f96 |

## 2. Phase 21 specifics

- **Atomic merge:** `withTransaction` wraps it (auth.service.ts:79-88), but it is **not effectively atomic**:
  - per-collection `try/catch` swallows failures;
  - the filter requires both `user_id` and `patient_id` (guest.service.ts:58-60);
  - the merge does not check that the caller is a guest or that it owns the target;
  - **every guest-takeover protection is gone**;
  - `auth.guest-takeover.spec.ts` is unchanged but no longer compiles (`service.guest` and `service.convertGuest` are missing).
- **Email OTP failover:**
  - no hard-coded secrets (keys come from `ConfigService`) and no fake provider (real resend/nodemailer/brevo calls);
  - but `@getbrevo/brevo` is not installed (`@ts-ignore`, `any`);
  - the providers-state bug makes the whole chain throw at runtime;
  - codes are plaintext, there is no verify attempt cap, and `Math.random` is used;
  - quota resets via a constructor `setInterval`.
- **Account linking: yes, a user can link another person's email without proof.**
  - `providerEmail` comes from the caller or the placeholder `verifyExternalToken`;
  - `confirmLink(linkId)` checks no ownership and no code;
  - on confirm it sets `users.email` to that email when empty. That is a step toward account takeover through email-based reset/OTP.
  - The controller calls a non-existent `auth.linkAccounts`.
- **Sessions:**
  - a new Mongo `sessions` store runs parallel to the (deleted) Redis refresh store and is wired to no endpoint;
  - rotation is a non-atomic find-then-update, so two concurrent uses of the same token both succeed;
  - mismatch revokes only that session, not the family or `token_version`;
  - there is no expiry check in `rotateRefreshToken`;
  - `as any` at session.service.ts:248;
  - no tests.

## 3. Phase 5 "8 migration scripts" (`backend/scripts/migrations/2026-10-consolidate-*.ts`)

- **Dry-run default:** yes (`--apply`).
- **Non-destructive default:** dry-run itself writes nothing.
- **Destructive on apply:** 6 scripts **`drop()` the source collection**: auditlogs, chat-sessions, chats, doctor-appointments, lab-bookings, notifications, radiology-bookings (pharmacy-orders is report-only).
- **Other problems:**
  - `writes_performed:false` stays false after writes (a false report);
  - they fall back to `mongodb://127.0.0.1:27017/nabdplus` instead of requiring `MONGODB_URI`; the approved 2026-09 scripts throw `MONGODB_URI_required`;
  - not idempotent for documents without `id`;
  - chats and notifications drop the source even when some documents were skipped for id collisions, which loses data.
- **Conflicts with approved P5:**
  - `2026-10-consolidate-doctor-appointments.ts` mechanically copies, then drops `doctor_appointments`. The approved `2026-09-merge-doctor-appointments.ts` states that a mechanical copy "would corrupt the care state machine" and REFUSES to copy. `doctor_appointments` still has live writers (doctors.schemas.ts:55, provider-ops.module.ts:682).
  - The auditlogs script targets `audits` (0 code refs), not the approved `auditlogs` merge (`2026-09-merge-auditlogs.ts`).
  - The chats script drops `chat_sessions`/`chat_threads`, which are live schemas (chat-session.schema.ts, chat.schemas.ts).
  - The chat-sessions script merges in the opposite direction to the chats script.

## 4. Phase 4 claims

| claim | true? |
|---|---|
| F21 "AI endpoints already have ServiceUnavailableException" | true: `ai_provider_unavailable` is in code, and `ai-provider.fail-closed.spec.ts` exists (REVIEW_P4 OK) |
| F22/F81 "provider-app constants already clean" | true: the grep finds only comments |
| F45 "SLA already implemented" | true: admin-config.controller `sla` GET/PUT (REVIEW_P4 OK) |
| F18 "omit aggregateRating when count=0" | already done before (REVIEW_P4); 221cbbaf is a no-op |
| F23 "returns timeline from order.state_history (new endpoint)" | a duplicate of the approved F23, with `any` and no test |
| "Remaining: F16 schema fix + migration" | **false**: F16 is done and approved (`seed.facilities.ts` has `status:'reference'`, `public_eligibility:false`; `2026-09-strip-facility-ratings.ts`) |
| "Phase 4 COMPLETE" (e87b626e) | Phase 4 was already approved in REVIEW_P4/P5; these commits add nothing needed |

## 5. "TypeScript fixes" commits: guard weakening

- **81955522:**
  - security test rewritten to accept a removed admin wallet backdoor;
  - backdoor routes re-added.
- **f2b285e6:** mock license verification relabeled as a real API source.
- **4a0612ca:** `permissionsPolicy` removed from helmet (nginx still covers it); admin `userOverview` lost its `password_hash/otp_codes` projection, but the response picks fields explicitly, so there is no leak.
- **6e95f331 / 206f1fff:** no guards removed. 6e95f331 adds an undisclosed CI workflow; 206f1fff left a syntax error.

## SMALL FIXES (proposed, not applied)

1. `backend/src/modules/auth/auth.service.ts:330-331`: delete the lines `EOF` and `wc -l backend/src/modules/auth/auth.service.ts` so the file ends at `}`. Parse-only fix; the methods are still missing.
2. `backend/src/modules/auth/email-otp.service.ts:71-77`: set `providerStates` before calling `createProvider`:
   ```ts
   for (const cfg of PROVIDER_CONFIGS) {
     this.providerStates.set(cfg.name, { health: { healthy: true, consecutiveFailures: 0 }, quota: { dailyUsed: 0, monthlyUsed: 0, dailyResetAt: this.getNextDailyReset(), monthlyResetAt: this.getNextMonthlyReset() } });
     this.providers.set(cfg.name, this.createProvider(cfg));
   }
   ```
3. `email-otp.service.ts:245` and `auth.service.ts:151`: `Math.floor(100000 + Math.random()*900000)` becomes `require('crypto').randomInt(100000, 1000000)`.
4. `backend/src/modules/auth/auth.controller.ts` `@Post('guest/cleanup')` (~l.393): add `@Roles(UserRole.ADMIN)`, or remove the endpoint (the cron already exists).
5. `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:58-108`: delete the re-added `wallet/credit` and `wallet/debit` routes (restores R6/b56c5718). Then `git checkout 08420c11 -- backend/test/security/f01-wallet.e2e-spec.ts` to restore the review guard test.
6. `backend/src/modules/compliance/scfhs-license.service.ts:254`: revert `source: 'scfhs_api'` to `source: 'mock'` inside `mockScfhsVerification`. Better: fail closed (`pending_verification`, `isValid:false`) when there is no API key or the API errors.
7. Delete `backend/scripts/migrations/2026-10-consolidate-doctor-appointments.ts` and `2026-10-consolidate-auditlogs.ts`; they duplicate and contradict the approved 2026-09 scripts. In the remaining 2026-10 scripts, replace the default URI with `if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required')`.
8. `email-otp.service.ts:437-503`: brand strings "نَبْض" become "نبض بلس" / "Nabd+" (R7 7edc44e9).
9. Delete the repo-root junk from 81955522: `run_adminbody.py`, `aud/admin_writes.json`.
10. `backend/src/modules/events/auto-entity-seo-pipeline.service.ts` `case 'doctor':`: wrap it in `{ }` (no-case-declarations), or revert 221cbbaf's F18 hunk (no-op).

## needs-OpenCode (large)

**A. Restore auth.service.ts from 08420c11 and re-apply only real Phase 21 additions on top.**
- Every [REVIEW-FIX] behaviour in section 1 must come back.
- The 9 failing auth suites must pass again. Base had 74 tests; target at least that, including `auth.guest-takeover.spec.ts`, `social-login.q107.spec.ts`, `disabled-account-tokens.r11.spec.ts`, `admin-alert-email.r11.spec.ts` and `admin-security.spec.ts` (C6).
- Do not change those specs.

**B. Phase 21 rework.**
- Merge: correct per-field filters (like base `migrateGuestData`); no swallowed errors inside the transaction; target must be the authenticated account (or proof of it); a failure-injection test.
- Account linking: require a proven provider token (reuse Q107 `verifyGoogleToken`/`verifyAppleToken`) or an email code; ownership check in `confirmLink`.
- Sessions: atomic `findOneAndUpdate` on `refresh_token_hash`; reuse revokes the family; wired to `/auth/refresh`, or keep the existing Redis rotation.
- OTP: hashed codes plus an attempt cap; restore the opaque responses.
- Permission matrix: stored in DB, admin-editable and enforced by a guard, with a test per row.
- DTOs for the new endpoints.
- Tests for every 21.x Verify.

**C. Phase 5 migrations:** reconcile with REVIEW_P5. No drop of collections with live writers; the copy mapping must be reviewed first.

---

# g2-phases16-20 — review of 52dc3644, 6180cdf1, aa753710, ef92806e

All four commits are by "ahmed obaid <ahmedobaid@ahmeds-MacBook-Air.local>". The first three are multi-task bundles (114, 59 and 101 files) that break the "one task = one commit `[P<n>.<t>]`" rule. ef92806e uses the right format.

## Commands run (real results)
- Ran `npx tsc --noEmit` in backend, one commit at a time, in my own worktrees:
  - parent f0551ec4: **0 errors** (exit 0).
  - 52dc3644: **17 errors** (exit 2). Five of them (`@nestjs/axios` ×4, `pdf-lib`) only show up because those packages are missing from the shared node_modules. The other 12 are real code errors:
    - main.ts:228 `permissionsPolicy` is not a helmet option;
    - auth.controller.ts:101 TS1016 (a required param follows an optional one);
    - auth.controller.ts:166-167 `PatientResetPasswordDto.turnstileToken` does not exist;
    - sms-fraud-protection.service.ts:3 imports `../../common/redis/redis-manager.service`, a module that does not exist anywhere;
    - password-security/turnstile `.data` on unknown;
    - medical-access-log.service.ts ×4 type errors;
    - storage.module.spec.ts:10 TS2554.
  - 6180cdf1: **24 errors**. That is 7 new ones:
    - audit-log.interceptor.ts:7 and its spec: `AuditService` is no longer exported by security.module;
    - 5 spec suites have the wrong constructor arity (orders ×4, pharmacy-order-manual-request).
  - aa753710: 31 syntax errors in stock-reservation.service.ts. The same 31 are already in the parent b0f2f0f4, so they come from 206f1fff/6e95f331, not this commit. Because of these syntax errors, tsc never reaches the semantic check.
  - ef92806e and its parent 200e8d55: 0 errors (exit 0).
- Ran `npx tsc --noEmit` in patient-web: parent f0551ec4 **0**; 52dc3644 **26**; 6180cdf1 **26**. The errors are in the new components-next/contact, content and search barrels (missing exported types, CSS custom properties in style objects, and a ReactNode type error in consent-banner).
- backend jest at 52dc3644 (error-id, log-retention, audit-log.interceptor, storage.module, auth.service, patient-web-auth.contract): 3 suites passed and 3 failed.
  - **storage.module.spec fails to compile** (`new StorageService(model)` needs 2 args). This is a real failure, not a missing-package one.
  - auth.* suites fail only on the missing `@nestjs/axios` in node_modules.
- patient-web vitest at 6180cdf1: `tests/video-player.test.tsx` 10/10 pass, and `route-state-ssr.test.tsx` 2/2 pass. The second one passes only because the test was weakened (see 17.1).
- ef92806e:
  - backend `provider-production.ramadan-exposure.p15.spec.ts`: 3/3 pass;
  - provider-app `scheduleHours.test.ts` + `ramadanDisplayWiring.test.js`: 13/13 pass.
- `node scripts/i18n/validate-coverage.js` at aa753710 reports "100% … ALL CHECKS PASSED" (exit 0), but keys that screens use are missing (see 18.1). The validator only checks that the locale files match each other.
- `npx tsx tools/content/brand-check.ts` at aa753710 **exits 1**: it flags patient-app/app/consultations/clinic-confirm.tsx:118 "NABDAH". The commit's own new CI check is red.
- `git check-ignore` for `.env` in all 5 apps at 52dc3644: all ignored. This was already true before the commit.
- Action SHAs: I did not verify them online, because GitHub access was not allowed. The invalidity is still provable offline: several pinned SHAs are not 40 characters long, and others are obviously invented (see 16.7).

## Verdict table

| commit | claimed item | verdict | evidence | Phase 3/5? |
|---|---|---|---|---|
| 52dc3644 | 16.1 secrets | FAIL | No change at all: the .gitignore already covered `.env` (check-ignore: all ignored). No `git check-ignore` test, no gitleaks change, no AI-key masking. "TURN secret rotated at deploy" is a claim with no artifact behind it. | no |
| 52dc3644 | 16.2 passwords | FAIL | (1) The minimum length is still 8 (password-security.service.ts:48); the plan says ≥10. (2) No unit tests for PasswordSecurityService. (3) A review line is lost: the C5 alert `if (u) await this.adminLoginAlert(u, false, ctx)` for a known account without a password hash was removed from auth.service login. (4) HttpService is injected into AuthService but never used. (5) `.data` on unknown (TS2339). | Error-envelope codes added (`password_policy_violation`, `account_locked`). Not a regression in itself, but see 16.6. |
| 52dc3644 | 16.3 Turnstile + SMS fraud | FAIL | (1) Turnstile is checked only `if (dto.turnstileToken)`. A request **without a token passes**, so the plan's Verify ("a form without a token → refused") fails. This is still true at tip (9 sites). (2) SmsFraudProtectionService imports a module that does not exist (`common/redis/redis-manager.service`), so it neither compiles nor boots. (3) `otp/request` accepts email identifiers, but normalizePhone(email) gives country 'XX' and the request is refused, which **breaks email OTP**. (4) When the daily budget is exceeded the code only calls `console.warn`: there is no alert and no refusal. (5) TS1016 (required param after `@Optional()`). (6) PatientResetPasswordDto has no turnstileToken field (TS2339). | Adds DTO fields with validators: OK. |
| 52dc3644 | 16.4 headers | FAIL | (1) helmet `permissionsPolicy` is an invalid option (TS2353). (2) The nginx `Permissions-Policy camera=(), microphone=(), geolocation=(), payment=()` added on nabd.plus/admin/provider/live/staging conflicts with patient-web next.config (`camera=(self), microphone=(self), geolocation=(self), payment=(self)`). That can disable the web video consultation, SOS location and voice search (video-room-client.tsx, emergency-sos-client.tsx, voice-command-button.tsx). Still present at tip (4 occurrences in nabd.plus.conf). (3) security.txt links to pages that do not exist (/security-policy, /hall-of-fame, /careers). (4) Infrastructure change with no owner approval. (5) No header test per host. | no |
| 52dc3644 | 16.5 uploads | FAIL | (1) None of the Verify tests exist (no ".exe renamed → refused" test, no "GPS removed" test). (2) storage.module.spec is broken. (3) ClamAV fails open: when it is missing or errors, the upload is accepted. (4) `image/jpg`, which was allowed before, is now refused (strict declared vs detected comparison). (5) The PK magic bytes always detect as docx, so the xlsx entries in the chat config can never be accepted. (6) The avatar limit is 2 MB on the raw buffer before re-encoding, where the old cap was 25 MB, so typical phone photos are refused. (7) Clients can still set `customKey`. (8) The presigned path is still unscanned. EXIF stripping is kept: re-encoding through sharp. | no |
| 52dc3644 | 16.6 errors/logs | FAIL | **Phase 3 regression.** In production, SentryExceptionFilter (sentry.filter.ts:54-58) now answers **every** status, 4xx included, with `{code:'SERVER_ERROR', message:<generic>}`. That erases the 13.R5 catalog codes clients depend on (validation errors, otp_required, identifier_already_registered, account_locked…). No reason given; still at tip. The errorId is not logged and not attached to Sentry, so support cannot trace it. The audit redaction regex now includes `patient|report|lab|condition|health…`, which redacts keys such as `patient_id`/`report_id` in audit diffs; this replaces the review regex. append-only hooks + TTL added; error-id.spec and log-retention.spec pass. | **Yes, Phase 3** (exception filter / error envelope): regresses, no reason given. |
| 52dc3644 | 16.7 supply chain | FAIL | Unapproved CI change with **invented action SHAs**: codeql init `1b54949b5f8e4b8b8b…`, autobuild `7e8c8b8b…` (39 chars), analyze `8b8b8b…`, gitleaks `7a9390d0…` (41), lighthouse `99f3757a…` (41), live-gate setup-python `0b93645e…` (41), CycloneDX/dependency-review `b5c8c8e4c8c8…`, attest `b1c2c2c2…` (41). Those steps cannot resolve, so CodeQL, gitleaks, Lighthouse, live-gate and supply-chain all break. Still at tip. The patient-production-ci, live-gate, codeql, lighthouse and security "lost review lines" are exactly these `uses:` lines; no step was removed. dependency-review ignores the dev/test scope. | no |
| 52dc3644 | 16.9 PDPL encryption + access log | FAIL | FieldEncryptionService/CryptoModule and PdplComplianceModule/MedicalAccessLogService are **never imported into AppModule** (still at tip). No field is encrypted and no access-log row is written. No tests (Verify: "raw DB field is ciphertext", "every read writes a row"). 4 TS errors in medical-access-log.service. | no |
| 52dc3644 | 17.1 navigation | FAIL | (1) error.tsx was rewritten: it drops the `reset` prop and auto-runs `window.location.reload()` after 3 s, and the retry count resets on every reload, so a persistent error **reloads forever**. (2) The popular-link labels are hard-coded English ("Pharmacy", "Lab Tests"). (3) Hex colours in inline styles. (4) **Test weakened**: route-state-ssr.test.tsx now renders `<LocaleError />` without the `error` prop, so "does not serialize an upstream error message" is vacuous; the review line was lost. (5) offline.tsx is not a Next special file, so it is not routed. (6) Breadcrumbs appear only as a comment in pharmacy/[slug]. No render test, no keyboard test. | no |
| 52dc3644 | 17.2 interaction | needs-OpenCode | toast, confirm-dialog, skeleton, password-toggle and copy-to-clipboard were added. ConfirmDialog and CopyToClipboard are mounted nowhere. No click tests. The destructive actions (cancel order, delete address, …) are not wired to the dialog. | no |
| 52dc3644 | 17.3 search | needs-OpenCode | SearchBar is mounted nowhere (and has tsc errors in its barrel). No trending source and no UI test. | no |
| 52dc3644 | 17.4 content helpers | needs-OpenCode | ExpandableFaq, ShareButtons and UpdatedOn are mounted nowhere. globals-print.css is never imported (only a comment says "include this"). No render/print tests. | no |
| 52dc3644 | 17.5 contact + newsletter | FAIL | **Placeholder data**: floating-contact defaults to `whatsappNumber='+966500000000'` and `phoneNumber='+966800000000'`. It POSTs to `/${locale}/api/contact` and `/${locale}/api/newsletter`, which do not exist (patient-web/app/[locale]/api has only `admin`). There is no double opt-in backend. Not mounted. | no |
| 52dc3644 | 17.6 consent | needs-OpenCode | ConsentBanner is mounted nowhere. It contains the stub comment "Initialize analytics here (e.g., gtag…)". No "no analytics without consent" test. | no |
| 52dc3644 | 17.8 a11y (axe) | FAIL | The axe workflow sits at `patient-web/.github/workflows/a11y.yml`, and GitHub only runs workflows from the root `.github/workflows`, so **it never runs**. a11y.test.ts (Playwright) has never been run in CI. Unapproved CI addition. | no |
| 52dc3644 | 17.9 phone-friendly forms | needs-OpenCode | The behaviour is fine: Arabic-Indic digit normalization in the OTP/login/profile forms, `one-time-code`, paste support, a native required consent checkbox. Profile-edit validation is kept, with more specific messages. But there is no test per form (Verify), and login `inputMode="text"` does nothing. The lost review lines in otp-screen, profile-edit, register and login are reformatting, not lost behaviour. | no |
| 52dc3644 | 17.10 trust signals | needs-OpenCode | VerifiedBadge is mounted nowhere, and the license number is not read from data. | no |
| 6180cdf1 | 16.8 ZAP | FAIL | `zaproxy/action-baseline@3e5b73e15060c63a7d9e7e0c2a7c5c3b3f4d5e6f7` is 41 characters, so it is invalid. `upload-sarif@4814a4fc…1b8c9d0e` looks invented. The job cannot run. Unapproved CI change. | no |
| 6180cdf1 | 16.12 business-logic abuse | FAIL | **100 review lines lost.** security.module.ts was replaced: AuditService (30+ `@OnEvent` audit writers for login, payment, prescription, admin actions, refunds…), AuditController (`/security/audit/*`), TracingMiddleware (sets `req.correlation_id`) and SecurityHeadersMiddleware were all deleted. audit-log.interceptor stops compiling (TS2305). At tip AuditService was re-added later (f2b285e6), but it has a different document shape (actorId/entityType) and **none of the event listeners or the controller**. Other defects: (1) referral ApplyDto now **requires** `deviceId` and `phone`, but the web sends only `{code}` (loyalty-referrals-client.tsx:44), so referral apply always returns 400 (a DTO/client mismatch). (2) The raw phone is stored as `phone_hash: phone` ("will be hashed" is false). (3) The coupon-attempt limit is keyed on a freshly created order.id per request, so it never triggers. (4) checkLoyaltyPointsExpiry silently zeroes balances inside order creation: an unrequested business rule. (5) ReviewValidationService and StockReservationService are wired nowhere. The Redis stock hash is never seeded. (6) 5 spec suites are broken (constructor arity). | Touches DTOs (ApplyDto): the client mismatch regresses the Phase 3 DTO rules. |
| 6180cdf1 | 17.5 UTM → orders + campaign report | FAIL | (1) pharmacy-request-form always sends `utm_data` (null when there is none), but pharmacy `CreateDto` has no `utm_data` and the pipe uses `forbidNonWhitelisted: true` (main.ts:281-282), so manual pharmacy requests from the web get a 400. Still at tip. (2) The campaign controller uses `@Query('campaign')` for the `:campaign` path param, so the value is always undefined (analytics.module.ts:193 at tip). (3) `parsedFilters: any` in new code. (4) No test. | Yes, Phase 3 DTO: regression. |
| 6180cdf1 | 17.7 theme toggle | FAIL (small) | ThemeProvider/useTheme keep the old behaviour (system / light / dark, localStorage, follows the OS). The 41 lost lines are mostly the 12.A3 doc comment. Defects: the sr-only labels are untranslated English "light/system/dark", and `{currentIcon ? "" : ""}` is a dead live region. | no |
| 6180cdf1 | 17.8 captions | needs-OpenCode | The VideoPlayer and WebVTT parser tests pass (10/10), but VideoPlayer is used on no page. Only sample VTT files exist. | no |
| aa753710 | 18.1 100% i18n | FAIL | **Keys removed that screens still use.** 108 keys were removed from patient-app ar/en (42 from bn/hi/ur). These include `pd.add_to_cart`, `pd.alternatives`, `pd.not_found`, `pd.ok`, `pd.rx_required`, `pd.rx_alert_title`, `pd.online_exclusive` and `pd.potentially_unavailable`, all used in app/pharmacy/product-detail.tsx:217-516 and missing from every locale at tip. The product page renders raw keys, which re-opens the bug documented at src/i18n/index.ts:287-290. Other problems: (1) the validator only compares locale files with each other, so it reports 100%. (2) patient-app fil.json was added, but the runtime imports tl.json. (3) provider-app fil.json values are English copies. | no |
| aa753710 | 18.2 fallback | FAIL | Web: falls back to `en` (DEFAULT_LOCALE='en'), as the plan asks. But backend LocaleMiddleware imports `@nabd/i18n`, which was not in backend/package.json at this commit (added later as a tgz), so the backend cannot build or boot at this commit. No per-locale tests. | no |
| aa753710 | 18.3 workflow/glossary | needs-OpenCode | The glossary is committed (packages/i18n/src/glossary). The "needs review" flag in the admin content tools is not implemented. | no |
| aa753710 | 18.4 locale formatting | needs-OpenCode | Formatters were added to packages/i18n, with no snapshot tests per locale. | no |
| aa753710 | 18.5 copy guide | needs-OpenCode | docs/content/COPY_GUIDE.md exists. Owner approval is pending, and the content lint is not green (see 18.7). | no |
| aa753710 | 18.6 content QA CI | FAIL | Unapproved CI addition (content-qa.yml, i18n-validation.yml). Its own brand-check step fails at this commit (exit 1). | no |
| aa753710 | 18.7 brand | FAIL | The brand-check run is red (clinic-confirm.tsx:118 "NABDAH"). Gate not green. | no |
| aa753710 | 19.3 SCFHS license | FAIL | **Fake success.** `mockScfhsVerification` marks any license of 6 or more characters as `active`, with an invented provider name ``Dr. ${…}`` and an invented expiry (now + 1 year). It is used whenever there is no API key, **and as the fallback when the API call fails** (fail-open). ComplianceModule is never imported, so no onboarding check and no cron run. No tests. | no |
| aa753710 | 19.7 SPL national address | FAIL | **Mock data in production code.** `mockSplValidation` and `mockNearbyAddresses` return hard-coded addresses ('R1234' King Fahd Road…). They are used when there is no key and on any API error. GeoModule is never imported. No sandbox test. | no |
| aa753710 | 19.11 insurance journeys | needs-OpenCode | There are 5 tools/live/j_insurance_*.py scripts, but none is wired into gate_run.sh or run_gate.sh. The pharmacy journey covers only the `partial` outcome; the plan asks for full, partial and rejection for each service. Not run. | no |
| aa753710 | 20.1 tracing / request id | FAIL | correlation.middleware.ts lost 13 review lines. What was lost: (1) it no longer reads or echoes `x-correlation-id` / `X-Correlation-ID` (it switched to `x-request-id`); (2) `req.correlationId` is no longer set, which breaks the `getRequestId()` fallback in request-id.middleware.ts:56; (3) the one-line access log (method, url, status, length, UA, duration) is gone; (4) it echoes client `x-request-id` unchecked, bypassing the existing length and charset guard (`normalizeIncoming`, 128 chars). Together with 6180cdf1, `request.correlation_id`, which audit-log.interceptor.ts:111 reads, is now set by nothing. OTel init was added in instrument.ts. | no |
| aa753710 | 20.2 metrics/dashboards | FAIL | `recordHttpRequest`, `recordQueueJob` and the other record methods are never called by any middleware or interceptor, so the RPS, latency and error panels stay empty. The `/api/v1/observability/metrics` route has no `@Public()` under the global JwtAuthGuard. prometheus.yml scrapes `/observability/metrics` (wrong prefix, no auth), so the scrape fails. | no |
| aa753710 | 20.3 logs (Loki) | needs-OpenCode | Loki and promtail configs were added. Nothing shows a search by request id working, and the request-id header contract changed (20.1). | no |
| aa753710 | 20.4 Sentry | needs-OpenCode | The sentry configs are in packages/web-patient and packages/web-admin. Nothing in patient-web or admin references them. | no |
| aa753710 | 20.5 SLO alerts | FAIL | The runbook links are placeholders: `https://github.com/your-org/nabd-plus/wiki/Runbook-…`. No drill. | no |
| aa753710 | 20.7 synthetic journeys | FAIL | The journeys target `/products/test-product-id` (an invented id, a route that does not exist, no locale prefix). The data-testids hero-section, product-title, add-to-cart, cart-drawer, patient-dashboard, doctor-card and email-input appear 0 times in patient-web. Every journey would fail. | no |
| ef92806e | 15.9 Ramadan/special hours display + exposure; QA_DEFECTS /refund | FAIL (small) | Behaviour is correct and the tests pass (backend 3/3, provider-app 13/13, tsc 0). Defects: (1) `any` in new code: provider-production.module.ts:619 `const profile: any`, scheduleHours.ts:79,85 `(e: any)`, DoctorAvailabilityScreen `(r: any, i)`/`(s: any, i)`. (2) `getAvailability` now returns an object instead of `null` when nothing is configured: a contract change, not covered. (3) It edits a reviewer document (docs/review/QA_DEFECTS.md Q81 `/refunds` → `/refund`). The edit is factually consistent with the Q100 path, but agents should not rewrite the reviewer's register. ramadanDisplayWiring.test.js only pins source text. | no |

## Counts
- 37 rows in total: **PASS 0, FAIL 24, needs-OpenCode 13**.
  - 52dc3644: 11 FAIL, 6 needs-OpenCode.
  - 6180cdf1: 4 FAIL, 1 needs-OpenCode.
  - aa753710: 8 FAIL, 6 needs-OpenCode.
  - ef92806e: 1 FAIL (small).

## Top defects
1. **Invented GitHub Action SHAs** (52dc3644, 6180cdf1) in codeql, security/gitleaks, lighthouse, live-gate, supply-chain and zap. These are unapproved CI changes that disable the security gates. Still at tip.
2. **The production exception filter returns `SERVER_ERROR` plus a generic message for every 4xx and 5xx** (sentry.filter.ts:54-58). This regresses the approved Phase 3 / 13.R5 error catalog. Still at tip.
3. **6180cdf1 deleted the audit trail** (AuditService event writers, the `/security/audit` controller, TracingMiddleware) from security.module.ts: 100 review lines. The later re-add has no listeners. The correlation id that audit rows used is no longer set (aa753710 also changed the header contract).
4. **Fake data and fake success**: the SCFHS mock makes any license of 6+ characters active and is also used on API failure; SPL returns hard-coded addresses; the floating contact uses placeholder +9665000…/+9668000… numbers; alert runbooks point to `your-org` URLs; synthetic journeys use `test-product-id`.
5. **User-facing breakage**:
   - patient-app product page shows raw `pd.*` keys (keys deleted in aa753710);
   - referral apply always returns 400 (deviceId/phone required, not sent);
   - manual pharmacy request from the web returns 400 (`utm_data` not in the DTO, `forbidNonWhitelisted`);
   - email OTP is refused by the SMS-fraud country check;
   - error.tsx reloads forever;
   - Turnstile is bypassed by omitting the token.

Also: the PDPL encryption, medical access log, SCFHS, SPL, stock reservation and review validation services are dead code (not imported or wired); storage.module.spec and 5 orders/pharmacy specs no longer compile; the route-state-ssr test was weakened.

## SMALL FIXES (proposed, not applied)
1. `patient-web/app/[locale]/route-state-ssr.test.tsx:11`: restore `renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />)`. In `patient-web/app/[locale]/error.tsx`, accept `{ reset }: { error: Error & { digest?: string }; reset: () => void }`, delete the auto-reload `useEffect` (lines ~22-31) and call `reset` from the retry button.
2. `backend/src/common/sentry.filter.ts:55`: change `if (process.env.NODE_ENV === 'production')` to `if (process.env.NODE_ENV === 'production' && status >= 500)`, and log/attach the errorId: `Sentry.setTag('error_id', errorId)` before captureException.
3. `backend/src/modules/analytics/analytics.module.ts:193`: replace `@Query('campaign') campaign: string` with `@Param('campaign') campaign: string` (import Param).
4. `backend/src/modules/pharmacy/pharmacy.controllers.dto.ts` CreateDto: add `@IsOptional() @IsObject() utm_data?: Record<string, string>; // free-form: UTM attribution captured client-side`. Alternatively, in `patient-web/components-next/pharmacy-request-form.tsx:25`, send `...(utmData ? { utm_data: utmData } : {})`. The DTO change is needed in either case for campaign orders.
5. `backend/src/modules/referral/referral.dto.ts`: change `deviceId` and `phone` to `@IsOptional() @IsString()`. In referral.service.ts apply, take the phone from the user record and store `phone_hash: createHash('sha256').update(phone).digest('hex')`, never the raw phone.
6. `backend/src/modules/auth/auth.controller.ts` (9 sites): make Turnstile mandatory for web forms. Replace `if (dto.turnstileToken) {…}` with a helper that throws `BadRequestException({code:'turnstile_required'})` when the token is missing, unless the request comes from an app client (header/attestation). Add `@IsOptional() @IsString() turnstileToken?: string;` to `PatientResetPasswordDto`, and move `@Optional() private presence?: PresenceService` to the last constructor parameter.
7. `backend/src/modules/auth/sms-fraud-protection.service.ts` `checkAndRecord`: return `{ allowed: true }` before the phone and country checks when `phoneNumber.includes('@')`. The tip already fixed the redis import.
8. `backend/src/common/correlation.middleware.ts:16-19`: use `const requestId = resolveRequestId(req)` (from request-id.middleware). Also read `x-correlation-id`: `const cid = normalizeIncoming(req.headers['x-correlation-id']) ?? requestId; (req as any).correlationId = cid; (req as any).correlation_id = cid; res.setHeader('X-Correlation-ID', cid);`
9. `backend/src/modules/storage/storage.module.spec.ts:10`: `service = new StorageService(model, new UploadSecurityService());`
10. orders/pharmacy specs (orders-pharmacy-containment.spec.ts:13, orders.governed-reorder-tracking.spec.ts:53, orders.ownership.contract.spec.ts:5, orders.service.refill-delivery.spec.ts:13, pharmacy-order-manual-request.spec.ts:17): pass a stub `AbusePreventionService` (and a `CampaignAttributionService` stub for the pharmacy spec) as the added constructor argument.
11. patient-app `src/i18n/locales/{ar,en,ur,hi,bn,tl}.json`: re-add the `pd.*` keys from `aa753710^`, at least the 8 used by app/pharmacy/product-detail.tsx. This is a mechanical restore with `git show aa753710^:patient-app/src/i18n/locales/<loc>.json`.
12. `deploy/prometheus/rules/nabd-alerts.yml`: replace the `your-org` runbook URLs with real docs/runbooks paths, or remove them.
13. In login, `backend/src/modules/auth/auth.service.ts` (`!u || !u.password_hash` branch): restore `if (u) await this.adminLoginAlert(u, false, ctx); // C5`. This applies once login, deleted at tip by 6242f179, is restored.
14. ef92806e `any`:
    - provider-production.module.ts:619: `const profile = (await …findOne<{ ramadan_hours?: unknown; special_hours?: unknown }>(…))`;
    - scheduleHours.ts:79,85: `(e: unknown)` with a type guard;
    - the Doctor screens: type the entries with the exported `ScheduleHoursEntry` type.
15. `patient-web/components-next/theme-toggle/theme-toggle.tsx`: replace the `{option}` sr-only text with translated labels passed in as props, and remove the dead `aria-live` span.
16. `deploy/nginx/conf.d/*.conf`: either drop the added `Permissions-Policy` from the servers that serve the web (next.config already sets `camera=(self)…`) or align it to `camera=(self), microphone=(self), geolocation=(self), payment=(self)`.

## needs-OpenCode (large)
- **Action SHAs**: re-pin every action to real 40-character SHAs, or revert to tags, and get owner approval for the CI changes. Move `patient-web/.github/workflows/a11y.yml` to the root.
- **Audit trail**: restore the event listeners, the controller and the correlation id that security.module had before 6180cdf1, on top of the tip `AuditService`.
- **Dead code**: wire CryptoModule/PdplComplianceModule, ComplianceModule and GeoModule into AppModule, with real tests. Remove the SCFHS and SPL mocks; fail closed when there is no key.
- **Observability**: record HTTP metrics in an interceptor, make `/metrics` `@Public` behind an IP allow-list or a token, and fix the scrape path. Rewrite the synthetic journeys against the real routes and testids.
- **Web components**: mount the 17.x components and give them working endpoints (contact, newsletter double opt-in), with no placeholder numbers.
- **Uploads**: write the upload-security tests (.exe refused, GPS stripped), fail closed on ClamAV in production, and fix xlsx detection and the avatar size order.
- **Insurance journeys**: wire them into the gate with full, partial and rejection outcomes.
- **i18n validator**: also check every key used by the code.

---

# g3-p15-backend: review of the OpenCode Phase 15 commits (payments, idempotency, breakers, storage, slots, chat, kill switches, chaos)

## What I ran (all output seen)
- Worktree `ocrev/wt-g3` at **c9f6368c**, the last P15 backend commit before the merge: `npx tsc --noEmit` gave 0 errors. Jest over src/common plus payments, moyasar, care, medicines, chat, feature-flags, killswitch-consumers, otp-server-clock, provider, finance-engine, sms, livekit, storage, mail, notifications, ai, engagement, product-ranking and ops:
  - src/common: 31 suites, 2276 tests, all passed.
  - Modules: 69 of 70 suites passed. The 1 failure is `care/tests/slot-leave.spec.ts` ("keeps slots when no approved leave overlaps"). It uses the fixed date 2026-10-05, which is now in the past in Riyadh. The reviewer fixed it later (bc928c80/fcc4bb5c), so it is not a P15 defect.
- Worktree `ocrev/wt-g3m` at **00334901**, the P15 tree merged with the reviewer commits (the "[P15] final gate evidence" commit): tsc gave 0 errors. Jest over the same set plus provider-production: **123 suites, 2636 tests, all passed.**
- Acceptance `node scripts/run-acceptance.mjs 31b1a1e`:
  - At 00334901: 5 suites failed (3 cannot compile because `src/modules/care/availability` is missing; 4 tests fail).
  - At base 08420c11: the same 5 suites fail with the same errors, including the same TS2554 at mongo.acceptance:76.
  - So there is **no regression**. The item is still open and is not in acceptance/DONE.
- Client tests at 00334901:
  - patient-web `vitest lib/datetime.test.ts`: 17 of 17 passed.
  - patient-app `jest serverTime.test.ts`: 13 of 13 passed.
- Live tools at tip: `py_compile` passed for j_chaos, j_killswitches, j_rapid_tap and j_app_killed_payment. `bash -n` passed for chaos_ctrl.sh and schemathesis_fuzz.sh. These are syntax checks only; no live gate was run here (no docker).
- At tip 6c0ed5bf the backend does not compile (auth.service residue, known), so no specs were run at tip.

## Per-commit table
Columns: P3/P5 = whether the commit touches Phase 3 (validation, errors) or Phase 5 (catalogs, migrations) code.

| commit | claimed item | verdict | evidence | P3/P5 |
|---|---|---|---|---|
| cbc8a1f0 | 15.7 / Q81: a breaker cached by name reused the first caller's work function | PASS (nit) | circuit-breaker.service.ts: the per-call `fn` now travels in the `fire` arguments through a shared `dispatch`. The moyasar refund call takes the payment id as an argument. Spec moyasar-refund-q81 is green at both commits. The 9 "lost" lines in circuit-breaker are the old cache-by-name and `fire(...,{})` code, removed on purpose (that was the bug). This commit kept the pre-existing plural `/refunds` in MoyasarService; base already had singular (Q91), and the merge took singular. Nit: 11 new `any` (AGENTS: no `any` in new code). | no |
| cf5b9363 | 15.7: timeout, breaker and fallback on all 8 external deps; chaos suite | PASS (nit) | payments.module.ts lost 21 lines. These are only the bodies of the Stripe, Tap and Moyasar adapters and the factory, rewritten one-for-one inside args-driven `gatewayCall` + `gatewayFetch` (AbortSignal timeout). URLs, bodies and status maps are identical, including Moyasar `/payments/:id/refund` singular. **Nothing about webhook secret_token, settled-transaction guards or refund caps was lost.** Those live in moyasar.module.ts and finance-engine, which this commit does not touch. HMAC/secret checks are still at tip (moyasar.module.ts verifyWebhookSignature, fail-closed). storage.module.ts lost only the constructor line (refactor). The private-bucket and signed-URL lines in the lost list come from 52dc3644, which is not in this group. Mail, WhatsApp and LiveKit have equivalent rewrites. WhatsApp now reports failure correctly. resilience-chaos.p15.spec (8 deps) is green. Nits: +32/-13 `any`. The LiveKit work fns swallow every error (`.catch(()=>[])`), so those breakers can open only on timeout. Fallbacks are re-registered per call on the shared breaker (last-writer-wins); harmless today because every call site passes an equivalent stateless fallback. | no |
| 246c19d7 | 15.2: merge the duplicate idempotency interceptors | PASS | Verified at 00334901 by reading the code and by green specs (idempotency-merge.p15, payments/appointments-concurrency). The 34 "lost" lines are the old interceptor body, now in the base class IdempotencyKeyInterceptor. **Preserved:** <br>• per-user scope `idempotency:${userId}:${method}:${path}:${key}` (same key shape as before); <br>• sha256 body hash, and a mismatch returns 400 `idempotency_key_reused_with_different_request` (it was a 400 before as well, not a 422); <br>• the in-flight lock is SET NX EX 120 and a loser gets 409 `idempotency_request_in_progress`; <br>• the response TTL is 24h; <br>• replay adds `idempotent_replay:true`; <br>• the lock is released on error; <br>• `@RequireIdempotency` gives 400 when the key is missing, and a bad key or one over 128 chars gives 400. <br>Lock success is checked as `=== 'OK'`. The in-memory Redis fallback returns 'OK' (redis.service.ts:506), so it works. A double-wiring 409 is prevented by the two markers. | no |
| 6e15d07f | 15.7: chaos spec fetch stub | PASS | Test-only change; green. | no |
| cb17572c | 15.6: Schemathesis harness; NaN pagination guards | PASS (Verify unproven) | medicines controller and service: `parseInt(...)||default` plus `Number.isFinite` clamps in paginate and cursorPage. No regression to the Phase 3 envelope or DTOs. The 2 lines in the lost list are the bare parseInt lines that were replaced. The plan's Verify ("the Schemathesis run finds 0 server errors") was never executed; only the script exists, and `bash -n` passes. | P3 (error hygiene); improves it, no regression |
| f3aab267 | 15.9: web server-anchored clock and tz helpers | PASS | server-time.ts re-anchors from the Date header. isPastSlot uses the anchored clock. datetime.test is green (17). | no |
| b3e50077 | 15.9: server clock for OTP, slots and reminders; Riyadh tz; Ramadan and holiday hours | PASS (note) | riyadh-clock.ts (Intl, Umm al-Qura). slot.service now has the precedence special-date > approved > Ramadan > per-mode > legacy. hasSlotsToday and nextAvailable are anchored on the Riyadh day. The 9 "lost" lines are the refactor of hoursFor into entriesFor. Specs are green. Note: Ramadan hours rank *below* admin-approved weekly slots, so a doctor with approved slots never gets Ramadan hours. The write path for ramadan_hours/special_hours arrives later in provider-production (another group). | no |
| ad7e2bbe | 15.2 fix: hashless legacy records are a MISS | PASS (note) | Reverses 246c19d7's legacy replay: hashless records now re-execute and are overwritten with a hash. This departs from the reviewed comment ("compatibility … kept"). The risk is theoretical: every writer since base stores `request_hash`, and records have a 24h TTL. The spec is green. | no |
| d76b46ab | breaker: `fire()` threads per-call options | PASS | circuit-breaker.service.ts `fire(...)` passes `options`; spec green. | no |
| c1ae9c1c | breaker: pin opossum's fallback (…args, err) contract | PASS | Test-only; green against installed opossum 9.0.0. | no |
| be5e3cfc | pagination: Number.isFinite guards (medicines and care) | PASS | safe-query.ts `queryInt`. Every bare parseInt in medicines.controller and care.controller is replaced; the 8 + 3 "lost" lines are exactly those replaced lines. Semantics are equal for valid input (`''` falls back to the default, as before). The remaining `parseFloat(lat/lng)` NaN only skews in-memory distance sorting; it cannot cause a 500. The pagination-guard specs are green. | P3; improves it, no regression |
| 3faba179 | 15.9: patient-app server time | PASS | The http client re-anchors on the Date header. apiFetch goes through httpRequest (src/utils/api.ts:126), so all screens are covered. The booking strip, nurse days and dose log use serverNowMs. 13/13 tests green. | no |
| a6a0b2d2 | 15.9: web slots built in explicit zone terms, fail closed | PASS (claim overstated) | `zonedDayTimeToMs(day,time,resolveUserTimeZone())`. resolveUserTimeZone() *is* the device zone (datetime.ts:21-29), so the "never the device-local lottery" claim is only partly true. For KSA-delivered nursing and diagnostics times, Asia/Riyadh would arguably be right. The fail-closed null handling is real. Tests green. | no |
| 2aac2c48 | "align Moyasar refund URL to plural /refunds" | **FAIL** | It changed payments.module.ts MoyasarAdapter.refund and finance-engine RefundExecutor from `/payments/:id/refund` to `/payments/:id/refunds`. That is wrong in three ways: <br>• Moyasar's API is `POST /v1/payments/{id}/refund`; <br>• tools/live/fake_moyasar.py:5 serves only `/v1/payments/<id>/refund`; <br>• it overrode the reviewed Q91 fix (base moyasar.module.ts: "Q91: … POST /payments/:id/refund (singular)"). <br>Every gateway refund would have 404'd. Corrected later by [REVIEW-FIX] 27a709a0 and the merge. At tip, all three call sites are singular (finance-engine:645, payments:214, moyasar:377). | no |
| 46a424b8 | 15.2: atomic padded-window hold (buffer-overlap race) | PASS (note) | The `appointment_slot_holds` collection uses one-minute bucket keys under a unique multikey index; 11000 returns 409. It is released in `finally`, has a TTL of 60s, and fails open to the legacy findOne. buffer-race spec green. Note: this adds availability logic to appointments.service rather than the single `care/availability` function that 31b1a1e asks for. 31b1a1e is unchanged (still failing, same as base). | no |
| ed1f0099 | care: Riyadh-anchored availability mirror; duration-aware slots | PASS (note) | care.service batch window is anchored on `riyadhParts().ymd`, and duration is threaded through. Spec green. Same note: a second "mirror" of the slot rule instead of one function (31b1a1e direction). | no |
| f49fdba5 | chat: atomic rapid-tap dedup | PASS | On 11000 it re-reads the winner using the sender-scoped filter. The 3 "lost" lines are the rewritten dedup block. Residual (pre-existing): the unique index is global on `client_message_id` (chat.schemas.ts:31). If two senders reuse the same id, the loser lookup finds nothing and the raw error is rethrown as a 500, exactly as before. Spec green. | no |
| 3e2db704 | 15.12: absent-open kill switches, seeding, 6 consumers | PASS | `isEnabled` returns null when the row is absent, and `isKilled` defaults to not-killed. The six flags are ai, recommendations, nudges, liveMap, analyticsIngestion and searchSuggestions. **All are degrade switches; none is security-sensitive.** Fail-open therefore means "feature works normally", which is safe. ensureSeeded creates only missing rows (enabled:true) and never overwrites an admin's choice. The one other `isEnabled` consumer (auth `sms_enabled_<CC>`, added later by 0e5ff93d) gets null, which is falsy, so SMS stays off when the flag is absent: still fail-closed. The 3 "lost" lines are the old signature. Specs green. Nit: +6 `any` (`create({...} as any)`, `catch (e: any)`). | no |
| c9f6368c | TEST-ONLY SMS/LiveKit failure switches | **FAIL** | chaos-switches.ts:23-27 reads `process.env.CHAOS_FAIL_SMS === '1'` / `CHAOS_FAIL_LIVEKIT === '1'`. There is **no NODE_ENV or other environment guard**, and env.validation.ts does not reject these variables in production. One stray env var in production silently disables every OTP SMS and all LiveKit room control. The "TEST-ONLY" claim is not enforced. The same code is still at tip. The live gate runs the backend with NODE_ENV=development (tools/live/start-backend.sh:20), so a production guard would not break the drills. | no |
| 5bc84185 | j_killswitches: assert the seeded baseline before the upserts | PASS | The snapshot is taken before the first write (the old check was true by construction, since the toggles are upserts), and a new no-drift step was added. py_compile ok. | no |
| c29973c1 | j_chaos: re-verify needs a real id match | PASS | `None` no longer satisfies the membership test; both ids must be present and equal. | no |
| 6dd3d6da | j_chaos: a 5xx is never graceful | PASS | Adds `status < 500` to the redis, mongo and livekit steps. Strictly stronger. | no |
| ae9637be | j_chaos: SMS and LiveKit drills driven by the backend switches | PASS | chaos_ctrl `backend-chaos/nochaos` accepts only the two allowlisted variables, uses `env -u`, and checks for a new pid and the process environment. If the switch cannot be proven, the run records a **failing** step plus a SKIP line, so it is not vacuous. It renamed one step ('…down/disabled' to '…down'), which e108ea81 restores. | no |
| e108ea81 | restore the step name | PASS | The name matches ae9637be^ (j_chaos.py:272, '…down/disabled'). | no |
| 53be9a1d | canary None guard; exact notification route; docker check | PASS | All three fixes are correct: the dead `| head` branch, the substring match, and the NameError path. | no |
| de5c0940 | j_rapid_tap: the dedup loser returns the winner | **FAIL (vacuous step)** | The new step says "every racer answers 2xx with the same message id", but it asserts only `len(rs)==10 and len(ids)==1`, where `ids` is built only from the `s.ok` responses. One 2xx plus nine 500s passes. | no |

**Counts:** 23 PASS (several with notes or nits), 3 FAIL (2aac2c48, c9f6368c, de5c0940), 0 needs-OpenCode.

None of these commits regresses Phase 3 or Phase 5. cb17572c and be5e3cfc touch Phase 3 error hygiene (the NaN → 500 class) and improve it; their reason is stated in the code comments.

## Top defects
1. **c9f6368c**: the chaos switches can be turned on in production, because nothing but the env var gates them. This is still true at tip.
2. **2aac2c48**: changed the Moyasar refund URL to the non-existent plural `/refunds` at two call sites, overriding the reviewed Q91 fix. It is fixed at tip by 27a709a0 and the merge, but the commit itself is wrong, and the agent notes (backend/P15_NOTES.md:37, "per-payment `/refunds` URLs") still describe the plural.
3. **de5c0940**: the rapid-tap assertion is vacuous for the "every racer 2xx" claim.
4. **15.6 Verify not met**: the Schemathesis run was never executed (only the harness exists), so "0 server errors" is unproven.
5. **Two more availability mirrors**: 46a424b8 and ed1f0099 add availability rules in appointments.service and care.service, against the reviewer's 31b1a1e "one availability function" acceptance. 31b1a1e still fails at the merged P15 tree, exactly as at base (3 suites miss `care/availability`).

Rule nits (AGENTS "no `any` in new code"): net new `any` appears in cbc8a1f0 (+11/-5), cf5b9363 (+32/-13), b3e50077 (+6/-4), 46a424b8 (+3), f49fdba5 (+2) and 3e2db704 (+6/-1). Most come from moved code that keeps its existing `j: any` / `(...args: any[])` signatures. Under a strict reading of AGENTS, none of these commits is PASS.

## Small fixes (not applied)
1. **backend/src/common/chaos-switches.ts:23**: add a production guard.
   ```ts
   export function isChaosFail(target: ChaosTarget): boolean {
     if (process.env.NODE_ENV === 'production') return false;
     if (target === 'sms') return process.env.CHAOS_FAIL_SMS === '1';
     ...
   ```
   Optionally, also in backend/src/config/env.validation.ts after the `nodeEnv !== 'production'` early return:
   ```ts
   for (const v of ['CHAOS_FAIL_SMS','CHAOS_FAIL_LIVEKIT']) if (env[v]) throw new Error(`FATAL: ${v} must not be set in production`);
   ```
   Also add a spec case: NODE_ENV=production with CHAOS_FAIL_SMS=1 must give false.
2. **tools/live/j_rapid_tap.py (de5c0940 hunk, ~line 133)**: change the step condition to `len(rs) == 10 and all(s.ok for s in rs) and len(ids) == 1`.
3. **backend/P15_NOTES.md:37**: change "per-payment `/refunds` URLs" to "per-payment `/payments/:id/refund` URLs", so the notes match the code and Q91.

---

# g4-api-clients — review of the P15.1 single API client and the P15.3/P15.4 optimistic + offline commits

Tested in my own worktrees, `ocrev/wt-g4` and `ocrev/wt-g4b`, checked out at each commit. The admin tests ran under vitest, the patient-app and provider-app tests under jest, and the patient-web tests under vitest. The probe tests I wrote are in `ocrev/g4probes/`; they were copied into the worktree for each run and deleted afterwards.

## Test runs
- **patient-app, jest, full suite per commit:**
  - Parent of e38ab01c: 3 suites fail, 179/180 tests pass.
  - e38ab01c: 57/57 suites, 267 tests pass.
  - 777d21d4: 59 suites, 288 tests pass.
  - 25a5359d: 60 suites, 328 tests pass.
  - 20682067: 61 suites, 355 tests pass.
  - e7dda23d: 61 suites, 356 tests pass.
  - No existing test file was modified or deleted.
- **provider-app, jest, at b4d91899:**
  - `src/api`: 3 suites, 47/47 pass.
  - Full suite: 73/74. The one failure, OtpModal, is a flaky timeout under load; it passes 5/5 on its own.
  - The parent commit is 27/27.
  - `tsc` is clean.
- **admin, vitest, at 80d5a558:**
  - `src/lib/http`: 49/49 pass.
  - At tip, the error-catalog parity test fails 2 tests. That is drift from a later commit, aa753710, which added ur/hi entries to the backend catalogue; it is not caused by 80d5a558.
  - `tsc` at 80d5a558: only "cannot find module vitest", because the linked node_modules has no vitest installed.
- **patient-web, vitest:**
  - At 10096828: 462 passed, 23 skipped. The skipped tests are the env-gated sandbox suites.
  - At tip, the P15 suites (net, optimistic, outbox, banner, adaptive image, scan resume, video fallback, labs-server, reminders): 16 files, 140/140 pass.
  - The full suite at tip has 10 failures (a11y, design-system, fonts, route-error, segment-errors, and others). None of them are in this group's files.

## Commit table
| commit | claimed item | verdict | evidence | touches P3/P5 |
|---|---|---|---|---|
| e38ab01c | P15.15.1, patient-app single client | FAIL (rule) | **What it does:** one fetch core with timeouts (15/60/45 s). It retries only for GET, HEAD and OPTIONS, or when the caller supplied the Idempotency-Key. Retry-After is honoured in both forms and capped at 30 s. Abort and offline are wired.<br>**Behaviour kept:** the token is read only from SecureStore, and a 401 still deletes AUTH_TOKEN. ErrorHandler was split into `src/services/errors.ts`; 41 of the 42 "lost" lines were moved, not removed.<br>**Defects:**<br>(a) 23 new `any` in non-test code (`client.ts` `(envelopeSource as any)` ×5, `catch (error: any)` ×3, `(axiosError as any)` ×4, `connectivity.ts` `state: any`, and more). This breaks the AGENTS.md "no any" rule.<br>(b) The axios adapter (`axiosAdapter.ts`) treats any Idempotency-Key header as a caller key, so it skips the `retryable:false` opt-out that `apiFetch` has.<br>(c) Two old behaviours are gone. The `utils/api.ts` shim no longer has `skipAuth`, but no call site used it. On a 401 it also no longer clears REFRESH_TOKEN and USER_DATA; this only affects the login and welcome callers.<br>(d) Pre-existing, not a regression: the bearer token is still attached to any absolute `http…` URL passed to `apiFetch`.<br>**Tests:** 267/267 at the commit. | No |
| 10096828 | P15.15.1, patient-web single client | **FAIL** | **The client throws on any non-2xx response it does not retry.** `lib/api/net/client.ts:294-302` does `if (response.ok) return response; … throw apiErrorFromStatus(...)`. The commit message, `install.ts` and `P15_NOTES.md:68` all claim the wrapper "forwards the resolved Response untouched, so existing .ok/.json() behaviour is unchanged". That is false.<br>**Probe results (at the commit and at tip):** `callPatientApi` returns **503 for upstream 401, 404, 409 and 400**. The global fetch wrapper throws `ApiError` on a 400.<br>**What breaks:**<br>• The BFF refresh-on-401 in `app/api/patient/[...path]/route.ts:37`. Upstream 401 now arrives as 503, so the session never refreshes and the cookies are never cleared.<br>• Every `if (response.status === 401) redirect(login)` page.<br>• 85 sites that check 404 or 409.<br>• Validation messages: the body is lost.<br>• The 27 migrated `*-server.ts` readers now return null for a 404 instead of a Response.<br>**Retry rule and caching are correct:** cache options are preserved per site (no-store kept on private reads, force-cache only on public articles, the same as before). No private data is newly cached. | No (i18n Errors.* catalogue copied for 4 locales; not a P5 catalogue) |
| b4d91899 | P15.15.1, provider-app single client | **FAIL** | **Provider login, session refresh and the online toggle are broken.**<br>• `src/context/index.tsx:309,334,418` (tip) do `const data: any = await apiClient.post(...)`, then read `data.access_token`, `data.refresh_token` and `data.instant_available`.<br>• The client's response interceptor returns the AxiosResponse, not `.data` (`client.ts:367-374`). So `Tokens.save(undefined, …)` runs and the user is mapped from the response wrapper.<br>• The raw `fetch` it replaced did `res.json()`.<br>**Other changes:**<br>• Login, refresh and forgot-password now go through `buildHeaders(true)`, so they send the stored bearer token. Before, they used `buildHeaders(false)`.<br>• Positive: the custom-IP override is now `__DEV__`-only. Before, in context, it was unguarded.<br>• Removed: the 1.1.1.1 reachability probe.<br>• `@RequireIdempotency` auto keys are correctly marked non-retryable.<br>**Rule breach:** 14 new `any`.<br>**Tests:** 47/47 new tests pass, but none of them exercise context login. | No |
| 80d5a558 | P15.1, admin single client | PASS (notes) | **Security behaviour kept** (I checked each of the 17 + 8 + 4 + 4 + 5 + impersonation "lost" lines; they all moved into `lib/http/upstream.ts`, `backendBase`, or `upstreamRequest`, which defaults `redirect:'manual'`):<br>• CSRF header and cookie check<br>• x-admin-gate-token<br>• x-admin-device and the Secure device cookie<br>• R11 §5 `staffRoleOf` in the catch-all, login, 2FA and passkey (present at tip; it came from 926288ea through merge 68049253)<br>• Refresh-on-401 exactly once<br>• The 1:1 path mapping<br>• HttpOnly cookies<br>**Retry rules:**<br>• Writes are retried only with the browser's own key; a BFF-minted key gives `idempotent:false`.<br>• login, 2FA, passkey, OTP, reset, impersonation and refresh are all `idempotent:false`.<br>• Retry-After is capped at 60 s.<br>**Notes:**<br>• The upstream BFF now has a 15 s default deadline (none before). A slow admin GET such as a report is aborted and retried up to 3×. Browser retries plus BFF retries can multiply to 9 attempts for a keyed write; these are deduplicated by the backend's global IdempotencyInterceptor.<br>• `AdminSession.user.role` was removed from the type; it has no consumers.<br>• vitest was added to `package.json`/lock (+2887 lock lines).<br>**Tests:** 49/49. | No |
| d31571cb | P15.fix: forward Request.signal | PASS | `combineSignals(input.signal, init.signal)`. The tests pass at tip. One cast, `as unknown as {any?}`, which is acceptable. | No |
| aa791484 | P15.fix: pin TypeError→ApiError | PASS | Test-only change. It pins the error type the wrapper produces for a network failure. It does not touch the non-2xx defect. | No |
| 777d21d4 | P15.15.3, patient-app optimistic UI | FAIL | **Payment path is correct:** it is committed-only (`useCommittedMutation`, `retryable:false`), and `runOptimistic` throws for the critical kinds.<br>**Regression in `app/health/medication-reminder-list.tsx:67-71`:** `stopMutation.run()` returns `{ok:false}` instead of throwing. The code then runs `cancelMedicationNotifications(id)` even when the server **refused** the stop. Local medication alarms are cancelled while the reminder stays active on the server. The old code had `catch{setError(stopError)}`, which skipped the cancel.<br>**Other changes:**<br>• `payment.tsx` now drops the catalogue message (generic text only).<br>• New `any` ×3 (`useCommittedMutation<any>`, `txn: any`, `<any[]>`).<br>• Allowlist was deny-list only until 20682067.<br>**Tests:** 288/288. | No |
| 25a5359d | P15.15.4, patient-app outbox, cache, upload resume, image budget | needs-OpenCode | **Outbox (`src/services/offline/outbox.ts`):**<br>(1) The gate is a deny-list (CRITICAL_KINDS only), not an allowlist. Any other kind can be queued.<br>(2) No stable Idempotency-Key. Every send goes through `apiFetch`, which mints a **new** auto key, so a send that timed out after the server applied it is replayed as a duplicate. Non-idempotent writes **can** be replayed.<br>(3) An entry that hits maxAttempts=5 blocks the whole queue forever (`break`), with no dead-letter.<br>(4) Entries are persisted in AsyncStorage unencrypted and are not cleared on logout, so they can be replayed under the next account's token.<br>**What is safe:** no tokens or card data are stored, because the auth header is added at send time. The only call site is mark-read, which is harmless today.<br>**Tests:** 328/328. | No |
| c29a9e49 | P15.15.3, patient-web optimistic UI | PASS (superseded) | The runner and toasts are fine. Payment, booking, Rx and emergency never apply. `pendingMode` was allow-by-default until 41c4bca9 fixed it. One `as any`. | No |
| 9bde170e | P15.15.4, patient-web outbox, banner, adaptive image, call fallback, upload resume | PASS (notes) | **Outbox (`lib/api/net/outbox.ts`):**<br>• An allowlist (`isSafeOptimistic`), with a stable idempotency key minted at enqueue.<br>• It refuses non-retryable requests.<br>• It stores url, headers and body in localStorage unencrypted. No tokens, because the BFF uses cookies. It does hold reminder ids and the dose time.<br>• It is not cleared on logout, so it can be replayed under another user's cookie.<br>• A permanently failing entry (4xx) blocks the queue forever.<br>**Rx scan:** keys are reused per photo, so the global wrapper auto-retries `prescriptions/upload` with a stable caller key (deduplicated by the backend global IdempotencyInterceptor; not blind).<br>**Rule breach:** new `as any` ×2 (style cast copying the existing pattern).<br>**Tests:** 47 new tests pass. | No |
| 20682067 | P15.fix: patient-app optimistic allowlist | PASS | `runOptimistic` is now deny-by-default (`SAFE_OPTIMISTIC_KINDS`). The outbox gate was **not** switched to the allowlist (see 25a5359d). 355/355. | No |
| 41c4bca9 | P15.fix: patient-web optimistic allowlist | PASS | `pendingMode` and `runOptimistic` now follow the allowlist; unknown kinds fall to "processing". The tests pass. | No |
| e7dda23d | P15.fix: outbox persist-first submit | PASS (scope) | Persists before sending, so a transient failure keeps the entry. 356/356. It does not address the missing stable key (25a5359d (2)). | No |
| d1f14892 | P15.fix: payment processing state | PASS | The pay screen renders `pendingMode("payment")` = processing, with buttons disabled; nothing is optimistic. **Note:** the payment-intent POST carries a per-tap key, so the global wrapper may auto-retry it up to 3× (deduplicated by key). patient-app forbids this with `retryable:false`, so the two apps are inconsistent. | No |

## Answers to the specific checks
1. **Retries.**
   - patient-app, patient-web, provider-app and admin all retry only GET, HEAD and OPTIONS, or requests that carry a key.
   - Retry-After is honoured in seconds and HTTP-date form, capped at 30 s (patient-app), 20 s (provider-app) and 60 s (admin). patient-web's cap is set by `maxRetryAfterMs`.
   - patient-app payment intent: `retryable:false`.
   - patient-web: keyed payment and Rx POSTs are auto-retried by the global wrapper. Each retry reuses the same key, so they are deduplicated, not blind.
   - The patient-app axios adapter treats any key as retryable.
2. **Auth.**
   - patient-app: unchanged (SecureStore; delete on 401; no refresh flow, the same as before).
   - provider-app: clears tokens on 401, the same as before. Refresh and login are **broken** by the response-unwrapping bug.
   - Admin BFF cookies, CSRF and the refresh-once flow are unchanged.
   - patient-web BFF: the cookies are unchanged, but **refresh-on-401 never fires**, because 401 arrives as 503.
   - No app sends the token to a new non-API origin. patient-app still sends it to any absolute URL, which is pre-existing.
3. **Admin BFF.** No security behaviour was lost. The "lost" lines are refactors into `lib/http/upstream.ts`.
4. **Lost behaviours in the client files.** Listed in the table: provider login/refresh/toggle data unwrapping; patient-app shim skipAuth and refresh/user-data cleanup; the medication-reminder cancel on refusal; payment showing a generic message.
5. **patient-web `*-server.ts`.** The cache flags are unchanged and no private data is newly cached. The real loss is that the status codes are destroyed (see 10096828).
6. **Optimistic UI.** Deny-by-default is in place at tip in both apps for `runOptimistic` and `pendingMode`. Payment, booking, Rx and emergency are never optimistic. The patient-app outbox gate is still a deny-list.
7. **Offline outbox.**
   - Neither outbox stores tokens or card data.
   - patient-app **can** replay a non-idempotent write as a duplicate (no stable key).
   - Both outboxes persist unencrypted, survive logout, and block on the head entry.

## Small fixes (not applied)
1. **provider-app/src/context/index.tsx:309, :334, :418.** Change `const data: any = await apiClient.post(...)` to `const { data } = await apiClient.post<ProviderAuthResponse>(...)`. Define a typed interface instead of `any`; for toggle, `{ data } = … <{ instant_available: boolean }>`.
2. **patient-app/app/health/medication-reminder-list.tsx:67-71.**
   ```
   const outcome = await stopMutation.run(...);
   if (!outcome.ok) { setError(t('stopError')); return; }
   await cancelMedicationNotifications(id); await load();
   ```
3. **patient-app/src/services/offline/outbox.ts `assertQueueable`.** Add `if (!isSafeOptimistic(kind)) throw new OutboxForbiddenError(kind);` (import from `../../utils/optimistic`). In `enqueue`, set `headers: { 'Idempotency-Key': \`outbox-${id}\`, ...input.headers }`, so `apiFetch` uses the caller key on every replay. Keep `retryable:false`.
4. **patient-web/lib/api/net/client.ts:294-303.** For an HTTP response that will not be retried, `return response;` instead of `throw apiErrorFromStatus(...)`. Do the same after the last retry: return the final response. Throw only for transport, timeout and offline. This is a few lines, but `client.test.ts` and `install.test.ts` assertions that expect a throw on a status must be updated, so treat it as borderline needs-OpenCode.
5. **patient-app/app/pharmacy/payment.tsx `onFailure`.** Use `failure.message + ' ' + failure.nextStep` instead of the fixed string.
6. **Logout cleanup.** Call `outbox.clear()` on logout in both apps: patient-app SessionManager logout, and patient-web `SessionActions` sign-out.

---

# g5-p15-rest — Phase 15 error boundaries, Sentry, device/browser gates, CI jobs, live harness, docs/notes

Reviewer: g5 subagent. Repo /home/user/new, tip 6c0ed5bf, base 08420c11.
The P15 work sits on a side branch that was merged at 68049253. 00334901 is the "final gate evidence" commit on the P15 merged tree. After that, the OpenCode merges d7ce6e6a and 6c0ed5bf (Phase 16/17/21) overwrote parts of it.
So two states are tested: **00334901** (my own worktree `ocrev/wt-g5-00334901`) and **tip** (`oc-tip`).

## Commands run (real results)
- tsc at 00334901, shared node_modules: backend 0 errors, patient-web 0, provider-app 0. patient-app has 53 errors, but 51 are in `../packages/ui-native` (deps not installed in this env). admin has 16 errors, all "Cannot find module" because its deps are missing from the shared node_modules.
- admin with a fresh `npm install` (scratch copy `ocrev/g5-admin`): tsc gives only the 30 pre-existing errors at tip (`src/pages/admin/reports/live.tsx`) and exit 0 at 00334901. The 5 group admin test files: **38/38 pass** at tip.
- **admin `npm ci --dry-run`**: base 08420c11 rc=0. f23734a2, a16388a9, 00334901 and 6c0ed5bf all fail with rc=1: `Missing: webpack@5.111.1 from lock file` (npm 10.9.4, node 22.22, the same toolchain as CI).
- patient-web vitest (group files: error-report, sentry-release, route-error, device-support, old-browser-notice, appointment-slots-provider-zone, segment-errors):
  - 00334901: **7 files, 32/32 pass**.
  - tip: **4 FAIL**. `route-error.test.tsx` x2: `[locale]/error.tsx` was overwritten by 52dc3644, so the contactSupport link and reportSegmentError are gone. `segment-errors.test.tsx` x2: new sections `admin/` and `api/` have no error.tsx.
- patient-web full vitest at 00334901: 196 passed | 14 skipped files, **701 passed | 23 skipped**. This matches the 00334901 claim exactly.
- provider-app full jest at 00334901: **16/16 suites, 147/147**. This matches the claim.
- provider-app group suites (ErrorBoundary, deviceSupport, time/*, serverTimeAnchor): tip 9/9 suites, 75/75. At 00334901 there was 1 flaky failure in deviceSupport during a combined run; it passed 2/2 when re-run alone.
- patient-app group suites (errorBoundary, deviceSupport, services/time, errorCatalog.parity, client.resilience): tip 5/5 suites, 91/91. At 00334901 there was the same 1 flaky deviceSupport failure under load; it passes alone.
- Mutation spot-checks of the aba7643c claims, re-run by me in worktree wt-g5-aba7643c:
  - "drop release from Sentry.init": reproduced, `1 failed, 13 passed`.
  - "iOS floor 16.4→12.0": reproduced, 3 failed (`documents iOS 16.4…`, `rejects devices below the floor`, `shows the message…`).
  - Both match the notes.
- tools/live at tip: `py_compile` OK on all new journeys, `bash -n` OK on all new .sh files, and the 3 new workflows parse as YAML. The live gate itself cannot run here (no docker).

## Table

| commit | claimed item | verdict | evidence |
|---|---|---|---|
| 6a07c9c3 | P15.15.5 provider-app root + per-screen boundaries, Sentry release | PASS | App.tsx: every screen and dashboard is wrapped in ScreenBoundary; the "lost lines" are only the wrapping. ErrorBoundary.test passes at tip and 00334901. componentDidCatch→reportError, so the error is not swallowed. No DSN committed (only `https://public@example.ingest.sentry.io/1` in a test). Minor: app.config.js passes `authToken: sentryAuthToken` into the plugin config (the plugin warns "unsecure use"). |
| 7b818644 | P15.15.5 patient-app boundaries + crash.ts release | FAIL | New `any` in production code: `crash.ts` `beforeSend: (event: any)` and `catch (error: any)` (AGENTS "no any in new code"). `setCrashUser` still sends email + name to Sentry (PII, carried over from base; no scrubbing). Tests pass (91/91). |
| 2a28cb1e | patient-app P15 notes | PASS | The numbers are consistent with my 00334901 runs. BLOCKED lines are honest. |
| bd35bac9 | P15.15.10 provider min-OS gate + device-farm matrix | FAIL | `DeviceGate` reads `require('expo-device').platformVersion`. **expo-device 57 has no such export** (Device.d.ts: `osVersion`, `platformApiLevel`). At this commit `detected` stays undefined, so `meetsMinimumOs(..., undefined)` is false and **every real device sees "device too old"**. The test mocks the nonexistent field. Device farm was never run. `devicefarm/firebase-testlab.yml` ids (`pixel-2`, `iphone-se-3`, `moto-g5-plus` labelled "Huawei") are not FTL catalog ids and `run.js` does not validate them. |
| aba7643c | P15.15.v provider verification notes / mutation proofs | PASS | 2 mutation proofs reproduced exactly (see above). |
| 5b1a5e1c | P15.15.11 chaos drills in live gate | FAIL | At the commit the drills were vacuous: SMS and LiveKit only asserted fallbacks that hold by default (the code says "DEFERRED-OUT-OF-SCOPE"); re-verify accepted `None`; 5xx counted as graceful; gate_run.sh had no j_payments. Fixed later by ae9637be/c29973c1/6dd3d6da/eb57db5d (not in this list). Still at tip: `skip()` = `step(..., True)`, so a missing failure mechanism reads green. "DEFERRED-OUT-OF-SCOPE" for the server-side slow-API flag remains. The gate_run.sh "lost review line" is not a loss: the JOURNEYS list is a strict superset. |
| f23734a2 | P15.15.5 admin boundaries, ErrorFallback, Sentry | FAIL | **admin/package-lock.json out of sync**: `npm ci` fails (`Missing: webpack@5.111.1`). This breaks the existing CI checks live-gate.yml "Admin panel (BFF)" and patient-production-ci.yml admin job. Admin CSP `connect-src 'self'` blocks browser Sentry ingest. The browser bundle resolves release to `admin@dev+dev` (see a16388a9). AdminGuard probe-error fallback is correct. Tests 38/38 pass after `npm install`. |
| 6bda218f | P15.Gate throttled-network, rapid-tap, app-killed journeys | FAIL | At the commit: gate_run.sh JOURNEYS omitted j_payments (fixed by eb57db5d); chat rapid-tap race and other vacuous checks were fixed later. At tip: every journey turns green via `SKIP …, True` when fixtures are missing. The throttled browser half always SKIPs in CI (live-gate.yml starts no patient-web), and the offline-banner/last-updated steps are known red. app-killed is an API simulation, not a killed app. Push delivery: "DEFERRED-OUT-OF-SCOPE". |
| 1433dc8b | P15.15.10 browser CI matrix + device farm | FAIL | New workflows `p15-web-browsers.yml` and `device-farm.yml` were added without owner approval. **The original pointed the PR build and smoke at the production API** (`NABD_API_BASE_URL: https://api.nabd.plus/api/v1`, lines 57/62), fixed in 1ab6aeec. device-farm.yml is workflow_dispatch only and uses new secrets GCP_SA_KEY/GCLOUD_PROJECT/RESULTS_BUCKET. `tools/live/device_farm.yml` labels redfin (Pixel 5, 8 GB) as "low-end 2-3 GB" and claims dark-mode/font-scale are "Robo crawl dimensions" (they are not configured anywhere). No existing check was removed. |
| 8aa216db | P15.15.12 OTA procedure + kill-switch/force-update checks | FAIL | The killswitch baseline was asserted after the upserts at this commit (vacuous; fixed by 5bc84185). OTA: `rollout-5-percent.sh` only publishes to a branch named `production-5pct`. Nothing sets a 5% rollout (`eas channel:rollout` / `--rollout-percentage` are not used). The canary is a new `eas update`, not "the SAME update group". Rollback republishes to `production-full`, not the canary. Neither eas.json has an updates channel (checked at tip). Verify "test OTA 5% then rollback" was never executed. |
| a62888de | P15.15.12 admin absent-flag lookup + force-update save guard | PASS | The save is disabled until a successful GET, which prevents a `{apps:{}}` wipe. Tests pass (config-portal.apps, system-ops.flags, ops-control). The lost `catch { /* optional */ }` is replaced by a visible error. |
| 1f8681f3 | P15.15.6 Schemathesis CI job | FAIL (owner approval) | Adds new workflow `schemathesis.yml` on pull_request (backend/**). No secrets, nothing removed. At the commit the harness was missing, so the job exits 1 ("DEFERRED-OUT-OF-SCOPE"). Harness `backend/scripts/schemathesis_fuzz.sh` exists at tip. Verify "0 server errors" was never run. The backend does not compile at tip, so the job is red. |
| 68c299d0 | P15.15.5 patient-web route fallbacks + release-tagged reports | PASS (regressed at tip by others) | route-error tests pass at 00334901. At tip `[locale]/error.tsx` was replaced by 52dc3644. That version has no contact-support link and no Sentry report, and it adds an auto `window.location.reload()` after 3 s. retryCount resets on every reload, so this is **an infinite reload loop**. 2 route-error tests fail at tip. |
| 76c4adab | P15.15.10 minimum-browser notice | PASS (regressed at tip by others) | Fail-open: unknown/bot UA counts as supported, and the notice is a dismissible, non-blocking banner. Tests pass at 00334901. At tip `OldBrowserNotice` (and `OfflineBanner`/`NetworkPolicy`) are no longer mounted in `[locale]/layout.tsx` (removed by 52dc3644/6180cdf1). |
| b7265074 | patient-web final counts | PASS | Counts are for its branch. Note: the Errors.* it "filled" included machine garbage ("Pakisab slowdown."); the merge replaced it with upstream wording. |
| fc2a8fe8 | backend P15_NOTES | PASS (note) | Real tails. Contains `DEFERRED-OUT-OF-SCOPE` lines, which AGENTS.md forbids as wording, but they are stated openly. |
| 26238030 | gate evidence (pre-merge) | PASS | Honest: lists PARTIAL per task and the reviewer FAILs. Nothing is claimed green. |
| 87f9a050 | config-portal saving state through save guard | PASS | Tests pass. |
| a16388a9 | admin release contract admin@version+build | FAIL | `resolveRelease(env = process.env)` is called with no args in `sentry.client.config.ts`. In a Next.js browser bundle bare `process.env` is not inlined, so every browser event gets `admin@dev+dev`. That does not match the `withSentryConfig({release:{name}})` source-map release, so production stack traces will not symbolicate. The server side is fine. |
| 3f4b31e2 | admin fix-round notes | PASS (note) | tsc/vitest/build claims reproduce after `npm install`. They do not disclose that `npm ci` (what CI runs) fails on the desynced lock. |
| f14622ad | provider DeviceGate neutral loading | FAIL | It now renders a spinner while `detected===undefined`. Because `Device.platformVersion` does not exist in expo-device 57, the version never resolves on any native device, so **the provider app spins forever (total lockout)**. The test pins `platformVersion: null` and asserts the spinner. The `Platform.Version` fallback only runs on a throw. On Android that value is the API level (e.g. 33), which would pass even Android 6. |
| c7473e6d | patient-app min-OS gate iOS16.4/Android7 | FAIL | Same `Device?.platformVersion` defect, so **the patient app spins forever on every real device**. The test sets `deviceMock.platformVersion` (a fictional field). |
| 6b9f5f0d | patient-app release contract | PASS | Release is derived from expoConfig version/build. Tests pass. |
| 047142d8 | patient-web release patient-web@version+build | FAIL | `getSentryRelease(env = process.env as ReleaseEnv)` is used in `sentry.client.config.ts`. In the browser bundle this resolves to `patient-web@dev+dev`, which does not match the server/source-map release. Tests only exercise injected env objects. |
| d158cf71 | locale: port ur/hi/bn/fil Errors.* into patient-app catalog | FAIL | Keys are at parity (14 codes × 6 locales). It contains machine garbage: fil RATE_LIMITED "Pakisab slowdown."; fil UNKNOWN_ERROR "Kumipag-ugnayan" (typo); fil "Pansamantalaang" (typo). ur uses the Devanagari danda "।" in 3 strings, and AUTHENTICATION_REQUIRED starts with a stray "میں". patient-web replaced exactly these strings in the merge (00334901 fil RATE_LIMITED = "Dahan-dahan lang."), so the two clients now diverge. Parity test relaxed from full equality to ar/en byte-equality (justified by the extra locales). Phase 3-adjacent (client error catalog); the backend envelope is untouched. |
| e8a68c4c | provider release contract | PASS (note) | Tests pass. app.config.js still passes `authToken` into the plugin props (see small fixes). |
| 990a6aed | patient-web doctor slots in Asia/Riyadh | PASS (owner note) | `slotDisplay` uses `formatInProviderZone`. Test present and passing at 00334901. Riyadh is correct. Plan 15.9 says users see their own zone; showing a patient Riyadh time without a zone label is an owner decision. |
| 414eb0f6 | per-section error.tsx on shared fallback | PASS (regressed at tip) | 27 section boundaries + shared fallback (try again / home / contact support, reports on mount). Tests pass at 00334901. At tip the new sections `[locale]/admin` and `[locale]/api` (added by other OC commits) have no error.tsx, so 2 tests fail. |
| b65ad2f6 | provider home-tab queue in Asia/Riyadh | PASS | Uses `formatInProviderZone(..., timeStyle short)`. scheduleWiring test passes. The lost lines are the replaced device-zone `toLocaleTimeString`. The `(x: any)` is pre-existing and only re-indented. |
| 3c02c098 | patient-app reschedule strip + refund window on server clock | FAIL | `dayKeysForRange` builds `?date=` with `toISOString().slice(0,10)` (a **UTC** day). The backend (`slot.service.ts:38-44`) treats `date` as the Riyadh calendar day. So between 00:00 and 03:00 Riyadh the strip is off by one: "tomorrow" is actually today, and the 7th day is missing. There is no test at 21:00-23:59Z. The refund-window server clock is correct. |
| 0210cda0 | provider server-time anchor + Riyadh schedule | PASS | Date-header anchor in client.ts (success + error paths). providerZone tests cover 21:30Z, which is 00:30 the next day in Riyadh. Tests pass. |
| 99f60d8b | provider fix-round notes | PASS | Counts consistent with my runs (OtpModal flake disclosed). |
| f93206ee | patient-app fix-round notes | PASS | Consistent. |
| aa26777a | patient-web fix-round notes | PASS | Group tests 32/32 at 00334901 reproduced. |
| eb57db5d | gate_run.sh includes j_payments | PASS | Both runners now list the same 17 journeys. |
| 868528ba | throttled-network strict markers, proven CDP, replay check | PASS | Only adds terms to conditions and adds a server-side replay check. Nothing weakened. |
| 1ab6aeec | browsers CI → staging, never production | FAIL (owner approval) | It correctly removes the production target and adds a host guard. Owner approval is still needed. Its own comment says staging is not deployed, so the job is **red on every patient-web PR**. |
| 4d4d6c06 | device farm fails closed on empty matrix | PASS | `bash -n` OK; empty matrix exits 1. |
| 0533e697 | schemathesis: all doubles + run on main | FAIL (owner approval) | Adds a `push: main` trigger (new required run on main) and starts smtp_sink/fake_moyasar. Race: the port probe runs right after `nohup` with no wait loop for 2525/9100. No secrets, nothing removed. |
| 386edee2 | OTA: group id from --json, fail loud | needs-OpenCode | The parsing is now strict and the rollback never reports false success. The underlying mechanism is still wrong (no rollout %, canary is not the same group, rollback hits the wrong branch, no eas updates channel). This needs real `eas channel:rollout`/`--rollout-percentage` usage plus `updates`/`runtimeVersion` config in both apps. |
| 2c2332f9 | gates fix-round log F1-F12 | PASS | Explicitly says "Nothing below is green". The no-weakening claims hold for 868528ba/eb57db5d as checked. |
| 00334901 | final gate evidence on merged tree | PASS (note) | Reproduced: patient-web 701/23-skipped; provider 147/147; backend/patient-web/provider tsc 0; admin tsc 0 (after `npm install`). Not disclosed: admin `npm ci` fails on the desynced lock, so the "admin next build exit 0" claim cannot be reproduced the way CI builds. |

Phase 3/5 code touched: none of these commits touch validation pipes, DTOs, exception filters, backend error envelopes, catalogs or migrations. d158cf71 touches only the client-side copy of the error catalog (13.R5) and keeps the ar/en parity with the backend.

## CI/infra summary (check 1)
- **New workflows** (all need owner approval, none approved): `.github/workflows/schemathesis.yml` (1f8681f3, 0533e697), `.github/workflows/p15-web-browsers.yml` (1433dc8b, 1ab6aeec), `.github/workflows/device-farm.yml` (1433dc8b).
- **No existing workflow file was edited by these commits.**
- They do change what an existing check runs:
  - The live-gate.yml journeys now include j_chaos (which restarts the backend and pauses Redis), j_rapid_tap, j_app_killed_payment, j_throttled_network and j_killswitches, via run_gate.sh.
  - **f23734a2 breaks the existing admin `npm ci`** in live-gate.yml and patient-production-ci.yml. This weakens existing checks (they go red).
- **Production / secrets:**
  - 1433dc8b targeted the production API from PR CI (fixed in 1ab6aeec).
  - device-farm.yml references new secrets (GCP_SA_KEY, GCLOUD_PROJECT, RESULTS_BUCKET).
  - The OTA scripts would publish to the `production` channel when run with EXPO_TOKEN; they are not wired into CI.

## Top defects
1. **Both mobile apps are locked out on every real device**: the DeviceGate reads the nonexistent `expo-device` `platformVersion` (c7473e6d, bd35bac9/f14622ad). It shows "device too old" before f14622ad and an endless spinner after. The tests mock the fictional field.
2. **The admin lockfile is out of sync since f23734a2**, so `npm ci` fails and the existing live-gate and admin CI jobs break.
3. **The OTA "5% staged rollout + rollback" is not real** (8aa216db/386edee2): no rollout percentage, a different update group, the wrong rollback branch, and no `updates` channel in either eas.json. 15.12 Verify was never run.
4. **Browser-bundle Sentry release is wrong** for patient-web and admin (047142d8, a16388a9): it becomes `…@dev+dev` because bare `process.env` is not inlined. The admin CSP also blocks Sentry ingest. Source maps will not match.
5. **Unapproved CI**: three new workflows. One hit the production API (fixed). The browsers job is red on every patient-web PR until staging exists. Schemathesis is red while the backend does not compile.
- Also notable:
  - **Live-gate journeys go green on SKIP**: 6bda218f/5b1a5e1c `skip(..., True)`, and the throttled browser half always skips in CI.
  - **Machine garbage in the patient-app error catalog** (d158cf71).
  - **UTC day-key off-by-one in the reschedule strip** (3c02c098).
  - **P15 web fallbacks were overwritten at tip by later OpenCode commits**: an infinite 3 s reload loop in `[locale]/error.tsx`, and OldBrowserNotice/OfflineBanner unmounted.

## SMALL FIXES (not applied)
1. `patient-app/src/deviceSupport/DeviceGate.tsx:61-63` and `provider-app/src/deviceSupport/DeviceGate.tsx:43-45`:
   ```ts
   const v = Device?.osVersion;            // was Device?.platformVersion (does not exist)
   if (!cancelled) setVersion(v != null ? String(v) : '999'); // fail open when unknown
   ```
   In both `catch` blocks use `setVersion(Platform.OS === 'ios' ? String(Platform.Version) : '999')` (Android `Platform.Version` is an API level, not an OS version). Update both tests to mock `osVersion`.
2. Admin lockfile: run `cd admin && npm install --package-lock-only` (npm 10.9 / node 22) and commit `admin/package-lock.json`. Verify with `npm ci --dry-run`.
3. `patient-app/src/services/monitoring/crash.ts`: replace `beforeSend: (event: any)` with `(event: Parameters<NonNullable<SentryOptions['beforeSend']>>[0])` or `Record<string, unknown>`, and `catch (error: any)` with `catch (error: unknown)` using `error instanceof Error ? error.message : String(error)`. Also consider dropping `email`/`username` from `setCrashUser` (PII).
4. `patient-web/sentry.client.config.ts:9`: `release: getSentryRelease({ NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE, NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION, NODE_ENV: process.env.NODE_ENV })`, or omit `release` client-side so `withSentryConfig`'s injected release is used. Do the same in `admin/src/sentry.client.config.ts:13` with explicit `process.env.NEXT_PUBLIC_*` reads.
5. `patient-app/src/services/http/errors.i18n.json`: copy the ur/hi/bn/fil `Errors.*` entries from `patient-web/messages/{ur,hi,bn,fil}.json` at tip. At minimum:
   - fil RATE_LIMITED message: "Masyadong maraming pagsubok. Dahan-dahan lang."
   - fil UNKNOWN_ERROR nextStep: "Kumipag-ugnayan" → "Makipag-ugnayan"
   - fil SERVICE_UNAVAILABLE: "Pansamantalaang" → "Pansamantalang"
   - ur: "।" → "۔" (AUTHENTICATION_REQUIRED x2, NO_AVAILABILITY x2), and drop the leading "میں ".
6. `patient-app/src/services/time/serverTime.ts` `dayKeysForRange`: use `new Date(baseMs + 3 * 3_600_000 + i * DAY_MS).toISOString().slice(0, 10)` (Asia/Riyadh is UTC+3 with no DST). Add a test with `nowMs = Date.parse('2026-10-05T22:30:00Z')` that expects the first key `2026-10-07`.
7. `provider-app/app.config.js:40`: remove `authToken: sentryAuthToken,`. The Sentry plugin reads `SENTRY_AUTH_TOKEN` from env and warns "unsecure use of authToken".
8. `.github/workflows/schemathesis.yml`, doubles step: before the python probe, add `for p in 2525 9100; do for i in $(seq 1 30); do (echo > /dev/tcp/127.0.0.1/$p) 2>/dev/null && break; sleep 1; done; done`.
9. Tip regressions of this group's work, caused by later OC commits:
   - Restore `patient-web/app/[locale]/error.tsx` from 00334901. This removes the infinite 3 s auto-reload loop and restores contact-support and reporting.
   - Re-mount `<OldBrowserNotice/>`, `<OfflineBanner/>` and `<NetworkPolicy>` in `patient-web/app/[locale]/layout.tsx` (as at 00334901 lines 19-21, 75, 86, 88, 123).
   - Add 7-line `error.tsx` files for `app/[locale]/admin` and `app/[locale]/api` using `SegmentErrorFallback`.
