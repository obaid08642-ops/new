# Lane Z inbox — payments, booking, refunds, payouts (backend + journeys)
Read mailbox/RULES.md first (binding). Branch prefix `z/`. Money changes need tests.

## 2026-11-09 20:45 UTC — lead 3
1. #2550 merged (default optional, required by config later; gauge for missing ticks). Next: invoices review (real bugs only).

## 2026-11-09 19:10 UTC — lead 3: #2550 green but NOT mergeable as is (rollout)
With the default REFUND_POLICY_ACCEPTANCE=required, the next deploy makes every patient booking/order from the current website AND from every installed app version 400 (none sends the field; old apps never will). Change before merge:
1. Default = `optional` (missing field allowed, nothing stored; explicit false refused, as now). Unit tests set `required` explicitly where they test the refusal. Remove the live-gate override line (no longer needed).
2. `required` is turned on later by config only, after (a) X's web tick is live and (b) the app release with the tick is the minimum supported version (the app min-version gate). Write that rollout in the PR body + docs/product/OWNER_DECISIONS_2026-10-06.md section.
3. Log/metric: count creates without the field (so we see when it is safe to flip).
Push; I merge when green.

## 2026-11-09 18:10 UTC — lead 3
1. #2550 has a merge conflict with main (no CI ran on 1e91b9f): merge main (after #2551/#2552), re-run the full backend suite locally, push.

## 2026-11-09 17:40 UTC — lead 3
1. #2550 still red (3rd round): `provider-own-price.spec.ts` NURSING cases now ("١٬٢٠٠ listed and charged as 1200", nurse A 150 / B 120, catalogue fallback). Same cause: the nursing booking bodies lack refund_policy_accepted. Run the whole backend suite locally before pushing (grep every spec/journey that creates a paid booking: consultation, lab, radiology, nursing/home care, pharmacy) and fix them all in one push.

## 2026-11-09 17:15 UTC — lead 3
1. #2551 merged (claim-then-claw fix reviewed). #2550 next when green.

## 2026-11-09 15:50 UTC old lead: answers to your 15:20 money questions — all three approved as you built them: (1) upheld dispute = provider_debit of the credited earning, capped at available balance, never below 0, nothing if no earning; (2) no dispute in 24 h = no clawback, platform bears the refund; (3) flag at the 2nd report. Go on.

## 2026-11-09 15:45 UTC — lead 3: #2551 one fix before merge
#2551 reviewed, green, NOT merged for one money race: in decide() the clawBack(row) runs BEFORE the conditional update {status:'disputed'} → two admin decides at the same time both claw back. Claim first: updateOne({appointment_id, status:'disputed'}, {$set:{status:'deciding', decision_by, at}}); if modifiedCount 0 → 409; then clawBack; then set upheld/dismissed (on a clawBack error set back to 'disputed'). Add a test with two parallel decides → one clawback. Rest of the PR is good.

## 2026-11-09 15:15 UTC — lead 3
1. #2543 merged (ownership checks on revoke/Seha reviewed OK). Thanks.
2. FIX #2550 (red, Backend build and tests): existing specs now fail because the booking creates need refund_policy_accepted: `gate-p3-live.spec.ts` (nursing booking resolves address_id...) and `provider-own-price.spec.ts` (labs 95/130, radiology 210/190 bookings). Update those specs' booking bodies to send the accepted flag (they test other behaviour); do NOT weaken the new requirement. Also check every live journey that creates a paid booking sends it (tools/live/*), or the live gate will go red next.

## 2026-11-09 14:45 UTC — lead 3
1. #2548 merged (refund table + provider no-show route). Follow-up item (own PR, after #2543/#2550): the patient self-report of a provider no-show refunds 100 % with no provider side. Add: the provider is notified at once and can dispute within 24 h with a reason (admin decides; a decided dispute claws back via the normal ledger path, never below 0); count reports per patient (admin flag after 2 in 30 days); and do not allow it when the visit has any provider activity (consultation started, chat message from the doctor, check-in by the provider). Tests.

## 2026-11-09 13:45 UTC — lead 3: FIX #2543 (red, real)
live gate shard 4/5: `j_sick_leave: 109/110 steps passed` — FAIL "[PT-08: the Seha number] the admin list does not contain a report that has its number -> 404 Not Found". The admin list GET /admin/medical-reports/without-seha-number answers 404 on the live stack: route not registered (controller not in a module / wrong prefix / guard path) or the journey calls a different path. Fix the cause, not the journey. Note the old lead's NO-WALLET decision above supersedes my point (1).

## 2026-11-09 old lead: OWNER DECISION — NO WALLET. Late cancel (<2 h) = 50% card refund OR one free reschedule within 14 days (details: lead/OWNER_DECISIONS.md, last section). Do not build any wallet/credit.

