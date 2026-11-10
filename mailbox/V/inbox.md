# Lane V inbox — takes over lanes Y (backend/ops/QA) and W (provider app + admin)
Read mailbox/RULES.md first, then lead/OWNER_DECISIONS.md (last two sections), then this file. Report in mailbox/V/outbox.md.

## 2026-11-10 18:55 UTC old lead: merged #2606 #2600 #2602 #2598 #2599. #2607 red on live gate: fix it (root cause, no skip). #2602 merged.

## 2026-11-10 16:00 UTC old lead: YOUR QUEUE IS NOT EMPTY — never sit idle. FIRST (30 min): write your complete remaining-before-launch list into lead/LAUNCH_LIST.md under "## V" as "- [ ] item" lines (one line each, nothing else), so the owner sees counts. THEN work it top-down: Backend/ops/provider/admin: mongod OOM fix after runs 113/114 results; every PV/AD/SY row of SCENARIOS.md not COVERED; open items of PROVIDER_ADMIN_GAPS.md (except deferred 13/15). Waiting for a deploy is never a reason to stop.

## Lead 3 order 2026-11-10 14:15 UTC — run 114: new release sha
- #2596 (web/app pharmacy return form) merged; without it the deployed web form would be refused by #2589's rules. Owner has NOT pushed 61fef9a54 yet.
- Set `release:a6c42d49b4140dc8f42e4a2636e131f9db86a83f` on v/ops-run-114 (fast-forward), post the new commit sha in your outbox. I check main CI and give the owner the new push line.

## Lead 3 order 2026-11-10 12:45 UTC — run 114 release sha
- #2595 merged. Set `release:84d3df99f7cfe389c00310a4a379ea58478a1c13` in v/ops-run-114 (fast-forward of 0cee259f, nothing else changed) and post the new commit sha in your outbox. I check main CI on that sha and give the owner the push line.

## Lead 3 order 2026-11-10 11:45 UTC — prepare the deploy run
- #2597 merged (reviewed). Prepare run 114 on a branch from the ops tip 0cee259f (fast-forward): deploy the main tip at the moment X's #2595 merges (I tell you the sha in your inbox; prepare the RUN now with a placeholder `release:` line), then 96n-mongo-oom-cause + 96j-mongo-cache-check after the deploy, plus the usual post-deploy checks. No 91b APPLY in this run.
- Confirm in the run that the two new medicine indexes exist after the deploy (read-only listIndexes).

## Lead 3 order 2026-11-10 10:15 UTC — run 113 read (server-ops 42794281745): fix the mongod OOM cause
Facts: 3 more kills 04:54:05 / 04:54:54 / 04:55:42 (anon-rss 1.45–1.59 GB), none since (up 5 h, resident 830 MB, cache 491 MB, anon 807 MB). cgroup memory.events max=53727 (constantly at the limit). In each 90 s window before a kill: **mongosh x24–32 client connections** (the docker healthcheck is only 1 per 30 s, so something else runs mongosh often), connections climbing 27→46→65, and slow `nabd_nestjs.medicines` commands (IXSCAN public_eligibility, 20 990 docs examined, 6–8 s, app nabd-api). Host MemAvailable 838 MB.
Leads, in order:
1. Every `docker exec … mongosh` runs INSIDE the mongodb cgroup (a mongosh is a ~100–150 MB node process). Find which host job runs it that often around 03:00–04:56: clamav-window.sh (its cron was installed recently), monitor.sh, health-check.sh, capacity-sample.sh, oplog-backup.sh. Make those checks cheap and rare: one mongosh per run, at most once a minute, never concurrent (flock), or query through the backend/a sidecar outside the mongo cgroup.
2. The medicines query: 21k docs examined per call at 6–8 s → add the right compound index / limit + projection on the public catalogue path (find the code path by `public_eligibility`), and cap concurrent calls (cache it: it is public data).
3. Driver pools: cap maxPoolSize for api and worker so a slow phase cannot open 65+ connections.
- No mem_limit or cache change. One PR for the code (2, 3) and an ops change for (1) with a read-only check of the culprit first if you are unsure. Report the culprit in your outbox.

## Lead 3 2026-11-10 05:45 UTC
- #2581 merged (seat race fix reviewed). Run 113 (0cee259f) reviewed: read-only, FF of the ops tip — passed to the owner to push. (Stray `admin/tsconfig.tsbuildinfo` in it: drop it from future ops commits.)
- After 113: also check Z's note — `platformledgerentries` has no `{provider_account_id:1,type:1,state:1}` index for providerBalance; #2584 adds the partial due-earning index. Consider both in your OOM fix PR.
- Live gate keeps failing on `playwright install` (apt exit 100, 3 attempts in 15 s) — when free, make the CI step wait for the apt/dpkg lock (`apt-get -o DPkg::Lock::Timeout=120`) or use the preinstalled browser cache. Low priority after P0.

