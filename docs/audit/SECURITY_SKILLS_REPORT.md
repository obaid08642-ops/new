# Security audit with Trail of Bits skills (2026-10-04)

**Targets**
- `origin/main` at `7fd81e8`, re-fetched at `25da2610` before the PRs. The backend files in scope did not change between the two.
- Agent tip `origin/fix/audit-2026-09` at `b274e6f`.

Every finding says where it is: **main**, **agent**, or **both**.

**Rule used: verified only.** A finding is listed only when it was reproduced personally: a real request and response on the local stack with synthetic data, or a test that fails. Sub-agent and tool output were treated as leads. Unproven leads are listed in §5 and are **not counted**.

## 0. Method

**Skills.** `trailofbits/skills` was cloned at commit **`82fe8226252622fa807643bdca1710901198553a`** (2026-09-28). No plugin install, and no install scripts were run. These skill files were read in full before use:

| Skill | File | Used for |
|---|---|---|
| sharp-edges | `plugins/sharp-edges/skills/sharp-edges/SKILL.md`, `references/auth-patterns.md` | Dangerous defaults (empty secret, fail-open by environment), auth and IDOR footguns. Found Q94 and Q99 and guided Q91. |
| fp-check | `plugins/fp-check/skills/fp-check/SKILL.md`, `references/standard-verification.md` | Every lead went through data flow → attacker control → impact → PoC → devil's-advocate check before it was counted. |
| variant-analysis | `plugins/variant-analysis/skills/variant-analysis/SKILL.md` | After Q93, searched for the same root cause (provider profiles returned with only `license_documents` removed). Found `POST /workflow/match`. |
| semgrep | `plugins/static-analysis/skills/semgrep/SKILL.md`, `references/rulesets.md`, `scripts/run-scans.sh` | Local scan with downloaded rules (§6). |
| entry-point-analyzer | `plugins/entry-point-analyzer/skills/entry-point-analyzer/SKILL.md` | Read, but not applied: it is written for smart contracts. Route mapping was done by hand per controller. |

**Local stack (synthetic data only)**
- MongoDB 7 replica set in docker, Redis, and the S3 stand-in (moto).
- The SMTP sink and the fake Moyasar from `tools/live`.
- Backends, each with its own throwaway DB:
  - main :8002;
  - agent :8003;
  - one per fix branch: :8004–:8007;
  - production-like limits for main and agent: :8012 and :8013 (`DISABLE_RATE_LIMIT=false`, default throttler, default OTP cap).
- For X0: nginx 1.27 in docker with the exact cached `location` blocks from each branch's `deploy/nginx/conf.d/nabd.plus.conf`.
- Nothing was sent to an external service, and nothing touched production or staging.

**Where an admin approval was needed**, a provider becoming active or a doctor role, it was simulated with one `updateOne` on the throwaway DB. The finding itself never depends on that step. The rows below say so.

**Deduplication**
- Checked against `docs/review/QA_DEFECTS.md` (Q1–Q90), `REVIEW_P13.md`, `REVIEW_P14.md` and the open PR #240 (Round 10 `[REVIEW-FIX]` batch). PR #240 touches none of the files fixed here.
- The CodeQL alerts API answers 403 to this session. So the CodeQL comparison uses the list of 7 High alerts in `REVIEW_P13.md:29`; none of them overlaps a finding here.
- New ids start at **Q91**.

## 1. Counts (verified only)

| Severity | New | Re-verified existing |
|---|---|---|
| **P0** | 1 (Q91, two paths) | 1 (X0, main only; closed on agent) |
| **P1** | 4 (Q92, Q93, Q95, Q96) | — |
| **P2** | 4 (Q94, Q97, Q98, Q99) | 1 (TRUST_PROXY_HOPS / X-Forwarded-For, already in `docs/deploy/DEPLOY_BRIEF_FOR_AGENT.md` §3.3) |

**Fixed by the reviewer** (4 PRs into `main`, each with a regression test that fails before the fix and a live re-check):

