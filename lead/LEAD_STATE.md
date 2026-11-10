# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Lead 3 run 2026-11-10 02:10 UTC
- Merged #2575. CI: #2576 (late invoice after refund), #2577 (policy stamp). Owner Qs open: no-show refund policy (cap/hold/keep), run 112b push.
## Lead 3 run 2026-11-10 01:40 UTC
- Merged #2573 (PT-54 UI), #2574. Z: fix late-invoice-after-refund, then per-service policy version/hash. OWNER Q: no-show auto-refund cap / hold. Run 112b waits for owner.
## Lead 3 run 2026-11-10 01:10 UTC
- Merged #2571, #2572. CI: #2573 (X PT-54 UI), #2574 (V G2 nursing price). Run 112b waits for owner.
## Lead 3 run 2026-11-10 00:40 UTC
- Merged #2570 (PT-54 backend). CI: #2571/#2572 (Z), #2573 (X PT-54 UI). Run 112b waits for owner.
## Lead 3 run 2026-11-10 00:15 UTC
- Merged #2566, #2569 (dtolint gate + CodeQL), #2567 (gapless invoices; small settle race follow-up to Z), #2568 (scan state UI). #2570 CI. Run 112b waits for owner push.
## Lead 3 run 2026-11-09 23:40 UTC
- No change: #2566-#2569 each 1 check pending. Run 112b waits for owner.
## Lead 3 run 2026-11-09 23:10 UTC
- Nothing green. #2569 (V dtolint) red CodeQL NoSQL step-up.guard.ts:98 → V. PT-54 = hide/unhide visit from history (V backend, X UI). Run 112b waits for owner.
## Lead 3 run 2026-11-09 22:40 UTC
- #2566 OK but conflict (Z); #2568 conflict (X); #2567 CI. V new queue: dtolint gate fix, PT-54, #2336 triage. Run 112b still waits for owner push.
## Lead 3 run 2026-11-09 22:15 UTC
- Run 111 DONE: LIVE main@a063da06; clamav skipped. Merged #2565 (invoice unique), #2564, #2563. Run 112b @1e46d6c2 (read-only + 91b dry run) → owner push. X: 'being checked' UI audit before defer. Z: invoice number gap question.
## Lead 3 run 2026-11-09 21:40 UTC
- Run 111 pushed as deploy-only main@a063da06 (server-ops 42701390983 waiting approval). V to rebuild run 112 (96k/96m/96c + 91b dry run) on 6453740b. Merged #2560 (web tick).
## Lead 3 run 2026-11-09 21:10 UTC
- Merged #2562 (docs). In CI: #2565 (Z invoices), #2564/#2563 (V), #2560 (X web tick). Runs 111/112 not pushed yet by owner.
## Lead 3 run 2026-11-09 20:45 UTC
- Merged #2550 (refund tick backend, optional default) then #2561 (app tick). Run 111 (26bafaf9) + run 112 (fc1bf90c: 91b dry run + deploy main@eff32b95) reviewed; owner asked to push 111 then 112. #2560 CI.
## Lead 3 run 2026-11-09 20:15 UTC
- Merged #2558 (ClamAV swap window), #2559, #2557. #2560 red (journey must tick) → X. Run 111 still waits for owner push; run 112 plan to V (91b dry run + deploy).
## Lead 3 run 2026-11-09 19:40 UTC
- V back (new crons). Run 111 = v/ops-run-111 @26bafaf9 read-only (96k/96m/96c) reviewed OK → owner push. #2558 ClamAV swap window CI. Merged #2554. #2550 reworked (default optional) CI.
## Lead 3 run 2026-11-09 19:10 UTC
- #2550 green but HELD: default `required` would 400 every booking from current web + installed apps → Z: default optional, flip by config after clients + app min-version. X: tick UI now. #2554 CI. V silent since 17:05 outbox (last commit 15:57): owner told.
## Lead 3 run 2026-11-09 18:40 UTC
- Merged #2553 (PT-03 app). #2554 conflict again (X). #2550 CI. V silent since 15:57 (2h45m): owner told at next wake if still silent.
## Lead 3 run 2026-11-09 18:10 UTC
- Nothing green. #2550 conflict → Z. #2553/#2554 rebased, CI. V silent since 15:57 (clamav order 17:40 pending); tell owner if >3 h.
## Lead 3 run 2026-11-09 17:40 UTC
- Run 110 DONE: LIVE main@5227a794, health ok; ClamAV skipped again (uploads refused) → V first item. Merged #2552. #2553/#2554 conflicts (X). #2550 red 3rd time (nursing specs) → Z.
## Lead 3 run 2026-11-09 17:15 UTC
- Run 110 pushed (deploy-only, main@5227a794), server-ops 42661237311 running. Merged #2551 (no-show dispute, race fixed), #2546 (doctor medical report UI). V: 96k+96m as run 111.
## Lead 3 run 2026-11-09 16:40 UTC
- No change: 8 PRs in CI, none green. Run 110 (454074c4) still waits for the owner's push.
## Lead 3 run 2026-11-09 16:15 UTC
- Run 110 = v/ops-run-110 @454074c4 (96k+96m read-only, deploy main@9269ee61, 96j-ledger, cf purge) reviewed OK; owner asked to push. #2552 conflict (X). #2551 race fix pushed (CI). #2550 still red.
## Lead 3 run 2026-11-09 15:45 UTC
- Merged #2549. #2551 green but held: decide() claws back before the CAS update (double clawback race) → Z fix. #2546 (V) still red since 14:15; run 110 not prepared by V yet.
## Lead 3 run 2026-11-09 15:15 UTC
- Merged #2544 (app bundle -7.1 MB, budget lowered), #2543 (medical report backend), #2547 (admin refund card). #2550 red: old specs need refund_policy_accepted → Z. Waiting V run 110 sha.
## Lead 3 run 2026-11-09 14:45 UTC
- Merged #2545 (96k read-only), #2548 (refund table + provider no-show), #2537. V to prepare run 110 (96k before deploy + clamd status + deploy main tip); owner pushes. Z follow-up: no-show dispute/abuse guard.
## Lead 3 run 2026-11-09 14:15 UTC
- Nothing green; 9 PRs in CI. #2546 (V) red on tokens + provider tests → V fix order. Live main@58a1bb6e.
## Lead 3 run 2026-11-09 13:45 UTC
- Nothing green. #2543 red: admin medical-reports list 404 on live gate → Z fix order. Owner (via old lead): no wallet; late cancel = 50% or one free reschedule.
## 2026-11-09 old lead — OWNER DECISION: NO WALLET (replaces "100% wallet credit")
The wallet stays removed; do not build a credit/balance system. Late cancellation (< 2 h before) gives the patient a choice:
(a) 50% refund to the original card, or
(b) ONE free reschedule of the same booking (same provider, same service, no new payment) within 14 days. Rescheduled visit then cancelled < 2 h or no-show = 0%. If the provider has no free slot in those 14 days or cancels the rescheduled visit = 100% refund to the card.
Unchanged: >= 2 h before = 100% card refund; patient no-show = 0%; provider cancels/no-show = 100% card refund at once; policy shown before payment with "I agree". Six languages.
Until (b) ships, (a) is the only option (already live). Z backend, X patient (web+app), V admin refund-policy page shows this table.

