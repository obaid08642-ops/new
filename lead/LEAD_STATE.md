# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

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
Review and merge session PRs, prepare server deploy runs, follow worker sessions, reply to the owner in Egyptian Arabic (short).
Tools: `lead/oncepass.sh` (merges every PR in `lead/approved.txt` whose latest checks are green, lighthouse aside) — run it from a checkout of this branch with `gh` available; add a PR number to approved.txt only after reviewing its diff. Never approve/merge your own PRs.

## Owner rules (binding)
Egyptian Arabic to the owner; never skip/disable tests or raise budgets; no secrets anywhere; server changes only via ops runs the owner approves (branch `review/server-inspect`, file `tools/ops/RUN`, `tools/ops/tasks/60-deploy-main.sh` OPS_RELEASE_SHA default = main SHA; push, then give the owner the "server-ops" run link); production checks GET only; DB changes only dry-run → owner approve → backup.
TOKEN BUDGET (owner, 2026-11-07): keep context small. Read only this file, the two outboxes and `gh` summaries. No long logs; grep/tail only.

## Old lead 2026-11-09 ~12:45 UTC
- Runs 109+110 pushed as ONE run 109 on review/server-inspect (server-ops 42616573387, waiting for owner): main tip 58a1bb6e + 96j-mongo-cache-check, 96i, 96j-ledger-duplicates (after deploy), 91c APPLY=yes, 98q. y/ops-run-110 is superseded. Y: next ops run must set 91c back to APPLY="" (dry run).

## Lead 3 run 2026-11-09 12:45 UTC
- Run 109 pushed by owner 12:23 (main@58a1bb6e + 96j-ledger + 91c APPLY), server-ops 42616573387 running. X bundle +6.1 KB over budget: no raise, X to cut real waste first. Pending CI: #2543 (Z sick-leave backend), #2542/#2537 (X), #2541 (W revenue screen).
## Lead 3 run 2026-11-09 12:30 UTC — OWNER DECISIONS
- RAM: no upgrade now; raise at launch; build as if sized for launch. Y: launch RAM target in R7 doc.
- PT-08 sick leave: both sides (patient request at booking; doctor issues with or without request); stamped certificate like the invoice, app/web view + PDF, QR verify page. Z backend first, then W (doctor) and X (patient). Legal note to owner: KSA = Seha/Sehhaty only; Seha link later.
- Still open from owner: refund default table (2h/50%/0%); runs 109/110 push.
## Lead 3 run 2026-11-09 12:10 UTC
- Merged #2538 (revenue by month), #2540 (PT-38 chat link). W ordered: RevenueInsights on /provider/stats/revenue. Z: invoices review. #2537 CI. Runs 109/110 still wait for the owner's push.
## Lead 3 run 2026-11-09 11:40 UTC
- No change: #2537/#2538/#2540 rebased, CI running. Runs 109/110 still wait for the owner's push to review/server-inspect.
## Lead 3 run 2026-11-09 11:20 UTC
- Merged #2539. Conflicts: #2537/#2540 (X; #2540 must justify 27 removed locale keys), #2538 (Z, reviewed OK). Runs 109 (31b2added) and 110 (y/ops-run-110, main 15e591f2) wait for the owner's push to review/server-inspect.
## Lead 3 run 2026-11-09 10:50 UTC
- Merged #2536 (unique earning index, self-gated). Run 109 BLOCKED: direct push to review/server-inspect denied for Y (Production Deploy); owner asked to push 31b2added or allow it. Run 110 = 96j-ledger-duplicates + main tip.
- #2539 X lighthouse TBT 260>240: X ordered to cut (no budget raise). Pending CI: #2538 (Z aggregate), #2537/#2540 (X). W idle until #2538.
## Lead 3 run 2026-11-09 10:15 UTC
- Merged #2534 (flake fix), #2533 (SY-06 sla/fraud), #2526 (PT-27). #2535 (Y run 109 PR into ops branch) red on ops-branch dep checks: not merged; Y to push RUN directly (as run 108) with main tip + 91c APPLY=yes. Pending: #2536 (Z ledger unique earning, CI). X: next patient SCENARIOS rows.
## Lead 3 run 2026-11-09 09:45 UTC
- Merged #2532 (wallet summary from providerBalance). Y ordered to prepare ops run 109 (96j + deploy main tip, incl. #2528-#2532). Pending CI: #2534 (Y flake fix), #2533 (W SY-06 sla/fraud), #2526 (X PT-27).
## Lead 3 run 2026-11-09 09:20 UTC
- LIVE main@1dfd4b83 (run 108). Merged since: #2528, #2529 (SY-06 journey), #2530 (alert-mail hysteresis, watchdog mail gate), #2531 (native gradle/pod retry). Next deploy (run 109) must carry these + 96j-mongo-cache-check.
- #2532 (Z wallet summary from providerBalance): red only on flaky password-hash.spec.ts:59 (timing, from #2497); failed job re-run; Y ordered to make it deterministic (no skip).
