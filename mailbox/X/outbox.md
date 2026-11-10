# Lane X outbox

# Lane X outbox

## 2026-11-10 national_id (decision 6): PR open; #2590 merged
- PR https://github.com/obaid08642-ops/new/pull/2593 (x/national-id): web + app ask for the national ID / iqama number only when a medical report needs it: (1) report detail with `needs_national_id`: form replaces the PDF button, PDF returns after saving; (2) booking when the patient ticks "I need a medical report" and `has_national_id` is false: same form inline, never blocks the booking. Client-side check = the server's (10 digits, 1 or 2, check digit). Six languages, tests, bundle 15,385,155 (budget 15,393,070). Needs Z's #2591 deployed; before that nothing is asked.
- #2590 (refund keys) merged. Nothing else open on lane X.

## 2026-11-10 refund keys of the 2-hour table (your 08:20 blocker): PR open
- PR https://github.com/obaid08642-ops/new/pull/2590 (x/refund-keys-2h): web + app text for `refund.policy.{lab,nursing,radiology}.full` ({hours}) and `.late` ({hours},{percent}), six languages; `radiology.full` text now carries the hours; old before_transit keys kept. Tests: each new line shown for lab, radiology, nursing, plus a new test (web + app) that every line key the reader accepts has a message in all six languages, so this cannot ship silently again.
- #2587 merged (thanks). App bundle 15,385,149 (budget 15,393,070).
- Suggestion for Z/lead: when a new `refund.policy.*` key is added on the server, the spec could list the keys and our test (KNOWN_LINES) fails until the clients have them; I can add that check to the server spec if Z wants.

## 2026-11-10 #2587: main merged (your 07:20 order)
- Merged main (with #2585) into x/late-reschedule and pushed; inventories regenerated. Waiting for CI.
- The UI shows no percentage of its own for the late-rescheduled case: the notice has no figure, and the cancel screen's refund figure still comes from the server (`refund_now.percent`), so Z's loophole fix needs no client change.

## 2026-11-10 free reschedule (decision 2): PR open
- PR https://github.com/obaid08642-ops/new/pull/2587 (x/late-reschedule): web + app cancel/reschedule screens read Z's `refund-preview.free_reschedule` (#2586). When late and available they say "cancelling returns part; you can move it once, free, within N days", and the existing reschedule picker reaches N days (14) instead of 7. Six languages, readers + tests. No offer if the preview is unreadable or the free one is used: screens behave as before. Needs #2586 deployed to show.
- Heads-up: the app bundle is 15,385,313 vs budget 15,393,070 (7.7 KB left). Main grew; this PR adds almost nothing. Whoever adds app code next will hit the budget; a trim pass may be needed (I can do one: ask).
- Waiting for Z: national_id fields (medical report). Pharmacy wording question still open (accepts/prepares vs dispatched).

## 2026-11-10 04:55 UTC read your 04:45 decisions; #2578 is merged
- #2578 (per-service refund text) merged. No open PR on lane X.
- Read the decisions. For X, waiting on Z's APIs before I build: (1) free reschedule instead of 50% on late cancel (web + app: a choice at cancel, then the reschedule picker, six languages, table text via Z's summary `free_reschedule` line); (2) national_id asked at the medical-report request (and before download when missing). I start each as soon as Z posts the endpoint and fields.
- Pharmacy note: the owner's text is "100% until the pharmacy accepts/prepares"; Z's summary keys are before_dispatch / after_dispatch / after_delivery. The wording of those three lines is mine; tell me if it must say "accepts/prepares" instead of "dispatched" and I change the six translations.

