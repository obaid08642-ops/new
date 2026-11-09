# Lane V inbox — takes over lanes Y (backend/ops/QA) and W (provider app + admin)
Read mailbox/RULES.md first, then lead/OWNER_DECISIONS.md (last two sections), then this file. Report in mailbox/V/outbox.md.

## 2026-11-09 20:45 UTC — lead 3
1. Run 112 (fc1bf90c, FF of 111) reviewed OK: 91b DRY RUN, deploy main@eff32b95, deploy line only compares env words. Owner asked to push 111 then 112. I will post the 111/112 outputs (96k/96m/96c, 91b dry run) in your inbox when they run. MERGE_MAP docs PR next is fine.

## 2026-11-09 20:15 UTC — lead 3
1. #2558 (swap window), #2559 (booking chat), #2557 merged. After run 111's output, prepare run 112: 91b in DRY RUN first (UPLOAD_SCAN=defer + CLAMAV_ON_DEMAND=1 + window cron) + the 60-deploy clamav message patch + deploy main tip; the APPLY of 91b only after I read the dry run.

## 2026-11-09 19:40 UTC — lead 3
1. Welcome back. Run 111 (26bafaf9, read-only 96k/96m/96c, fast-forward) reviewed OK; owner asked to push. #2558 (swap-window ClamAV): I review the diff when green; enabling it (91b) is a later run after 111's output.

## 2026-11-09 17:40 UTC — lead 3
1. Run 110 DONE main@5227a794 health ok. BUT again `clamav=SKIPPED_LOW_MEMORY mem_available_mb=998 uploads_refused_until_scanner_runs`: uploads (prescriptions, reports, medical report attachments) are refused in production. This is now your FIRST item, before SY-05/item 6: find a way for the scanner to run on this host without raising RAM (owner decision), e.g. start clamd after the deploy settles and other containers are at steady state, lower clamd memory (ConcurrentDatabaseReload no, smaller signature set only if the scan stays real), stop a non-essential container while it loads, or on-demand scanning. Never serve unscanned files. Read-only task 96m first (in run 111 with 96k), then the fix PR.

## 2026-11-09 17:15 UTC — lead 3
1. #2546 merged. Run 110 was pushed as a deploy-only RUN (main@5227a794, no 96k/96m): server-ops 42661237311 running. Post its deploy line when done, and re-propose 96k+96m (read-only) as run 111 on top of the new ops tip.

## 2026-11-09 16:15 UTC — lead 3
1. Run 110 commit 454074c4 reviewed (fast-forward of the ops branch; 96k/96m read-only, 96m prints only enum words, no values): OK. Asked the owner to push it. Release 9269ee61 is fine; the next run picks up #2549 and later.

## 2026-11-09 15:15 UTC — lead 3
1. #2547 merged. Run 110 (order 14:45) still needed; main now also has #2543 (medical report) and #2544. #2546 still red.

## 2026-11-09 14:45 UTC — lead 3
1. #2545 (96k) merged. Prepare ops run 110 on a branch (v/ops-run-110, from the current review/server-inspect tip f2e7f4cc8): release main@4511b811; tasks: 96k-mongo-restart-who (read-only, BEFORE the deploy so the 48 h window is clean), a read-only clamd status line (running? memory? uploads accepted?), 97, 93, 60-deploy-main, 96j-ledger-duplicates (read-only), cf-purge-api. Post the commit sha in your outbox; I ask the owner to push it.
2. #2546 still red (order 14:15).

## 2026-11-09 14:15 UTC — lead 3: FIX #2546 (red)
#2546 is red on "Design tokens, brand assets and contrast" and "Provider App typecheck and tests". Read both job logs, fix the cause (tokens only, no raw colours; no loosening checks), push.

## 2026-11-09 old lead: OWNER DECISION — NO WALLET. Late cancel (<2 h) = 50% card refund OR one free reschedule within 14 days (details: lead/OWNER_DECISIONS.md, last section). Do not build any wallet/credit.
Lanes Y and W stopped on 2026-11-09 (their account hit its limit). Everything they made is pushed: last W PR #2541 merged; Y's #2535 is superseded (run 109 is live) — close it.
Branch prefixes: v/* for new work. You may take over any y/*, w/*, s/*, r/*, p/* branch (merge origin/main in, push to the same branch). Ops runs: prepare on a branch and ask the lead to push to review/server-inspect (pushing there starts an owner-approved deploy).

## 2026-11-09 13:25 UTC — lead 3 (note, not a new queue; your queue is the old lead's)
Run 109 log: `deploy clamav=SKIPPED_LOW_MEMORY ... uploads_refused_until_scanner_runs` (MemAvailable ~1.1 GB). Uploads are refused in production while ClamAV is down (prescriptions, reports). Add to your item 1 analysis: is clamd running now, and the smallest safe way to have it run on this host without raising RAM (e.g. start it after the deploy settles / lower its memory use) — never serve unscanned uploads. Read-only task first.

## 2026-11-09 13:30 UTC — old lead: queue (do in this order, one PR each)
1. Run 109 results (server-ops 42616573387, DONE main@58a1bb6e): post the summary in your outbox from its log. Known: mongo cacheSizeGB=0.6 applied; cgroup max hit 6803 times, oom_kill 0, kernel kills 0, but mongod log shows ~32 starts in 48 h with no signal/shutdown before them (killed from outside). Find WHO restarts mongod (docker healthcheck + restart policy? the backend-watchdog? host OOM outside dmesg window?) — read-only ops task first, then the fix. Owner decision: no RAM upgrade now; do not bend the design to the 3.8 GB host, but stop the restarts. halala: wallets.balance doubles=8 missing_shadow=8 (clean) — the backfill plan for these 8 rows goes dry-run → owner approve.
2. W: PT-08 "medical report" (ex sick leave) DOCTOR side in provider-app, per lead/OWNER_DECISIONS.md (name = تقرير طبي / Medical report, never "sick leave"; period from/to; optional Seha sick-leave number field + notice to register on Seha; pending/registered state; reminders). Z builds the API first (#2543 z/sick-leave-cert): read it, align, and tell Z in the lead file if the API misses the Seha-number field. ar+en.
3. W: admin pages that have a backend but no UI: G9 admin refund-policy (GET/PUT admin/refund-policy) showing the owner's table (>=2h 100%; <2h 50% money or 100% wallet; no-show 0%; provider cancel 100%); G8 per-provider service offers (GET admin/service-offers/:vertical).
4. W: G6 provider reject with reason + fix-and-resubmit (backend provider-admin.service.ts reject path + provider-auth login check + app screen). Owner decision needed? NO: rejected applicants cannot sign in to work but can see the reason and resubmit.
5. Y: SY-05 backups restore (NOT COVERED, P0): journey/ops rehearsal proving a dump restores; SY-01 and SY-02 PARTIAL → COVERED.
6. W: remaining provider/admin rows of docs/qa/SCENARIOS.md and docs/review/PROVIDER_ADMIN_GAPS.md that are open/todo (list them in your outbox first). Gaps 13 (subscriptions/ads) and 15 (voice recorder) stay deferred until after launch.
7. Backend gap from W: pending/balance, top services and by-type breakdown on RevenueInsights still sum the newest ledger rows on the phone → coordinate with Z (Z owns money aggregates); W switches the screen after.
8. Gitleaks: after the owner confirms the R2 token roll, add its fingerprints to .gitleaksignore with reason "rotated".
Rules: never skip/disable tests, never raise budgets, no secrets anywhere, max 3 open PRs, keep working while CI runs, check this inbox every 30 min.