| Id | Fix commit | PR |
|---|---|---|
| Q91 | `78e23175` | #242 |
| Q92 | `4f3b1898` | #243 |
| Q93 | `a35cb6f2` | #245 |
| Q94 | `16baba9f` | #246 |

The agent branch carries the same code, so it gets the fixes through the usual main → `fix/audit-2026-09` sync.

**Sent to the agent** as Round 11 in `REVIEW_REAUDIT_P1_P11.md`: Q95, Q96, Q97, Q98, Q99, and the follow-ups of Q91 and Q94.

## 2. Findings

Evidence files are in `docs/review/evidence/security_skills_2026-10-04/` (`x_*.txt`), with the probe scripts in `probes/`.

### P0

#### Q91 — Account takeover through the guest endpoints (both)

**Where:** `backend/src/modules/auth/auth.service.ts`. The file is identical in main and agent.

**Path 1: `POST /auth/guest {phone}`** (`:808-842`, public, 20 requests/min)
- The service runs `userModel.findOne({ phone })`. It has no `is_guest` filter.
- It returns `signToken(u)` for whatever account owns that phone, with no OTP and no password.
- The device-binding branch (`guest_device:<id>` → user id) also re-issued a token for an account that had since been converted.

**Path 2: `POST /auth/convert-guest {email}`** (`:871-918`)
- Any guest token is enough.
- If the email belongs to another account, the "merge" branch migrated the guest's data into that account and returned **a token for that account**.

**Proof:** `x_guest_*.txt` and `x_convert_*.txt`.
```
[main]  POST /auth/guest {phone: victim} -> 201 user.id=<victim id> is_guest=False token=yes
[main]  GET /auth/me with that token -> 200 id=<victim id> email=victim…@nabd.test
[agent] (same) -> 201 user.id=<victim id> …; GET /auth/me -> 200 victim
[main]  POST /auth/convert-guest {email: victim} -> 201 user.id=<victim id>; GET /auth/me -> 200 victim
[agent] (same) -> 201 …; GET /auth/me -> 200 victim
```

