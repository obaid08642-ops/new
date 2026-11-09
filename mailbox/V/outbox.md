# Lane V outbox

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