## Lead 3 run 2026-11-09 13:25 UTC
- Run 109 DONE main@58a1bb6e health ok; 91c applied (monitor/watchdog installed), 98q ok, halala clean except 8 wallets + 20 orders missing shadows (clean). ClamAV SKIPPED_LOW_MEMORY → uploads refused: told V. Mongo 32 starts/48 h, V on it (#2545).
- Merged #2542. #2537 conflict (X). Z answered: refund table + agree tick GO; wallet credit waits for owner. Lead 3 follows lead/OWNER_DECISIONS.md (Medical report, not sick leave). Lanes now X, Z, V (old lead runs V's queue).
## Old lead 2026-11-09 13:30 UTC — LANES CHANGED
- Lanes Y and W STOPPED (account B out of credit). New lane V (account A) takes over both: mailbox/V/inbox.md has the full queue. Send Y/W orders to V from now on. W #2541 merged by old lead. #2535 superseded (V closes it).

## 2026-11-09 old lead — OWNER DECISIONS (refund + sick-leave document), binding
REFUND (owner approved; old lead's additions approved): cancel >= 2 h before = 100%; < 2 h = 50% money OR 100% wallet credit (patient chooses); patient no-show = 0%; provider cancels or no-show = 100% immediately. The policy text is shown before payment and the patient ticks "I agree" (KSA e-commerce law: terms stated before contract). Six languages.
SICK LEAVE → renamed. Never call our document "إجازة مرضية / sick leave" (KSA: official sick leave only via Seha; unofficial issuing is an offence). Our document = "تقرير طبي / Medical report" stating the recommended rest period (from/to, days).
- Patient can request it at booking (tick/reason); doctor can issue with or without a request, sets the period, diagnosis text optional (patient privacy).
- Document like the invoice: platform name + logo, doctor name, specialty, licence number (SCFHS), facility, date, period, QR to our verify page, unique doc number; app/web view + PDF.
- Seha link: after issuing, the doctor sees a notice "if you granted rest days, register the sick leave on Seha and enter its number here". Optional field (not blocking) for the Seha sick-leave number; format-validated; editable by the issuing doctor only; audit-logged.
- Until the number is added the document shows "Seha registration: pending"; once added it shows "Registered on Seha: <number>" + "verify on Seha" text, the patient gets a notification, and the PDF regenerates with it.
- Reminders to the doctor if a rest period was given and no number after 24 h and 72 h; admin list of reports without a Seha number after 3 days.
- We do NOT verify the number with Seha (no API); the employer verifies on Seha. Footer: "Official sick leave is issued via Seha".
Owner: Z backend first, then W (doctor) and X (patient).

## Role
