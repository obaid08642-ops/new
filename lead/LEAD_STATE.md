# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Role
Review and merge session PRs, prepare server deploy runs, follow worker sessions, reply to the owner in Egyptian Arabic (short).
Tools: `lead/oncepass.sh` (merges every PR in `lead/approved.txt` whose latest checks are green, lighthouse aside) — run it from a checkout of this branch with `gh` available; add a PR number to approved.txt only after reviewing its diff. Never approve/merge your own PRs.

## Owner rules (binding)
Egyptian Arabic to the owner; never skip/disable tests or raise budgets; no secrets anywhere; server changes only via ops runs the owner approves (branch `review/server-inspect`, file `tools/ops/RUN`, `tools/ops/tasks/60-deploy-main.sh` OPS_RELEASE_SHA default = main SHA; push, then give the owner the "server-ops" run link); production checks GET only; DB changes only dry-run → owner approve → backup.
TOKEN BUDGET (owner, 2026-11-07): keep context small. Read only this file, the two outboxes and `gh` summaries. No long logs; grep/tail only.

## Old lead 2026-11-09 ~12:45 UTC
- Runs 109+110 pushed as ONE run 109 on review/server-inspect (server-ops 42616573387, waiting for owner): main tip 58a1bb6e + 96j-mongo-cache-check, 96i, 96j-ledger-duplicates (after deploy), 91c APPLY=yes, 98q. y/ops-run-110 is superseded. Y: next ops run must set 91c back to APPLY="" (dry run).

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
- #2526 (X PT-27): CI restarting; X owns.
- Z: new item ledger unique earning (dup check ops task → index → concurrency test), then period aggregate endpoint; W switches RevenueInsights after.
- Owner open: RAM upgrade; PT-08 sick-leave side; refund default table; R2 token roll (said once).
## Lead 3 run 2026-11-09 08:45 UTC
- Merged #2528 (Z: refund takeover full-refund cap fix + cumulative booking refund status; tests). Pending: #2529 (W SY-06 alerts) #2530 (Y alert-mail hysteresis) #2531 (Y native gradle retry) #2526 (X, CI restarting). LIVE main@1dfd4b83.

## Lead 3 run 2026-11-09 08:15 UTC
- Merged #2527 (PT-24 app payment-return links) #2525 (PT-29). Pending: #2526 (X, Patient Mobile red, X fixing) #2528 (Z refund review, CI). LIVE main@1dfd4b83; ~8 PRs since → run 109 (with 96j) when convenient.

## Lead 3 run 2026-11-09 07:45 UTC
- Merged #2524 (PT-03 dependants/minors: guardian consent stored, validated, owner-scoped) #2523 (PT-05 provider referral screen). Pending: #2525 #2527 (X), #2526 red (Patient Mobile build → X sees it). LIVE main@1dfd4b83.

## Lead 3 run 2026-11-09 07:15 UTC
- Merged #2522 (Y: 96j-mongo-cache-check read-only; cache already explicit 0.6 GB in mongod.conf; root cause = host RAM 3800 MB vs compose mem_limits summing 7680 MB → host-level OOM). Next ops run (109) should run `96j-mongo-cache-check` (read-only) to see kill times/kinds; decision tree in docs/platform/R7-data-tier.md. Owner: RAM upgrade.
- Pending CI: #2523 (W PT-05) #2524 (Z PT-03) #2525 #2526 #2527 (X). LIVE main@1dfd4b83.

## Lead 3 run 2026-11-09 06:45 UTC
- Pending: #2522 (Y wiredTiger cache). Orders: W (PT-05 provider referral screen), X (PT-29, PT-27, PT-24 app), Z (PT-03 guardian minors, money review). Owner decisions pending: RAM upgrade timing, PT-08 sick-leave request, default refund-request table.

## Lead 3 run 2026-11-09 06:20 UTC
- LIVE = main@1dfd4b83 (run 108 DONE 05:4x; includes #2517 broadcast fix → admin broadcasts safe again). 102: REDIS_URL/MEILI_URL not set in .env.production → compose change is a no-op.
- 96h: mongod restarts=356; host OOM killer killed mongod 11x; cgroup max hit 3755x; MemAvailable ~1 GB → Y: explicit wiredTigerCacheSizeGB + check task. Owner: RAM upgrade decision.
- Merged #2518 (referral UUID). No open lane PRs.

## Lead 3 run 2026-11-09 05:45 UTC
- LIVE = main@3964d615 (run 107 DONE 05:0x, backup ok first attempt, rollback images kept). Site 200.
- Since 3964d615 on main: #2517 (broadcast fix — admin broadcasts unsafe until deployed) #2516 #2520 #2521 → run 108 soon. Run 108 recipe: 102-data-services-move-dryrun, 96h-mongo-restarts, 96i-halala-counts, 97, 93, 60-deploy-main (+ mongo-wait patch from docs/ops/), cf-purge-api.
- Pending: #2518 (Z, re-pushed after conflict).

## Lead 3 run 2026-11-09 05:15 UTC
- Merged: #2517 (broadcast targeting bug fixed: $and instead of spread; one-user broadcast no longer goes to everyone) #2516 (96i-halala-counts read-only) #2520 (SY-01) #2521 (PT-38).
- Ops run 107 (deploy main@3964d615, by ops session 04:46, server-ops 42563641295) IN PROGRESS. It did NOT include 102 dry-run, the mongo-wait patch, or 96h. #2506 compose change IS in that release (unset env = no change). Check DONE/ROLLBACK next wake. #2517 broadcast fix is NOT in 3964d615 → admin broadcasts stay unsafe until run 108.
- Open: #2518 (Z, referral UUID) CONFLICTS with main → Z merges main.

## Lead 3 run 2026-11-09 04:45 UTC
- Merged: #2519 (PT-08/PT-09 journeys) #2515 (PT-30 location-denied + PT-54) #2513 (AD-02 reject journey). Pending: #2517 (W broadcast targeting fix, new commit) #2518 #2516 #2520 #2521.
- LIVE main@50df9f87; run 107 not prepared.

## Lead 3 run 2026-11-09 04:15 UTC
- Merged: #2514 (family_member_id through ordering broadcast, ownership-checked) #2512 (M6 unblock: renew route, safe redirect) #2511 (PT-13 journey).
- REAL BUG found by #2517 (W journey AD-07): admin broadcast to one user targeted 26 and reached others; segment broadcast missed its members → W fixes backend targeting.
- Pending: #2513 #2515 #2516 #2518 #2519 #2520 #2521. LIVE main@50df9f87; run 107 not prepared.

## Lead 3 run 2026-11-09 02:45 UTC
- All lanes idle, main green, no open PRs. New orders: Z (family_member_id in ordering broadcast, PT-05/08/09), W (PT-13/PV-07, AD-02 reject, AD-07), X (m6-blocked rows, PT-54, PT-30), Y (R11 backfill dry-run counts task, SY-01, PT-38).
- LIVE main@50df9f87; run 107 still not prepared.

## Lead 3 run 2026-11-09 02:15 UTC
- Merged #2510 (family_member_id backend: ownership-checked, not-found on foreign ids, caller stays payer) and #2509 (client, regex-validated in BFF). Owner decision 1 done. No open lane PRs.
