# Lane W outbox

## 2026-11-08 17:40 — gap 20 part: bed admission id (branch ready, PR waits for a slot)
Status: in progress
PR: none yet (3 open: #2480, #2484, #2492). Branch w/audit3-bed-admission-id is pushed; I open its PR as soon as one of the three merges.
- Your 17:15 order noted: gaps 23 and 24 go to lane Z; I do gap 20 rest, one PR each. Gaps 13/15 deferred (PR #2492).
- Bed admission id: GET /facility/beds/wards/:id/beds now gives every occupied bed its active admission_id (so any staff member on any device can discharge; before, only the admitting device knew it). Spec facility-ops.beds-admission.spec.ts (3 tests); facility-ops jest 17 passed; backend tsc clean; BedManagementScreen prefers bed.admission_id. No literal-string or colour change.
- Next: claims hub states, then staff credentialing fields (each its own PR).

## 2026-11-08 17:00 — gaps 13 and 15 marked deferred
Status: done (PR open)
PR: #2492 (docs only, 2 lines in docs/qa/screens-audit-3.md); #2480 and #2484 still open with main merged in, CI re-running
- Your 16:25 order: gaps 13 (subscriptions/ads) and 15 (voice recorder) are now marked DEFERRED until after launch in the audit doc. Nothing built.
- Open PRs of mine: 3 (#2480, #2484, #2492), at the cap.
- Still open question: gaps 23 and 24 (commission accrual, refund-policy fields) are backend money rules marked FOR F; tell me if they are mine or lane F's. Remaining gap 20 parts: staff credentialing fields, claims hub states, bed admission id.

## 2026-11-08 16:25 — conflicts fixed on #2480 and #2484
Status: in progress
PR: #2480 (merged main, pushed), #2484 (merged main, pushed); CI re-running on both. #2487 was merged by you.
- #2480: conflict only in docs/qa/screens-audit-3.md (my gap 20 line vs the gap 19 FIXED line); kept both. provider-app tsc clean, facility+nursing jest 11 passed, locale-parity ok, literal baseline 5424.
- #2484: conflicts in provider ar.json/en.json (coverage.* vs supplies.* keys) and the audit doc (gap 18 vs gap 19 lines); kept both sides. tsc clean, nursing jest 8 passed, locale-parity ok, colours 397, literal baseline 5442.
- Baseline note: main still has 5444. Whichever of #2480 (5424) / #2484 (5442) merges second needs main merged in and the baseline set to the real lower number (I will do it when told).
- Open PRs of mine: 2. Gaps 23/24 still await your answer on whether they are mine (FOR F money rules).

## 2026-11-08 15:20 — #2484 and #2487 green, ready for review
Status: done (waiting for review/merge)
PR: #2484 (gap 18) all checks green incl. live gate; #2487 (gap 19) all checks green incl. live gate; #2480 (gap 20) green on every finished job at 14:47, live-gate shards 2 and 5 were still running then
- No new orders since your 13:15 note; main has no merges since 12:50.
- I am at 3 open PRs (cap). Gaps 23 and 24 (insurance commission accrue, refund-policy fields) wait for a merge. Both are backend money rules marked FOR F in the audit doc, so please say if I should still take them or leave them to lane F.
- Merge order note: #2480 and #2484 both lower tools/design/no-literal-ui-string.baseline.json (5444 to 5424, 5444 to 5442); whichever merges second needs main merged in and the baseline set to the lower real number.

## 2026-11-08 14:10 — screens-audit-3 gap 19
Status: in progress
PR: #2487 (CI: just opened). Open PRs of mine: #2480, #2484, #2487 (cap reached). Correction to my 13:55 note: I had a free slot; gap 19 is now done.
- Nurse supply request now picks one of the nurse's active visits (GET /nursing/jobs/active) and sends its booking_id; no active visit disables the button and says why. Fake local "pending" row removed. 4 supplies.* keys (ar+en).
- Not fixed, in the audit doc: the "Current supplies" list is the catalogue without status, so the Delivered/Ordered/Pending counters stay 0; no endpoint returns the nurse's earlier supply requests.
- Checks: provider-app tsc clean, nursing jest 8 passed, locale-parity ok, colours 397 (unchanged), literal baseline 5444 (unchanged).
- Next: gaps 23 and 24 after a PR merges (cap 3). #2484 will need the literal baseline merged from main once #2480 lands.

## 2026-11-08 13:55 — #2480 conflict fixed
Status: in progress
PR: #2480 (merged origin/main, pushed 5aa65228; CI re-running), #2484 (CI running, no red so far)
- #2480 conflicted only in provider ar.json/en.json (my tracker.* keys vs the merged disputes.* keys). Kept both; locale-parity ok, literal baseline 5424, provider-app tsc clean, facility+shared jest 76 passed.
- 13:47 check: no new orders; #2484 has no red yet.
- Not starting gap 19 until a PR slot frees (3 open: #2480, #2484 and none other of mine; will start now if you want, otherwise after #2480 merges).

## 2026-11-08 13:30 — screens-audit-3 gap 18
Status: in progress
PR: #2484 (CI: just opened); #2480 approved, waiting for your merge (was green on its last check); #2474 and #2481 merged
- Nurse coverage screen now reads the device location (permission asked) and sends lat/lng; shows inside/outside, distance and radius, or "no area set".
- Fixed neighbourhood list removed (no real source). 6 coverage.* keys, provider ar+en. Literal baseline 5444 to 5442, colours 397 unchanged.
- Next: gap 19 (medical supplies needs booking_id), then 23, 24.
- Checks of 11:17, 11:47, 12:17, 12:47: nothing red, nothing new; I did not report them. Scheduled tasks expire about 2026-11-14; I will renew them before.

## 2026-11-08 10:30 UTC — re-ran the outage reds (lead 10:15)
Status: in progress
PR: #2474, #2480, #2481 (CI: re-running; at the cap of 3)
- Every red on the three PRs was a live-gate shard (shards 2-5 on #2474/#2480/#2481, plus the `live` summary job). Checked one failed log (#2481, run 42468794648): `curl: (22) ... 504`, exit 22, in the LiveKit download. All other checks are green (backend, provider-app, admin, patient web/mobile, policy, tokens, security scans).
- Re-ran failed jobs once on runs 42468794648, 42467097088, 42466588746. No empty commits. If a shard fails again for a reason other than that 504, I will read it and fix.
- #2474 merge-main: Y's #2479 is not on main yet (main at f5a698ee at 10:20); I merge main when it lands.
- Next at a free slot: gap 20 rest (staff credentialing fields, claims hub states, bed admission id), then 18, 19, 23, 24.

## 2026-11-08 10:25 UTC — gap 32 labelled (lead 09:45)
Status: in progress
PR: #2481 (CI: pending). Also open at the cap of 3: #2474 (disputes screen; live gate red on the LiveKit 504, waiting for Y's #2479 on main, then I merge main), #2480 (gap 20 tracker/QR log, CI pending).
- Gap 32 done as ordered, no worker snapshot: the cron list is now the declared schedule and says so (`crons_source: declared`, ar+en note, `where` host/app, fake `status` removed; admin page title, note and a neutral "runs in" column). Spec 3/3, both tsc 0, admin_calls audit 0 missing.
- Skipping gaps 13 and 15 as ordered.
- Next when a slot frees: gap 20 rest (staff credentialing fields, claims hub states, bed admission id), then 18, 19, 23, 24.

## 2026-11-08 10:00 UTC — screens-audit-3 gap 20 (tracker / QR log)
Status: in progress
PR: #2480 (CI: pending). Also open: #2474 (disputes screen, main merged in, no red at last look). Merged by you: #2463, #2471, #2466.
- Gap 20 (part): `GET /provider/facility/patients/active` now returns inpatient or booked, ward and bed, admission date, next appointment and the doctor's name (was only id/name/phone/email). Tracker screen and QR history show them. The screens used to show an MRN and a critical/observation/stable status that no collection stores, and marked every QR row "Arrived": all removed or made truthful. Literal baseline 5444 -> 5424.
- Local: backend tsc 0, 4 new jest tests; provider-app tsc 0, 10 jest; parity/literal/colour gates unchanged or lower. The live journey (`j_facility.py`) is not run here (no stack).
- QUESTION (gap 32, health dashboard cron list): the list is static because cron jobs run in the `worker` process while the dashboard is in the `api` process, and unnamed `@Cron` jobs get random UUID names. A truthful list = worker publishes a named job snapshot to Mongo + name ~20 jobs. Worth doing, or leave static and label it "declared schedule"? I did not start it.
- Left: gap 20 rest (staff credentialing fields, claims hub states, bed admission id), then 13, 15, 18, 19, 23, 24. Gaps 13 (subscriptions/ads module) and 15 (voice recorder) are whole features, not fixes: say if you want them scoped.

## 2026-11-08 08:45 UTC — provider-app disputes screen (lead order 08:15)
Status: in progress
PR: #2474 (CI: pending). Also open: #2463, #2471 (CI so far: no red; only live-gate shards still running at 08:20)
- New `ProviderDisputesScreen` (doctor Settings > "Booking disputes"), wired to `GET /support/provider/disputes`; loading, empty, retry states; no patient message or identity shown (the endpoint returns none). PV-15 row set to COVERED in SCENARIOS.md.
- Local: provider-app `tsc` exit 0; jest 11/11 (4 new screen tests + i18n); locale-parity, no-literal-ui-string and client-token-sync all unchanged (no new problems).
- DECISION FOR YOU: the order says six languages, but the provider app is Arabic + English only by owner decision 2026-10-31 (`provider-app/src/i18n/index.ts`, `i18n.test.ts`, and `locale-parity.mjs` lists provider as "Arabic and English only"). I built ar + en. Adding ur/hi/bn/fil/tl would break that test and that decision. Tell me if the owner has reversed it; otherwise I keep provider = ar + en.
- Not run: the screen on a device (no simulator here).
- Left: screens-audit-3 gaps 13, 15, 18-20, 23-24, 32, one PR each, once a PR slot frees (3 open now).

## 2026-11-08 08:10 UTC — PV-15 live journey
Status: in progress
PR: #2471 (CI: pending)
- `tools/live/j_dispute.py`: after the patient files the dispute, the doctor reads `GET /support/provider/disputes` and sees it (booking id and kind), with no patient message or identity; a patient is refused on that route.
- SCENARIOS.md PV-15 text updated; it stays PARTIAL because the provider app has no disputes screen yet.
- Not run locally (no stack); the CI live gate is the first run. #2463 also pending (see 07:55).
- Left: provider-app disputes screen (six languages) if you want it; otherwise screens-audit-3 gaps 13, 15, 18-20, 23-24, 32 next.

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
