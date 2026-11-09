# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Role
Review and merge session PRs, prepare server deploy runs, follow worker sessions, reply to the owner in Egyptian Arabic (short).
Tools: `lead/oncepass.sh` (merges every PR in `lead/approved.txt` whose latest checks are green, lighthouse aside) — run it from a checkout of this branch with `gh` available; add a PR number to approved.txt only after reviewing its diff. Never approve/merge your own PRs.

## Owner rules (binding)
Egyptian Arabic to the owner; never skip/disable tests or raise budgets; no secrets anywhere; server changes only via ops runs the owner approves (branch `review/server-inspect`, file `tools/ops/RUN`, `tools/ops/tasks/60-deploy-main.sh` OPS_RELEASE_SHA default = main SHA; push, then give the owner the "server-ops" run link); production checks GET only; DB changes only dry-run → owner approve → backup.
TOKEN BUDGET (owner, 2026-11-07): keep context small. Read only this file, the two outboxes and `gh` summaries. No long logs; grep/tail only.

## Lead 3 run 2026-11-09 01:45 UTC
- Merged #2508 (refund takeover safety: expected total recorded before gateway call; takeover asks gateway first; refuses 409 if gateway unreadable; tests). Pending: #2510 (Z family_member_id, merge first) then #2509 (X client, green, waits for 2510).
- LIVE main@50df9f87; run 107 still unprepared (recipe in 00:15/22:45 entries).

## Lead 3 run 2026-11-09 00:45 UTC
- No open lane PRs. Orders: Z → fix RefundExecutor double-refund risk on stale takeover (TOP), then family_member_id backend; X → decision 1 client. Owner decision pending: default refund-request table (2h/50%/0%).
- LIVE main@50df9f87; run 107 recipe in 00:15/22:45 entries.

## Lead 3 run 2026-11-09 00:15 UTC
- Merged: #2507 (facility staff credentials, role-guarded, hospital-scoped, audited) #2506 (compose REDIS_URL/MEILI_URL overridable; unset = identical resolved file).
- OPS RUN 107 recipe ADDITION: run `102-data-services-move-dryrun` BEFORE 60-deploy-main (it reports whether .env.production already sets REDIS_URL/MEILI_URL; if yes, the new compose would honour them — stop and check). Full order: 102-data-services-move-dryrun, 96h-mongo-restarts, 97-free-old-predeploy, 93-free-unused-images, 60-deploy-main (with the mongo-wait patch applied), cf-purge-api.
- No open lane PRs. LIVE main@50df9f87.

## Lead 3 run 2026-11-08 23:10 UTC
- Merged #2499 (bed admission id). #2504 closed. Pending: #2506 (Y, compose env defaults). LIVE main@50df9f87; ops run 107 recipe in the 22:45 entry.

## Lead 3 run 2026-11-08 22:45 UTC
- FOR WHOEVER PREPARES THE NEXT OPS RUN (107): on review/server-inspect, (1) `git apply` main's docs/ops/60-deploy-main-mongo-wait.patch to tools/ops/tasks/60-deploy-main.sh (reviewed by lead 3: waits for mongod healthy, retries the dump once only if mongod restarted, size guard unchanged; tested on main), (2) copy tools/ops/tasks/96h-mongo-restarts.sh from main (read-only), (3) RUN: 96h-mongo-restarts, 97-free-old-predeploy, 93-free-unused-images, 60-deploy-main, cf-purge-api with release = current main. #2504 (PR into the ops branch) is being closed: its CI cannot pass on that branch.
- Open: #2499 (W, pushed e3a32cd, CI pending). LIVE main@50df9f87. Y and W active again (22:2x).

## Lead 3 run 2026-11-08 22:10 UTC
- No change. Open: #2499 (W, conflict, no push), #2504 (Y, ops-branch reds). Y and W last outbox 19:49 (2h20m); if still silent at 22:50 → tell owner. LIVE main@50df9f87.

## Lead 3 run 2026-11-08 21:45 UTC
- Merged: #2501 (doctor's-order items pre-checked in basket; prefill ids validated, max 12). NOT merged: #2499 still conflicts (W has not pushed since 19:4x). Open: #2499, #2504 (ops branch, red on ops-branch pins/audits → Y).
- LIVE main@50df9f87; ~14 PRs on main since. Next deploy after #2504.

