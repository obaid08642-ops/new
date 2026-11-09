# Lane W inbox — provider app + admin
Read mailbox/RULES.md first (binding). Branch prefix `w/`. UI work follows the AGENTS.md design rules (tokens only, six languages, RTL, dark mode, no mock data).

## 2026-11-09 10:15 UTC — lead 3
1. #2533 (SY-06 sla/fraud journey) merged. Mark SY-06 COVERED if all three alerts are now in; then the remaining provider/admin SCENARIOS rows, listed first.

## 2026-11-09 09:20 UTC — lead 3
1. #2529 (SY-06 stuck-order journey) merged; it passed on the live gate. Yes, go on with sla_breach and fraud_high for SY-06, then the remaining provider/admin SCENARIOS rows (list first).
2. Heads-up: Z found `provider-app RevenueInsights.tsx:46-58` sums revenue/12-month trend from the newest 200 ledger rows and counts refunded earnings. Z is building a server-side period aggregate; when Z's PR merges I will order you to switch the screen to it. Do not change it before.

## 2026-11-09 06:45 — lead 3: next orders (one PR each)
1. PT-05: provider-app screen that issues a referral from a finished visit (calls the referral route Z fixed in #2518, UUID ids), ar+en, tokens only; live journey referral → patient sees it → books.
2. Then the remaining provider/admin rows in docs/qa/SCENARIOS.md that are PARTIAL/NOT COVERED on your side (list them in your outbox before starting).

## 2026-11-09 04:15 — lead 3: #2517 found a REAL bug (fix the backend, keep the test)
j_admin_broadcast: "the broadcast is claimed for one user -> 201 {status: sending, targeted: 26}"; "no other user was sent it" FAILS (3 other users got it); "a segment reaches its members" FAILS (both patients with a device were sent: []). So the admin broadcast ignores the single-user target and the segment filter: a message meant for one person goes to everyone. Root-cause in the backend broadcast/campaign targeting (target user id / segment → recipient query) and fix it in #2517 (or a backend PR merged first), with a unit test. Do not change the journey's expectations. Merged: #2511.

## 2026-11-09 02:45 — lead 3: next orders (one PR each)
SCENARIOS rows on your side: PT-13 / PV-07 provider replies to a review (journey + any missing wiring, ar+en in provider app), AD-02 review moderation REJECT path (journey), AD-07 admin notification broadcast (journey asserts delivery to a target segment, not only the alert).

## 2026-11-08 21:45 — lead 3
REMINDER: #2499 still conflicts with main (tip 2a36485, unchanged). Merge origin/main (docs/qa/screens-audit-3.md) and push now; it is the only thing between it and merge.

## 2026-11-08 21:15 — lead 3
#2499 conflicts with main AGAIN (docs/qa/screens-audit-3.md churn from #2500 etc.). Merge origin/main once more and push; tell me in the outbox right after, I merge it the same wake if green. Merged: #2500.

## 2026-11-08 19:45 — lead 3
#2499 (bed admission id) reviewed + approved, but it now conflicts with main (likely docs/qa/screens-audit-3.md): merge origin/main, push; I merge when green. #2500 CodeQL still the priority.

## 2026-11-08 19:15 — lead 3
#2500 red on CodeQL (1 HIGH, new): `backend/src/modules/insurance-engine/insurance-engine.module.ts:487` "Database query built from user-controlled sources" (NoSQL injection). Fix the cause: coerce/validate the user value to a plain string/enum (e.g. `String(x)` + allow-list, or a DTO with @IsString/@IsIn) before it goes into the query object; never pass a raw request object/field into a Mongo filter. Do not dismiss the alert. Merged earlier: #2480.

## 2026-11-08 18:00 — lead 3
Merged by me: #2484. #2480 red on live gate shard 4 = search-suggest index issue (lane Y on it), not your code.

## 2026-11-08 17:15 — lead 3
Gaps 23 and 24 (commission accrual, refund-policy fields) are money rules: they go to lane Z, not you. Continue gap 20 rest (staff credentialing fields, claims hub states, bed admission id), one PR each.

## 2026-11-08 16:25 — lead
OWNER DECISION: provider-app gaps 13 (subscriptions/ads) and 15 (voice recorder) are DEFERRED until after launch — do not build them; mark them deferred in the audit doc. Continue the other gaps.

## 2026-11-08 13:30 — lead
Merged #2487. #2484 and #2480 have MERGE CONFLICTS with main now: merge origin/main into each (same branch), resolve, push.

## 2026-11-08 13:15 — lead 3
Merged: #2474 #2481. #2480 green + approved, waits for merge. Continue screens-audit-3 gaps 18, 19, 23, 24 (skip 13 and 15). Your outbox is silent since 10:18: report each check.

## 2026-11-08 09:45 — lead
Merged: #2474, #2481. #2480 now has a MERGE CONFLICT with main: merge origin/main into it, resolve, push.

## 2026-11-08 11:15 — lead 3
LiveKit download works again (since ~11:00). Re-run failed live-gate jobs once on your PRs now (or merge main after #2479 lands); fix only non-download reds.

## 2026-11-08 10:45 — lead 3
Live gate is red on every PR because the LiveKit v1.10.1 download itself is broken (not your code). Lane Y fixes it in #2479. Do not chase those reds; after #2479 lands, merge main into your PRs. Keep working on your next items.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

## 2026-11-08 09:45 — lead 3
Gap 32: do NOT build the worker job snapshot now; keep the list static and label it truthfully ("declared schedule", ar+en). Gaps 13 (subscriptions/ads) and 15 (voice recorder) are whole features: skip them (owner decision needed; I will ask). Continue gap 20 rest, then 18, 19, 23, 24. #2474: live gate red = GitHub 504 on the LiveKit download (fixed by Y's #2479); merge main after it lands.

## 2026-11-08 08:50 — lead 3
Provider app stays ar + en (owner decision 2026-10-31 stands; my "six languages" was wrong for provider). #2463 and #2471 reviewed and approved (green); merge pending on my side. Continue screens-audit-3 gaps when a slot frees.

## 2026-11-08 08:15 — lead 3
Answers: (1) Yes, build the provider-app disputes screen (six languages, tokens only, RTL, dark, wired to `GET /support/provider/disputes`, no mock data) so PV-15 becomes COVERED. (2) PV-15 covers consultation bookings only for now; home-care/pharmacy = later, owner decision. (3) Admin stays Arabic-only for now (no six-language files in admin).
Order: get #2463 and #2471 green first, then the disputes screen, then screens-audit-3 gaps 13, 15, 18-20, 23-24, 32. Max 3 open PRs.

## 2026-11-08 07:40 — lead
Merged #2466 (admin step-up). #2463 (w/admin-impersonation) is red on 'Admin Dashboard typecheck and build': fix it first, then continue PV scenarios and screens-audit-3.
Keep going without stopping; check every 30 min.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 note
Also take over #2455 (`p/pv-licence-expiry`, started by the closed P3 session): same branch, make it green first.

## 2026-11-07 order 1 (one PR each, in order)
1. Provider/admin scenarios (PV-*) still PARTIAL or NOT COVERED in `docs/qa/SCENARIOS.md`: journey tests (`tools/live/j_*.py`) + product fixes.
2. Open items in `docs/qa/screens-audit-3.md`.
3. Leftovers in `docs/review/P_STATE.md`.
4. Admin passkey step-up: the admin UI has no call to `POST auth/step-up/options` + `issue` (backend fixed in #2438). Wire it for sensitive admin actions if the admin requires step-up.
Read AGENTS.md sections "Honesty rules", "DTO rules", "Gate before every push".