## 2026-11-10 per-service refund text at the tick: PR open
- PR https://github.com/obaid08642-ops/new/pull/2578 (x/refund-tick-text): web + app tick reads Z's `GET /refund-policy/summary?service=...` (#2577) and shows each line in six languages with the server's numbers; falls back to the general line if the read fails (so it is safe before #2577 is deployed). Every call site passes its service.
- Fixed on the way: app key `consult.hidden.showLink` used `{{n}}` (app format is `{n}`), the placeholder would have shown in "Show hidden visits (N)" since #2573.
- Not done: sending back the `hash` shown (Z's optional 409 refund_policy_changed); say if you want it (needs the field on every create body).

## 2026-11-10 PT-54 hide / show hidden: PR open
- PR https://github.com/obaid08642-ops/new/pull/2573 (branch x/pt54-hide): Hide / Show hidden on web + app appointment history (past tab), six languages, tests, bundle 15,291,030 (budget unchanged).
- Lists are not server-filtered, so clients read the hidden set from `GET /unified-bookings/mine?kind=consultation&include_hidden=1`. Suggest to V: a light `GET /unified-bookings/hidden` later.
- Not yet: orders centre rows (pharmacy/lab/radiology/nursing). Say if you want them next.

## 2026-11-10 00:20 UTC — PT-54 waiting for V; a backend gap V found is real (for Z)
- PT-54 Hide / Show hidden: V has not posted the API yet (V's 00:10 entry asks you which "PT-54" is meant: the catalogue row is "patient hides or unhides a visit from history"). I start the moment the route is posted (web + app history, six languages). Told V nothing: you own that answer.
- I confirmed V's dtocheck finding on main: `CreateOrderingBookingDto` (backend/src/modules/ordering/ordering.dto.ts) has no `family_member_id` (only the quote and ASAP DTOs do), while my web BFF (`app/api/ordering/bookings/route.ts`) and the app send it when a lab or radiology booking is made for another family member (decision 1). With `forbidNonWhitelisted` that booking would answer 400. It only shows when a family member is chosen (the patient's own booking never sends it). For Z: add `family_member_id?: string` (same validator as AsapDto) to `CreateOrderingBookingDto`, and check the booking service stores it. No client change needed.
- #2568 (scan state): main merged, no red, CI running.

## 2026-11-09 23:45 UTC — upload "being checked" audit (order 22:15): [PR 2568](https://github.com/obaid08642-ops/new/pull/2568)
What exists (web + app share the gate, badge and six-language strings): profile photo (both), support chat image (both), return photos (app; no web upload), pharmacy box photo (web), doctor chat attachment and voice note (app: MediaScanWatch + badge; web: text and voice only, the voice player gates on 423).
What was missing: OPENING a stored file in quarantine (423): the lab report PDF (web raw JSON, app "no report") and the nurse's visit result files (web raw JSON, app generic error). Fixed in one PR: web `ProtectedFileLink` (probe, "being checked", opens by itself when ready), app `downloadProtected(..., onPending)` + nursing file 423, new string in six languages, tests (web +4, app +2; web 3030, app 2,406 pass).
Checked, not affected: prescription photos (`upload_image`) and lab/radiology booking documents (`url_or_b64`) are stored inline in their records, OCR calls store nothing, the medical report PDF is generated: no quarantine. Open question for you/owner: the provider-app side (a doctor or pharmacy opening a quarantined file) is not in this lane. No live quarantine journey (needs `UPLOAD_SCAN=defer`).

## 2026-11-09 23:00 UTC — #2560 live gate red fixed (journeys now tick the box)
- Cause (as you said): two browser journeys never ticked the new box, so the send button stayed off: `j_patient_flows_c` (pickup checkout, shard 1) and `j_manual_request` (shard 3).
- Fix in `tools/live`: those two plus `j_web_home_nursing` (the nursing booking confirm, would have failed next) now check "I have read the refund policy and I agree to it" (Arabic text) like a patient, each with a step proving the button is disabled BEFORE the tick. `j_telehealth_consent`'s web booking helper (it mimics booking-flow's POST) now sends `refund_policy_accepted: true`. I grepped every journey for create clicks (Arabic button labels of all create screens) and for web-proxy create posts: no other journey ends in a paid create/order. Main merged into #2560 (inventories regenerated); pushed, gate re-running.
- Not run here (no stack): the journeys themselves; CI is the proof.

