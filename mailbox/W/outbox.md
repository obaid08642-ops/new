# Lane W outbox

## 2026-11-11 03:00 UTC — takeover #2603 (x/pt54-orders)
Status: in progress (waiting for CI)
PR: #2603 (CI: running on new tip 1d799e78)
- Merged origin/main into x/pt54-orders; the 7 conflicts were all generated docs/inventories. Took main's copy, regenerated with tools/design/screen-inventory.mjs and provider-inventory.mjs (--check clean), no hand edits. Pushed to the same branch.
- Ran: patient-app hiddenVisits test 4/4, patient-web orders-screens 38/38. Local tsc shows only workspace-resolution errors (react/react-native from packages/*) and one existing test-file implicit-any, none in files this PR touches; CI is the judge.
- Next: #2604 only after you merge #2603.

## 2026-11-11 02:30 UTC — check
Status: done (waiting)
PR: #2541 merged (all 32 checks green). No open PRs.
- Inbox: nothing newer than the 2026-11-09 12:30 PT-08 sick-leave note; still waiting for Z's sick-leave API before coding.
- Reminder: the two scheduled checks (:17, :47) expire about 2026-11-14 and need renewing.

## 2026-11-09 12:12 UTC — RevenueInsights on Z's aggregate
Status: done (waiting for CI/review)
PR: #2541 (CI: just opened)
- RevenueInsights.tsx: revenue, refunds and the 12-month trend from GET /provider/stats/revenue?months=24; the on-phone sums of the newest 200 ledger rows are gone. Period switch Month / 3 months / Year (aggregate is monthly: Week removed). ar+en, tests (period maths + screen). tsc clean, jest 414 pass, token-sync 397, literal baseline 5422 -> 5420, locale-parity no new.
- Still on the phone (Needs review, backend gap): pending/balance, top services, breakdown by type come from the ledger's newest rows; they need a server aggregate like #2538.
- Everything I made is pushed (owner asked); no local-only commits.
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 10:48 UTC — RevenueInsights: read #2538, waiting for merge
Status: in progress (waiting, no code)
PR: none yet
- Read #2538: GET /provider/stats/revenue?months=12 (max 24) -> {currency, months:[{month 'YYYY-MM', earned, refunded, net}], total:{earned, refunded, net}}, Riyadh months, refunds netted (cash basis).
- Plan: the 12-month trend and the net figure come from it (replace the on-phone sums at RevenueInsights.tsx:46-58); show earned/refunded/net; update sharedScreens.test.tsx (it asserts the old ledger call). Question: the screen also has a Week/Month/Year switch and a "top services" + "by type" breakdown computed from the newest 200 ledger rows; the aggregate is monthly only, so Week cannot be served by it. Unless you say otherwise I will make the period switch Month/3 months/Year (months=1/3/12), and move the two breakdowns to Needs-review as still computed on the phone from the last 200 rows (backend gap), not fixed by me.
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 10:17 UTC — queue empty (SY-06 COVERED)
Status: done
PR: none open (#2523 PT-05, #2529, #2533 SY-06 all merged)
- SCENARIOS on main: PT-05 and SY-06 are COVERED. Re-read of the file: every remaining PARTIAL/NOT COVERED row is owner H (patient app: PT-03/08/09/24/38/54) or S backend (SY-01/02/05), none is a provider-app or admin row. Nothing to start on my side.
- Waiting for your RevenueInsights.tsx order (after Z's period aggregate merges); not touching it before. Send any other order and I take it.
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 09:19 UTC — SY-06 SLA + fraud journey
Status: in progress
PR: #2533 (CI: just opened); #2529 merged
- j_admin_sla_fraud_alerts.py: a lab booking past its SLA time and an open 99% fraud alert each raise one alert (severity, key, params, link), no duplicate on a second evaluation; fraud threshold above 100 refused; rules restored. The SLA time and the fraud alert are set in the TEST database (db_raw.set_raw / new insert_raw, same guard): no screen sets the SLA time and the fraud detectors run on their own schedule. Not run locally; the live gate is its first run.
- SY-06 -> COVERED in SCENARIOS. After this, no provider/admin row of SCENARIOS is left (PV/AD COVERED, PT-05 COVERED; PT-03/08/09/24/27/29/38/54 are patient-app, SY-01/02/05 backend).
- Not touching RevenueInsights.tsx until you order it (Z's aggregate).
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 08:20 UTC — PT-05 merged; SY-06 stuck-order journey
Status: in progress
PR: #2529 (CI: just opened); #2523 (PT-05) is merged, all 32 checks were green
- SY-06: new j_admin_stuck_alerts.py (real open lab booking -> order_stuck alert once, no duplicate, patient cannot evaluate, rules restored). Not run locally (no live stack here): the live gate on #2529 is its first real run.
- SY-06 stays PARTIAL in SCENARIOS (sla_breach and fraud_high not yet covered); I will add those next unless you say otherwise.
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 06:52 UTC — PT-05 provider-app referral screen
Status: done
PR: #2523 (CI: just opened, not yet seen)
- IssueReferralScreen on the consultation screen posts to doctor-referrals/issue-referrals-and-prescription with UUID visit/patient/doctor ids, lab + radiology + home-care notes; ar+en, tokens only; body builder unit-tested. provider-app tsc clean, jest 408 pass; token-sync 397, literal baseline 5422, locale-parity no new.
- SCENARIOS PT-05 -> COVERED (journey is Z's j_referral_booking.py; the RN screen itself is unit-tested only, not driven by the live gate).
- Remaining rows on my side (provider/admin): all PV/AD rows are COVERED; only SY-06 (monitoring alerts, PARTIAL, admin side) is left. PT-03/08/09/24/27/29/38/54 are patient-app, SY-01/02/05 backend. Next: SY-06.
- Reminder: renew the two scheduled checks (:17, :47) before 2026-11-14.

## 2026-11-09 05:20 — 02:45 orders done, queue empty
Status: done
PR: #2511 (PT-13), #2513 (AD-02 reject), #2517 (AD-07 broadcast + backend fix) all merged. No open PRs of mine.
- PT-13/PV-07: patient is told once per review reply (en, ar). AD-02: reject path covered. AD-07: broadcast journey + the real bug fixed (a `user:<id>` / segment audience was overwritten by the paging condition, so one person's message went to everyone; `$and` fix, 3 unit tests).
- SCENARIOS rows PT-13, AD-02, AD-07 are COVERED. Open product gaps for the lead (not fixed): an admin broadcast writes no in-app inbox row (device push only) and returns no campaign id.
- Waiting for the next order. Reminder: the two scheduled checks (:17, :47) expire before ~2026-11-14 and need renewing.

## 2026-11-09 04:40 — #2517 root cause fixed (broadcast ignored its audience)
Status: in progress
PR: #2517 (CI: re-running on 2565c1d9). #2511 merged. #2513 (AD-02) still running, nothing red. Open PRs of mine: 2.
- Root cause: `segmentFilter('user:<id>')` is `{ id }` and `sendCampaign` / `fanout` spread it before their own `id` condition, so the paging condition replaced the audience: one person's message was counted and queued for every user. Fixed with `$and` in both places; 3 new unit tests (the single-user one fails on the old code, I checked), 10 jest tests green, tsc clean.
- Journey expectations unchanged. One set-up step added: the devices register their made-up tokens again before the segment send (the push worker can switch a token off after the first send, which would also have hidden the target from the `patients` send); a failed broadcast is a failed step, not a crash. I cannot see the CI log (log host blocked), so if the segment step still fails after this, tell me the line.
- Product gaps not fixed: broadcast writes no in-app inbox row; its response has no campaign id.

## 2026-11-09 03:55 — CI check of #2511 / #2513 / #2517
Status: in progress
PR: #2511 all checks green (live gate shards 1-5 green, only the aggregate `live` is queued); #2513 and #2517 still running behind a long runner queue.
- #2517 (AD-07): live gate shard 1 failed. My new `j_admin_broadcast` is in shard 4 (computed with gate_shard.py), which passed; shard 4 also ran `j_provider_scenarios` (PT-13) green on #2511. So I read shard 1 as not from my change; I cannot read the log (the log host is blocked from my sandbox). I will re-run the failed job once as soon as the run ends (GitHub refuses while shards 2, 3, 5 still run).
- #2513 (AD-02 reject) shard 3 (`j_review_rating`) is still running; nothing red yet.
- No new orders in the inbox.

## 2026-11-09 03:30 — 3 journeys opened (PT-13/PV-07, AD-02 reject, AD-07 broadcast)
Status: in progress
PR: #2511 (PT-13), #2513 (AD-02), #2517 (AD-07). CI: just opened, not checked yet. Open PRs of mine: 3 (the limit).
- PT-13/PV-07: PV-07 was already covered (`j_provider_scenarios`); #2511 adds the missing patient side (one notification per reply, en and ar). The provider app screen is already ar+en and wired (screen -> POST reply -> event -> notification), no product change.
- AD-02: #2513 adds the reject path to `j_review_rating` (reason max 500, patient forbidden, leaves the queue, never public, second decision 404, unchanged resubmission stays rejected).
- AD-07: #2517 new `j_admin_broadcast` (rules, one user, `patients` segment vs a nurse, no double send). Delivery is read from `pushlogs` via a new read-only `db_raw.find_raw`; the phone/gateway are outside the stack.
- Not run locally: the journeys (need the full stack); the live gate is the check. Finding for you (product, not fixed): an admin broadcast creates no in-app inbox row (only a device push) and the broadcast response has no campaign id.

## 2026-11-09 00:20 — gap 20 closed, queue empty
Status: done
PR: #2507 merged (CI was green); #2499, #2500 merged earlier
- Gap 20 of screens-audit-3 is fully done: tracker/QR, bed admission id, claims hub states, staff credentialing fields.
- No open PRs of mine. Gaps 13/15 deferred by owner, 23/24 are lane Z. Waiting for the next order.
- Reminder: the two scheduled checks (:17, :47) expire before ~2026-11-14 and need renewing.

## 2026-11-08 23:30 — #2499 merged; gap 20 credentialing
Status: in progress
PR: #2507 (CI: just opened)
- #2499 (bed admission id) is merged. Gap 20 is now only the credentialing PR left.
- #2507: staff records carry licence expiry and malpractice cover; GET /hospital/staff returns them; new PUT /hospital/staff/:id/credentials (validated, facility-scoped, audited); 4 new tests; tsc, dtolint, dtocheck clean.
- Not built: an edit form in the app (screen only displays). Open PRs of mine: 1.

## 2026-11-08 22:25 — #2499 conflict fixed again
Status: in progress
PR: #2499 (CI: re-running on e3a32cdc)
- Merged origin/main into w/audit3-bed-admission-id; only docs/qa/screens-audit-3.md conflicted (gap 20 line). Kept the claims-hub text from main and added the bed part. Tip e3a32cdc.
- Please merge when green. Next: gap 20 last part, staff credentialing fields (one PR).

## 2026-11-08 20:00 — #2499 conflict fixed, #2500 CodeQL green
Status: in progress
PR: #2499 (merged main in, one doc-line conflict kept both sides, pushed 2a36485a; backend tsc clean, facility-ops jest 17 pass; CI re-running), #2500 (CodeQL now success after the state allow-list fix; other jobs still running/queued, nothing red)
- Next: staff credentialing fields (last open part of gap 20), once a slot frees.

## 2026-11-08 19:40 — #2500 CodeQL fixed
Status: in progress
PR: #2500 (pushed; merged main in first, one doc conflict kept both sides), #2499 (no red when last checked)
- CodeQL HIGH at insurance-engine.module.ts:487 was the `state` query value going straight into the Mongo filter. providerQueue now accepts `state` only if it is a plain string in the known-state allow-list (INSURANCE_REQUEST_STATES + reserved); an object/array (?state[$ne]=x) or unknown string answers 400 invalid_state and never reaches the query. No client of mine sends ?state=.
- Spec insurance-provider-queue.spec.ts: 7 tests pass (3 new for the validation); backend tsc clean. Waiting for CodeQL to re-run on the push.
- Next: staff credentialing fields (last open part of gap 20).

## 2026-11-08 18:45 — two PRs opened for gap 20 (bed admission id, claims hub)
Status: in progress
PR: #2499 (bed admission id), #2500 (claims hub), #2480 (tracker/QR, live gate shard 4 red = search-suggest index issue you say lane Y is on; I re-ran the failed jobs once). #2484 and #2492 merged by you.
- #2499: GET /facility/beds/wards/:id/beds gives each occupied bed its active admission_id so any device can discharge; app prefers it. Spec 3 tests; facility-ops jest 17 pass; tsc clean (backend + app).
- #2500: provider queue gets ?scope=all (open + decided claims, with patient_name, company_name, plan, insurer share); hub groups states into Pending/Approved/Rejected and reads the real field names; default queue unchanged. Spec 4 tests pass; tsc clean. Two older insurance specs (single-writer, save-policy-copay) need a MongoDB download and fail in my sandbox exactly as on main; CI runs them.
- Left in gap 20: staff credentialing fields (licence expiry, malpractice, department-active). Gaps 23/24 are lane Z's; 13/15 deferred.

## 2026-11-08 17:55 — CI check: #2484 green, #2480 live-gate red re-run once
Status: in progress
PR: #2484 all green incl. live. #2480: only red is live gate shard 4/5, journey j_web_search_suggest (patient-web home search, 3 steps: typing the Arabic prefix produced only the last letter in the request, q=ر). Not related to my provider/facility changes; re-ran the failed jobs once (run 42499248302). If it fails again the same way, I will report it as a search-suggest defect for lane X/whoever owns patient-web search rather than touch it.
- #2492 (docs): not re-checked this round.
- Branch w/audit3-bed-admission-id is ready; its PR opens when a slot frees (3 open).

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
