# Lane W outbox

## 2026-11-08 07:55 UTC — #2463 admin impersonation (lead order 07:40)
Status: in progress
PR: #2463 (CI: pending, new run on f7fd82a9)
- Cause of the red 'Admin Dashboard typecheck and build': `tools/audit/admin_calls.py` looked for a backend route with the same path as `/api/admin/impersonation/{start,context,revoke}`. Those calls are served by the admin app's own Next routes (`admin/src/pages/api/admin/impersonation/*.ts`, support cookie), so none exists in the backend.
- Fix: the check now counts a call as served when a file for it exists under `pages/api/admin/` (not the `[...path]` proxy). Locally: 230 calls, 0 without a route (was 3); admin `tsc` exit 0, vitest 95/95.
- Reviewer please check: this edits a verification tool (AGENTS.md rule). The change only adds the local-route case; backend-route matching is unchanged. If you prefer an allow-list in the tool, say so and I redo it.
- Also merged main (conflict in docs/qa/screens-audit-3.md: gap 26 fixed by step-up, gap 27 fixed here).
- Left: next, PV scenarios (order 1) and screens-audit-3 open gaps (13, 15, 18-20, 23-24, 32) once CI is green.

## 2026-11-07 21:00 UTC — #2455 and #2462 merged; step-up PR opened
Status: in progress
PR: #2466 admin passkey step-up (CI: pending), #2463 admin impersonation (CI: green earlier, not merged yet)
What changed: #2455 and #2462 are merged (by you). I opened #2466 (order 4) after merging origin/main into the branch; admin tsc and vitest (95 tests) pass. It needs a real passkey to test on staging (please confirm with a ban/unban by an admin who has a passkey).
Left / blockers / questions: 2 open PRs. Next: remaining open gaps in screens-audit-3.md (13, 15, 18-20, 23-24, 32) and docs/review/P_STATE.md leftovers (order 3, not started). Questions still open: PV-15 for home-care/pharmacy bookings? Does admin need six languages?

## 2026-11-07 20:30 UTC — order 4: admin passkey step-up (branch pushed, PR held)
Status: in progress
PR: none yet (branch `w/admin-step-up` pushed; I hold the PR because I have 3 open PRs, the cap in RULES.md 6)
What changed: `admin/src/lib/step-up.ts` (+ test): on a 403 `step_up_required`/`step_up_invalid` for a write, `adminFetch` runs `auth/step-up/options` -> passkey prompt -> `auth/step-up/issue` for `METHOD:/api/v1/<path>`, then retries once with `X-Step-Up-Token`. The BFF proxy now forwards that header. Cancelled prompt -> Arabic error, no retry loop. admin tsc and vitest (95 tests) pass. Not run on a real device (needs a passkey).
Left / blockers / questions: I will open the PR as soon as one of #2455/#2462/#2463 is merged. Reviewer: the admin screens are Arabic-only today, so the new message follows that (no six-language files in admin); tell me if admin must be translated.

## 2026-11-07 20:00 UTC — #2455, #2462, #2463 green (ready for review)
Status: done (waiting for the lead reviewer to review and merge)
PR: #2455 (CI: live green after a re-run of the scanner shard), #2462 (CI: green), #2463 (CI: green)
What changed: #2455 PV-08/PV-09 licence-expiry journey (route fix); #2462 `GET /support/provider/disputes` (PV-15 -> PARTIAL); #2463 admin impersonation page uses the dedicated support-session routes + sweep expectation. The scanner "two file inputs" failure on #2455 did not repeat on re-run, so it looks flaky on the patient-web barcode page; worth an owner look (not my lane).
Left / blockers / questions: starting order 4 next (admin passkey step-up wiring), on a new branch `w/admin-step-up`. Question still open: should PV-15 also cover home-care and pharmacy bookings?

## 2026-11-07 19:50 UTC — #2462 and #2463 live gate green; #2455 re-run
Status: in progress
PR: #2462 (CI: live green after re-run; other checks seen green), #2463 (CI: live green after the sweep fix), #2455 (CI: live shard 3 re-run queued)
What changed: no new code. The #2462 re-run passed, which fits the 503 load-shedding cause. #2455's red shard (j_ai_scanner "web scan flow") passed on #2462's shard 3, so it is not a fixed defect on main; I re-ran only the failed job. If it fails again the same way, it is a real two-file-input problem on /en/pharmacy/barcode (patient-web) and I will ask for an owner.
Left / blockers / questions: #2462 and #2463 look ready for review (not merged by me); I did not re-read every non-live check on them this round. Inbox has no new orders. I am at 3 open PRs; next item after they are green: remaining open gaps in screens-audit-3.md (13, 15, 18-20, 23-24, 32) or order 4 (admin passkey step-up).

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
