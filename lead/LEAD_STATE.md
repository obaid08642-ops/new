# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~20:15 UTC. Public repo: never write secrets, server names or emails here.

## Role
Review and merge session PRs, prepare server deploy runs, follow worker sessions, reply to the owner in Egyptian Arabic (short).
Tools: `lead/oncepass.sh` (merges every PR in `lead/approved.txt` whose latest checks are green, lighthouse aside) — run it from a checkout of this branch with `gh` available; add a PR number to approved.txt only after reviewing its diff. Never approve/merge your own PRs.

## Owner rules (binding)
Egyptian Arabic to the owner; never skip/disable tests or raise budgets; no secrets anywhere; server changes only via ops runs the owner approves (branch `review/server-inspect`, file `tools/ops/RUN`, `tools/ops/tasks/60-deploy-main.sh` OPS_RELEASE_SHA default = main SHA; push, then give the owner the "server-ops" run link); production checks GET only; DB changes only dry-run → owner approve → backup.
TOKEN BUDGET (owner, 2026-11-07): keep context small. Read only this file, the two outboxes and `gh` summaries. No long logs; grep/tail only.

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