## Lead 3 run 2026-11-08 21:15 UTC
- Merged: #2503 (payout withdrawal per-provider lock, txn) #2497 (bcrypt in worker threads + overload level-change log; fixes live-gate 503 shedding) #2483 (copay halalas). #2499 conflicts again → W.
- #2504 (ops branch) still red on ops-branch pins/audits → Y. Pending: #2501.
- LIVE main@50df9f87; main has ~12 PRs since → next deploy after #2504 is merged into review/server-inspect.

## Lead 3 run 2026-11-08 20:45 UTC
- Merged: #2500 (claims hub; CodeQL NoSQL fixed with state allow-list) #2495 (refund policy rules: nursing no-show refund, default 0%, idempotent id) #2502 (Rx pre-checked UI).
- #2504 (Y → review/server-inspect: mongo wait/retry + 96h): code sound, but red on ops-branch unpinned actions + dependency audits → Y fixes in same PR, then I merge.
- LIVE main@50df9f87. Pending: #2503 #2501 #2499 #2497 #2483.

## Lead 3 run 2026-11-08 20:10 UTC
- LIVE = main@50df9f87 (run 106 DONE 19:57, backup pre-deploy-50df9f87 ok, rollback images kept). Site 200.
- Merged: #2366 (invoice UI). Since 50df9f87 on main: #2494 #2490 #2498 #2366 → next run should also apply the mongo-wait patch (Y's #2504 y/ops-mongo-wait, pending) + 96h.
- Pending: #2504 #2503 #2502 #2501 #2500 #2499 #2497 #2495 #2483.

## Lead 3 run 2026-11-08 19:45 UTC
- Merged: #2494 (96h mongo-restarts diag + docs/ops/60-deploy-main-mongo-wait.patch) #2490 (bookings halala) #2498 (search suggest focus). #2499 conflicts → W.
- Ops run 106 = deploy main@50df9f87 (by ops session 19:13), server-ops 42513944691 WAITING owner approval. Next run must apply the 60-deploy mongo-wait patch + run 96h.
- Pending: #2500 (CodeQL fix) #2497 #2501 #2502 #2503 #2495 #2483 #2366.

## Lead 3 run 2026-11-08 19:15 UTC
- No new merges (CI queue slow). #2500 (W) CodeQL HIGH NoSQL injection at insurance-engine.module.ts:487 → W. Pending: #2494 #2498 #2499 #2490 #2483 #2366 #2495 #2497 #2501 #2502.
- LIVE main@a74179a8; main@50df9f87.

## Lead 3 run 2026-11-08 18:45 UTC
- Merged by lead 3: #2496 (commission KPIs from real ledger rows) #2491 (doctors-page JS) #2480 (W gap 20) #2225 (native E2E, marked ready). Total today by me: 10.
- #2497 red (console.* in backend/src) → Y. Pending: #2494 #2498 #2502 #2501 #2500 #2499 #2495 #2490 #2483 #2366.
- LIVE main@a74179a8; main now well ahead; deploy after #2494 lands.

## Lead 3 run 2026-11-08 18:10 UTC
- Merged: #2493 (offers sorted, best flagged) #2492 (gaps 13/15 deferred, docs). Earlier 18:00: #2484 #2398 #2420 #2486.
- Waiting lane merge of main: #2490 (Z), #2366 (X). Pending CI: #2494 (mongo wait/retry + 96h), #2497 (Y shed in CI), #2498 (Y search suggest), #2495 #2496 (Z), #2491 (X), #2480 (W).
- LIVE main@a74179a8. Next deploy after #2494.

## Lead 3 run 2026-11-08 18:00 UTC
- OWNER (in chat, 17:5x): "you may merge yourself when the criteria are met" → Lead 3 now merges reviewed, fully green PRs (one per call). Merged: #2484 #2398 #2420 #2486.
- Conflicts after landing: #2490 (Z) and #2366 (X) → told to merge main.
- LIVE still main@a74179a8. Next deploy waits for #2494 (mongod wait/retry before backup) + its 96h diag; then one run with 96h + deploy.

