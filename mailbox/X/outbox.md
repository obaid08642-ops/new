# Lane X outbox

## 2026-11-08 19:20 UTC — decision 2(b) (doctor's order items pre-checked in the basket) built and pushed; PRs for 2(a) and 2(b) wait for a free slot
Status: in progress
PR: not opened (cap): branches `x/rx-prechecked` (2a pharmacy) and `x/orders-prechecked` (2b ordering) pushed, both with tests green. Open own PRs unchanged: #2420 (green), #2366, #2491 and #2493 (lighthouse green on both). Nothing landed; main a74179a8.
What changed: 2(b): the Order button of a labs/radiology group posted to the backend, got a prefill (the group's items) and ignored it, landing on the service home. Now the route hands the catalogue ids to the basket (`?order=<id>&pre=<ids>`, ids validated, max 12), the order group links to the basket instead of the service home, and the basket shows a "From your doctor's order" checklist: the items are added to the local basket once per order (pre-checked), each can be unticked (removes the line, the item stays open in My medical orders) and ticked again; nothing is locked. Nursing keeps its entry (nursing is not bookable through the basket yet). Two new strings in six languages; tsc 0; vitest 452 files green; locale-parity and literal-string gates clean; the two Needs-review rows (prefill not read, doctor's items not pre-ticked) are closed. Not seen at runtime (no backend here). PR body will say pre-checked, NOT locked.
Left / blockers / questions: (1) The cap: tell me to open the two PRs now (6 open then) or I open them as the others land; nothing is waiting on you except this. (2) Next: decision 1 (family member), the biggest of the three: the member goes through the context bar, the URL and the quote (`family_member_id`, the backend already takes it), default the patient, ASAP hidden (no member field).

## 2026-11-08 18:45 UTC — decision 2(a) (pharmacy pre-checked) built and pushed, PR not opened: I am at the PR cap
Status: in progress
PR: branch `x/rx-prechecked` pushed, NO PR yet. Open own PRs: #2420 (green), #2366, #2491 (doctors page), #2493 (offers sorted) = 4 = your cap. Landing state unchanged (main a74179a8).
What changed: decision 2(a), as you clarified at 17:15: on a doctor's prescription, "Order these medicines" now lists the catalogue medicines as ticked checkboxes (only when there is more than one), only the ticked ones go into the cart, the patient can untick any (pre-checked, NOT locked: no forced purchase), nothing ticked disables the button with a line saying why. Hand-written lines (no catalogue id) are still only counted, as before. Two new strings (`Prescriptions.pickLabel`, `pickNone`) in the six languages; locale-parity and no-literal-ui-string gates clean; tsc 0; vitest 451 files green; new tests for the chosen-items logic, the pre-checked markup, the single-medicine case and the six-language keys. Not seen at runtime (no backend here).
Left / blockers / questions: (1) Can I go above 4 open PRs for these decisions? You asked for one PR per screen group, and there are three more (2a pharmacy, 2b Ord03, 1 family member). If not, I open #2a the moment one of the four lands. (2) Next I build 2(b) (Ord03 doctor's-order items pre-checked, unticking = the existing "later") then 1 (family member chip), each its own branch and PR, same rules.

## 2026-11-08 17:55 UTC — owner decision 3 (offers sorted, best highlighted) built: #2493; decisions 1 and 2 queued behind the PR cap
Status: in progress
PR: #2493 (new, `x/offers-sorted`, CI starting). Own open PRs now: #2420 (green, waiting), #2366 (1df21188, CI running), #2491 (doctors page, CI running), #2493 = 4, the maximum you allowed.
What changed: decision 3: the providers step (Ord05) pinned the best match first and listed the rest in server order, so the list was not sorted when the best (ranked by score) was dearer than others. `providerPriceList` now returns every provider with its own total in one list, sorted (price ascending by default; server order kept for nearest / fastest / rating), the best match flagged in place with its coverage lines and insured share under it. No price is computed on the client. Choice I made: providers that lack an item sort after the complete ones (their price is for fewer items). tsc 0, vitest 451 files green, tests added.
Left / blockers / questions: (1) I will start decisions 1 (family member, default the patient) and 2 (pre-checked) as separate PRs as soon as one of my four PRs lands (cap). (2) Decision 2 says "prescription medicines are pre-checked": I read it for the ordering screens as the doctor's-order items (the patient's active medical orders for that test/scan/service) pre-ticked and untickable, as in the board's Ord03 row; if you mean the pharmacy prescription order screens, tell me and I switch. (3) Decision 1: the member goes into the quote context (`family_member_id`, the backend already accepts it and stores it on the quote), carried through the URL like place and pay, one chip in the context bar listing the patient and their family members (GET /family/members); ASAP has no member field, so I will hide the member chip for the ASAP broadcast path unless the backend takes it.

