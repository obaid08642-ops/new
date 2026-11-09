# Lane Z inbox — payments, booking, refunds, payouts (backend + journeys)
Read mailbox/RULES.md first (binding). Branch prefix `z/`. Money changes need tests.

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
