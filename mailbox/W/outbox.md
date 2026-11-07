# Lane W outbox

## 2026-11-07 19:20 UTC — #2462 live gate red = CI load (503), re-run queued
Status: in progress
PR: #2462 (CI: red then re-run queued), #2463 (CI: fix pushed, live gate re-running), #2455 (CI: red, scanner shard, not mine)
What changed: #2462's live gate failed in `j_pharmacy_refill` (provider_approval_required after a 503 on the pending list) and `j_provider_accept_complete` (503 `server_shedding_load`). The route I added is not called by those journeys; the backend was shedding load on the runner while several live gates ran at once. I re-ran only the failed jobs (no code change, no test skipped). If it fails again with a 503, I will treat it as a real problem with load or retry handling and report it with the log lines.
Left / blockers / questions: #2455 still waits for an owner of the `j_ai_scanner` two-file-input failure (patient-web). Inbox has no new orders.

## 2026-11-07 19:00 UTC — #2463 live gate fixed (mine); #2455 shard 3 still outside lane W
Status: in progress
PR: #2463 (CI: pending after fix, 6a93706d), #2455 (CI: red, live shard 3, not from my diff), #2462 (CI: not re-checked)
What changed: #2463's red was caused by my change: `j_admin_sweep.py` expected the old generic context path to answer 403; the dedicated route `/api/admin/impersonation/context` rightly answers 401 `support_session_required` without a support cookie. I added it to `EXPECTED_REFUSAL` with the exact status and code (the old entry stays). Reviewer: this edits a verification tool, so please confirm it.
Left / blockers / questions: #2455 shard 3 is `j_ai_scanner` "web scan flow" (2 file inputs on /en/pharmacy/barcode), patient-web, not my lane; please say who owns it or whether main is red too. Re-run of #2455 needs that resolved.

## 2026-11-07 18:30 UTC — CI status of #2455 / #2463 (live gate red, not from my change)
Status: blocked (on a failure outside lane W)
PR: #2455 (CI: red, live shard 3), #2463 (CI: red, live shard 1), #2462 (CI: not re-checked)
What changed: nothing this round. #2455: the licence journey itself now passes (shard 1 green, the 404 is fixed). Shard 3 fails in `tools/live/j_ai_scanner.py`: "web scan flow", `input[type=file]` matches 2 elements on `/en/pharmacy/barcode` (strict mode violation; the journey prints the inputs' HTML but I could not read that part of the log). #2463 (admin-only client change) has the live gate red too (shard 1, log not read yet).
Left / blockers / questions: the scanner page is patient-web, outside lane W, and not touched by my diffs. Is this red already on main? If main is red too, who owns it (X/Y)? I will not change the journey locator without a decision, to avoid hiding a real page defect (two file inputs). Next check: read the #2463 shard 1 log and, if it is a different failure, fix it.

## 2026-11-07 16:40 UTC — order 2 gap 27 (admin impersonation)
Status: in progress
PR: #2463 (CI: pending)
What changed: the impersonation page now calls the dedicated BFF routes (start/context/revoke) instead of the generic proxy, so the support cookie is set and the context proof can pass. admin tsc and vitest (91 tests) pass.
Left / blockers / questions: 3 open PRs (#2455, #2462, #2463), so I stop starting new items until CI is green. Remaining open gaps in screens-audit-3: 13, 15, 18-20, 23-24, 26 (= order 4, step-up), 32.

## 2026-11-07 16:25 UTC — order 1 PV-15 provider disputes
Status: in progress
PR: #2462 (CI: pending, just queued)
What changed: new `GET /support/provider/disputes` (provider roles): tickets naming the provider's own consultation/lab/radiology bookings, limited fields (no patient name, phone or message). Unit spec added; tsc, nest build, jest on support (20 tests) and dtolint pass locally. PV-15 NOT COVERED -> PARTIAL in SCENARIOS.md. This was the only PV-* row left not COVERED.
Left / blockers / questions: no live journey or provider-app screen for PV-15 yet (follow-up). Question: include home-care/pharmacy bookings? #2455 CI (fix pushed) also pending. Next: order 2 (screens-audit-3.md).

## 2026-11-07 16:10 UTC — #2455 licence expiry journey (PV-08/PV-09)
Status: in progress
PR: #2455 (CI: pending after fix; earlier live gate shard 1 was red)
What changed: root cause of the red shard: the journey posted to `/admin/providers/license-monitor/run` and got 404 (admin client strips one `/admin`; the route needs `/admin/admin/providers/license-monitor/run`, same as the ratings steps). Fixed both calls, merged origin/main, pushed (500ce6b1).
Left / blockers / questions: waiting for CI; then order 1 (remaining PV-* in docs/qa/SCENARIOS.md). Scheduled tasks: two hourly tasks at :17 and :47 created (30-minute spacing; minimum interval is hourly). They expire after 7 days, to be renewed.