## 2026-11-09 22:30 UTC — refund tick (app) up: [PR 2561](https://github.com/obaid08642-ops/new/pull/2561)
- App half of the refund tick, opened after #2554 merged: shared `RefundPolicyTick` + `withRefundPolicy`, all app create flows (consultation booking, instant, ordering bookings + radiology + ASAP, insurance lab/radiology bookings, home nursing, the three pharmacy order screens). 34 existing tests needed the tick first and were updated; new tests for the tick, the field on the create calls, and the off-until-agreed button. App jest 288 suites / 2,404 passed; bundle 15,285,840 of 15,393,070.
- Merge order for both: Z's #2550 first, then [#2560](https://github.com/obaid08642-ops/new/pull/2560) (web) and #2561 (app), then remove the `REFUND_POLICY_ACCEPTANCE=optional` line from `tools/live/start-backend.sh`. The app refill from medication reminders is left alone (Z: legacy path answers 503).
- Still open from my side: booking a consultation for a dependant (`family_member_id`), live journeys for PT-08/PT-03 after deploys.

## 2026-11-09 21:00 UTC — refund tick (web) up: [PR 2560](https://github.com/obaid08642-ops/new/pull/2560); #2554 re-merged
- Web refund tick: shared tick + `withRefundPolicy`, every web create flow (consultation booking, instant, lab/radiology/ASAP ordering, diagnostics checkout, nursing, the three pharmacy order screens), BFF schemas require the literal true, six languages, tests for the refusal. Merge AFTER Z's #2550 (unknown fields are rejected); then the `REFUND_POLICY_ACCEPTANCE=optional` line in `tools/live/start-backend.sh` goes (not touched). Routes with no web caller are listed in the PR body.
- #2554 (PT-08 app) conflicted again after #2553: main merged, inventories regenerated, pushed. I will open the app refund tick only after #2554 merges (your rule on the inventory loop).
- Test lesson (3rd time): the `app` directory holds tests too; I now run `app lib tests` before every push.

