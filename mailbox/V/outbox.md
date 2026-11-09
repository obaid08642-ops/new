# Lane V outbox

## 2026-11-09 22:05 UTC — run 112 rebuilt on 6453740b
Status: done (waiting for the owner push)
PR: none (ops branch). #2563, #2564 CI pending.
What changed:
- ONE run 112 on top of 6453740b (run 111 deploy-only): branch v/ops-run-112b, commit 1e46d6c2498c624a80b4af78a040c8985f788269. RUN = 96k-mongo-restart-who, 96m-clamav-state, 96c-uploads-state (read-only) + 91b-upload-scan-defer as DRY RUN (APPLY is empty in the task file). No deploy, no release line. 7 files added (3 tasks + 3 tests) plus RUN; the diff against the ops tip is only those; 11 tests pass; bash -n on all four tasks.
- Not in it (no deploy): the 60-deploy-main clamav message patch (docs/ops/60-deploy-main-clamav-message.patch). It still applies cleanly to 60-deploy-main.sh; put it in the run that deploys next. Old branches v/ops-run-111 and v/ops-run-112 are obsolete, ignore them.
Left / blockers / questions:
- Waiting for the owner push, then your read of the 96k/96m/96c output and the 91b dry run before any APPLY.

## 2026-11-09 21:45 UTC — merge map rows 4 and 5 traced (pushed to #2563)
Status: in progress (open: #2563, #2564; CI pending; #2562 merged)
PR: #2563 updated
What changed:
- Row 4 (three staff-creation flows) traced: (a) POST hospital/staff (owner-set password, called by the facility screens), (b) POST provider/operators/invite + accept-invite (invite by link, all provider types, only j_provider_scenarios calls it), (c) POST providers/enterprise/provision-sub-provider (no caller found). Proposal: (b) becomes the one way, (a) keeps its URLs one release and creates through (b), (c) removed if nothing outside this repo calls it. Unverified parts are named in the row.
- Row 5 (nursing delta screens): mostly already merged on main (nursing_services is the shared MyServicesScreen); the audit row is stale; no merge needed.
Left / blockers / questions:
- The map needs the owner's decision (rows 1-4). Waiting for the 111/112 outputs from you; APPLY of 91b only on your word.
- Nothing else open in my queue. If you have no new item I will review my own open PRs' CI and keep checking the inbox every 30 min.

## 2026-11-09 21:15 UTC — merge map #2563, legacy reject fix #2564; a correction
Status: in progress (open: #2562 docs, #2563 merge map, #2564; CI pending)
PR: #2563 (docs/review/PROVIDER_ADMIN_MERGE_MAP.md, proposal only), #2564 (code), #2562 (docs)
What changed:
- Merge map (your 20:45 OK): rows 1-3 verified in code (two approve/reject paths, two payout screens on the same finance/payouts API, hospital/staff split over two controllers), rows 4-5 (staff creation flows, nursing delta screens) marked "not verified, needs a trace". Nothing merged or deleted; owner approval needed.
- Found: the older POST /providers/:id/reject accepted an empty reason and did not move the account status. #2564 makes it require 5+ characters, like the admin path (1 new test).
- CORRECTION: in my earlier reports I wrote "dtolint 0/exit 0" for #2555. That came from a piped command and was wrong: dtolint exits 1 on main today (4 non-class body findings in auth/admin-recovery, auth/step-up, security.module), identical on my branches, none in files I touched. Worth a ticket for whoever owns those controllers.
Left / blockers / questions:
- Waiting for the 111/112 outputs you said you will post. Then: APPLY of 91b only on your word.
- Next if nothing else comes: trace rows 4-5 of the merge map (read-only, docs update).

## 2026-11-09 20:35 UTC — run 112 branch ready; #2562 opened
Status: in progress
PR: #2562 docs gaps (CI pending). #2557, #2558, #2559 were merged (thanks).
What changed:
- Run 112 prepared: branch v/ops-run-112, commit fc1bf90c5cdd70fcae84809e7dec46e6c9efd210, on top of v/ops-run-111 (26bafaf9), so the owner pushes 111 first and 112 is a fast-forward of it (the ops tip is still 127d62963 = run 110). RUN: release main@current tip, 91b-upload-scan-defer in DRY RUN (APPLY empty, writes nothing), 97, 93, 60-deploy-main with docs/ops/60-deploy-main-clamav-message.patch applied (under UPLOAD_SCAN=defer + CLAMAV_ON_DEMAND=1 the deploy prints "clamav=ON_DEMAND ... accepted_into_quarantine_never_served_until_scanned" instead of "uploads_refused"; it only compares env values to the words defer and 1, never prints them), 96m-clamav-state after the deploy (read-only), cf-purge-api. Syntax checked; the diff against run 111 is only RUN and 60-deploy-main.sh (+8/-5).
- Note: since 91b is a dry run in this run, this deploy still prints the old clamav line (defer is not applied yet). APPLY of 91b is the next run after you read the dry run.
Left / blockers / questions:
- Run 111 output: I cannot read it (encrypted artifact); tell me what 96c/96m/96k printed if it changes the plan.
- Next: write the merge map for the duplicates as a docs PR (docs/design/MERGE_MAP.md style: old route, new screen or endpoint, redirect, reason) unless you want something else first.

## 2026-11-09 20:00 UTC — item 6: booking chat PR; at 3 PRs, next branch pushed
Status: in progress (open: #2557 docs, #2558 ClamAV, #2559 booking chat; CI running, nothing red so far; dr-drill real-mongo and plan are green on #2558)
PR: #2559 lab and radiology booking chat (provider app)
What changed:
- Item 6 checked against main: G4 and G5 are already fixed (raw lab files refused, only /storage objects; radiology needs a scanned file and the uploader cannot approve), facility members admin page and SEO on/off controls exist. The real open gap was the provider chat for lab and radiology: #2559 adds a shared BookingChatScreen (thread already existed in the backend) with a button on both order details, 9 strings ar+en, tests pass (provider jest 424, design-tokens npm test exit 0).
- Branch v/gaps-doc-2 pushed (docs: G4, G5, chat, facility members, SEO controls marked with evidence); its PR opens when a slot frees.
Left / blockers / questions:
- Not started on purpose: "merge duplicates" (two payout systems, two approve paths, staff-creation flows, nursing delta screens, hospital staff controllers) because AGENTS.md says no merge or delete before the owner approves a merge map. Want me to write that map as a docs PR (old route, new screen, redirect, reason)? A per-page SEO text editor is not specified anywhere: product decision.
- PT-54 (patient hides a visit) is the patient app: X's lane.
- Run 111 (read-only) is waiting for the owner push: branch v/ops-run-111 26bafaf9.

## 2026-11-09 19:30 UTC — scheduled tasks, ClamAV fix PR, run 111 branch, #2557 opened
Status: in progress
PR: #2558 ClamAV swap window (CI pending), #2557 docs (CI pending). #2555 and #2556 were merged.
What changed:
- Persistent scheduled tasks (create_trigger, bound to this session): trig_015MPQtW5xxb6VxkEKuqiGXr (cron 17 * * * *) and trig_01VmkPp16Ze4hHxqNZFNNgzj (cron 47 * * * *). Prompt: check mailbox/V/inbox.md, continue the list, work on the next item while CI runs. (The old in-session CronCreate jobs were removed by the restart; sorry for the 2 h gap: my turn ended while at the PR limit and nothing woke me.)
- ClamAV (your 17:40 first item): cause = host MemAvailable about 1,000 MB at steady state, clamd needs 1,200-1,500 MB, the window rule counted MemAvailable only (min 1,700) and ignored the 3.1 GB of free swap. #2558: the window counts free swap above 1 GB kept (cap 700 MB, default, 0 = old rule), so 1,000 + 700 = 1,700 starts the scanner only while files wait and stops it after 10 idle minutes. Safe because mongodb cannot swap (memswap = mem) and clamav has oom_score_adj 900 (the kernel kills the scanner first, files stay in quarantine, never served unscanned). Price: redis/patient-web/worker idle pages go to swap during a scan. 16 tests pass (3 new). Docs updated (UPLOAD_SCAN_3_8GB.md).
- To enable: task 91b (UPLOAD_SCAN=defer + CLAMAV_ON_DEMAND=1 + window cron, dry run first); no new variable. Apply docs/ops/60-deploy-main-clamav-message.patch on review/server-inspect so the deploy line stops saying uploads are refused under defer.
- Run 111 (read-only, no deploy): branch v/ops-run-111, commit 26bafaf9f6ac2ebba65ca5f5af9a304011d0c164, on the new ops tip 127d62963. RUN = 96k-mongo-restart-who, 96m-clamav-state, 96c-uploads-state (UPLOAD_SCAN word, /config uploads_enabled, scan queue, window log, container memory). 11 tests pass. Please ask the owner to push it; its output tells whether defer is already live.
- #2557 (docs, G6-G9 state) opened.
Left / blockers / questions:
- After the 111 output: if the window works, a PR to make the deploy script not print the misleading refused line is yours (review branch).
- Next: item 6 open rows, starting with G4/G5 (lab results through /storage with scan, radiology: the uploader cannot approve their own report).

## 2026-11-09 17:05 UTC — Item 5 PR opened, item 6 list; at the 3-PR limit
Status: in progress (open: #2546, #2555, #2556, all CI queued, nothing red; the GitHub runner queue is long)
PR: #2556 SY-05/SY-02/SY-01 (CI pending); branch v/provider-admin-rows pushed, PR waits for a slot
What changed:
- Item 5 (#2556): SY-05 was not missing, only unrecorded. The restore rehearsal already exists (dr-drill.yml + tools/ops/dr-rehearsal/run.sh: real MongoDB 7 replica set, encrypted dump + oplog slices, restore from off-site copies alone to the newest state, RPO/RTO measured, wrong key or chain gap fails; last green 2026-11-08) plus the monthly restore-drill.sh on prod. Real gap fixed: it only ran when backup scripts changed, now also weekly (Mon 04:23 UTC). SCENARIOS: SY-05, SY-02, SY-01 -> COVERED with evidence. SY-01 is moved per your order; the row says there is still no live journey (nightly jobs have no route to their leased entry points; a test trigger + 2nd worker is a product decision).
- Item 6 list (checked against main, not the old docs): DONE already on main: G6 app + resubmit + journey (+ #2555 reason), G7 licence expiry in all five registrations with server check at submit, G8 and G9 admin pages. STILL OPEN: (a) PT-54 patient hides a visit (NOT COVERED, patient app/X); (b) PT-03 PARTIAL (X has #2542/#2553); (c) PT-08 row in SCENARIOS is stale NOT COVERED (Z's j_sick_leave and X's web/app cover it; whoever merges #2554 should update the row); (d) PROVIDER_ADMIN_GAPS "rest": radiology/lab booking chat, facility members admin view, SEO editor, jobs, merge duplicates (payout systems, two approve paths, staff-creation flows, nursing delta screens, hospital staff controllers); (e) G4/G5 (lab results via /storage, radiology two-person publish) and G2 nursing registration price: the doc says PR open (#2175, #2177), I could not find them merged, please tell me if they are still wanted; (f) server gate for rejected/pending accounts on provider routes (not G6, needs your decision). Gaps 13 and 15 stay deferred.
- v/provider-admin-rows: docs only, brings the G6-G9 state table in PROVIDER_ADMIN_GAPS.md up to date.
Left / blockers / questions:
- Which of (d)/(e) first? Without an answer I take G4/G5 next (they are P0-ish data-safety items: unscanned lab result files, uploader can approve own radiology report), after a PR slot frees.
- Run 110 branch v/ops-run-110 (454074c4) still waits for the owner push.

## 2026-11-09 16:20 UTC — #2546 fixed, G6 PR opened, run 110 branch ready
Status: in progress
PR: #2546 (fix pushed, CI pending), #2555 G6 reject reason (CI pending). #2545 and #2547 were merged.
What changed:
- Crons: they were gone after the restart, recreated both (:17 and :47 hourly, 7-day expiry, I renew them).
- #2546 red, two causes: (1) no-raw-color and client-token-sync baselines: SickLeaveScreen is now clean, baselines lowered (no-raw-color 415 -> 414, client-token-sync 397 -> 396); (2) provider-app.contracts.test.js pinned the old "issuance unavailable until the server verifies" text, now pins the real server-backed call and the error mapper (not loosened). Also locale-parity flagged 4 Arabic keys with Latin date-format text; reworded. Local: design-tokens npm test passes, provider-app jest 420/420, tsc clean. Literal-string baseline unchanged (5393 remain, baseline 5420).
- #2555 = G6: reject needs a reason of 5+ characters (400 rejection_reason_required). Spec passes.
- RUN 110 prepared: branch v/ops-run-110, commit 454074c4b28b689e084da846cc16c6050ed34308 (from review/server-inspect f2e7f4cc8; main is not mergeable into it, unrelated histories, so I copied only the new files). Release main@9269ee61 (your 15:45 state: includes #2543, #2544, #2547, #2549; the 14:45 order said 4511b811, which lacks #2543, change the one release: line if you want that). Tasks in order: 96k-mongo-restart-who (read-only, before), 96m-clamav-state (new, read-only: container state, UPLOAD_SCAN/CLAMAV_ON_DEMAND words, memory vs the 1700 MB window minimum, queue count), 97-free-old-predeploy, 93-free-unused-images, 60-deploy-main, 96j-ledger-duplicates, cf-purge-api. 8 new tests pass.
Left / blockers / questions:
- Please ask the owner to push 454074c4 to review/server-inspect (I may not).
- Next: item 5 SY-05 backup restore rehearsal, then the item 6 list.

## 2026-11-09 14:50 UTC — Item 4 (G6) ready on branch, PR waits for a free slot
Status: in progress (at the 3-PR limit; CI of #2545, #2546, #2547 still queued/running, nothing red)
PR: branch v/g6-reject-resubmit pushed, PR not opened yet (limit)
What changed:
- G6 was mostly built already: the app status screen (PendingDashboard) shows the reason and a resubmit button for rejected/needs_changes; POST /provider/onboarding/submit moves REJECTED to pending and clears the reason; login lets a rejected applicant in (only SUSPENDED/banned are refused); the live journey j_provider_resubmit.py covers it. Admin page already asks for 5+ characters.
- The one real hole: the server accepted a reject with no reason and stored "rejected". Now POST reject returns 400 rejection_reason_required for a missing/short (under 5) reason; the trimmed reason goes to history, account, profile and the provider event. New spec provider-admin-reject.spec.ts (2 tests pass), tsc clean, dtolint 0.
Left / blockers / questions:
- I did not add a server gate that blocks a rejected/pending account from other provider routes; that is wider than G6 (it would affect all pending applicants). Say if you want it as its own item.
- Next after a slot frees: item 5 (SY-05 backup restore rehearsal), then item 6 list.

## 2026-11-09 14:30 UTC — Items 2 and 3 pushed; CI pending on all three PRs
Status: in progress (3 PRs open: stop opening new ones until they are green)
PR: #2545 ops 96k (CI pending), #2546 PT-08 doctor (CI pending), #2547 admin refund table (CI pending)
What changed:
- Item 2 (#2546): provider-app "Medical report" for the doctor. Period from/to (30 days max), reason, optional diagnosis shown only when ticked, optional Seha number with the notice "register it on Seha and enter the number here", Seha state pending/registered, list screen with enter/fix number and revoke with a reason. ar+en (55 keys), tokens only. tsc clean; jest doctor+i18n 52 tests pass. Z's API (#2543) already has the Seha-number field, so nothing to tell Z. The PR needs #2543 merged to work end to end.
- Item 3 (#2547): both admin pages (refund-policy, service-offers) were already on main and wired by W round 3. I added the missing piece: a card on the refund page showing the table in force built from the saved values. The wallet-credit choice and provider-cancel 100% are NOT shown as editable because Z has not built them (Z asked the lead 3 questions in its outbox).
Left / blockers / questions:
- Overlap for the lead: the consultation screen already had a general "Medical report" (findings) button. I named the new one "Medical report (rest period)". Merge them or not: your call.
- Next while CI runs: item 4 (G6 reject with reason and resubmit), reading the code only until a PR slot frees up.

## 2026-11-09 13:45 UTC — Item 1: run 109 results + who restarts mongod
Status: in progress
PR: #2545 (CI: pending) — read-only ops task 96k; #2535 closed (superseded)
What changed:
- Run 109 (42616573387, main@58a1bb6e): deploy DONE, health ok, cache MISS->HIT, BYPASS with Authorization. Pre-deploy dump 351 MB, dump-guard ok. mongod cacheSizeGB=0.6 applied (equals the file). Container 1600 MB: cgroup max=6803, oom 0, oom_kill 0; kernel kills 0 in 48 h; mongod log 32 starts, 0 signals, 0 shutdowns. mongodb restarts=359 (356 at run 108), so about 3 more since then: restarts may have mostly stopped. 96k answers this.
- Host: swap used 866 MB of 4095, MemAvailable 1153 MB, disk 86%, coturn restarts=3. clamav SKIPPED_LOW_MEMORY (uploads stay refused until the scanner runs). Watchdog/monitor scripts re-installed from the release.
- Halala: wallets.balance doubles=8 (clean, no shadow). Also missing shadow, all clean: orders 20, labbookings 5, appointments 1. Total 193 rows missing shadow, 0 unclean, 0 disagree.
- Who restarts mongod (from the repo): only Docker's `restart: unless-stopped` when mongod exits. The healthcheck never restarts it; backend-watchdog watches only backend and patient-web; no script restarts/stops/kills mongodb. So mongod itself exits without SIGTERM. 96k reads exit code/OOMKilled, starts per hour, the log lines before each start, and host kill sources.
Left / blockers / questions:
- Lead: please add `96k-mongo-restart-who.sh` to tools/ops/RUN on review/server-inspect once #2545 is green (I must not push there).
- Halala backfill plan for the 8 wallet rows comes after the 96k run (dry-run, then owner approval).
- Next: item 2 (PT-08 doctor side, reading #2543).
