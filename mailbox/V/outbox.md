# Lane V outbox

## 2026-11-10 11:55 UTC — run 114 prepared (deploy after #2595)
Status: ready, waiting for the release sha
PR: none (ops branch)
What changed: branch `v/ops-run-114` (e6d82fa59, fast-forward of the ops tip 0cee259f). RUN: 97-free-old-predeploy, 93-free-unused-images, 60-deploy-main, cf-purge-api, then read-only 96p-medicine-indexes (new: the two covering indexes present + distinct plan), 96n-mongo-oom-cause, 96j-mongo-cache-check. No 91b APPLY. Test: test_medicine_indexes.py (3 pass).
Left: the `release:` line is a PLACEHOLDER (`release:PLACEHOLDER-main-tip-sha-from-lead`): replace with the main tip sha when #2595 merges before pushing to review/server-inspect. I did not push there.

## 2026-11-10 11:10 UTC — P0 mongod OOM: culprit and code fix PR #2597
Status: in progress (CI pending)
PR: #2597
Culprit (read from the code, it fits every run 113 fact; not yet confirmed on the server): GET /medicines/filters. It ran 3 `distinct` scans (category, manufacturer, form) of the whole public catalogue. category is covered by an existing public index; manufacturer and form are in NO index, so each loaded all ~21,000 public medicine documents (about 20 KB each per the schema comment, ~420 MB per scan) into mongod, in sequence and, on a burst of cache misses, in parallel. That is the "20,990 docs examined, 6-8 s" and the memory outside the WiredTiger cache that grew past 1.6 GB. The route only had an edge cache, not a single flight at the app. Connections 27 -> 65 are the same burst.
Fix in #2597: filters() through HotCache (one build per refresh for the fleet, 30 min + stale 1 h); covering indexes {public flags, manufacturer} and {public flags, form} so distinct reads index keys only; GET /medicines/stream (public, full catalogue, no app uses it) capped at 3 at once per process (503 + Retry-After); driver pools api 80 -> 55 / worker 40 -> 25 (budget 242 of 300, the second-replica test still holds). No mem_limit or cache change.
Lead 1 (mongosh x24-32): not a host job. Those are mongod client-metadata log lines: one mongosh opens several connections (main + monitors), the docker healthcheck is 3 invocations per 90 s = about 24 lines. monitor.sh / capacity-sample.sh / oplog-backup.sh run it once per run (15/15/10 min), clamav-window.sh only when CLAMAV_ON_DEMAND=1 (not enabled), _oplog-mongo-wait polls `docker inspect`. The killed process was mongod itself (1.45-1.59 GB). No ops change made.
Left / blockers / questions:
- After deploy, re-run 96n (read-only, already on the ops tip) to see if the kills stopped; if some other slow command shows up in the windows, send it and I fix that too.
- Z's platformledgerentries index (#2584) is not in my PR.
- Stray admin/tsconfig.tsbuildinfo: noted, not in any new ops commit.

## 2026-11-10 08:30 UTC — still waiting for run 113 (P0 mongod loop)
Status: waiting; nothing red on my side
The ops tip on review/server-inspect is still 1e46d6c24 (run 112b), so run 113 (0cee259f, read-only 96n + 96j) has not been pushed: there is no output about the mongod OOM loop yet, and the loop has run since about 03:00 UTC. If the owner is slow to push, 96n can also be run alone by dispatching server-ops on that branch. #2585 (live gate apt lock) is green so far, waiting for the live gate itself. I keep checking the ops tip every 30 minutes and start the fix PR when the output is in.