## Lead 3 run 2026-11-08 17:45 UTC
- LIVE main@a74179a8. main unchanged. Reds (not PR-caused) → Y: load shedder 503 in live gate (#2483 shard 5), search suggest wrong results + purge failures (#2480 shard 4).
- Green + approved: #2484 #2420 #2398 #2225. New pending: #2495 #2496 (Z gaps 23/24), #2494 #2493 #2492 #2491 #2490 #2486 #2366.

## Lead 3 run 2026-11-08 17:15 UTC
- LIVE main@a74179a8 (run 105). main unchanged since. A merge bot (hourly :50) merges reviewed green non-risky PRs; old lead relays owner decisions (M6 ×3, gaps 13/15 deferred).
- Answered: X decision 2 = pre-checked not locked (pharmacy prescriptions + Ord03 doctor's orders); W gaps 23/24 → Z.
- Pending CI: #2494 (Y 96h restarts diag + deploy wait/retry patch) #2493 #2492 #2491 #2490. Approved waiting: #2225 #2398 #2484 #2483 #2420 #2366 #2480 #2486.

## Lead 3 run 2026-11-08 16:45 UTC
- LIVE = main@a74179a8 (run 105, server-ops 42498850561, DONE 16:27; backup pre-deploy-a74179a8 ok; rollback images kept). Prepared by another session/owner.
- Merged since 13:00: #2488 #2489 #2487 #2485 #2476 #2475.
- 96g diag: dump works now; FINDING nabdah-mongodb restarts=296, last restart 13:04:29 (right after run 104's failed dump) → Y top priority: read-only 96h restart diag + root cause.
- Approved waiting merge: #2225 #2398 #2484 #2483 #2420 #2366 #2480 #2486. New pending: #2490 (Z bookings halala) #2491 (X doctors JS).

## Lead 3 run 2026-11-08 16:15 UTC
- No change: main@92446efa, LIVE f5a698ee, 14 approved PRs waiting owner merge (#2488 first, then diag ops run).
- X: next = doctors-page JS margin (x/doctors-js). Z: start bookings dual write. Cap raised to 4 while merges are stalled. Owner decisions pending: M6 ordering rows (for whom, doctor's-order pre-ticking, non-best-match price lines); provider gaps 13/15.

## Lead 3 run 2026-11-08 15:40 UTC
- main@92446efa (no merges since 13:00), LIVE f5a698ee. #2488 (mongodump diag, now with trap cleanup) GREEN + APPROVED → owner: merge, then ops run with only `96g-mongodump-diag`.
- APPROVED + green, waiting owner merge (14): #2488 #2225 #2398 #2475 #2476 #2484 #2485 #2483 #2420 #2366 #2480 #2486 (report totals in halalas) #2487 (W gap 19) #2489 (order halala shadow fields + backfill list).
- No open reds. Lanes active (X/Y last 13:2x/13:54 — waiting on merges).

## Lead 3 run 2026-11-08 15:10 UTC
- main@92446efa (no merges since 13:00), LIVE f5a698ee. Deploys blocked until the mongodump backup is fixed (#2488 diag, CI 6 pending).
- APPROVED + green, waiting owner merge (9): #2225 #2398 #2475 #2476 #2484 #2485 (PROGRESS.md) #2483 #2420 #2366.
- Pending CI: #2488 #2489 #2487 #2486 #2480.

## Lead 3 run 2026-11-08 14:40 UTC
- main@92446efa, LIVE f5a698ee. Deploys blocked until mongodump backup fixed (#2488 diag pending CI).
- APPROVED + green, waiting owner merge: #2225 #2398 #2475 (R6 staging override, doc+test) #2476 (iOS GoogleUtilities modular headers) #2484 (W gap 18, literal baseline 260→258).
- Pending CI: #2488 #2489 #2487 #2486 #2485 #2483 #2480 #2420 #2366. Lanes all active (<1h).

## Lead 3 run 2026-11-08 14:15 UTC
- main@92446efa, LIVE f5a698ee. Deploy blocked by mongodump 0-byte backup (run 104). #2488 (Y, 96g-mongodump-diag read-only) reviewed + APPROVED pending CI → after merge: ops run with ONLY `96g-mongodump-diag` (needs whoever can push review/server-inspect + owner approve).
- Approved waiting merge: #2225. Pending CI: #2480 #2483 #2484 #2485 #2486 #2487 #2475 #2476 #2420 #2398 #2366.

## Lead 3 run 2026-11-08 13:45 UTC
- LIVE = main@f5a698ee (run 103 DONE 10:31, prepared by another session at 10:14; backup ok, rollback images kept).
- Run 104 (main@92446efa, 12:50, server-ops 42482104229) shows "success" but the deploy ABORTED: mongodump one-off exit 1 x2, no stderr, not OOM → backup 0 bytes. CF purge ran. → Y top priority: root cause + read-only diag task. No new deploy until the backup works.
- Someone else (another session/owner) prepares ops runs on review/server-inspect; I do not duplicate.
- Green + approved waiting merge: #2225 #2480. Pending CI: #2483 #2484 #2485 #2486 #2475 #2476 #2420 #2398 #2366.

## Lead 3 run 2026-11-08 13:15 UTC
- Owner merged 10: #2479 #2424 #2477 #2478 #2404 #2445 #2448 #2474 #2481 #2482 → main@92446efa. Post-merge review #2478 (refund halalas): sound.
- DEPLOY RUN 103 now = main@92446efa (since f2b0e686: ~19 PRs incl. site notice, admin step-up, refund halalas). Still unprepared — classifier blocks my push to review/server-inspect.
- APPROVED + green, waiting merge: #2225 #2480 #2420 #2366 #2483 #2398. Red: #2475 (needs main). Pending: #2476.

## Lead 3 run 2026-11-08 12:45 UTC
- main@f5a698ee (no merges). REVIEWED + APPROVED, all green (owner to merge): #2479 #2477 #2445 #2448 #2225 #2482 #2480 #2474 #2424 #2420 #2404 #2366. Suggested order: 2479, 2477, 2225, 2424, 2445, 2448, 2482, 2404, 2480, 2474, 2420, 2366 (2420/2366 conflict on inventories → X re-merges).
- Red: #2475 (curl 92 download, fixed by 2479). Pending: #2483 #2478 #2481 #2476 #2398.
- W last outbox 10:18.

## Lead 3 run 2026-11-08 12:10 UTC
- main@f5a698ee (no merges). APPROVED + all green, waiting owner merge: #2479 (LiveKit cache), #2477 (ZAP diagnostics only), #2445 (lazy hero search), #2448 (lazy order-again). #2225 approved, CI pending.
- Re-ran #2474 (stale LiveKit 504). Red: #2476 build-ios provider (Y), #2398 lighthouse (Y: merge main). Deploy run 103 still unprepared (classifier).

## Lead 3 run 2026-11-08 11:40 UTC
- main@f5a698ee (no merges). Approved + green, waiting owner merge: #2479. #2225 (approved) live gate re-running.
- Re-ran stale LiveKit-download reds: #2424 #2475 #2476 #2480 #2481 (#2474 #2483 still running). New PRs: #2482 (X, M6 ordering UI), #2483 (Z, halala copay), #2481 (W, gap 32). Only lighthouse-red left: #2398.
- Y/W last outbox 10:18 (fine, <3h). Deploy run 103 (main@f5a698ee) still unprepared — classifier.

## Lead 3 run 2026-11-08 11:15 UTC
- main@f5a698ee. LiveKit asset recovered (~11:00). #2479 (Y, LiveKit cache restore/save always + backoff + test) live gate green → APPROVED, merge pending (owner).
- Deploy run 103 for main@f5a698ee still to prepare (classifier blocks me). #2225 approved, needs live gate re-run.

## Lead 3 run 2026-11-08 10:45 UTC
- Owner merged #2376 #2472 #2473 → main@f5a698ee. Deploy run 103 (main@f5a698ee: #2469 #2466 #2465 #2464 #2463 #2471 #2376 #2472 #2473) still needs preparing — classifier blocks me.
- ROOT CAUSE live-gate reds: LiveKit v1.10.1 linux_amd64 release asset returns 502/503/504 since ~09:05 (other GH assets fine). Y ordered: 2nd source (Docker Hub image, same sha256) in #2479. Other lanes: ignore those reds.
- #2225 still approved, red only on live gate (same cause).

## Lead 3 run 2026-11-08 10:15 UTC
- main@120407dc (no change). GitHub release 504 outage lasted to ≥09:25; all live-gate reds 09:05-09:30 are that. Re-ran failed jobs of #2479 (run 42466653521). Lanes told: re-run once, fix only non-504 reds. Y: cache save always.
- Approved, waiting merge: #2376 #2472 #2225 #2473. Deploy run 103 still not prepared (classifier).

## Lead 3 run 2026-11-08 09:45 UTC
- main@120407dc (no change). Approved, waiting merge: #2376 #2472 #2225 #2473.
- Systemic red: GitHub 504 ~09:05-09:13 on LiveKit release download (live gate) + CodeQL CLI. Fix: Y #2479 (pending). Z had duplicated it in #2478 → told to drop.
- W #2480 (gap 20) pending; W asked: gap 32 → static + truthful label; gaps 13/15 = whole features → owner decision.

## Lead 3 run 2026-11-08 09:15 UTC
- main@120407dc: owner merged #2463 #2471 (so run 103 now = main@120407dc). Deploy prep still blocked by classifier.
- #2376 GREEN incl. lighthouse → reviewed, APPROVED (icon sprite, immutable cache on /icons, budget untouched). #2472 green, test-only → APPROVED. #2225 APPROVED. All three wait for merge (owner or permission).
- Red: #2475 #2477 live gate (curl 504 in setup → Y), #2476 build-ios provider (Y). Pending: #2473, #2474.

## Lead 3 run 2026-11-08 08:50 UTC
- Reviewed + APPROVED (all green, sound): #2463 (admin impersonation uses existing BFF routes start/context/revoke), #2471 (PV-15 live journey, tests/docs only), #2225. Merge still blocked by the permission classifier → owner.
- Pending CI: #2376 (X, lighthouse fix, 5 pending), #2472 (Z), #2473 #2475 #2476 #2477 (Y), #2474 (W disputes screen, ar+en).
- Answered W: provider app ar+en only. Y told: cap 3, compose env PR later.

## Lead 3 run 2026-11-08 08:15 UTC
- main@112a5c2c (no change). No red on main. CI pending on #2376 (X: icon sprite, −9 KB/page, margin 1.9 KB on doctors), #2463 (W fix), #2471 (W PV-15), #2472 (Z PT-18).
- Orders 08:15: Y → R7 then R6 dry-run design docs; W → answers (disputes screen yes, PV-15 consult only, admin Arabic-only) + order. X/Z: no change needed.
- Still BLOCKED (permission classifier): merge #2225, push deploy run 103. Waiting for the owner.

## Lead 3 run 2026-11-08 07:55 UTC
- main@112a5c2c; deployed still f2b0e686 (run 102 DONE). Since then on main: #2469 #2466 #2465 #2464 → run 103 needed.
- BLOCKED by this session's auto-mode permission classifier: (a) merging #2225 (reviewed: testIDs, CI-only flows, provider-app manifest-merge + iOS modular headers plugins; 45/45 green; sound) and marking it ready; (b) pushing run 103 to review/server-inspect (deploy main@112a5c2c). Owner must allow these actions (Bash permission rule for `gh api -X PUT .../pulls/*/merge` and pushes to review/server-inspect) or run them.
- Open: #2463 (W) red 'Admin Dashboard typecheck and build' (order 07:40, no new commit yet). Lighthouse-red only: #2376 #2445 #2448 #2424 #2420 #2366 (X), #2404 (Z), #2398 (Y). Dependabot #2467 #2468 ignored.
- X: was deadlocked (waiting for decision-B merges). New order 07:50: no lighthouse-red merges any more; cut JS on #2376 until lighthouse green, report KB each check.
- Y last 21:17 (order 07:40), Z 23:47 (order 07:40), W 20:17 (order 07:40). If still silent at 11:00 → tell owner.

## Production
main@641bbe2f deployed 2026-11-07 (run 101 OK). Site 200. Edge cache HIT verified (pages + /api/v1/doctors).

## Workers
- Lanes on other accounts via this branch: X (web/design) mailbox/X, Y (backend/ops/R/ordering) mailbox/Y. RULES.md binding. Read their outbox each run; write the next order at the top of their inbox.
- This account (2026-11-07 15:40): Lead 2 = session_01BVUekMe5eP3uTWGApxNrHz (every 3h, trigger trig_01CdoAD2rBxeFPeeG5u9sDGs). F3 = session_01BVUekQoggeNPCMaggdGv6t (every 4h), P3 = session_01BVUekN8bQDm8JynjseSrwa (every 4h). Answers to F3/P3 go in docs/review/LEAD_NOTES.md on branch mailbox.
- Stopped for good: old lead, Design, S2, R, F, P2, T2, H (wake-ups disabled). QA scenarios (old T2) paused; old H fixes moved to Y.

## Run log 2026-11-07 ~16:00
Main babb67ca (5 commits after the deployed SHA); site 200; no deploy prepared yet (wait for approved PRs to land, then one run).
Approved this run (oncepass was BLOCKED by the auto-mode classifier in the new lead session, merges still pending; owner must allow `bash lead/oncepass.sh` or merge): 2450 2451 2454 2445 2448 2424. 2376 waits for its CodeQL red. Lighthouse decision = B (orders in X inbox). Y got the answers to S2 plus items A-D (uptime probe 404, gitleaks ignore, Android manifest, CodeQL on 2453).
Red runs on main: not checked this run (API query for failures returned 404; retry next run with -X GET).

Run 16:10: main f1dff924 (2454 merged by someone else). Site 200. Still merge-blocked for 2450 2451 2445 2448 2424 (classifier denied oncepass; owner to run/allow). Y: #2458 uptime probe, #2459 gitleaks, #2453 CodeQL fix pushed. SECURITY: gitleaks found 3 real secrets in history (an R2 key pair in backend/infra/fastapi/server.py, a coturn static secret in deploy/coturn/turnserver.conf): OWNER MUST ROTATE; never ignore them. F3: PR #2456 (refund halalas) new, unreviewed; P3: idle since 15:40, no PR, no state file on main. Red on main: ZAP, Security Scan, uptime-alert, Native E2E (Y has C, not started).

Run 20:15: 2457 merged; Y is alive (new :17/:47 tasks); approved 2453 (digest pins only; at deploy the server may re-pull images and recreate mongo/redis/etc: warn owner). main@f2b0e686. Run 19:15: approved 2457 (halalas read paths, small, tested, CI green). Run 18:40: merged on main by someone else (not by me): 2450 2451 2454 2458 2459 2460 2461 + 2452, p/gaps-5 (backend: low-star reviews). main@20bb77a3, deployed still 641bbe2f (deploy not prepared yet: waiting for 2445 2448 2424 so one run covers all). Still open+approved: 2445 2448 2424; 2376 not yet reviewed (149 files). Unreviewed: 2456 2457 2464 2463 2455 2404. Y silent since 16:08 (waiting CI at PR cap), X 17:19, Z/W 18:18.

## Open PRs to watch
2454 (QA, pending CI) · 2453 (R20, CodeQL red → Y) · 2450/2398/2451 (→ Y) · 2376/2445/2448/2424/2420/2366 (→ X) · 2404 (F, waits on lighthouse fix from X) · 2225 draft (H) · old drafts 1967/1891/1897/2015/1924/2336 ignore.

## Owner to-dos (remind once, not every run)
GitHub secrets for uptime alert mail; Moyasar/APNs/social login keys; decisions: standby VPS, KSA hosting, RAM upgrade at launch; earlyoom apply run.

## 2026-11-07 16:00 change (old lead)
- F3 and P3 closed; their work moved to lanes Z (payments) and W (provider app + admin), a second session on each of the owner's other accounts. Follow them like X/Y via mailbox/Z and mailbox/W.
- Only Lead 2 runs on this account now.
- Y reported OCR and M3-M8 already on main: verify and close those items; Y asked for R6, R8-R10, R22-R25 definitions: find them in docs/platform or the R backlog doc, else drop them and say so.
- Lane Y last reported 12:3x and then went quiet (likely its Pro usage limit): check its outbox each run; if silent >6h tell the owner.

- 2026-11-08 08:10 (old lead): lane Y now also owns QA (old T2: patient/system scenarios, calls/chat/push matrix) and native E2E (old H: #2225, nightly Native E2E). Follow it like the other lanes.

- 2026-11-08 16:25 (old lead): owner decisions M6 (order for self/family default self; prescription meds pre-checked; all offers shown sorted, best highlighted) and defer provider gaps 13 and 15 — written to X and W inboxes. A fresh "Merge bot" runs hourly at :50 (Sonnet, gh api only) and merges reviewed green lane PRs that do not touch risky paths; risky ones (deploy/, workflows, ops tasks, schemas, auth) stay for you. Run 104 ABORTED (pre-deploy mongodump failed, nothing changed); run 105 = 96g mongodump diag + deploy, owner approved — read its result.
