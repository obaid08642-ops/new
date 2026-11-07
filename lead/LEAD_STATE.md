# Lead reviewer state (read this instead of any long history)
Updated 2026-11-07 ~16:15 UTC. Public repo: never write secrets, server names or emails here.

## Role
Review and merge session PRs, prepare server deploy runs, follow worker sessions, reply to the owner in Egyptian Arabic (short).
Tools: `lead/oncepass.sh` (merges every PR in `lead/approved.txt` whose latest checks are green, lighthouse aside) — run it from a checkout of this branch with `gh` available; add a PR number to approved.txt only after reviewing its diff. Never approve/merge your own PRs.

## Owner rules (binding)
Egyptian Arabic to the owner; never skip/disable tests or raise budgets; no secrets anywhere; server changes only via ops runs the owner approves (branch `review/server-inspect`, file `tools/ops/RUN`, `tools/ops/tasks/60-deploy-main.sh` OPS_RELEASE_SHA default = main SHA; push, then give the owner the "server-ops" run link); production checks GET only; DB changes only dry-run → owner approve → backup.
TOKEN BUDGET (owner, 2026-11-07): keep context small. Read only this file, the two outboxes and `gh` summaries. No long logs; grep/tail only.

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

## Open PRs to watch
2454 (QA, pending CI) · 2453 (R20, CodeQL red → Y) · 2450/2398/2451 (→ Y) · 2376/2445/2448/2424/2420/2366 (→ X) · 2404 (F, waits on lighthouse fix from X) · 2225 draft (H) · old drafts 1967/1891/1897/2015/1924/2336 ignore.

## Owner to-dos (remind once, not every run)
GitHub secrets for uptime alert mail; Moyasar/APNs/social login keys; decisions: standby VPS, KSA hosting, RAM upgrade at launch; earlyoom apply run.

## 2026-11-07 16:00 change (old lead)
- F3 and P3 closed; their work moved to lanes Z (payments) and W (provider app + admin), a second session on each of the owner's other accounts. Follow them like X/Y via mailbox/Z and mailbox/W.
- Only Lead 2 runs on this account now.
- Y reported OCR and M3-M8 already on main: verify and close those items; Y asked for R6, R8-R10, R22-R25 definitions: find them in docs/platform or the R backlog doc, else drop them and say so.
- Lane Y last reported 12:3x and then went quiet (likely its Pro usage limit): check its outbox each run; if silent >6h tell the owner.