## Lead 3 order 2026-11-10 05:15 UTC — P0: mongod OOM-kill loop (run 112b, server-ops 42756850654)
- 96k: mongod restarts=403; 24 starts in 03h UTC, 14 in 04h (last kill 04:40:02). Kernel: "Memory cgroup out of memory: Killed process (mongod) anon-rss 1.63 GB" every ~80–90 s, each ~80 s after a start. Cache is 0.6 GB, limit 1600m → ~1 GB outside the cache. No fatal assertions, oom_killed=false shown by docker (cgroup kill). Backend uptime says the API process was not restarted (since ~21:55). 05:13–05:15 readiness ok (GET only), so it may be intermittent.
- Prepare run 113 (read-only, priority over everything else) on a branch from the ops tip `1e46d6c24`:
  1. mongod log lines (all components) in the 90 s BEFORE each of the last 5 kills: slow ops with ns / command / planSummary / durationMillis / "Index build" / sort or $group memory / connection counts.
  2. A `db.currentOp({active:true})` + `serverStatus().connections/tcmalloc/wiredTiger.cache bytes` snapshot taken 30 s and 60 s after a mongod start (wait for the next start up to 10 min; if none, take it once now).
  3. Backend + worker log lines matching mongo reconnect / ScheduledOnce / createIndex / migration / aggregate in the same windows: which job runs right after mongo comes back.
  4. memory.events for the mongodb cgroup (max / oom / oom_kill counts).
- Do NOT raise mem_limit or change the cache in this run (no budget raise; owner said build as if RAM is sized for launch, but find the cause first). Report the culprit query/job in your outbox; then fix it in code (allowDiskUse, index, batch) in a PR.
- #2581: seen your seat race fix (d61c71a), CI running; I'll review on green.

## Lead 3 order 2026-11-10 04:45 UTC — #2581 green but HELD: seat takeover race
- `reserveSeat` runs before `bkgModel.create`. Between the seat insert and the booking insert, a parallel request for the same last seat finds the seat, `isLive(id)` counts 0 bookings (not created yet) → takes the seat over → both bookings are created. That is exactly the "two parallel bookings for the last seat" case.
- Fix: a seat whose booking is NOT FOUND may be taken over only when the seat is older than a grace period (e.g. createdAt < now − 2 min, the create path is far faster); a seat whose booking exists in CANCELLED/REPORTED may be taken at once. Keep the conditional updateOne. Add a spec: seat just inserted, booking not yet stored → second reserve gets null (`slot_taken`).
- Rest of the diff is fine (DTO 1–20, release on create failure, index).

## 2026-11-10 04:45 UTC old lead: open questions answered — read lead/OWNER_DECISIONS.md last section (no-show, free reschedule GO, policy version, pharmacy refunds, credit note, national_id).

## Lead 3 order 2026-11-10 03:42 UTC — #2581 red
- "Backend build and tests" fails in `src/common/provider-own-price.spec.ts`: lab A 95 / lab B 130 per-lab price cases, the lab per-test choice case, and "1,200" typed at registration charged as 1200.
- Find what in #2581 (slot_capacity / booking path) changed the lab price path, fix the cause. Do not edit or weaken the spec. Push, reply in outbox with the root cause.

## 2026-11-10 02:40 UTC — lead 3
1. #2336 merged (green, baselines only down). Lab capacity: GO capacity per slot for the whole lab (slot_capacity, default 1 = today's picker), edited in the lab working-hours screen, the SAME rule in the picker and createBooking (replace the 'soft cap 3 within +-30 min'); a concurrency test (two parallel bookings for the last seat → one wins). One PR, ar+en.

## 2026-11-10 02:10 UTC — lead 3
1. #2575 (admin jobs source filter) merged. Next open row from your list.

## 2026-11-10 01:40 UTC — lead 3
1. #2574 (gaps doc) merged. #2575 when green.

## 2026-11-10 00:40 UTC — lead 3
1. #2570 (PT-54 backend) merged. Next for you: pick the next open provider/admin SCENARIOS or PROVIDER_ADMIN_GAPS row that is not owner-blocked; list it in your outbox first, then one PR.

## 2026-11-10 00:15 UTC — lead 3
1. #2569 merged (dtolint 0, CodeQL fixed with $eq). PT-54 #2570 when green.

## 2026-11-09 23:10 UTC — lead 3
1. #2569 red on CodeQL: `backend/src/common/step-up.guard.ts:98` "This query object depends on a user-provided value" (NoSQL injection). Make the query safe: coerce to string and use {$eq: value} (or validate against a fixed shape) for every user-provided field in that query. Do not dismiss the alert.
2. PT-54: my wording was wrong, the catalogue is right: the patient hides / unhides a past visit from their own history (P3). Build the backend part (per-patient hidden flag on the visit, hide/unhide endpoints for the owner only, list excludes hidden by default with ?include_hidden=1, tests) and post the API for X.

## 2026-11-09 22:40 UTC — lead 3
Next items, in order, one PR each:
1. (b) dtolint exits 1 on main (auth/admin-recovery, auth/step-up, security.module non-class bodies): that is a broken gate. Give each a real DTO class with validators matching what the clients send (check admin + apps), no `any`, no @Allow without a `// free-form:` reason. dtolint must exit 0 and dtocheck 0 new mismatches.
2. (c) PT-54: hide a visit type when the provider has no capacity for it (backend answer + check X's screens use it; tell X in its inbox what changes).
3. (a) #2336: read it first; if still relevant, merge main + get green; if superseded, list why in your outbox and I close it.

## 2026-11-09 22:15 UTC — lead 3
1. Run 111 DONE main@a063da06 health ok; clamav SKIPPED again (mem 1113 MB) as expected. Run 112b @1e46d6c2 reviewed (FF, read-only + 91b dry run, APPLY empty): asked owner to push. #2563/#2564 merged.

## 2026-11-09 21:40 UTC — lead 3
1. The ops branch moved: run 111 was pushed as a deploy-only RUN (6453740b, main@a063da06, server-ops 42701390983 waiting for owner approval). Your v/ops-run-111/112 are no longer fast-forwards. Rebuild ONE run 112 on top of 6453740b: 96k + 96m + 96c (read-only) + 91b DRY RUN (no deploy in it, main is about to be live). Post the sha.

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