## 2026-11-08 17:20 UTC — order 16:15: doctors-page margin widened, #2491 open (-6.3 KB on the doctors page)
Status: in progress (CI on #2491 starting)
PR: #2491 (new, `x/doctors-js`); #2420 (c62b0c4e) fully green, waiting for the owner; #2366 (1df21188) merged with main again after #2485 landed (CI starting); #2485 landed.
What changed: lazy-loading the consult card would not have helped (a lazy server-rendered client component is still preloaded by the page), so the card is no longer a client component. `DoctorListCard` was client only for the reader's-zone next free time; that dragged DoctorCard (Cards.tsx), the next/image runtime (via optimizedImageSrc) and the class maps into the page. Now: server card + the existing `LocalTimeLine` island; the mirror drops "use client" from Cards.tsx (no hook in it) and lets `DoctorCardProps.nextSlot` be a node. First-load script, brotli (build manifest): /ar/consultations/doctors 42.2 -> 35.9 KB (-6.3), /ar 32.1 -> 30.0 (-2.0), /ar/c 36.3 -> 36.2 (-0.1). The doctors margin goes from 1.9 KB to about 8 KB. tsc 0, vitest 452 files green (4 new tests), mirror `--check` clean; the CI lighthouse run is the proof (no local Lighthouse here).
Left / blockers / questions: (1) A correction: when I merged main into #2366 the conflict was in docs/design/PROGRESS.md and I resolved it with main's file, which dropped #2366's own "00. Invoice UI" item; I noticed it, restored the item and pushed the fix (1df21188). (2) Visual note on #2491: the clock icon of the next-free-time line shows before its text is written. (3) Open own PRs: #2420, #2366, #2491.

## 2026-11-08 15:50 UTC — status: #2420, #2366, #2485 fully green, waiting for the owner's merge
Status: waiting (nothing red, nothing for me to fix)
PR: #2420 (c62b0c4e, 40 checks success), #2366 (c3f5eb13, 45 success), #2485 (2803e31c, 32 success): 0 red, 0 pending, all clean with main 92446efa. main has not moved since the 13:15 landings of #2424 #2445 #2448 #2482. Inbox: newest X order still the 13:15 note. Both schedules fire on time (every 30 minutes).
Left / blockers / questions: when #2420 lands I merge main into #2366 (inventories regenerate) and re-check it. I take no new item without an order: the remaining M6 `[client]` rows need a product call (For whom, doctor's-order pre-ticking, non-best-match price lines) and I will not guess in a payment/insurance flow.

## 2026-11-08 13:45 UTC — #2424 #2445 #2448 #2482 landed; #2420 and #2366 re-merged with main; PROGRESS PR open
Status: in progress (waiting for CI on two new tips)
PR: #2420 (c62b0c4e) and #2366 (c3f5eb13): main 92446efa merged in, CI starting; #2485 (new, docs only): PROGRESS.md "Next" brought up to date.
What changed: after the four landings, #2420 and #2366 conflicted only in the generated docs/design inventories. For each I took main's files, regenerated them with screen-inventory.mjs (`--check` clean), and ran sync-ui-components `--check` (clean), web tsc (0 errors) and the full vitest (452 files green) before pushing. #2366 is merged with main as it is now; when #2420 lands I merge main into it once more (the inventories will conflict again). #2485: PROGRESS item 0 said "all open" but every one of its PRs (#1961 to #1990) is merged, and item 1 now states the real M6 state; file 7.8 -> 6.5 KB.
Left / blockers / questions: nothing red. After #2420 lands I redo #2366 against main the same way. Open own PRs: #2420, #2366, #2485 (three). Next items after these are the three `[client]` M6 rows (For whom, doctor's-order pre-ticking, non-best-match price lines) only if you tell me to take one; everything else open there is backend or owner.

## 2026-11-08 12:20 UTC — #2445 and #2448 fully green; #2424 / #2420 / #2366 waiting on their last job
Status: in progress
PR: #2445 (123550cc): 38 checks success, 0 red, 0 pending: READY. #2448 (3d1012de): 38 success, 0 red, 0 pending: READY. #2424 (444596ff): 40 success, 0 red, last job `live gate (shard 1/5)` still running. #2420 (666497da) and #2366 (14e1505e): 40 and 45 success, 0 red, only the `live` aggregate queued. #2482 (0b19c2bd): 30 success, 0 red, 6 running/queued. All six clean with main f5a698ee.
What changed: nothing pushed; the earlier download-outage reds (503/504) cleared on their own re-runs.
Left / blockers / questions: nothing red. The lead can merge #2445 and #2448 now and #2424 the moment its shard ends (the order you set was #2424 first; #2424 is the only one still running a real job). I merge main into the next PR after each landing.

## 2026-11-08 11:25 UTC — lighthouse GREEN on all five PRs after main (#2376) was merged in
Status: in progress (live-gate / CodeQL re-runs and the rest of CI still finishing)
PR: #2424 (444596ff), #2445 (123550cc), #2448 (3d1012de), #2420 (666497da), #2366 (14e1505e): `lighthouse` completed success on every one; all clean with main f5a698ee. #2482 (0b19c2bd): CI running, no red so far.
What changed: nothing pushed this check except the earlier #2482 commit. Reds seen so far were all download outages: #2424 live gate shards 1 and 3 (curl 503/504), #2448 CodeQL analysis (CodeQL CLI download 504). I re-ran the failed CodeQL job on #2448 once (triggered). #2424's live gate run is still in progress, so GitHub refuses the re-run until it ends; I do it at the next check, once.
Left / blockers / questions: nothing that is not a download. Merge order stays #2424, #2445, #2448, #2420, #2366; tell me when each lands and I merge main into the next (regenerating inventories if they conflict).

## 2026-11-08 10:45 UTC — #2376 landed: main merged into all five PRs and #2482, CI re-running
Status: in progress (waiting for CI on six new tips)
PR: #2424 (444596ff), #2445 (123550cc), #2448 (3d1012de), #2420 (666497da), #2366 (14e1505e), #2482 (697233b3): all pushed, CI starting
What changed: merged origin/main (f5a698ee, with #2376) into each branch; all merges were clean, none needed an inventory regeneration. Before pushing I ran on every branch: web `tsc --noEmit` 0 errors and the mirror `--check` clean (the sprite change removed FILL_ICON_PATHS / LINE_ICON_PATHS, so a branch importing them would have broken; none did); full vitest on #2420 and #2366 (450 files green). #2482: its reds were the old Lighthouse (it predated #2376) and the live gate / CodeQL jobs that hit the GitHub release-download 504 (curl 504 in the LiveKit install and in the CodeQL bundle, same outage you described); the new push replaces those runs, so no separate re-run was needed.
Left / blockers / questions: I read each tip's checks at the next two checks and fix any red that is not a `curl 504`. Order for landing as you set it: #2424, #2445, #2448, #2420, #2366 (merge each when green; I regenerate inventories on the next one if needed).

## 2026-11-08 10:20 UTC — order 09:45: first M6 slice open as #2482; waiting for #2376 to land
Status: in progress
PR: #2482 (new, `x/ordering-m6`, CI starting); #2376 approved, not on main yet; #2424 #2445 #2448 #2420 #2366 clean with main
What changed: PROGRESS "Next" item 0 is gone (its PRs are no longer open) and item 1's backend rows are no longer blocked (M3-M8 on main). I checked all open web M6 rows (m6-*-web.json, m6-blocked.json, m6-visual-web.json): most are `[backend]`. Took the cleanest `[client]` one as slice 1 (#2482): the confirm step (Ord07) showed preparation lines only for lab items; it now reads lab, radiology and nursing items through the item page's own `loadItem`, nothing invented. tsc 0, vitest 449 files green (new test for it), inventory `--check` clean, row closed in `m6-ord06-07-web.json`. Not seen at runtime (no backend here).
Left / blockers / questions: (1) I did not start "For whom" (family member): it needs the member in about fifteen call sites of the quote/booking flow and the ASAP request has no member field, in a payment/insurance flow I cannot run; say if you want it anyway and I will do it as its own PR with the safe default (member only where the quote already takes it). (2) Same for doctor's-order pre-ticking and non-best-match price lines. (3) Order after #2376 lands is unchanged: #2424, #2445, #2448, #2420, #2366, regenerating inventories after each.

## 2026-11-08 09:35 UTC — #2376 43/43 green; margin check with the other five PRs done
Status: done on my side for #2376; next step starts when #2376 is on main
PR: #2376 (tip 727eaf6b: 43 checks success, 0 red, 0 pending, lighthouse green); #2445, #2448, #2424, #2420, #2366 clean with main 120407dc
What changed: nothing pushed. Margin check as ordered: I merged #2445 #2448 #2424 #2420 #2366 on top of #2376 in a throwaway local branch (not pushed, deleted), built it and measured first-load script (brotli, page + layout chunks, build manifest): /ar 37.0 -> 32.1 KB (lazy search + order-again), /ar/c 36.3 KB (unchanged), /ar/consultations/doctors 42.2 KB (unchanged). So the doctors margin of 1.9 KB survives all five (the site notice adds no client JS; nursing and invoice touch other routes). tsc 0 and the mirror `--check` clean on the combined tree.
Left / blockers / questions: (1) The generated docs/design inventories conflict between #2420 and #2366 themselves (both regenerate them), so after one lands the other needs main merged and the inventories regenerated; I do that right after each landing. (2) The doctors margin is thin (1.9 KB); a further cut is available if you want more room (the consult card chunk, about 10 KB, is the next target) but I do not start it unless you say so. (3) I merge main into the five PRs the moment #2376 shows on main.

## 2026-11-08 08:50 UTC — #2376: `lighthouse` is GREEN on 727eaf6b
Status: in progress (2 checks still running: `runtime contrast (rendered pages, both themes)` and `live gate (shard 2/5)`)
PR: #2376 (tip 727eaf6b): 40 checks success, 0 red, 2 pending; `lighthouse` completed success (it runs on /ar, /ar/c and /ar/consultations/doctors against the unchanged budget).
What changed: nothing since the last report; this is the CI result of the sprite change (icon outlines out of the JavaScript, about -9 KB brotli on each audited page, local build numbers: 37.0 / 36.3 / 42.2 KB).
Left / blockers / questions: I will tell you when the last two checks finish (next check in 30 min); if one goes red I fix it. The sprite can only plausibly affect the contrast check (icon colours now come through `<use>`); I read its result as soon as it ends. Not green yet means do not merge yet.

## 2026-11-08 08:30 UTC — order 07:50: #2376 first-load JS cut by ~9 KB per page (CI pending)
Status: in progress (waiting for the real `lighthouse` run on tip 727eaf6b)
PR: #2376 (tip 727eaf6b, merged with main 112a5c2c; CI running)
What changed: the two icon records (57 fill + 32 line glyphs, ~13 KB brotli) were inside the JavaScript of every shell page. They are now `<symbol>`s of a static SVG sprite (`public/icons/sprite-<hash>.svg`, immutable cache, drawn with `<use href>`), generated by `tools/design/sync-ui-components.mjs`; no icon name or call site changed. First-load script, brotli, page + layout chunks from the build manifest: /ar 46.3 -> 37.0 KB, /ar/c 45.6 -> 36.3 KB, /ar/consultations/doctors 51.3 -> 42.2 KB (saved 9.3 / 9.3 / 9.0 KB). The cut needed from the last CI run was 1.7 / 1.5 / 7.1 KB, so the margin is 7.6 / 7.8 / 1.9 KB. Local checks: tsc 0, vitest 449 files green, mirror `--check` clean; icons checked in Chromium on the production build (sprite 200, icons drawn). PR body has the table and the checks.
Left / blockers / questions: local Lighthouse is not possible here (no docker), so the CI `lighthouse` run on 727eaf6b is the proof; I will tell you the moment it is green (I check every 30 minutes) and fix anything red. If it is green: please merge #2376; I then merge main into #2445 #2448 #2424 #2420 #2366 if you have not.

## 2026-11-08 06:20 UTC — heartbeat: checked, nothing new
Status: blocked on landings
PR: #2376, #2445, #2448, #2424, #2420, #2366: clean with main f2b0e686, only `lighthouse` red. Inbox: newest X order still the 16:10 decision (B), no commit to it for 14 hours. Both schedules fired on time every 30 min since 04:17 UTC.
Left / blockers / questions: nothing landed; I start the CoreShell split sizing the moment one of the approved PRs is on main.

## 2026-11-08 04:20 UTC — heartbeat: checked, nothing new
Status: blocked on landings
PR: #2376, #2445, #2448, #2424, #2420, #2366: clean with main f2b0e686, only `lighthouse` red. Inbox: newest X order still the 16:10 decision (B), no commit to it for 12 hours. Both schedules fired on time every 30 min since 02:17 UTC.
Left / blockers / questions: nothing landed; I start the CoreShell split sizing the moment one of the approved PRs is on main.

## 2026-11-08 02:20 UTC — heartbeat: checked, nothing new
Status: blocked on landings
PR: #2376, #2445, #2448, #2424, #2420, #2366: clean with main f2b0e686, only `lighthouse` red. Inbox: newest X order still the 16:10 decision (B), no commit to it for 10 hours. Both schedules fired on time every 30 min since 00:17 UTC.
Left / blockers / questions: nothing landed; I start the CoreShell split sizing the moment one of the approved PRs is on main.

## 2026-11-08 00:20 UTC — heartbeat: checked, nothing new
Status: blocked on landings
PR: #2376, #2445, #2448, #2424, #2420, #2366: clean with main f2b0e686, only `lighthouse` red. Inbox: newest X order still the 16:10 decision (B), no commit to it for 8 hours. Both schedules fired on time every 30 min since 22:17 UTC.
Left / blockers / questions: nothing landed; I start the CoreShell split sizing the moment one of the approved PRs is on main.

## 2026-11-07 22:20 UTC — heartbeat: checked, nothing new
Status: blocked on landings
PR: #2376, #2445, #2448, #2424, #2420, #2366: clean with main f2b0e686, only `lighthouse` red. Inbox: newest X order still the 16:10 decision (B). Both schedules fired on time (20:17 to 22:17 UTC, every 30 min).
Left / blockers / questions: nothing landed; I start the CoreShell split sizing the moment one of the approved PRs is on main.

## 2026-11-07 20:05 UTC — schedules verified; no new order in the X inbox
Status: blocked on landings (not on anything I can do)
PR: #2376 (tip c06d9e3d), #2445, #2448, #2424, #2420, #2366: all clean with main af4f1c55, the only red check on each is `lighthouse`
What changed:
- Scheduled tasks: both are real triggers bound to this session with persistent_session_id=session_01JnGhHLkmjzp6svJv7k3Vih (create_trigger, not the session-only cron): trig_01W1c9avbsUPuCzYaJ9qcJe8 (minute 17) and trig_01CEz4ss89WaunoEFnDuoWuc (minute 47). list_triggers shows last runs at 19:18 and 19:48 UTC, both SUCCEEDED, next 20:17 and 20:47. Prompts updated today to the wording in the lead's note. I did not create duplicates. The gap in my outbox is because every check since 17:20 found nothing new and nothing red, so I wrote nothing (RULES: end quickly); I will add a one-line "checked, nothing new" entry every second hour from now on so it is visible that the checks run.
- Inbox: the newest X order on branch mailbox is still the 16:10 lighthouse decision (B); `git log -- mailbox/X/inbox.md` shows no commit after ecc3ae08. If a newer order was meant for X it is not on the branch.
Left / blockers / questions: #2445, #2448, #2424 are approved but unmerged (lead state: the merge helper is blocked by the classifier, owner has to allow it or merge). #2376 still needs the lead's review (149 files); CodeQL is green on it. I start the CoreShell split sizing as soon as any of them is on main, as ordered.

## 2026-11-07 17:20 UTC — #2376 CodeQL green; nothing else new
Status: done for the ordered fix; waiting for landings
PR: #2376 (tip c06d9e3d, CI finished: only `lighthouse` red, CodeQL green), #2445, #2448, #2424, #2420, #2366 (only `lighthouse` red; all clean with main f1dff924)
What changed: nothing in code. The CodeQL fix on #2376 worked (no new alerts).
Left / blockers / questions: #2376 is ready for the lead's merge. No landings yet, so no re-measure of /ar, /ar/c and the doctors page and no CoreShell split sizing yet; I start that the moment the approved PRs are on main.

## 2026-11-07 16:10 UTC — decision B received: #2376 CodeQL fixed; second scheduled task created
Status: in progress
PR: #2376 (tip c06d9e3d, CI pending); #2445, #2448, #2424 approved by the lead (all clean with main f1dff924); #2420, #2366 clean with main
What changed:
- Scheduled tasks: now two hourly tasks 30 minutes apart, both firing into this session: trig_01W1c9avbsUPuCzYaJ9qcJe8 (minute 17) and trig_01CEz4ss89WaunoEFnDuoWuc (minute 47). Created 2026-11-07; I will check for an expiry and renew them if the account expires them (7 days).
- #2376 CodeQL: the red "CodeQL" check was 2 new high alerts (polynomial regular expression, the nested-quantifier pattern that detects a leading `"use client"`) in patient-web/tests/fill-glyph-boundary.test.ts:24 and tools/design/codemod-ficon-glyph.mjs:46. Both now use a linear scan (no backtracking). fill-glyph-boundary tests 5/5, web tsc 0, node --check ok. Merged main (clean) and pushed.
Left / blockers / questions: waiting for CI on #2376 (its lighthouse stays red until the structural work, but the lead said lighthouse is on main already). After the landings I will re-measure /ar, /ar/c and the doctors page on main and size the CoreShell split in its own PR, as ordered. Not starting the refactor before that.

## 2026-11-07 15:25 UTC — hourly check: all six PRs green except lighthouse
Status: blocked on the lighthouse decision (no new order in the inbox)
PR: #2376 (121719fc), #2445 (8a0606ff), #2448 (d0f0ff74), #2424 (3854dbe7), #2420 (01ffb253), #2366 (59c0502e): CI finished on every tip; the only red check on each is `lighthouse` (script size), everything else (Patient Production CI, live gate, CodeQL, browsers, acceptance, security) is green. All six merge cleanly with main (checked against babb67ca).
What changed: nothing in code this hour.
Left / blockers / questions: every one of the six is held only by the lighthouse budget, which main itself exceeds (about +5.8 KB on /ar, +3.0 KB on /ar/c, +9.0 KB on the doctors page before any PR). Merging #2376, #2445, #2448 brings /ar under the budget; /ar/c and the doctors page need the shared-component refactor (CoreShell's icon records, about 3 KB from the glyph trim and the rest from splitting CoreShell), which I cannot size below ~1 day of work and will start only on your go. Alternatively the lead may decide how the lighthouse check is treated for merges; I will not change the budget.

## 2026-11-07 14:25 UTC — hourly check: #2420 and #2366 had no CI (conflict with main), fixed; option A re-assessed
Status: in progress (waiting for the lead's decision on #2376)
PR: #2420, #2366 (new tips 01ffb253, 59c0502e, CI starting), #2376 / #2424 / #2445 / #2448 (red only on lighthouse; merge with main is clean)
What changed:
- #2420 and #2366 reported `mergeable_state: dirty` after main moved again, so GitHub ran no CI on my earlier tips. Same cause as before (generated docs/design inventories conflict on every main update): merged main again, took main's files and regenerated them with screen-inventory.mjs, pushed. They will conflict again whenever another PR lands; a merge by the lead right after a green run avoids a third round.
- Option A (line-icon record trim) re-measured: only 9 of the 32 line icons are unused by the web (about 1 KB gz), and a missed name throws at runtime, so it does not pay. The real saving is structural (CoreShell's two icon records in the first load of every shell page), a refactor of the shared components that I will not start without the lead's go.
Left / blockers / questions: no new order; blocked on the lighthouse decision (B recommended: merge #2376, #2445, #2448 as soon as their other checks are green, then /ar passes; /ar/c needs ~1.5 KB and doctors ~7 KB more via the structural refactor, tell me if you want it).

## 2026-11-07 13:20 UTC — hourly check: only Lighthouse is red on the first four PRs
Status: in progress (waiting for the lead's decision on #2376)
PR: #2445 (CI: all green except lighthouse; live gate fixed), #2448 (all green except lighthouse), #2424 (all green except lighthouse), #2376 (all green except lighthouse; CodeQL green), #2420 / #2366 (no CI result for the new tips found yet, checking next hour)
What changed: nothing new in code. New measurement from #2445 (main + lazy search only): script size /ar 175,927, /ar/c 177,119, /ar/consultations/doctors 183,096 B (budget 174,080). Compared with #2376 (175,748 / 175,533 / 181,229) this shows main itself is over the budget by about 5.8 / 3.0 / 9.0 KB, so every web PR is red on lighthouse until the budget work lands, whatever the PR changes. #2376 saves ~3.6 KB on /ar, 1.6 KB on /ar/c, 1.9 KB on doctors versus main; #2445 saves 3.7 KB on /ar and #2448 2.3 KB on /ar (home only), so /ar should pass with #2376 + #2445 + #2448 merged; /ar/c needs another ~1.5 KB and doctors ~7 KB.
Left / blockers / questions: same decision as before (A: separate icon-record refactor PR; B: land #2376/#2445/#2448 first). Without an answer I will start A next hour on branch x/icon-record from the merged state of #2376, because it is the only way to get /ar/c and doctors under the budget.

## 2026-11-07 12:30 UTC — hourly check: #2445 live-gate red fixed
Status: in progress
PR: #2445 (CI: pushed fix 8a0606ff, pending), #2448 / #2424 (live gate running; other checks green so far), #2376 / #2420 / #2366 (not re-read this hour)
What changed: #2445 live gate shard 2/5 was a real regression, not a flake: journey j_web_search_suggest reads role=combobox / aria-controls / aria-autocomplete on the Home search field at load, and the lazy field only had them after the first focus. The plain field now carries the collapsed combobox attributes and points to an empty hidden listbox; the live field still replaces it on first focus. web tsc + full vitest green locally. The journey was not touched.
- Lighthouse is red on #2424, #2445, #2448 (same script-budget cause as #2376, not a regression of those PRs; patient-production-ci and CodeQL are green on them).
Left / blockers / questions: unchanged from the 12:40 entry: #2376 needs the decision (A: icon-record refactor PR, B: land #2445/#2448 first). Waiting for the lead's answer in the inbox; no new order this hour.

## 2026-11-07 12:40 UTC — order 1 item 1 (#2376): blocked on a design choice; items 2-3 pushed; item 4 has nothing open
Status: blocked (#2376 only); everything else waiting for GitHub CI (runners were queued at 11:10, nothing had started)
PR: #2376 (lighthouse red: -1.7 KB /ar, -1.5 KB /ar/c, -7.1 KB /ar/consultations/doctors needed), #2445 #2448 #2424 #2420 #2366 (CI queued)
What changed: nothing new in code since the 12:00 report except experiments that I reverted.
- Tried making ConsultState client-only (`ssr:false`): only -0.75 KB on the doctors page. Not kept.
- Doctors page cost (brotli, manifest-based): layout 24.8 KB + CoreShell chunk 14.2 KB + consult card chunk 9.9 KB + filters sheet 2.4 KB = 51.3 KB; /ar = 46.3 KB. The CoreShell chunk carries two icon records (fill record 57 glyphs ~7.8 KB gz, line-icon record 32 glyphs ~5.3 KB gz) that every shell page ships. Real savings need either per-glyph modules for the line-icon record (like the fill record) plus a smaller fill core list (needs call-site changes in ~60 files), or splitting CoreShell. I did not start this blind: it is a large refactor of shared design components.
- Item 4: the owner colour stack (#1961, #1968, #1971, #1974, #1980-#1990) is no longer among the open PRs (merged or closed), so item 0 has nothing to do; item 1 (M6 ordering rows) lists only blocked rows besides what is built.
Left / blockers / questions:
- Decision for the lead: (a) approve the glyph/icon-record refactor as its own PR (I would do it: line-icon per-glyph modules first, ~-2 KB everywhere, then fill core trimming), or (b) merge #2445 and #2448 first (they bring /ar under) and treat /ar/c and doctors as a second step. Until CI numbers for #2445/#2448 are in, I cannot tell if /ar/c passes. I will start (a) on a new branch x/icon-record only after CI shows which of the six PRs are green, because of the 3-open-PR cap.
- The hourly task will check CI of the six PRs and fix any red.

## 2026-11-07 12:00 UTC — order 1: all six PRs taken over, merged with main, pushed (CI pending)
Status: in progress
PR: #2376 (CI: lighthouse RED, CodeQL check red 3 s), #2445 (pending), #2448 (pending), #2424 (pending), #2420 (pending), #2366 (pending)
What changed:
- #2445 `design/web-lazy-search`, #2448 `design/web-lazy-home`: merged main, tsc + full vitest green locally (449 files). #2448: one test asserted the literal `<OrderAgainCard` in home-quick-tiles; now it asserts `<OrderAgainGate` and that the gate lazy-imports the card (same intent, not weakened).
- #2424 `design/site-notice`: the web part was already complete (server component, no client JS, action tokens, six languages, no noindex, default ON, tests). Added the backend half: GET /config now carries `features.site_notice_enabled = true`, an admin feature-flag row with that key switches it off; spec added; backend tsc, config jest (11 pass), dtolint 0 locally.
- #2420 `design/nursing-options`, #2366 `design/invoice-ui-2`: merged main; the only conflicts were generated docs/design inventories, regenerated with tools/design/screen-inventory.mjs (--check clean), not hand-merged. web tsc + vitest green locally.
- #2376: merged main earlier; CodeQL run on the head commit is green now. Lighthouse still over budget, identical to before: script 175748 / 175533 / 181229 B vs 174080 on /ar, /ar/c, /ar/consultations/doctors (needs -1.7 / -1.5 / -7.1 KB). From the build manifests (brotli): layout chunks 24.8 KB are common; the doctors page adds the CoreShell chunk (14 KB, with the 57-glyph fill record 21 KB raw and the 32-glyph line-icon record 13 KB raw) and the consult card chunk (10 KB). I tried trimming the fill core list (-27 glyphs): about -3 KB but 99 type errors and a codemod that duplicates FillAnyName and cannot fix client data-driven icons, so I reverted it (too invasive to do blind).
Left / blockers / questions:
- #2376 needs a real cut of ~7 KB on the doctors page (candidates: per-glyph modules for the line-icon record in src/Icon.tsx like the fill record; not loading CoreShell's full tab/search code on consult pages). I will work on it next. After #2445 (-3.7 KB on /ar) and #2448 land, /ar should pass; /ar/c (-1.5 KB) and doctors do not yet.
- Rule 6 cap (3 open PRs): I now hold six taken-over PRs because the order told me to take them all over; I opened no new PRs. Question: ok to treat them as one block, or tell me which to drop?
- Local Lighthouse is not possible (no docker daemon here); I measure from `.next/server/app/**/page_client-reference-manifest.js` entryJSFiles + the .br sizes, which matched the CI difference between pages within 0.5 KB.

## 2026-11-07 11:00 UTC — order 1, item 1: #2376 design/web-budget
Status: in progress
PR: #2376 (CI: pending after merge of origin/main, tip 121719fc)
What changed: took over the branch, merged origin/main (no conflicts), tsc and `next build` pass locally, pushed to the same branch. Branch commit says "not yet under the Lighthouse budget" (last CI: script 175748 B on /ar, 175533 on /ar/c, 181229 on /ar/consultations/doctors, budget 174080). Local Lighthouse needs the CI local-api backend, so I use CI numbers.
Left / blockers / questions: waiting for CI numbers, then cut first-load JS further (no budget change) and fix CodeQL. Hourly scheduled task created (trig_01W1c9avbsUPuCzYaJ9qcJe8, fires into this session). #2445, #2448, site notice, #2420, #2366 not started (the rules say not to start the next item while the previous PR is red).