## 2026-11-10 06:00 UTC — P0 mongod OOM loop: run 113 ready (read-only)
Status: waiting for the owner push
PR: none (ops branch). #2581 CI running on the race fix (d61c71a; the first jobs are green).
Run 113: branch v/ops-run-113, commit 0cee259f41d16d542d0329310068df97bab4900e, a fast-forward of the ops tip 1e46d6c24. RUN = 96n-mongo-oom-cause (new) + 96j-mongo-cache-check (anon/file split, mongod's own cache numbers). No deploy, no limit or cache change, nothing written.
96n prints only short `status:` lines (the public log keeps the first 40 of the run), in this order: (1) the last 5 kernel kills of mongod with time and anon-rss; (2) the mongodb cgroup memory.events (max / oom / oom_kill), current, peak, limit; (3) for each of the last 5 kills, the mongod log of the 90 s before it: number of slow queries and the slowest one (namespace, op type, plan summary, ms, docs examined, client application name), index-build lines, sort/group-memory messages, accepted connections, client application names; (4) waits up to 200 s for the next mongod start and takes a snapshot 30 s and 60 s after it (currentOp top 3 by running time with ns|op|secs|app|plan|command name, connections, resident, tcmalloc allocated/heap, WiredTiger cache and dirty bytes); without a start it takes one now; (5) backend and worker log lines (mongo reconnect, ScheduledOnce, createIndex, migration, aggregate, cron) in the 120 s after each of the last 3 starts: counts and the first two lines. Command bodies and filters are never printed (patient data), mails and long numbers in log lines are masked.
4 new tests pass (fake docker/dmesg/cgroup: kill and cgroup lines, the window summary, snapshots after a start, one snapshot without a start, no command body in the output, read-only); the task takes up to about 5 min (limit per task is 420 s).
Left / blockers / questions:
- Please ask the owner to push 0cee259f. When the output is in, I fix the culprit in code (allowDiskUse, an index, a batch) in one PR.

## 2026-11-10 05:15 UTC — #2581 seat takeover race fixed
Status: in progress (fix pushed, CI pending)
PR: #2581
You were right: the seat was inserted before the booking, and "booking not found" counted as "seat is free", so a parallel request took the seat of a booking that was still being created.
Fix (lab-slot-seats.ts, labs.service.ts): a seat's booking now has three states: live, free (stored as CANCELLED/REPORTED) and missing (not stored). A free seat is taken at once. A missing one is taken only if the seat is `confirmed` (the booking was stored once, so missing now means removed) or older than 2 minutes (SEAT_GRACE_MS, a request that died). `book` confirms the seat right after the booking is stored; the conditional updateOne stays. Specs: seat just inserted and booking not stored yet -> the second reserve gets null (slot_taken); unconfirmed seat taken only after the grace period; confirmed-and-removed taken at once; cancelled seat taken by exactly one of three parallel bookings; and a service-level test with a slow create (second request arrives while the first is still being stored -> one fulfilled, one slot_taken). labs + ordering 147/147, tsc clean.
The own-price spec (stand-in booking model that never stores): the first booking confirms its seat after its create, so a second booking of the same lab in the same minute finds a confirmed seat with a missing booking and takes it: no slot_taken there (I could not run that spec locally, no MongoDB binary; CI is the proof).
Left / blockers / questions: none.

## 2026-11-10 04:10 UTC — #2581 red (provider-own-price.spec): root cause and fix
Status: in progress (fix pushed, CI pending)
PR: #2581 (46ddf9a6 -> new push)
Root cause: the price path itself did not change. In `book` the new seat step took its collection from `this.bkgModel.db`; the own-price spec (real in-memory Mongo, only the booking collections are stand-ins) gives `book` a booking model that has no `db`, so `book` threw a TypeError before it priced anything: every lab case that books (lab A 95 / lab B 130, the per-test choice, "1,200" at registration) failed for that reason, not because of a price. The spec is untouched.
Fix: the seats collection now comes from the provider-profile model's connection (`ProviderProfile.db`, the real database in that spec and in production; the same database as every other lab collection); the unique-index call is cached per collection handle instead of once per process. In that spec the real seat collection works as is: each booking takes a seat, the second booking of lab B in the same minute finds the first seat's booking not live in the stand-in model (countDocuments is 0) and takes it over, so no `slot_taken`. I could not run that spec here (no MongoDB binary in my sandbox, 36 of 36 fail at startup on main too); I read its construction (`new LabsService(LabModel, model, {}, ProfileModel, ...)`) and ran everything else: labs + ordering 143/143, tsc clean. My own specs and the home-fee specs now put the `db` mock on the profile model.
Left / blockers / questions:
- If the spec still shows a lab price failure after this push, send me the first error line.

## 2026-11-10 03:30 UTC — lab capacity PR #2581 (your 02:40 GO)
Status: in progress (CI pending)
PR: #2581
What changed:
- slot_capacity per lab (1-20, default 1), GET/PUT /labs/provider/slot-capacity, the lab sets it in its working-hours screen (card only for role lab, ar+en). Picker and `book` use the same number; the +-30 min "soft cap 3" is gone. Each booking takes a numbered seat of its slot (unique index in lab_slot_seats), so two parallel bookings for the last seat cannot both win (tests: 2 parallel -> 1 wins; capacity 3 with 5 parallel -> 3 win; a cancelled booking's seat is reused; a failed write releases the seat). 14 new tests, labs+ordering 143/143, provider-app 430/430, design-tokens exit 0.
- IMPORTANT finding fixed in the same PR: nothing in the repo ever wrote `schedule_lab`, which the lab slot picker reads. A lab registered through the wizard (it saves `working_hours`) therefore offered NO slots (`no_schedule`), also in the ordering quote. The picker now falls back to the registration hours (as home-care does). Please check production once deployed: lab slot pickers should now show slots.
Left / blockers / questions:
- Watch the live gate: with capacity 1 a second booking of the same lab at the exact same time now gets slot_taken (before: up to 3 within +-30 min). The lab journeys use hours 10, 11, 12; if one fails I fix the journey data, not the rule.
- Radiology uses its own picker (not changed). Say if you want the same capacity there.

## 2026-11-10 02:35 UTC — #2575 merged; last open row (lab capacity): facts and 2 questions
Status: waiting for your answer on the last row; nothing red, no open PR of mine except #2336 (yours to decide)
What changed: nothing new in code since #2575.
The last open row of my list, "lab schedule has no per-service capacity", read in the code today:
- The patient slot picker (labs.service.ts slotsForProvider) offers 30-minute slots from `schedule_lab` and marks a slot taken when ANY non-cancelled booking has exactly that start (so capacity 1 per slot per lab).
- createBooking (same file, ~line 338) is looser: it refuses only when 3 or more bookings fall within +-30 minutes of the chosen time ("soft cap at 3 for safety", comment says the provider schedule could set a higher number, but nothing reads such a setting).
- `schedule_lab` is only written at registration; there is no screen where a lab sets how many samples it can take at the same time, and capacity is per lab, not per test.
Questions (a product definition, so I did not build): (1) capacity per time slot for the whole lab (what I would build: a `slot_capacity` setting, default 1 = today's picker, edited in the lab working-hours screen, used by BOTH the picker and createBooking) or per test (e.g. at most N blood draws and M ultrasounds per hour)? (2) is changing the booking-side limit from "3 within +-30 min" to "the lab's own number per slot" acceptable?
Left / blockers / questions:
- If you want (1) as stated, say "go capacity per slot" and I build it as one PR (backend + lab app setting, ar+en). Otherwise give me another item.
- #2336 (p/screens-audit-2) is current with main and green on my side; merge or close it as you see fit.

## 2026-11-10 01:05 UTC — next provider/admin row: listing first, as ordered
Status: in progress (PR #2574 docs; #2336 still open)
PR: #2574 (docs, CI pending)
What changed:
- I checked every open-looking row of PROVIDER_ADMIN_GAPS.md and the SCENARIOS provider/admin rows against main. G1-G9 are ALL done (G2: price per chosen service is required in NursingRegistration; G1/G3: MyServicesScreen + booking modes; G4/G5/G7/G8/G9 and the licence-expiry list and the pharmacy QR screen (real public page) also on main). SCENARIOS has no provider/admin row that is not COVERED. #2574 corrects the doc (state section dated today).
- Rows really still open: (1) lab schedule has no per-service capacity (slots are per provider, not per test); (2) jobs posted by facilities (POST recruitment/jobs) have no admin list or moderation, only guest jobs are reviewed. Owner-blocked: duplicate merges (MERGE_MAP) and a per-page SEO editor.
Left / blockers / questions:
- Proposal, one PR each unless you say no: (2) admin "jobs" page (list all jobs, close/hide one with a reason, audit-logged; needs a backend route GET/POST admin/recruitment/jobs). Is job moderation wanted at all (product), or only guest jobs? (1) lab per-service capacity is a bigger change (schedule model, patient slot picker): I would not start it without your word.
- Until you answer I do not start (1) or (2). I keep the CI of #2574/#2336 and the inbox under watch.

## 2026-11-10 01:20 UTC — CodeQL fix pushed to #2569; PT-54 backend #2570 (API for X)
Status: in progress (CI pending on #2569, #2570, #2336)
PR: #2569 (fix pushed), #2570 PT-54 backend, #2336 (p/screens-audit-2, merged main in)
What changed:
- #2569 CodeQL: `step-up.guard.ts` credential lookup now takes only a string `response.id` (else 403 unknown_credential) and matches `user_id` and `credential_id` with `$eq`; test added (operator objects, numbers and empty ids never reach findOne); step-up specs 14/14.
- PT-54 backend (#2570), API for X:
  - `POST /unified-bookings/:kind/:id/hide` and `/unhide` (kind = pharmacy | lab | radiology | nursing | consultation, same spellings the history already uses). Answer `{ok, kind, id, hidden}`. Idempotent. 404 `booking_not_found` if not the caller's visit, 400 `invalid_kind`, 400 `visit_not_finished` when hiding a visit that is not COMPLETED/CANCELLED.
  - `GET /unified-bookings/mine` (the history list): hidden visits are left out by default; `?include_hidden=1` returns all; every row now has `hidden: boolean`.
  - Stored in a new collection `patient_hidden_visits` (per patient; the visit documents, provider and invoice views are untouched); added to the PDPL erase/export list. Other lists (care/appointments, invoices) are not filtered.
  - 5 new tests, unified-bookings 30/30, users/PDPL 40/40, tsc clean.
- X: I cannot edit its inbox (RULES). Please tell X: Hide / Show hidden on web + app history uses the three calls above; web proxy allow-list `isAllowedPatientApiTarget` needs `/unified-bookings/{kind}/{id}/hide|unhide` and the `include_hidden` query on `/unified-bookings/mine`.
Left / blockers / questions:
- Nothing blocked. Next: CI on the three PRs; then back to the inbox.

## 2026-11-10 00:10 UTC — 22:40 queue: (b) done #2569, (a) #2336 revived, (c) needs your answer
Status: in progress (CI pending on #2569 and #2336)
PR: #2569 dtolint, #2336 (branch p/screens-audit-2, pushed 3c2c2c3c)
What changed:
- (b) #2569: dtolint was 12 findings, not 4 (8 `any` bodies + 4 inline types): admin recovery start/redeem, step-up issue, legal hold, claim decide, dispute-config, refund-policy (nested), loyalty rewards/challenges/config. Real DTO classes matching the clients, free-form objects carry a `// free-form:` reason, no any/@Allow. dtolint exit 0 (was 1); dtocheck 1 mismatch = the same as main (not mine): POST /ordering/bookings, patient-web sends `family_member_id` (route.ts:36) but CreateOrderingBookingDto has no such field, so the pipe answers 400 for a family booking. For X/Z: add the field (if the quote does not already carry the family member) or stop sending it. New spec, tsc/nest build clean. 15 suites touched by the change fail locally on main too (no MongoDB binary in my sandbox), CI decides.
- (a) #2336: still relevant (real fixes: fake "saved" toasts, wrong endpoints, buttons the server refuses). Merged main in: 3 conflicts resolved (PendingDashboard, LabDashboard, RadiologyDashboard). Two things you should know: (1) main had switched the resubmit to POST /provider/onboarding/submit, but the live journey j_provider_resubmit.py and the audit use /provider-onboarding/submit (the wizard's submit; the older route needs document and bank rows the wizard never creates). I put /provider-onboarding/submit back; my earlier reports and #2555 text said /provider/onboarding/submit, that path was wrong. (2) the PR's new literal strings broke no-literal-ui-string (+4 in each of 4 files): moved 17 strings to the locale files (ar+en); baselines lowered (literal 5420 -> 5375, emoji 42 -> 41, no-left-right 106 -> 104; none raised). provider-app tsc + jest 428/428, design-tokens npm test exit 0. Radiology kept main's Reschedule button on an aborted scan (the PR had replaced it with a text); say if the PR's version was intended.
- (c) PT-54: the catalogue row says "PT-54 = patient hides or unhides a visit from history (P3, patient app)". Your text says "hide a visit type when the provider has no capacity for it". These are different features. I did not guess. Which one? If it is the capacity one, tell me which visit types (clinic / home / video?) and where "capacity" comes from (provider schedule slots, daily limit, nursing availability?).
Left / blockers / questions:
- (c) question above. Everything else is waiting on CI.

## 2026-11-09 22:30 UTC — queue empty, asking for the next item
Status: idle, nothing red (none of my PRs is open: #2557-#2559, #2562-#2564 all merged)
What changed: nothing since the 22:05 entry; read your 22:15 note (run 112b waits for the owner).
Left / blockers / questions:
- My queue (items 1-8 of the old lead) is done or waiting on others: item 7 revenue aggregates (Z owns), item 8 gitleaks (needs the owner's R2 token roll), run 112b (owner push), merge map #2563 (owner decision), APPLY of 91b (your word after the dry run).
- Give me the next item. Candidates I see: (a) the old audit PR #2336 (p/screens-audit-2, from 31 Oct, 29 files, mergeable state unknown): I can merge main in, fix conflicts and get it green if you want it; (b) the 4 dtolint non-class body findings on main (auth/admin-recovery, auth/step-up, security.module): dtolint exits 1 on main; (c) PT-54 hide a visit if X has no capacity. I will not start any of them without your word, except I keep checking the inbox every 30 min.

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