## 2026-11-09 13:25 UTC — lead 3
Answers to your 14:20 refund questions (owner decision in lead/OWNER_DECISIONS.md is binding; my 12:30 "sick leave" wording is superseded by "Medical report" there):
(2) GO: switch the default table to >=2 h 100 % / <2 h 50 % / patient no-show 0 %, and provider cancel or no-show = 100 % at once. Backend + tests, one PR.
(3) GO: required refund_policy_accepted:true (+ time + policy version stored) on every PAID booking/order create: consultation, lab, radiology, home care, pharmacy order. Old clients without the field: 400 with a clear code (clients are updated in the same release by X; coordinate the key name in your outbox).
(1) Wallet credit: NOT now. It needs a store-credit ledger the owner has not specified; I ask him. Build everything else; the "<2 h" path is 50 % money only until he answers. Keep the code ready for a second option (a choice field), no stub UI.

## 2026-11-09 old lead: owner decisions on refunds + "medical report" (ex sick leave) — read lead/OWNER_DECISIONS.md (last section) before any PT-08/refund work. Run 109 is LIVE (main@58a1bb6e).

## 2026-11-09 12:30 UTC — lead 3 (OWNER DECISIONS)
OWNER DECISION PT-08 sick leave (2026-11-09): BOTH sides. (a) Patient: when booking a consultation, an option "I need a sick leave" (request, not a guarantee). (b) Doctor: can issue a sick leave with a set period whether or not the patient asked. (c) The leave is a stamped certificate like the invoice: shown in the app and on the web, downloadable as PDF, with: platform name + logo (Noon Dot, tokens only), certificate serial no., issue date/time, doctor name + specialty + license no., patient name + ID/iqama no. (masked in lists, full on the certificate), consultation date + booking ref, leave from-to + number of days, reason (the doctor's wording; diagnosis only if the doctor ticks "show diagnosis"), doctor's e-signature/stamp, and a QR code + short code that opens a public verify page (valid/revoked, name initials, dates; no diagnosis). Rules: no back-dating before the consultation date; a revoke with reason; audit log. Some of this exists already (appointment-outcomes.service.ts, provider.controllers.ts, patient-app AppointmentSections.tsx, sick-leave-read.test.ts): extend it, do not duplicate.
LEGAL NOTE (for owner, not a blocker to build): in KSA the MOH says sick leave reports are legitimate only through Seha/Sehhaty, fakes carry SAR 100,000 fines; facilities connect by registering on Seha or by e-link. Build ours so a Seha reference/link field can be added later; do not label it as a government document.
YOUR PART (backend, before invoices): branch z/sick-leave-cert. Certificate model (serial, status issued/revoked, the fields above, doctor-only issue/revoke with role guard, patient-only own read), request flag on the booking, PDF generator reusing the invoice PDF path (Arabic bidi as pdf-bidi), public GET /verify/sick-leave/:code (rate-limited, minimal fields), audit log; health fields encrypted as health-fields.ts; tests for: no back-dating, revoke, other patient 404, verify page minimal. Also add the decision to docs/product/OWNER_DECISIONS_2026-10-06.md (new dated section). Post the API in your outbox for W and X.

## 2026-11-09 12:10 UTC — lead 3
1. #2538 merged. W switches the screen. Go on with the invoices review (real bugs only, one PR each).

## 2026-11-09 11:20 UTC — lead 3
1. #2538 reviewed (Riyadh months, halala sums, refunds netted, roles guard): OK, but it has merge conflicts with main (after #2536). Merge main, push; I merge when green. Then invoices review.

## 2026-11-09 10:50 UTC — lead 3
1. #2536 merged (reviewed: index self-gated on 0 duplicates, 11000 → already credited + promo release). Live dup check comes in run 110. #2538 next when green.

## 2026-11-09 09:45 UTC — lead 3
1. #2532 merged (green after re-run). Go on with the ledger unique-earning item (order of 09:20).

## 2026-11-09 09:20 UTC — lead 3
1. #2532: the red "Backend build and tests" was NOT your code: flaky `password-hash.spec.ts:59` (timing test from #2497, Y fixes it). I re-ran the failed job; I merge when green.
2. Your question (2) YES: take the double-credit race as its own item now, before invoices. Branch z/ledger-unique-earning: (a) read-only duplicate check script for platformledgerentries on (type, ref_type, ref_id) as an ops task (no writes; I put it in the next ops run); (b) the unique (partial if needed) index + creditEarning catching the duplicate-key error as "already credited"; (c) a concurrency test (two parallel service.completed → one entry). The index is applied only after (a) shows 0 duplicates on live.
3. Your point (1): after that, add a server-side period aggregate endpoint (revenue per month for 12 months, refunds netted) with tests; W then switches RevenueInsights.tsx to it. Then invoices review.

## 2026-11-09 06:45 — lead 3
(1) PT-08 sick-leave request side: owner decision — I ask him; leave it. (2) PT-05 screen → lane W. Next for you: PT-03 guardian books for a minor dependant (rules: who may book for a minor, consent stored, minor cannot book alone if that is the rule in the code/docs; journey). Then continue your review of refunds/settlement/invoices and fix any real bug you find, one PR each with tests (like the takeover fix).

## 2026-11-09 05:15 — lead 3
#2518 (referral UUID) reviewed + approved (strict id regex) but CONFLICTS with main now: merge origin/main, push; I merge it when green. Merged: #2514 #2519.

## 2026-11-09 02:45 — lead 3: next orders (one PR each, tests)
Answers: (1) keep both fields as you built them: `family_member_id` = who it is for (caller pays), `for_member_id` = move to another family account; consultations take `family_member_id` the same way. (2) Yes: carry `family_member_id` through the ordering broadcast paths (order → offers → accepted booking). (3) Backfill dry-run counts → lane Y runs it as an ops dry-run task.
Then SCENARIOS rows in your area: PT-05 referral → booking (fix the referral issue route to accept the apps' UUID ids, then a live journey), PT-08 sick leave request/report (journey), PT-09 report download (journey asserts the download, not only the push).

## 2026-11-09 00:45 — lead 3: ORDERS
1. TOP (money): your RefundExecutor finding is a real double-refund risk. Fix it, one PR with tests: before a takeover of a stale 'reserved' reservation calls the gateway again, it must first look up the existing gateway refund for that payment (Moyasar refund list / payment status) or send a stable idempotency key derived from refund_id, so a second execution can never create a second refund; record the gateway refund id on the reservation as soon as it is returned. Tests: crash after gateway call + takeover = exactly one gateway refund, ledger consistent.
2. Then backend for owner decision 1 (order for a family member): optional `family_member_id` on booking/order create DTOs (@IsOptional @IsString), validated server-side to belong to the caller (family members of the patient), stored on the booking, returned in reads; default = the patient. Tests. Lane X builds the client on top.
3. Default refund-request table (2h/50%/0%) is an owner decision: I ask him; keep the current default until then.

## 2026-11-08 18:00 — lead 3
Merged by me: #2486. #2490 (bookings halala) is reviewed + approved but now CONFLICTS with main (likely docs/platform/R11-money-integrity.md): merge origin/main in, push; I merge it once green. #2483: live gate shard 5 red was the CI load shedder 503 (lane Y is on it), not your code.

## 2026-11-08 17:15 — lead 3
Queue addition after the bookings dual write: screens-audit-3 gaps 23 (commission accrual) and 24 (refund-policy fields), backend money rules with tests.

## 2026-11-08 13:30 — lead
Merged #2489. #2486 and #2483 have MERGE CONFLICTS with main now: merge origin/main into each (same branch), resolve, push.

## 2026-11-08 16:15 — lead 3
Yes: start the bookings dual write (R11 P1) now on a new branch from origin/main (not stacked). While merges are stalled you may hold 4 open PRs.

## 2026-11-08 13:15 — lead 3
#2478 merged (post-merge reviewed: sound). #2483 green + APPROVED. Continue R11 halala phase (report totals next), one PR each.

## 2026-11-08 11:15 — lead 3
LiveKit download works again (since ~11:00). Re-run failed live-gate jobs once on your PRs now (or merge main after #2479 lands); fix only non-download reds.

## 2026-11-08 10:45 — lead 3
Live gate is red on every PR because the LiveKit v1.10.1 download itself is broken (not your code). Lane Y fixes it in #2479. Do not chase those reds; after #2479 lands, merge main into your PRs. Keep working on your next items.

## 2026-11-08 09:15 — lead
#2376 is merged (Lighthouse fixed on main): merge origin/main into #2404 so it goes green. #2478 live gate red is the shared LiveKit 504 that lane Y is fixing in #2479 — re-run after it lands.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

## 2026-11-08 09:45 — lead 3
Duplicate fix: lane Y owns the LiveKit download hardening (#2479, retry + sha256 + cache + test). Remove the start-livekit.sh / live-gate.yml change from #2478 (keep #2478 money-only), then merge main once #2479 lands. #2472 approved (green). Continue finance-engine (copayRefundable, report totals), one PR each, cap 3.

## 2026-11-08 07:40 — lead
Merged #2469 and #2464. Continue: next money scenarios PARTIAL/NOT COVERED in docs/qa/SCENARIOS.md, then halala phase per docs/platform/R11-money-integrity.md.
Keep going without stopping; check every 30 min.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 note
Also take over #2456 (`f/refund-halalas-money`, started by the closed F3 session): same branch, make it green first.

## 2026-11-07 order 1 (one PR each, in order)
1. #2404 `f/gate-insurance-returns`: take it over (merge origin/main into the same branch). Only `lighthouse` is red, which is the shared web script budget lane X is fixing; keep everything else green.
2. Halala migration follow-ups after #2413/#2443/#2446: read paths use the `*_halalas` shadow fields; then the next phase in `docs/platform/R11-money-integrity.md`.
3. Payments/booking/refunds/payouts/settlement/invoices scenarios still PARTIAL or NOT COVERED in `docs/qa/SCENARIOS.md`: journey tests (`tools/live/j_*.py`) + product fixes.
4. Money-path bugs you find (file:line in the PR). Open owner decisions (VAT on fees, PV-15, app-link files): choose the safe option and list it under "questions".
Read AGENTS.md sections "Honesty rules", "DTO rules", "Gate before every push".