**Fix (reviewer, `78e23175`, PR #242)**
- A row is reused only when it is a guest row.
- A registered account's phone is never attached to a new guest.
- Convert-guest with someone else's email → 409.
- `auth.guest-takeover.spec.ts`: 3 of 4 cases fail before, 4/4 pass after.
- Live on the fix build: `guest {phone: victim}` returns a new guest id; convert-guest returns 409.

**Left for the agent (Round 11):** a guest-to-existing-account merge that first authenticates as the existing account (password or OTP).

**Phase:** 7D (auth hardening).

#### X0 — Private responses served from the shared Nginx cache (main; the agent fix closes it)

**Where:**
- main `backend/src/common/cache-control.interceptor.ts:5-15`: `public, s-maxage=300` by URL prefix;
- main `deploy/nginx/conf.d/nabd.plus.conf:60-121`: caches `^/api/v1/(medicines|lab-services|radiology|care/services)` with no bypass on `Authorization`.

**Proof (main):** `x_x0_main.txt`, through nginx with main's exact location blocks.
```
/radiology/bookings/mine
   anon-before 401
   A           200 MISS  cc=public, max-age=300, s-maxage=300
   anon-after  200 HIT   (A's response)
   B           200 HIT   (A's response)
```
`/radiology/reports/mine` behaves the same way.

The synthetic patient had no radiology bookings, so the cached body is A's empty list. What is proven is the mechanism: an anonymous caller and a second patient receive A's authenticated response from the cache. With real bookings, that cached body is A's data. A booking was not created because the QA catalog for radiology is empty here (HANDOFF §1).

**Proof (agent):** `x_x0_agent.txt`, through nginx with the agent's allow-list.
```
A          200  cc=private, no-store
anon-after 401
B          200  its own response
```
The agent's private routes fall through to the uncached `location /`, and every cached location has `proxy_cache_bypass`/`proxy_no_cache` on `Authorization` and on the real session cookies.

**Verdict:** still exploitable on `main` today. The agent fix closes it for these routes. The Cloudflare rules (owner action, X0 item 5) were not tested here.

### P1

#### Q92 — Any patient can read any patient's medical profile through the family module (both)

**Where:** `backend/src/modules/family/family.service.ts:167-177` (`getMemberHealth`), route `GET /family/member-health/:userId`.

**Root cause:** the method checks that the caller is in *a* group (the owner always passes `hasPermission`). It never checks that the target is in that group.

**Proof:** `x_family_*.txt`. A and B share no group.
```
[main]  B GET /family/member-health/<A id> -> 200 {'patient_id': <A>, 'allergies': [{'name': 'SyntheticPenicillinAllergy'…}], 'blood_type': 'AB-' …}
[agent] (same) -> 200, A's profile
```

**Fix (reviewer, `4f3b1898`, PR #243)**
- The same membership check as `getMemberRecords`.
- The spec fails before and passes after.
- Live on the fix build: 404 `Member not found in your family group`.

**Phase:** 7D.

#### Q93 — Provider IBAN, bank name and commission terms in public and patient-facing listings (both)

**Where:**
- `backend/src/modules/provider-onboarding/provider-onboarding.module.ts:467` (`GET /search/providers`, `@Public`);
- variant `backend/src/modules/workflow-engine/workflow-engine.module.ts:369,476` (`POST /workflow/match`, any signed-in user).

Both remove only `_id`, `__v` and `license_documents`.

**Proof:** `x_prov_*.txt` and `x_match_*.txt`.
1. The provider enters the IBAN through the real `POST /provider-onboarding/step2`.
2. Approval is simulated on the test DB (`status: active`).
3. Then:
```
[main]  anonymous GET /search/providers?type=doctor -> 200 … {'iban': 'SA0380000000608010167519', 'bank_account_name': 'Synthetic Doctor Bank Acct', 'commission_rate': 10}
[agent] (same)
[main]  patient POST /workflow/match {kind: consultation} -> 201 … {'iban': 'SA03…', 'bank_account_name': …, 'commission_rate': 10}
[agent] (same)
```

**Fix (reviewer, `a35cb6f2`, PR #245)**
- One list of private fields: `iban`, `bank_account_name`, `national_id`, `tax_number`, `signature_url` and the `commission_*` fields.
- It is applied as a projection on search, and stripped after scoring on match.
- The spec fails before (2/2) and passes after.
- Live on the fix build: all of those fields are absent.

**Phase:** 7D / 13.R4 (data minimisation).

#### Q95 — Any doctor, lab, radiology or hospital account can write a report into any patient's record (both)

**Where:** `backend/src/modules/medical-reports/medical-reports.service.ts:39-66`, route `POST /medical-reports`.

**Root cause:** the code checks only `user.role`. Nothing links the caller to `body.patient_id`: no appointment, booking or referral is required. `critical: true` also fires the critical-report event.

**Proof:** `x_medrep_*.txt`. The doctor role was simulated on the test DB. The doctor has no relation to the patient.
```
[main]  doctor POST /medical-reports {patient_id: <unrelated>, critical: true} -> 201
[main]  patient GET /medical-reports/mine contains it: 200 True
[agent] (same) -> 201 / True
```

**Agent task:** the caller must be the provider on an appointment, lab booking, radiology booking or admission of that patient (or an admin). Accept `appointment_id`/`*_booking_id` and verify it, and do not take `doctor_id`/`doctor_name` from the body.

**Same pattern (lead, §5):** `POST /home-care/care-plans/:patientId`.

**Phase:** 7D.

#### Q96 — Refund requests are not bound to a real, owned, paid booking; another patient's refund is returned (both)

**Where:** `backend/src/modules/insurance-engine/insurance-engine.module.ts:795-817` (`RefundService.request`, `POST /refunds/request`).

**Root causes**
- The code never checks that `booking_id` exists or belongs to the caller.
- `amount_paid`, `scheduled_at`, `booking_kind` and `payment_id` come from the client.
- The duplicate check is on `booking_id` only, and it returns the existing document to whoever asks.

**Proof:** `x_chatref_*.txt`.
```
[main]  A requests refund for booking-of-A-… -> 201 patient_id=<A>
[main]  B requests the same booking id -> 201 -> returns patient_id=<A> reason='synthetic A reason (private)' amount_paid=250
[main]  B files for a booking that does not exist, amount_paid 99999, scheduled_at 2099 -> 201 refund_percent=100 refund_amount=99999
[agent] identical
```

**Impact**
- Another patient's refund document (patient id, amount, reason) is disclosed.
- Patient B can pre-empt A's refund.
- The admin queue fills with invented amounts. The executor caps a refund at the paid amount; that cap was not exercised here.

**Agent task:** look up the booking by kind and id, require `patient_id == caller`, take the paid amount and the schedule from the booking or transaction, scope the duplicate check to `{booking_id, patient_id}`, and never return another patient's document.

**Phase:** 7D / money.

### P2

#### Q94 — TURN credentials signed with a public default secret; any account, guests included, gets 24h credentials (both)

**Where:** `backend/src/modules/coturn/coturn.service.ts:25`:
- `COTURN_SECRET || 'change_this_secret'`;
- `isConfigured()` checks only the host;
- TTL is 86400 s.

Route `GET /calls/ice/credentials`, global JWT guard only.

**Proof:** `x_turnrl_main.txt` and `x_turn_agent.txt`, with `COTURN_HOST` set and no secret.
```
[main]  guest (no account, no call) GET /calls/ice/credentials -> 200 ttl=86400
[main]    credential == HMAC-SHA1("change_this_secret", username): True
[agent] (same) -> 200 ttl 86400 … True
```

`deploy.sh` generates a real secret, so production is exposed only if that variable is lost. That is why this is P2, not P1.

**Fix (reviewer, `16baba9f`, PR #246)**
- A missing secret means `coturn_not_configured` (503).
- The spec fails before and passes after.
- Live on the fix build: 503 without a secret, 200 with one.

**Agent task (Round 11):** issue TURN credentials only to a party of an active call session, with a TTL of about 10 minutes, and never to guests. This complements Q54/Q64, which cover the deny-list and the wiring, not who can get credentials.

**Phase:** 16 (calls).

#### Q97 — Group chat bypasses the "existing relationship" rule (both)

**Where:** `backend/src/modules/chat/chat.service.ts:71-77` (`createGroupThread`), route `POST /chat/threads/group`.

**Root cause:** arbitrary `participant_ids` with no relationship check. `getOrCreateDirectThread` enforces LJ-06; this path does not. `addParticipant` also allows either party of a *direct* thread to add a third user, who then reads the history.

**Proof:** `x_chatref_*.txt`.
```
[main]  stranger A -> direct thread to unrelated B: 403 direct_chat_requires_existing_relationship
[main]  stranger A -> group thread with B: 201; A sends message: 201; thread appears in B inbox: True
[agent] identical
```

**Agent task:** apply the same relationship rule to every participant of a new group, and to each participant added to a group. Do not allow adding participants to `direct` threads.

**Phase:** 7D.

#### Q98 — Presigned uploads accept any client-declared Content-Type; the bucket serves it back as HTML (both)

**Where:** `backend/src/modules/media/media.controller.ts:56-70` (`POST /media/presigned`). Only the file name's extension is checked; `mimetype` is signed as sent. `media.service.ts` `generatePresignedUploadUrl` has no length condition.

**Proof:** `x_media_*.txt`, on moto. Real S3 and R2 honour the signed Content-Type the same way, but that was not tested here.
```
[main]  POST /media/presigned {filename: report.pdf, mimetype: text/html} -> 201
[main]  PUT html to the URL -> 200
[main]  GET signed read URL -> 200 Content-Type: text/html, body '<html><body><h1>synthetic page…'
[agent] identical
```

**Relation to existing items:** the agent's `59e0d6b` (EXIF strip and type checks, REVIEW_P14 FAIL) does not cover the presigned path.

**Agent task:**
- Allow-list `mimetype` against the extension.
- Sign `Content-Type` and `Content-Length` (or use a POST policy with `content-length-range`).
- Serve reads with `Content-Disposition: attachment`, or from a separate origin.
- Check the magic bytes on finalize.

**Phase:** 7D / 16.

#### Q99 — Moyasar webhook accepted unsigned whenever `NODE_ENV` is not `production` (both)

**Where:** `backend/src/modules/webhooks/webhooks.service.ts:38-49` (`verifyMoyasar` returns true when the secret is missing outside production), route `POST /webhooks/moyasar` (public).

**Proof:** `x_webhook.txt`.
```
POST /webhooks/moyasar, no signature -> 201 {"status":"success","event":"payment.failed"}
```
The same result on main and agent, both started with `NODE_ENV=development`.

**Impact:** on any non-production deployment (staging), anyone can post gateway events. The payments lead in §5 shows that a forged `payment.paid` reaches `recordVerifiedGatewayPayment`, which was not proven end to end here. The other two receivers were fixed in F60; this third one was missed.

**Agent task:** fail closed in every environment. The local stack sets a test secret, and `tools/live/fake_moyasar.py` signs with it. Make the replay check atomic (`SET NX` before processing).

**Phase:** 7D / money.

#### Known, re-verified — `TRUST_PROXY_HOPS` default 2 lets a direct client forge `X-Forwarded-For` (both)

**Proof (production-like limits):** `x_turnrl_main.txt`.
```
POST /auth/login wrong password x30 (same IP)        -> 401 x5, 429 x25
POST /auth/verify-otp wrong code x30                 -> 400 x3, 429 x27
POST /auth/login wrong password x30, rotating XFF    -> 401 x30   (throttle bypassed)
```

The agent behaves the same (`x_turnrl_agent.txt`; it also adds a 1-hour IP ban, which then blocked every request from the probe IP).

This is already a deploy requirement (`DEPLOY_BRIEF_FOR_AGENT.md` §3.3: set `TRUST_PROXY_HOPS` to the real proxy count). It is not counted as new. It is safe only if the origin accepts traffic from Cloudflare alone.

## 3. Areas checked that held (verified)

- **Rate limits with `DISABLE_RATE_LIMIT=false`:** login, verify-otp and guest are throttled per IP on main and agent (see above).
- **X0 on the agent tip:** closed for the private radiology and medicines routes (see above).
- **Idempotency (main), code review only:** the key is scoped `user.id:method:url:key`, the body is hashed, and concurrent duplicates get a `SET NX` 409. No cross-user replay was found. This was not reproduced live, so it is not counted.

## 4. Fixes made in this audit

| Id | Branch → PR | Commit | Regression test | Live re-check |
|---|---|---|---|---|
| Q91 | `review/fix-guest-takeover` → main, #242 | `78e23175` | `auth/auth.guest-takeover.spec.ts` (3/4 fail before) | `x_guest_fix.txt`, `x_convert_fix.txt` |
| Q92 | `review/fix-family-health-idor` → main, #243 | `4f3b1898` | `family/family.member-health-idor.spec.ts` (fails before) | `x_family_fix.txt` |
| Q93 | `review/fix-provider-private-fields` → main, #245 | `a35cb6f2` | `provider-onboarding/provider-private-fields.spec.ts` (2/2 fail before) | `x_prov_fix.txt`, `x_match_fix.txt` |
| Q94 | `review/fix-turn-secret-fail-closed` → main, #246 | `16baba9f` | `coturn/coturn.secret.spec.ts` (fails before) | `x_turn_fix.txt` |

**Gate on each fix branch:**
- `tsc` 0;
- `nest build` 0;
- `npm test` 10/10 chunks;
- dtolint 0;
- dtocheck 0 mismatches.

The boot suites `test/security test/journeys` show 3 suites / 20 tests failing **identically on unmodified main**: `PdplService` is not provided to `UsersController` in `p3-provider-credential`, `p3-credential-rotation` and `journeys/provider-onboarding`. That is pre-existing; it is reported, not fixed here.

None of the fixes is in this report PR.

## 5. Not verified (leads; not counted)

Each of these is code-read only, or was not reproduced in this session. The next reviewer pass should reproduce each before reporting it.

**Admin authentication**
1. **Admin device lock.** An admin access token alone can enroll a new device id (`POST /admin/devices/enroll`), and the exemption regex matches any path containing `/admin/devices`. This is the root cause already recorded under **X4 / `ca16fa7`** (REVIEW_P13). It was not re-tested live in this session.
2. **Agent only:** `AdminDeviceService.revoke` compares a string to `_id` (an ObjectId), so revoking a device may never match and now returns 404. Not run.
3. Changed user-agent, account recovery and the mobile API path for admin: not tested.

**Payments, refunds and loyalty**
4. **Payments.** A forged `payment.paid` on the non-production webhook (Q99) creates a confirmed `pharmacy_payment_evidence` row with no gateway lookup. Separately, `verifyPayment` overwrites any status and downgrades refunded or captured transactions; the Moyasar sync route has no owner check.
5. **Consultation card intent charges `price`, not `total_price`** (`payments.module.ts:340`). This is a revenue loss, not a security issue.
6. **`RefundExecutor`.** Card refunds on the current payment flow are booked as cash without a gateway call, and the cumulative cap is never updated (`finance-engine.module.ts:600-660`).
7. **Admin refunds.** No cumulative cap and no lock (`payments.module.ts:458-478`). `/refunds` vs `/refund` path. No step-up (Q66/Q89).
8. **Loyalty.** `max_redeem_percent` can be configured up to 100 (no `@Max(10)`). Redemption itself caps atomically, and no cash-out path was found.

**Provider privacy and access**
9. **Provider privacy rule:**
   - lab and radiology inboxes return `patient_phone`, address and coordinates before acceptance;
   - the nursing open pool returns the exact address and phone to every nurse;
   - any nurse can cancel or claim any unassigned request;
   - pharmacy broadcasts carry `national_id` and the policy number.

   The lab, nursing, radiology and home-care part overlaps the REVIEW_P13 13.R4 FAIL. Not reproduced here, because the QA catalogs are empty.
10. **Same pattern as Q95:** `POST /home-care/care-plans/:patientId`; `POST /prescriptions/:id/verify` (any pharmacy claims an unassigned prescription); `POST /booking/flow/payment/:type/:id/mark` (a provider marks its own booking paid); `LabsEngineController` (`lab_id` taken from the request).

**Chat and calls**
11. **Legacy Socket.IO `ChatGateway`.** Accepts refresh and QR tokens, does not check `tv`, and relays to `thread_<id>` without a membership check.
12. **LiveKit `POST /calls/initiate`.** Issues 2h tokens for PENDING or future appointments and sends a call push each time. The newer `issueBookingCallToken` path is correctly limited.

**AI gateway**
13. No per-user limit; guests are allowed; `copilot/suggest` has no doctor role (free LLM proxy). Agent `stripPii` misses names and images. The cross-user cache is **Q82** (also affects `ocr-translate`, `medicine-image-search` and `analyze-meal`).

**Web**
14. **patient-web.** No CSRF defence beyond SameSite=Lax (`lib/api/csrf.ts` `assertSameOrigin` is never imported). A `text/plain` form can log a victim into the attacker's account (login CSRF). Not run: patient-web was not built in this session.
15. **Admin BFF.** Any valid JWT (even a patient's) in the `admin_access` cookie is forwarded with `ADMIN_GATE_TOKEN`, which cancels the C3 network gate; RBAC still applies. `admin_device` never gets `Secure`. Not run: admin was not built.

**Functional regressions on the agent tip** (not security)
16. `POST /media/upload` reads `file.file` (Fastify) under Express. `POST /home-care/bookings` always returns 400 `provider_id_required`.

17. Semgrep leads: unescaped email HTML in `notifications.service.ts`; JSON-LD `</script>` break-out in the admin `s/[type]/[slug]` page (§6).

## 6. Semgrep (local, rules downloaded, `--metrics=off`)

Scanned with `run-scans.sh` from the skill, in **important-only** mode (WARNING/ERROR).

**Targets:** source-only copies of `backend/src`, `admin/src`, `patient-web/app` and `patient-web/lib`, one for main and one for the agent tip.

**Rulesets:**
- `p/security-audit`, `p/secrets`;
- `p/typescript`, `p/nodejs`, `p/nextjs`, `p/react`;
- third-party: Trail of Bits `semgrep-rules` and elttam `semgrep-rules`, cloned locally.

Every command ran with `--metrics=off`, and no code left the container. Semgrep Pro was not used (OSS only, no cross-file taint).

**Approval gate:** the skill's step-3 approval was taken from the task brief ("semgrep runs locally with downloaded rules"). No other approval was asked in this unattended session.

**What did not run:** `p/express` failed on both targets: `Failed to download configuration … HTTP 404` (registry), semgrep exit 7. It is reported here, not hidden. The other 8 rulesets ran with exit 0 and no partial scans.

**Raw results (same on main and agent, line numbers shifted):** 16 hits.

| Rule | Location (main) | Triage |
|---|---|---|
| `cors-misconfiguration` ×2 | `api-security.module.ts:219` | False positive: the origin is checked against an allow-list before it is reflected. |
| `v3-potentially-bad-cors` ×3 | `main.ts:101,108`, `configured-io.adapter.ts:20` | False positive in production: the boot check requires `ALLOWED_ORIGINS` to hold exact origins (DEPLOY_BRIEF §3.3). |
| `mongodb-insecure-transport`, `redis-unencrypted-transport` ×3 | `app.module.ts`, `redis.service.ts`, `step-up.guard.ts`, `admin-governance.controller.ts` | Informational: Mongo and Redis are on the internal docker network. |
| `raw-html-format` ×2 | `admin/.../verify-2fa.ts:41` | False positive: this builds a `Set-Cookie` string, not HTML. |
| `raw-html-format` ×2 | `notifications.service.ts:373` (agent `:392`) | **Lead, not verified:** the notification title and body are interpolated unescaped into the email HTML. This is HTML injection in emails if any title or body carries user text. |
| `react-dangerouslysetinnerhtml` ×3 | `admin/src/pages/s/[type]/[slug].tsx:80` | **Lead, not verified:** JSON-LD is written with `JSON.stringify` inside `<script>`, which does not escape `</script>`. A stored string containing `</script>` in `meta.structured` would break out. Who can write that data was not traced. |

**Result:** 0 verified findings from tool output alone; 2 leads were added to §5.

## 7. What was NOT tested

- Production and staging: none. All results come from the local stack.
- Real Moyasar, real R2/S3, real LiveKit and coturn, and Cloudflare (cache rules, WAF, origin lock): none.
- The native apps (patient-app, provider-app) on a device: none. patient-web and admin were not built or run, so the BFF, CSRF and server-action leads are code-read only.
- Admin 2FA, step-up and device lock were not exercised live (see §5.1–3).
- AI provider calls: none (no provider keys, and no cost incurred).
- X0 with a non-empty private payload: not tested (no radiology catalog in QA). The mechanism was proven with A's empty response being served to others.
- Cloudflare's own edge cache (X0 item 5): not tested.

## 8. Coordination

- PR #240 (Round 10) was checked: no overlap with the files fixed here.
- The fixes went to `main` only. Nothing was pushed to `fix/audit-2026-09`; the agent branch receives the fixes through the reviewer's main → agent sync.
- QA_DEFECTS rows Q91–Q99 and Round 11 in `REVIEW_REAUDIT_P1_P11.md` are added in this report PR.
