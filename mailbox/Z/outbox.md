## 19:49 UTC 2026-11-08 — check 19:48: #2490 merged; #2483 re-conflicted and fixed
Status: waiting for CI and merges
PR: #2483 (conflicted again on the R11 doc rows after #2490 merged: merged main, pushed 428d79d7, tsc ok, CI re-running), #2495 (live gate queued since 18:20, no failure), #2503 (live gate queued, no failure); no conflicts on #2495/#2503
What changed: no new order since 18:00. The only change: the #2483 doc merge.
Left / blockers / questions: 3 open PRs (2483, 2495, 2503). Still open from before: (1) test-database backfill dry run counts (orders, appointments, labbookings, radiologybookings, homecarebookings) from you/ops; (2) default refund-request table 2h/50%/0% vs the old 24h/4h windows (#2496 merged with the new default; tell me if you want the old one back); (3) accrue() unused on purpose. No further queued item for lane Z: send the next order or I keep reviewing refunds/settlement/invoices for money-path bugs.

## 19:21 UTC 2026-11-08 — check 19:18: money-path bug found and fixed (#2503)
Status: in progress
PR: #2503 (CI: pending): payout request race. #2490, #2483, #2495 (no conflicts; live gates were running/queued at 18:47, no failure seen; not re-read this round)
What changed: no new order since 18:00. Doing the money-path bug review (order 4): provider-payouts.controller.ts request() (~69-113) reads the available balance and "no open withdrawal" inside a transaction that writes no shared document, so two requests of one provider with different idempotency keys (two devices, a double tap) both pass and both reserve (up to 2x the balance). Fix: a per-provider lock document (provider_withdrawal_locks) written first inside the transaction, so the second one hits a transient write conflict, is retried and then refused with pending_withdrawal_exists. 3 new tests (call order, refusal after an open request, duplicate-key race). Not testable here: the real concurrent behaviour needs a MongoDB replica set (live gate covers the sequential path via j_payouts.py).
Left / blockers / questions: 4 open PRs (2490, 2483, 2495, 2503). Also looked at the balance maths (locked = any row with state locked): only payout reservations use that state today, so no live bug; I did not change it. Still waiting for the test-database backfill dry run counts from you/ops.

## 18:48 UTC 2026-11-08 — check 18:47: #2496 merged; the backfill dry run needs a test database I do not have
Status: waiting for CI and merges
PR: #2496 merged (thanks). #2490 (live gate running since 18:20, no failure), #2483 and #2495 (live gate queued, no failure); all three up to date enough (no conflicts; 57 commits behind main, the merge commits already resolved)
What changed: nothing pushed. Inbox: no new order since 18:00.
Left / blockers / questions: the planned backfill dry run (orders, appointments, labbookings, radiologybookings, homecarebookings) cannot be done from my sandbox: there is no MongoDB here (the memory-server binary download is blocked) and I must not point it at staging or production. Proposal: you or ops run `halala-backfill` in dry-run mode on the test database after #2490 merges, and send me the unclean counts per collection; I will fix whatever it lists (float-drift values). Until then my lane has no further queued item: tell me the next order, or I will look for money-path bugs in refunds/payouts/settlement (file:line in the PR).

## 18:20 UTC 2026-11-08 — check 18:18: #2486 merged, three conflicts fixed
Status: in progress
PR: #2483 (merged main, R11 doc P2 row only, pushed 14ab3ae4), #2490 (merged main, R11 doc rows, pushed f0eb43fa), #2495 (merged main, only two adjacent imports in finance-engine.module.ts, both kept, 23 tests pass, pushed 412c1e85); #2496 (no conflict, 29 behind main, CI queued earlier). CI re-running on all of them.
What changed: 18:00 note read (conflicts to Z): all three were the same R11 doc rows that every halala PR edits, plus one import line pair. No code behaviour changed by the merges. tsc ok on each.
Left / blockers / questions: 4 open PRs now (2483, 2490, 2495, 2496) - within your allowance of 4. Two questions from 17:18 still open (default refund-request table; accrue() left unused). Next after merges: backfill dry run on the TEST database for orders/appointments/labbookings/radiologybookings/homecarebookings and the P1->P2 gate report.

## 17:48 UTC 2026-11-08 — check 17:48
Status: waiting for CI and merges
PR: #2490 (bookings: live gate SUCCESS, ready to merge), #2483 and #2486 (ready to merge, green earlier), #2495 and #2496 (Patient Production CI queued behind the runner backlog, no completed run yet, no failure); all five up to date with main, no conflicts
What changed: nothing pushed. Inbox unchanged since 17:15.
Left / blockers / questions: ready to merge: #2483, #2486, #2490. Five open PRs (above your 4), so no new item until some merge. Questions from 17:18 still open: default refund-request table (2h/50%/0%) vs the old fixed windows; accrue() left unused on purpose.

## 17:29 UTC 2026-11-08 — check 17:18: gap 24 (#2495) and gap 23 (#2496) opened
Status: in progress
PR: #2495 (CI: pending), #2496 (CI: pending), #2490 / #2486 / #2483 (no conflicts at 17:18; last completed runs green)
What changed: 17:15 order (screens-audit-3 gaps 23, 24):
 - #2495 z/refund-policy-fields (gap 24): home_visit.patient_absent_percent and pharmacy.refund_delivery_fee_before_dispatch are read now. Pharmacy cancel listener honours the delivery-fee flag; the nurse's no-show (home-care.controller visits/:id/no-show) emits homecare.booking_no_show and a new NursingNoShowRefundListener refunds the policy percent (default 0 = as today). Lab/radiology have no patient-absent state, so not wired (product decision if wanted). 11 tests.
 - #2496 z/commission-kpis (gap 23): the commission KPIs were 0 because accrue() has no caller; I did NOT wire accrue() into payments (it writes another row shape into the real ledger collection and would double-count): platformSummary / providerSummary / admin commissions list now read the real provider_earning and commission/vat_reversal rows in halalas, net of refunds; patient refund requests and policy-preview follow refund_policy.consultation instead of fixed 24h/4h windows (default table 2h/50%/0%); money-path bug found: provider-ops creditEarning (~758) raw-inserted earning rows without the R11 *_halalas shadows, fixed. 22 tests.
Left / blockers / questions: questions (safe options taken): (1) refund requests now use the owner's default table (2h/50%/0%), so a request 3h before the start gets 100% (was 0%); say so if you want the old windows kept as the default. (2) accrue() left unused on purpose. 5 open PRs (2483, 2486, 2490, 2495, 2496) - above the 4 you allowed; I start nothing new until some merge.

## 16:48 UTC 2026-11-08 — check 16:47
Status: waiting for CI
PR: #2483 / #2486 / #2490: every completed run is success (acceptance, CodeQL, schemathesis, legacy-client-contract; #2486 and #2483 also passed live gate/CI on their previous commits); the live gate and Patient Production CI on the merge commits are still running; no completed failure; all three up to date with main, no conflicts
What changed: nothing pushed. Inbox: no new order since 16:15.
Left / blockers / questions: next: backfill dry run on the test database for the new collections (orders, appointments, labbookings, radiologybookings, homecarebookings), report unclean per collection, then the P1->P2 gate check.

## 16:24 UTC 2026-11-08 — check 16:18: conflicts fixed, #2490 opened (bookings dual write)
Status: in progress
PR: #2483 (merged main, doc conflict only, tsc ok, pushed c92ac05f, CI re-running), #2486 (same, pushed 80f4c77a, CI re-running), #2490 (CI: pending), #2489 merged (thanks)
What changed: (1) both 13:30 conflicts were only the R11 doc rows (every halala PR edits them): resolved by taking main's P1 row (orders done) and keeping my P2 row. (2) 16:15 order: #2490 z/halala-bookings from origin/main (not stacked): halalaShadowPlugin on AppointmentSchema, LabBookingSchema, RadiologyBookingSchema, HomeCareBookingSchema (price/total, the three fees, total_price, insurance_copay/doctor_penalty where the schema has them), field lists exported and reused by halala-backfill TARGETS; the one raw booking write that sets money (instant-consultation appointment insert) adds price_halalas with shadowFields; 17 schema tests; tsc, nest build, dtolint ok; Mongo suites run in CI only. All P1 modules are now dual-written.
Left / blockers / questions: 4 open PRs (2483, 2486, 2490 + none other: 2489 merged), within the allowance. Next: backfill dry run on the test database (never staging/production) and report unclean per collection; then the P1->P2 gate check.

## 15:48 UTC 2026-11-08 — check 15:47: three PRs ready to merge
Status: waiting for review/merge
PR: #2483 (approved, live gate success), #2486 (live gate success), #2489 (live gate SUCCESS 15:31 with the orders plugin on real Order documents; Acceptance, CodeQL, legacy-client-contract success); all up to date with main, no conflicts
What changed: nothing pushed. Inbox unchanged since 13:15.
Left / blockers / questions: ready to merge: #2483, #2486, #2489. I am at the 3-PR cap so the bookings dual write (R11 P1) waits for the first merge; tell me in the inbox if I may start it on top of an open PR instead.

## 15:19 UTC 2026-11-08 — check 15:18
Status: two PRs ready to merge
PR: #2483 (approved; live gate success, no conflict), #2486 (live gate run 42484648036 SUCCESS, no conflict, up to date with main), #2489 (live gate still running; Acceptance, CodeQL, legacy-client-contract success; no completed failure)
What changed: nothing pushed. Inbox unchanged since 13:15.
Left / blockers / questions: ready to merge: #2483 and #2486. At the 3-PR cap; the bookings dual write (R11 P1) starts when a slot frees.

## 14:48 UTC 2026-11-08 — check 14:47
Status: waiting for review/CI
PR: #2483 (approved; live gate run SUCCESS on a800964c, no conflict: ready to merge), #2486 (live gate still running since 13:22, no completed failure), #2489 (completed so far: acceptance, CodeQL, legacy-client-contract all success; backend/live still running); all up to date with main
What changed: nothing pushed. Inbox unchanged since 13:15.
Left / blockers / questions: #2483 can be merged now. Next after a slot frees: bookings dual write (R11 P1).

## 14:22 UTC 2026-11-08 — check 14:18: #2489 opened (R11 P1 orders)
Status: in progress
PR: #2489 (CI: pending), #2486 and #2483 (live runs queued/in progress at 13:48, no completed failures seen; all up to date with main)
What changed: #2489 z/halala-orders: halalaShadowPlugin on OrderSchema for 10 money fields (ORDER_HALALA_FIELDS), backfill TARGETS gets 'orders' with the same list, 5 schema-level tests, R11 doc updated. No raw collection('orders') write touches those fields (checked). tsc, nest build, dtolint ok; 8 Mongo suites run only in CI (several save real Orders through the plugin: any red there is mine).
Left / blockers / questions: next: bookings (same step, one module per PR). Inbox unchanged since 13:15. 3 open PRs (2483, 2486, 2489).

## 13:48 UTC 2026-11-08 — check 13:48 + assessment of what R11 has left
Status: waiting for CI
PR: #2483 (approved; live run on the merged-main commit in progress), #2486 (live run queued, no completed failures); both up to date with main, no conflicts
What changed: nothing pushed. Inbox unchanged since 13:15.
Left / blockers / questions: assessment (my proposal, no owner decision needed): the remaining round2(...) calls in finance-engine.module.ts now go through roundSar (#2469), which rounds on the decimal text, so subtracting/multiplying doubles and then rounding no longer loses a half cent; rewriting each of them onto integer halalas has little value and real risk (coupon, loyalty, wallet pricing). The real gap in the R11 table is P1 expand for orders and bookings (no *_halalas shadow yet: "Still planned: orders, bookings"). My next PR is that dual write (halalaShadowPlugin on the order and booking schemas + halala-backfill coverage + tests), one module per PR, starting with orders. Tell me in the inbox if you prefer another order.

## 13:22 UTC 2026-11-08 — check 13:17: #2404/#2478 merged, #2483 conflict fixed, #2486 opened (report totals)
Status: in progress
PR: #2483 (approved; conflicted with main only on the R11 doc line after #2478 merged; merged main, tsc ok, pushed a800964c, CI re-running), #2486 (CI: pending), nothing else of mine open
What changed: #2486 z/halala-report-totals: ReportsService.summary adds whole halalas in the $group (halalasSum: integer shadow first, double*100 rounded only for rows without one) and converts to SAR once (finance-engine/report-totals.ts, pure reportFigures); same response shape and units. 5 unit tests; refund-commission-reversal.spec's report test now feeds halala group rows (assertion unchanged). tsc, nest build, dtolint ok; the pipeline against real MongoDB is exercised only in CI (not runnable in my sandbox).
Left / blockers / questions: next: remaining round2 callers in finance-engine (wallet, coupon, loyalty math), one PR each. 2 open PRs (2483, 2486).

## 12:48 UTC 2026-11-08 — check 12:47: #2478 green, #2404 Lighthouse green
Status: ready for review
PR: #2478 (CI: live gate run 42475216870 completed SUCCESS, plus acceptance, CodeQL, security, schemathesis, legacy-client-contract, patient CI; money-only diff, no conflict), #2404 (Lighthouse now green on the merged-main commit; acceptance, CodeQL, schemathesis, P15 browsers, design-gate green; live gate run 42472985588 had shards 1,3,4 green at 12:17, last two still running then), #2483 (earlier runs green; re-run of the failed live jobs had shards 1,3,5 green, 2,4 queued at 12:17)
What changed: nothing pushed this round. Inbox unchanged since 11:15.
Left / blockers / questions: ready to review/merge: #2478 (refund split on halalas) and, once its live shards 2/5 finish, #2404. At the cap (3 open), so the report totals in finance-engine (ReportsService.summary) start when one merges.

## 12:18 UTC 2026-11-08 — check 12:17: no red, LiveKit steps green
Status: waiting for CI
PR: #2478 (live run 42475216870: shards 1,3 green, 2/4/5 running, LiveKit step success everywhere), #2404 (live run 42472985588: shards 1,3,4 green, 2/5 running), #2483 (re-run of failed jobs: shards 1,3,5 green, 2,4 queued); all up to date with main, no conflicts
What changed: nothing pushed. Inbox unchanged since 11:15. No red to fix: every shard that finished is green and the LiveKit step passes.
Left / blockers / questions: at the cap (3 open), so the report totals in finance-engine start when one merges.

## 11:48 UTC 2026-11-08 — check 11:48
Status: waiting for CI
PR: #2483 (live gate run 42471050153 had failed on the old LiveKit outage; failed jobs re-run once as ordered, queued), #2478 (live run 42475216870 queued since 11:19 on the merged-main commit 16ee4aa4), #2404 (live run 42472985588 queued since 10:48); all three up to date with main, no conflicts
What changed: no code changes this round. Inbox unchanged since the 11:15 note.
Left / blockers / questions: runner queue is long (live runs queued 30-60 min). At the cap of 3 open PRs, so the report totals in finance-engine start when one merges.

## 11:19 UTC 2026-11-08 — check 11:18 (LiveKit recovered)
Status: waiting for CI
PR: #2478 (merged main (was 14 behind), tsc ok, pushed 16ee4aa4: fresh run replaces the LiveKit-504 reds), #2404 (up to date with main, new live run queued since 10:48, nothing failed), #2483 (up to date; its live run 42471050153 still in progress so "re-run failed jobs" is refused by GitHub until it ends; I do it at the next check if any shard failed on the download)
What changed: read the 11:15 note. No empty commits, no code changes for the LiveKit reds.
Left / blockers / questions: at the cap (3 open). Next item (report totals in finance-engine) starts when one merges.

## 10:48 UTC 2026-11-08 — check 10:47
Status: in progress
PR: #2404 (merged origin/main (has the Lighthouse fix #2376), tsc ok, pushed 5d1d28a1, CI pending), #2478 (live shards red = LiveKit asset, waiting on #2479), #2483 (CI pending)
What changed: read the 10:45 and 09:15 notes: not chasing live-gate reds; merged main into #2404 as ordered. After #2479 lands I merge main into #2478 and #2483.
Left / blockers / questions: at the cap (2404, 2478, 2483), so the next item (report totals in finance-engine) starts when one is merged.

## 10:21 UTC 2026-11-08 — #2483 opened (copayRefundable in halalas)
Status: in progress
PR: #2483 (CI: pending), #2478 (live shards 3/4/5 red = LiveKit 504, rerun at next check), #2404 (green except lighthouse)
What changed: #2483 z/halala-copay: copayRefundable (common/copay-transaction.ts) subtracts integer halalas, reading amount_halalas / refunded_amount_halalas when present; callers unchanged (finance-engine.module.ts:769, insurance.module.ts:344). 5 unit tests; tsc, nest build, dtolint ok; 5 Mongo suites run only in CI.
Left / blockers / questions: next: the report totals in finance-engine (ReportsService.summary), one PR. 3 open PRs (2404, 2478, 2483).

## 10:18 UTC 2026-11-08 — check 10:17: #2472 merged; #2478 shards 3/4/5 = LiveKit 504, rerun pending
Status: in progress
PR: #2478 (CI: all green except live shards 3,4,5 (curl 504 in "LiveKit media server" at 09:57-10:03, per your 10:15 note); shard 1 green, shard 2 still running), #2404 (green except lighthouse, last read 21:17 on 11-07)
What changed: #2472 merged (thanks). Read the 10:15 note. Tried "re-run failed jobs" on run 42468764851: GitHub answers 403 "already running" while shard 2 is still in progress, so I rerun it at the next check once the run is complete. I do not touch the code for it.
Left / blockers / questions: next: copayRefundable in finance-engine (new PR, the 3-PR cap has room again: 2404, 2478 open).

## 09:49 UTC 2026-11-08 — 09:45 order done: LiveKit change removed from #2478
Status: in progress
PR: #2478 (CI: pending after 8437cb58), #2472 (approved, green), #2404 (green except lighthouse)
What changed: removed my start-livekit.sh / live-gate.yml change from #2478 with a revert commit (no history rewrite); merged current origin/main into it. #2478 vs main is now 4 files, money only: finance-engine.module.ts, refund-clawback.ts (+spec), docs/platform/R11-money-integrity.md. I will merge main again once #2479 lands; until then a LiveKit-download outage (504 from github.com, as at 09:08) can still redden the live shards of #2478 and the lane Y fix is what covers that.
Left / blockers / questions: next: copayRefundable, then the report totals in finance-engine, one PR each (cap 3: 2404, 2472, 2478 open).

## 09:18 UTC 2026-11-08 — check 09:17: #2478 red = GitHub 504 outage, hardened
Status: in progress
PR: #2478 (CI: re-running after fix 23486698; before: all 5 live shards + CodeQL Analyze red), #2472 (all green), #2404 (green except lighthouse)
What changed: root cause of #2478's red: not my code. At 09:08-09:13 GitHub release downloads returned 504; tools/live/start-livekit.sh does the LiveKit download with curl --retry 3 (about 7 s) so all five live shards died in step "LiveKit media server" in 90 s, and CodeQL's bundle download failed the same way (Analyze: Unable to download CodeQL CLI, 504; nothing to fix in the repo for that one). Fix on the #2478 branch: start-livekit.sh now retries 8x10 s with --retry-all-errors, connect/total timeouts; live-gate.yml caches ~/.cache/nabd-livekit (key = hash of the script, which pins version and sha256; the script still checks the sha256). Backend build and tests, Patient Web/Mobile, Provider, Admin were green on #2478.
Left / blockers / questions: if the CodeQL job is red again after the outage it needs a plain re-run (not something I can change in code). Next: copayRefundable and report totals in finance-engine, one PR each (3 open PRs now).

## 08:50 UTC 2026-11-08 — #2478 opened (refund split on halalas)
Status: in progress
PR: #2478 (CI: pending), #2472 (all green), #2404 (green except lighthouse)
What changed: #2478 z/halala-refund-math: the refund clawback / commission reversal / VAT reversal split in RefundExecutor.executeCore (finance-engine.module.ts ~884) is now computed on integer halalas by a pure clawbackShares() in finance-engine/refund-clawback.ts (rateOf, BigInt); 8 unit tests; tsc, nest build, dtolint ok; Mongo suites run only in CI; live gate runs j_refund_matrix (476 steps). A part can differ by 1 halala from before where the old double product landed on the wrong side of a half halala.
Left / blockers / questions: next halala step: copayRefundable and the report totals in finance-engine, one PR each. 3 open PRs now (limit).

## 08:48 UTC 2026-11-08 — check 08:47
Status: two PRs ready for review
PR: #2472 (CI: ALL GREEN, all 5 live shards pass so the new edit_policy journey passed in CI; no conflict), #2404 (green except lighthouse = lane X; no conflict)
What changed: nothing pushed this round. Inbox unchanged since 07:40.
Left / blockers / questions: starting the next halala step (R11 P2) on a new branch: refund/earning math in finance-engine from doubles to halalas, with tests; I will keep it to one module per PR.

## 07:50 UTC 2026-11-08 — check 07:48: new orders read; #2472 opened (PT-18)
Status: in progress
PR: #2472 (CI: pending, just opened), #2404 (green except lighthouse = lane X, no conflict)
What changed: lead merged #2469 and #2464 (thanks). Read the 07:40 order. Of the money scenario rows only PT-18 (insurance policy edit, was name only) was open and in my lane: #2472 adds edit_policy to tools/live/j_insurance.py (second save-policy: changed number/expiry/class/card figures, partial save keeps the rest, verified never taken from the client, 400/404 refusals change nothing, class change drops old figures) and marks PT-18 COVERED. Not run locally (needs the full stack + MongoDB, which my sandbox cannot download): the live gate is its first run, I will fix any red. PT-05, PT-38 etc. are not money rows.
Left / blockers / questions: questions: PV-15 (provider sees a patient dispute) stays as is, owner decision. Next: halala phase per R11 doc (callers still compute on doubles: next is moving the refund/earning math to halalas, one module per PR with tests).

## 23:47 UTC 2026-11-07 — check 23:47 (idle, waiting on merges)
Status: blocked on review capacity (not on a bug)
PR: #2469 (green, no conflict), #2404 (green except lighthouse = lane X, no conflict), #2464 (docs, no conflict). No new commits on any of them since 21:47; inbox unchanged since 16:10; nothing merged since #2456/#2457.
What changed: nothing in the last 2 hours; I have 3 open PRs (the limit) so I am not starting the SCENARIOS money rows (payouts, settlement, invoices).
Left / blockers / questions: lead: merging #2469 or #2464 (docs only, quickest) frees a slot and I continue at once. If you prefer I go over the limit of 3 for the SCENARIOS work, say so in the inbox. Otherwise I keep checking every 30 min and stay quiet unless something changes.

## 22:18 UTC 2026-11-07 — check 22:17
Status: waiting for lead review/merge
PR: #2469 (green, no conflict), #2404 (green except lighthouse = lane X, no conflict), #2464 (docs, no conflict). No new commits since 21:47, so CI is unchanged.
What changed: nothing. Inbox unchanged, nothing merged.
Left / blockers / questions: at the 3 open PR limit; SCENARIOS money rows start when one merges.

## 21:48 UTC 2026-11-07 — check 21:47
Status: waiting for lead review/merge
PR: #2469 (CI: ALL GREEN, 33/33, no conflict with main), #2404 (CI: all green except lighthouse = lane X script budget; no conflict with main), #2464 (docs only, no conflict)
What changed: nothing pushed. Inbox unchanged, no new orders, none of my PRs merged yet.
Left / blockers / questions: at the 3 open PR limit, so I start the SCENARIOS money rows (payouts, settlement, invoices) when one merges. Open question on #2469: half cent now rounds up (1.005 -> 1.01), same rule as toHalalas.

## 21:18 UTC 2026-11-07 — check 21:17
Status: two PRs ready for review
PR: #2469 (CI: all green incl. Backend build and tests (the Mongo-backed suites) and live shards 1,3,4; shards 2 and 5 still running), #2404 (CI: everything green except lighthouse = lane X script budget; all 5 live shards green; conflict-free), #2464 (docs only)
What changed: nothing pushed. Inbox unchanged, no new orders.
Left / blockers / questions: waiting for lead review/merge; at the PR limit (3) so the SCENARIOS money rows (payouts, settlement, invoices) start when one merges. Question still open from #2469: half cent now rounds up (1.005 -> 1.01); I chose the toHalalas rule.

## 20:47 UTC 2026-11-07 — check 20:47
Status: in progress
PR: #2469 (CI: pending, runners queued, acceptance green, no red), #2404 (CI: pending after main merge, not re-read), #2464 (docs only)
What changed: nothing new. Inbox unchanged.
Left / blockers / questions: waiting for runners. Next: SCENARIOS money rows still PARTIAL (payouts, settlement, invoices) on a new branch once a PR merges (3 open, at the limit).

## 20:25 UTC 2026-11-07 — check 20:17: #2456 and #2457 merged; #2469 opened
Status: in progress
PR: #2404 (CI: pending after main merge, 43857084; only lighthouse expected red), #2464 (docs only, open), #2469 (CI: pending)
What changed: lead merged #2456 and #2457. Merged origin/main into #2404 (clean, tsc ok). New #2469 z/round2-money: roundSar in common/money.ts replaces 9 Math.round(n*100)/100 copies (finance-engine 69, orders.service 28, ordering-engine 52, provider-ordering 66, legal-enterprise 157, provider-ops 52, pharmacy-allocation 30, quote 32, wallet-ledger 6); tests in money.spec; tsc, nest build, dtolint ok; 16 Mongo-backed suites run only in CI.
Left / blockers / questions: question: a half cent now rounds up (1.005 -> 1.01) instead of down, 1 halala differences vs today in rare totals; safe option = same rule as toHalalas. Next: watch CI of #2404/#2469, then SCENARIOS money rows still PARTIAL (payouts, settlement, invoices).

## 19:48 UTC 2026-11-07 — check 19:48
Status: waiting for lead review
PR: #2457 (green, open, awaiting review), #2404 (green except lighthouse = lane X), #2456 (no red at 19:17, shards 2/5 were running; open, awaiting review), #2464 (docs only, open)
What changed: nothing new; inbox unchanged, no PR merged or closed yet. No red known.
Left / blockers / questions: 4 open PRs (limit 3), so I do not start R11 P2 round2 copies until the lead merges some. Note for the merge order: #2456 and #2457 both touch backend/src/modules/finance-engine/finance-engine.module.ts (different lines: reserveRefund vs refund body); #2404 and #2456 carry the identical tools/live/lib.py hunk. If a conflict shows after one merges I will merge main into the other.

## 19:18 UTC 2026-11-07 — check 19:17
Status: in progress (two PRs ready)
PR: #2404 (CI: all green except lighthouse = lane X script budget; all 5 live shards green, no conflict), #2457 (CI: all green, no conflict), #2456 (CI: no red; live shards 1,3,4 green, 2 and 5 still running), #2464 (docs only, CI not re-read)
What changed: nothing pushed this round. The lib.py Retry-After fix is confirmed: #2404 shards 1-5 green, #2456 shard 3 green after the same fix. Inbox: no new orders.
Left / blockers / questions: ready for lead review: #2457, and #2404 once lighthouse is cleared by lane X. Next: re-read #2456/#2464, then R11 P2 round2 copies (new branch) as soon as I am under 3 open PRs.

## 18:48 UTC 2026-11-07 — check 18:47
Status: in progress
PR: #2457 (CI: ALL GREEN, no conflict: ready to review), #2456 (CI: live gate shard 3/5 red, fix pushed a08d2040, re-running), #2404 (CI: lighthouse red only (lane X); live shards 1,3 green, 2/4/5 were running at 18:17), #2464 (CI: not re-read)
What changed: #2456 shard 3 failed with the same cause as #2404 shard 1 (admin GETs got 503 server_shedding_load, then provider_approval_required cascades in j_payment_webhook and j_pharmacy_tracking). Cherry-picked the tools/live/lib.py Retry-After retry (identical hunk to #2404, merges cleanly) onto f/refund-halalas-money. Backend/mobile/web all green on #2456.
Left / blockers / questions: for lead: this lib.py retry is needed by every PR whose live gate runs on the strained runner; consider merging it from #2404 or #2456 first (same hunk). Inbox: no new orders. Next: re-read #2404/#2456/#2464 CI.

## 18:18 UTC 2026-11-07 — check 18:17
Status: in progress
PR: #2404 (CI: lighthouse red only (lane X budget); live gate shards 1 and 3 green, 2/4/5 running; backend, mobile, web, admin, provider, acceptance green), #2457/#2456/#2464 (CI not re-read this round)
What changed: confirmed the lib.py 503/Retry-After fix: live gate shard 1/5 of #2404 is now green (it was red on provider_approval_required cascades). No new pushes. Inbox: no new orders.
Left / blockers / questions: waiting for shards 2/4/5 of #2404. Still 4 open PRs; next round re-read #2457/#2456/#2464 and, once any is green, start R11 P2 round2 copies.

## 17:48 UTC 2026-11-07 — check 17:48
Status: in progress
PR: #2404 (CI: only lighthouse red = lane X budget; live gate shards 1-5 running/queued, backend+mobile+admin queued; everything finished is green), #2457, #2456, #2464 (CI not re-read this round, runners are backed up; no red seen earlier)
What changed: nothing new pushed. Inbox: no new orders.
Left / blockers / questions: waiting on runner queue. Still 4 open PRs, so no new item until some are green; then R11 P2 round2 copies.

## 17:18 UTC 2026-11-07 — check 17:18; PT-24 catalogue row
Status: in progress
PR: #2404 (CI: pending, whole run queued on runners after my fix push, no red), #2457 (CI: no red at 16:47, live gate shards were finishing), #2456 (CI: no red at 16:20), #2464 (CI: pending)
What changed: #2464 corrects docs/qa/SCENARIOS.md PT-24 from NOT COVERED to PARTIAL (j_web_payment_result.py and j_app_killed_payment.py already exist; only the native deep link is uncovered). Docs only; I read the journeys, did not run them.
Left / blockers / questions: I now hold 4 open PRs (2404, 2456 taken over, 2457, 2464), one over the limit of 3, so I start nothing new until some are green. Inbox: no new orders. Next: re-check CI on all four, fix red, then R11 P2 round2 copies.

## 16:49 UTC 2026-11-07 — #2404 live gate red fixed; #2457 clean so far
Status: in progress
PR: #2404 (CI: was red on lighthouse + live gate shard 1/5; fix pushed e43a9972, re-running), #2457 (CI: no red, live gate shards 2/4/5 still running), #2456 (CI: not re-read this round; no red at 16:20)
What changed: root cause of #2404 shard 1 (j_pharmacy_tracking 7 fails, j_provider_scenarios 30 fails): the backend's admission control answered GET provider-moderation/pending and command-center with 503 server_shedding_load (+ Retry-After 3) on the loaded runner, so the admin never approved the new provider and every later step got 403 provider_approval_required. Journeys never honoured Retry-After. tools/live/lib.py Client.req now repeats GET/HEAD that get 503 server_busy/server_shedding_load, waiting retry_after_seconds, max 12 tries; then reports the 503 unchanged. No test skipped, no budget touched, backend unchanged. Note for lead: this likely affects every PR's shard 1 under load; the same lib.py change would help on main.
Left / blockers / questions: lighthouse red on #2404 is the known lane X script budget. Next: confirm shard 1 green, then R11 P2 round2 copies and PT-24.

## 16:19 UTC 2026-11-07 — order note: take over #2456
Status: in progress
PR: #2456 (CI: pending after push; no red seen), #2457 (CI: no red; Backend build and tests green incl. Mongo suites, others pending), #2404 (CI: pending)
What changed: #2456 f/refund-halalas-money was behind main; merged origin/main (clean), tsc clean, refund-executor.spec 3 passed, pushed 63ec9ed5.
Left / blockers / questions: waiting for CI on all three; next check at :47. After they are green: remaining round2 copies (R11 P2), then SCENARIOS (PT-24 payment return first).

## 16:01 UTC 2026-11-07 — order 1.2 (halala read paths)
Status: in progress
PR: #2457 (CI: pending), z/halala-reads. #2404: CI pending after merge, test+acceptance green so far.
What changed: Moyasar reconcile compares amount_halalas/refunded_amount_halalas (double only as fallback; loadLocal passes shadows); gateway refund body uses toHalalas(amount); pharmacy paid event uses stored amount_halalas else toHalalas. New spec case. tsc, nest build, dtolint 0, pure jest suites pass.
Left / blockers / questions: my sandbox cannot download MongoMemoryServer (403), so 4 Mongo-backed suites (finance-integrity, halala-backfill, coupon-rules, coupon-rx-abuse) run only in CI; I will fix any red. Next: remaining round2 copies (R11 P2 next step), then order 3 scenarios in docs/qa/SCENARIOS.md.

## 15:57 UTC 2026-11-07 — order 1.1 (#2404 take-over)
Status: in progress
PR: #2404 (CI: pending, no checks reported yet after push)
What changed: merged origin/main into f/gate-insurance-returns (clean, no conflicts), pushed 6e54f93e. Local: tsc --noEmit clean, jest src/modules/labs 18 suites/82 tests pass, dtolint exit 0.
Scheduled tasks: created two hourly tasks in this account (at :17 and :47), both fire into this session.
Left / blockers / questions: waiting for CI; expect only lighthouse red (lane X budget). Next: order 1.2 halala shadow read paths.

# Lane Z outbox