## 2026-11-09 18:00 UTC — app PRs opened after #2544; #2552 red fixed
- Opened: [PR 2553](https://github.com/obaid08642-ops/new/pull/2553) (PT-03 app: Add a child) and [PR 2554](https://github.com/obaid08642-ops/new/pull/2554) (PT-08 app: medical report request, list, detail, PDF share). Main merged into both, inventories regenerated, tests green locally.
- #2552 (no-show UI) was red on 2 checks: (1) web: `appointments-ssr.test.ts` renders the appointment page without a message provider, and my new client island needs one: the test now mocks the island (its own logic is tested separately); I had run only `tests` and `lib`, not `app`, so I now run `app lib tests` before every push. (2) app: the bundle was 1,873 bytes over the OLD budget (CI measured before #2544 merged); with main merged it measures 15,248,836 of 15,393,070. Pushed; CI re-running.
- Waiting: refund tick (#2550 not merged and conflicting); my answer on labs/pharmacy text.

## 2026-11-09 17:00 UTC — 14:45 order: "the doctor did not come" up; PT-08 app held; refund tick next
- [PR 2552](https://github.com/obaid08642-ops/new/pull/2552): "The doctor did not come" on the web appointment page and the app appointment screen, on Z's `POST /care/appointments/:id/provider-no-show` (#2548): offered 10 minutes after the start, only for confirmed / checked-in / en-route visits, a confirm step (cancelled + full refund), the server's refusal shown as an error. Six languages, tests (web logic + allowlist, app 4). Works only once #2548 is deployed.
- #2549 (PT-08 web): main merged (a test-file conflict kept from both sides, inventories regenerated), pushed; 2,747 web tests pass.
- PT-08 app (`x/pt08-app`) and PT-03 app (`x/pt03-dependants-app`) are pushed and wait for #2544 to merge (bundle budget); I open both the moment it does.
- Refund policy tick (`refund_policy_accepted`): I read Z's 15:25 entry (14 create routes, the server rejects unknown fields so I cannot ship before #2550 merges, and the live-gate `optional` env line is removed when my PR lands). Plan: a shared tick component with the policy text (consultation table: >= 2 h 100%, < 2 h 50% to the card, patient no-show 0%, doctor no-show 100%; the other services use their own rules, linked to the policy page), one PR per group of flows (consultation booking web+app first, then ordering, then pharmacy and cart). Branches stay unopened until #2550 is merged. Question: for labs, radiology, nursing and pharmacy the 2-hour table does not apply (Z: "own rules"); is a link to the policy page plus the tick enough there, or do you want a per-service text?

## 2026-11-09 16:00 UTC — #2544 fixed, #2537 merged with main, PT-08 web up
- #2544 (bundle): the 3 reds had one cause: the per-glyph deep imports resolve to the Phosphor package's TypeScript SOURCE, so tsc type-checked `lib/icon-base.tsx` and failed (12.A6, 12.A7, Patient Mobile build). Checks not loosened. Fix: the 32 glyphs now come through `packages/ui-native/src/phosphorGlyphs.js` (plain `require`s) with a `phosphorGlyphs.d.ts` beside it, so tsc takes the types from the .d.ts and never opens the package source (a tsconfig `paths` stub was rejected: Expo's Metro and jest honour `paths` at runtime and would have swapped the real glyphs for the stub). Reproduced locally first (ui-native tsc), then: ui-native tsc clean for this file, patient-app tsc clean, provider-app tsc clean, patient-app jest 282 suites, provider-app 70 suites, real bundle 15,241,408 bytes (budget 15,393,070). CI is re-running.
- #2537: main merged again after #2542, inventories regenerated, pushed.
- PT-08 web: [PR 2549](https://github.com/obaid08642-ops/new/pull/2549) on Z's API (#2543): booking tick "I need a medical report" (`sick_leave_requested`), `/medical-reports` list + detail + PDF, public `/[locale]/verify/sick-leave/[code]` (minimal fields, asserted by a test), wording "Medical report" / Seha pending-registered / footer, old "Sick leave" label renamed in six languages. It shows the error state until #2543 is deployed.
- Next (in order): PT-08 app screens; PT-03 app PR (`x/pt03-dependants-app`) as soon as #2544 merges; booking for a dependant with `family_member_id`; refund policy tick when Z posts the key.

## 2026-11-09 14:30 UTC — bundle report and trim: -7.1 MB ([PR 2544](https://github.com/obaid08642-ops/new/pull/2544))
Composition report (per module from the Metro source map of the Android bundle): top 15 modules are in the PR body. The big items: `phosphor-react-native` 5.77 MB (the whole library, for 32 glyphs, via `import *` in `packages/ui-native/src/Icon.tsx`), app i18n 4.75 MB (`autoTranslationsPhase5.json` 1.82 MB, the six locale files 0.2 to 0.64 MB each), `livekit-client` bundled twice (esm 535 KB + umd 533 KB, because `app/room/[id].tsx` did a `require`), `@sentry/conventions` 349 KB, `mdn-data` 199 KB.
Cut: per-glyph Phosphor imports and no second livekit require. Measured Android bundle 22,411,297 -> 15,240,663 bytes (-7.17 MB, not 6.2 KB). I lowered `perf/bundle-budget.json` to 15,393,070 (measured + 1%), as the file's own note says to do when the bundle shrinks; if you want a different margin say so. Tests: patient-app full jest 282 suites / 2,377 passed, provider-app 70 suites / 408 passed (same `Icon`); jest transform allow-list gets `phosphor-react-native` in both apps.
Not touched, for you: `autoTranslationsPhase5.json` (1.1 MB on disk, `src/i18n/index.ts`), `@sentry/conventions`, `mdn-data`, the MaterialCommunityIcons glyph map: each needs a product or dependency decision.
Next: when #2544 is merged I open the PT-03 app PR (branch `x/pt03-dependants-app`, no longer over the budget) and start PT-08 (sick leave) on Z's API ([PR 2543](https://github.com/obaid08642-ops/new/pull/2543), spec read).

## 2026-11-09 13:40 UTC — #2537 fixed again; PT-03 dependants; budget question; PT-08 waiting for Z
- #2537: main merged again (inventories regenerated), CI is running.
- Patient list: every PT row left is blocked or device-only (PT-24 device, PT-54 backend, PT-08 waits for Z's API, PT-03 below). PT-03 turned out to need more: Z's #2524 gave `POST/GET/DELETE /family/dependants`, but no client could create a dependant, so a guardian could not start a booking for a minor. I built "Add a child" (family/add tab): web [PR 2542](https://github.com/obaid08642-ops/new/pull/2542) (no app bundle impact, open), app on branch `x/pt03-dependants-app` (built, tested, NOT opened).
- **Decision for you (app bundle budget):** the app tab (13 keys x 6 languages + the screen + list/remove) takes the Android bundle to 22,419,755 bytes locally, 6,144 over the 22,413,611 budget. I will not raise it, and I have no unreferenced locale keys left to remove (27 gone in #2540, 25 in #2526; the 25 that remain look dynamic: `consult.rate.star1..5`, `consult.hub.price*`, `diag.offer.count*`). Options: (a) you raise the budget by the measured amount (as for earlier features), (b) you name app code or keys to drop, (c) I drop the list/remove part of the app screen (about 2 KB, not enough alone). Say which; until then the app branch stays unopened.
- Next for PT-03: booking a doctor consultation for a dependant (web and app send `for_member_id`; a dependant needs `family_member_id`), after the budget answer for the app side.
- PT-08 (sick leave): waiting for Z's API (`z/sick-leave-cert`), nothing in Z's outbox yet; I start the booking option, certificate screen and the verify page when it lands.
- Needs the owner: the guardian-consent sentence on the new form is my wording (legal); and signup collects no birth date, so an adult can be added as a dependant (Z's note, no gate added).

## 2026-11-09 11:45 UTC — orders of 11:20 done
- #2537 and #2540: main merged into both (only generated inventories and the PT-27 row conflicted; inventories regenerated, `--check` passes); both pushed, CI should run now.
- #2540 body now lists the 27 removed keys and the proof: each key searched in the app, tests, e2e, scripts, ui-native and web lib (0 hits), dynamic prefixes/suffixes (0 hits), and in backend, web, provider-app and docs (0 hits); the same 27 removed in all six locale files, 0 added; locale parity ok; local bundle 22,408,583 (5,028 under the budget, not raised).
2 PRs open; waiting for CI/next order.

## 2026-11-09 11:30 UTC — #2539 Lighthouse red: variance, not the PR
#2539 (PT-09) changes one web test file, the QA catalogue and nothing that ships: no `patient-web` runtime file differs from main (main's web code is unchanged since 02acfaf7, whose Lighthouse run 42592552103 passed). Only `/ar/c` failed in run 42600605819 attempt 1 (TBT 260.3 vs 240); I re-ran the job (attempt 2) and it passed with no code change. So `/ar/c` sits close to the 240 ms budget on main and flips with runner load; the budget is untouched. If it keeps flipping, the owner of the `/ar/c` page weight could look at it (the page is the catalogue categories). I did not change anything in the PR for this.

## 2026-11-09 12:00 UTC — top 3 of the open patient scenarios: 3 PRs
- PT-03 guardian booking: [PR 2537](https://github.com/obaid08642-ops/new/pull/2537): web test for the booking screen of a family member; row PARTIAL with the evidence (a live journey of a minor's booking needs the stack). Also fixes the PT-27 row (COVERED, client).
- PT-38 chat link: [PR 2540](https://github.com/obaid08642-ops/new/pull/2540): a shared web chat link now opens the conversation of the thread's booking in the app (new `chat-link` screen, no new strings, 5 tests). Row COVERED (unit).
- PT-09 reports: [PR 2539](https://github.com/obaid08642-ops/new/pull/2539): client was already built and tested; row COVERED (client) and an allowlist test for the report download.
Bundle budget: the new screen put the app 1,436 bytes over (budget not raised); I removed 27 locale keys that nothing references (grep, dynamic prefixes included), local bundle 22,408,583 (5,028 under). If you prefer those keys stay, say so and I will find the bytes elsewhere. Earlier today the same was needed for #2526 (25 keys).
Left open: PT-24 (device only), PT-08 and PT-54 (backend first). 3 PRs open; waiting for CI/next order.

## 2026-11-09 10:30 UTC — list of open patient scenarios (order of 10:15)
All patient rows still not COVERED in `docs/qa/SCENARIOS.md` (after #2525, #2526, #2527, #2512, #2515), by user impact:
| # | Row | Status | What is missing | Who can close it |
|---|---|---|---|---|
| 1 | PT-24 payment return (P0) | PARTIAL | link wiring is tested; only the real OS handing the link to the app is open | device farm + production Team ID and fingerprint, not a code gap |
| 2 | PT-03 guardian books for a minor (P1, booking) | NOT COVERED | no test that a dependant's booking carries the member and the guardian pays | X (client test, web + app); journey needs the stack |
| 3 | PT-38 deep links (P1) | PARTIAL | a shared web chat link opens the appointments list in the app, not the conversation | X (resolve thread to booking) if the thread read gives `booking_id`, else product decision |
| 4 | PT-27 OCR corrected (P1) | PARTIAL in the file | client done in #2526; row text still said PARTIAL | X: row fixed in the next PR |
| 5 | PT-09 reports viewed and downloaded (P2) | PARTIAL | no test of the download (web and app) | X |
| 6 | PT-08 sick leave request (P2) | NOT COVERED | the patient can see a sick leave; there is no patient request in the app or backend | backend first |
| 7 | PT-54 hide a visit (P3) | NOT COVERED | no `hidden_by_patient` flag or PATCH | backend first |
I take PT-03, PT-38 and PT-09 now (one PR each; PT-27's row fix rides in the first), unless you say otherwise.

## 2026-11-09 07:30 UTC — orders of 06:45 done (3 PRs)
1. PT-29: [PR 2525](https://github.com/obaid08642-ops/new/pull/2525): already built and tested (6 tests re-run); only the QA row was wrong, now COVERED.
2. PT-27: [PR 2526](https://github.com/obaid08642-ops/new/pull/2526): the OCR lines are shown for correction (edit, remove, add) before saving, web and app, six languages; the backend already takes the items, no backend change; the app now sends name/quantity like the web.
3. PT-24: [PR 2527](https://github.com/obaid08642-ops/new/pull/2527): gap found and fixed: `/payments/result` was not an app link, so the gateway return opened the browser; now in the AASA list, Android filters and link map; test shows the return lands on the result screen with the payment id. Real OS hand-over still needs a device and the production Team ID/fingerprint.
Local checks: web vitest 1898, app jest (pharmacy, i18n, links, payments) green, tsc, locale-parity, literal baseline 5422 unchanged, inventories regenerated. 3 PRs open; waiting for CI/next order.

## 2026-11-09 05:50 UTC — status: idle
Both orders of 02:45 are merged (PR 2512 renew action, PR 2515 PT-30 web / PT-54 gap). No open PRs, nothing red. Waiting for the next order; checks still fire at :17 and :47.

## 2026-11-09 03:00 UTC — orders of 02:45 done (2 PRs)
1. [PR 2512](https://github.com/obaid08642-ops/new/pull/2512): renew action on expired/expiring medical orders (web, six languages); item names and web prefill already done; the app flow's prefill stays open in the row (one line).
2. [PR 2515](https://github.com/obaid08642-ops/new/pull/2515): PT-30 web denied message in the address book (others already handled); PT-54 has no backend flag, so one Needs-review line (backend first).
Checks local: tsc, vitest 1883, locale-parity, no-literal 5422 (unchanged), inventories regenerated. Waiting for CI/next order.

## 2026-11-09 02:20 UTC — decision 1 landed (Z #2510, then my #2509); lane X idle again
Status: idle (no open PR, no red)
PR: none open. On main now: Z #2510 (family_member_id in booking/order create) then X #2509 (the web client part), main 92929afc. All three owner decisions of 16:25 are done: (1) order for a family member (#2509 + Z #2510), (2) pre-checked in the pharmacy (#2502) and in the ordering basket (#2501), (3) offers sorted with the best highlighted (#2493).
What changed: nothing new in code since #2509. Not seen at runtime (no backend in my environment): the first real order for a family member on the live gate or on staging is the check I cannot make; the live-gate journeys for ordering do not cover a member order, so a journey case (quote with `for=<member>`, then booking, then the booking shows the member) is worth adding by whoever owns tools/live.
Left / blockers / questions: waiting for the next order. Schedules still fire every 30 minutes (:17 and :47); I will check their expiry before 2026-11-14.

## 2026-11-09 01:30 UTC — decision 1 (order for a family member): web client part open as #2509
Status: in progress (CI starting); merge after Z's backend PR, as you ordered
PR: #2509 (`x/order-for-member`, new). No other open PR of mine.
What changed: a "For whom" chip in the ordering context bar (Me first and selected, then the family members from GET /family/members; hidden when there are none), carried as `for=<id>` in the address like place and pay (the patient writes nothing) and sent as `family_member_id` ONLY when another member is chosen: in the quote context (already accepted by the backend), the ASAP request, the lab booking and the radiology booking. One finding on the way: the web BFF routes `bookings`, `asap` and `radiology-bookings` use zod schemas that silently strip unknown fields, so the member would never have reached the backend; each now keeps `family_member_id`. Two strings in six languages. tsc 0, vitest 457 files green, new tests (address, builders, chip, wiring, routes, strings), locale and literal-string gates clean. Not seen at runtime.
Left / blockers / questions: (1) Merge order: Z's PR first (booking/order create takes `family_member_id`), then #2509. Until then only a member order depends on it. (2) Please tell Z that the ASAP request (`POST /ordering/asap`, `AsapDto`) and `POST /radiology/bookings` also receive the field, not only `POST /ordering/bookings`. (3) Not covered: nursing (not bookable via the basket yet) and the hub's own filters. I will merge main into #2509 when it conflicts and read its CI at every check.

## 2026-11-08 22:00 UTC — everything of lane X is on main; idle, waiting for an order
Status: idle (no open PR, no red, nothing to build without a decision)
PR: none open. On main: #2376 #2445 #2448 #2424 #2482 #2485 #2420 #2366 #2491 #2493 #2502 #2501 (main 82f6e736).
What changed: the last two (#2502 pharmacy pre-checked, #2501 ordering pre-checked) landed; the three owner decisions of 16:25 are done except decision 1.
Left / blockers / questions: (1) Decision 1 (order for a family member) waits for the backend: bookings do not carry `family_member_id` (spec in my 20:40 entry). (2) Idle otherwise: send the next order, or say "start the client part of decision 1 behind a patient-only default". (3) Schedules still fire every 30 minutes (trig_01W1c9avbsUPuCzYaJ9qcJe8 at :17, trig_01CEz4ss89WaunoEFnDuoWuc at :47); I will check whether they expire (7 days) before 2026-11-14 and renew them.

## 2026-11-08 21:05 UTC — #2366 landed; #2501 re-merged with main; #2502 ready
Status: in progress (waiting for the last checks and for the owner's merges)
PR: #2501 (29f61ddb, merged with main 0a5004a5, inventories regenerated, own needs-review edits intact, tsc 0, vitest 456 files green; CI restarting); #2502 (52beeeb7, clean, 38 checks green, 1 pending). Open own PRs: 2.
What changed: nothing new in code. Decision 1 is still waiting for the backend to carry the member on bookings (spec in my 20:40 entry; no reply in the inbox yet).
Left / blockers / questions: I have no open order I can build without a decision: the three M6 owner decisions are done (3 landed, 2a and 2b in review) except decision 1 (backend). Tell me the next order, or say "start the client part of decision 1 behind a patient-only default" and I do that.

## 2026-11-08 20:40 UTC — decision 1 (order for a family member) is blocked by a BACKEND gap; #2491 landed
Status: decision 1 blocked (backend), everything else waiting for CI
PR: #2491 landed (main 50df9f87). Open own PRs: #2366 (f5e03e78, clean, CI 6/43 so far), #2501 (2b ordering, ecdd1c55), #2502 (2a pharmacy, 52beeeb7): CI running, 0 red.
What changed: before building decision 1 I checked what the backend does with a member, so the UI would not promise something it does not do. Result (grep of backend/src): `family_member_id` exists only in `ordering.dto.ts` (the quote context) and `ordering.service.ts` (it checks the member is the patient's, prices coverage with the MEMBER's policy, and stores the id on the quote row) and in `instant-consultation`. The booking never reads it: `POST /ordering/bookings` creates the bookings under the account holder with no member; `POST /radiology/bookings` and the lab booking routes have no member field at all; `POST /ordering/asap` neither. So a "For whom" chip on the web would price the quote with the member's insurance and then book it as the account holder: the patient would believe the booking is for their relative when the booking record, the provider's schedule, the results and the notifications are not.
Left / blockers / questions: Rule 9, safe option: I do NOT ship the chip until the backend carries the member. Spec for lane Y (backend): (1) `POST /ordering/bookings`: take `quote.family_member_id` (the quote is already the patient's) and store `family_member_id` on every booking it creates, so results, status and notifications can name the member; (2) `POST /radiology/bookings` (and the lab/nursing booking routes that the ordering flow can reach) accept an optional `family_member_id` (own-member check like the quote's `ownMember`) and store it; (3) `POST /ordering/asap` (`AsapDto`) the same, or the web hides the chip on the ASAP path; (4) the booking read models return `family_member_id` (and the member's display name) so the screens can show "for <name>". When (1)-(2) are on main, I build the web part in one PR: context-bar chip (the patient first and selected, then the family members from GET /family/members), `for=<member id>` carried in the URL like place and pay, `family_member_id` in the quote context (the web quote route already accepts it), the member's name on the confirm step; plus the app part if you want it. Tell me if you want me to start the client part now behind a hidden default (patient only) so it merges as soon as the backend lands.

## 2026-11-08 20:00 UTC — #2420 and #2493 landed; #2366 re-merged; PRs #2501 (2b) and #2502 (2a) opened
Status: in progress (CI on the new PRs starting)
PR: #2366 (f5e03e78, merged with main 510305a1, inventories regenerated, own PROGRESS edit intact, 453 files green: ready for you); #2491 (doctors page, 37 checks green incl. lighthouse, ready); #2501 (new, ordering: doctor's items pre-checked in the basket); #2502 (new, pharmacy: prescription medicines pre-checked). Open own PRs: 4.
What changed: with #2420 and #2493 merged I freed two slots and opened the decision-2 PRs. Both bodies say "pre-checked, NOT locked: the patient can untick". #2501: the Order button's prefill reaches the basket; items arrive ticked in a "From your doctor's order" checklist (untick removes the line, the item stays open in My medical orders); two strings in six languages. #2502: "Order these medicines" lists the prescription's catalogue medicines as ticked checkboxes (only if more than one), only ticked go to the cart; two strings in six languages. tsc 0, vitest 453 / 451 files green, gates clean, not seen at runtime (no backend).
Left / blockers / questions: next is decision 1 (family member, default the patient) on its own branch; it needs a slot only for its PR, I build it now. If #2366 or #2491 lands first I merge main into the others as before.

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

