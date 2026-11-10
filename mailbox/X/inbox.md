# Lane X inbox — web + design (patient web, patient app UI)
Read mailbox/RULES.md first.

## Lead 3 order 2026-11-10 13:15 UTC
- #2596 is green but CONFLICTS with main (after #2595). Merge main, keep the bundle under budget, push; I merge on green.

## Lead 3 order 2026-11-10 12:15 UTC
- #2589 (Z pharmacy backend) merged: the server now requires `reason_code` + photo on pharmacy returns, so #2596 is needed before the next app release.
- #2596 red: Android bundle 11 018 bytes over budget (its own keys + #2595's). After #2595 merges, merge main into #2596 and trim the same way (dead keys / dead strings) until it is under; no budget change.

## Lead 3 order 2026-11-10 11:45 UTC — #2595 red: Android bundle 5 356 bytes over budget
- "Patient Mobile build and tests": 2423/2423 tests pass, but `android bundle 14.69 MB … FAIL: 5356 bytes over the budget`. The budget is not raised.
- Make room inside the app: drop the app locale keys the server no longer sends and no app screen reads (pharmacy before_dispatch / after_dispatch / after_delivery, lab/nursing before_transit, the old radiology.full wording if unused) — an installed old app keeps its own bundled strings, so the new build does not need them; grep the app for each key before removing. Or trim other dead strings. Keep all six languages for the live keys.
- This PR is the deploy blocker (late_rescheduled key): please today.

## Lead 3 order 2026-11-10 11:15 UTC
- #2593 merged. #2595 (keys) now conflicts with main after #2594: merge main, push; I merge on green.
- #2596 (return form) is green but waits for Z's #2589 (an old backend would reject `reason_code`); I merge both together.

## Lead 3 order 2026-11-10 09:50 UTC — client keys still missing (deploy blockers)
- Pharmacy (#2589, when merged): keys `refund.policy.pharmacy.before_preparation {delivery_fee_refunded}`, `.after_preparation`, `refund.policy.card_destination`; return form: only reasons wrong_item / damaged / expired / not_as_described as `reason_code`, photo required; error keys `cancel_not_allowed_after_preparation`, `pharmacy_return_needs_a_defect_reason`, `photo_evidence_required`.
- Consultation: `refund.policy.consultation.late_rescheduled {percent}` (Z re-opens it in a new PR).
- Six languages each, in the same PR as the screen change. I see #2593 (national_id) running — good.

## Lead 3 order 2026-11-10 08:20 UTC — deploy blocker: refund policy keys from #2588
- #2587 merged. Z's #2588 (merged) now sends refund-policy summary lines `refund.policy.lab.full`, `.lab.late`, `.nursing.full`, `.nursing.late`, `.radiology.late` (params `hours`, `percent`) and no longer sends `lab/nursing.before_transit`, `radiology.full` with no params. The clients have no keys for the new ones (web `policy_lab_full` etc. missing in all six files).
- PR now: add the five keys in web + app, six languages, with `{hours}`/`{percent}` (app `{x}` format), using the server params. Keep the old keys until the next app min-version. Tests: the tick shows each new line for lab, radiology, nursing.
- This blocks the next deploy (an old key shown raw to patients at the payment tick).

## Lead 3 order 2026-11-10 07:20 UTC — #2587
- Live gate shard 5/5 failed on `playwright install` (apt lock, infra). The fix (#2585) is on main now: merge main into x/late-reschedule and push; I review on green.
- Note: Z's #2586 is changing the rule (a late-rescheduled booking is refunded at the late % if cancelled). Your preview/UI must show what the server returns, not a client-side 100 %.

## 2026-11-10 04:45 UTC old lead: open questions answered — read lead/OWNER_DECISIONS.md last section (no-show, free reschedule GO, policy version, pharmacy refunds, credit note, national_id).

## 2026-11-10 01:40 UTC — lead 3
1. #2573 (PT-54 UI) merged. Next: when Z posts per-service refund-policy text keys, show the right text per service at the tick (six languages).

## 2026-11-10 00:15 UTC — lead 3
1. #2568 (being-checked state) merged.

## 2026-11-09 23:10 UTC — lead 3
1. When V posts the PT-54 API (patient hides/unhides a past visit from history): add Hide / Show hidden on web + app visit history, six languages.

## 2026-11-09 22:40 UTC — lead 3
1. #2568 (scan state) has a merge conflict, no CI ran: merge main, push.

## 2026-11-09 22:15 UTC — lead 3
1. Before 91b APPLY (UPLOAD_SCAN=defer): uploads are accepted into quarantine and shown later. Check that web + app show a clear "being checked" state for an uploaded file (prescription, report, chat attachment, medical-report attachment) and refresh to ready, six languages. Report in your outbox what exists and what is missing; fix the gaps in one PR.

## 2026-11-09 21:40 UTC — lead 3
1. #2560 (web tick) merged. Refund tick now live in code on web + app once deployed; the server stays optional until we flip by config.

## 2026-11-09 21:40 UTC old lead (OWNER RULE): every patient change ships on BOTH web and app. Next item: audit the last 2 weeks of patient features (M6 order-for-member #2509, Rx pre-checked #2502/#2501, offers sorted #2493, renew #2512, PT-24/27/29/38, refund tick #2560) and list in your outbox any that exist on only one side; then build the missing side, one PR each.

## 2026-11-09 20:45 UTC — lead 3
1. #2561 (app tick) merged right after #2550. #2560 (web tick) when green.

## 2026-11-09 20:15 UTC — lead 3
1. #2560 red: live gate shard 3 `j_manual_request` "[journeys 74: quantity and box photo from the website] web request flow: Locator.click timeout 30 s". Most likely your new tick keeps the submit disabled and the browser journey never ticks it. The journey must tick the box like a real patient (and keep one step proving submit stays disabled without it). Check every browser journey that ends in a paid create/order (tools/live/*web*).

## 2026-11-09 19:40 UTC — lead 3
1. #2554 merged. #2560 (refund tick web) when green.

## 2026-11-09 19:10 UTC — lead 3
1. Refund tick: start the web + app tick now on Z's key `refund_policy_accepted: true` (Z's #2550 will accept it optional first). Policy text before payment, six languages, every create route listed in #2550's body, web BFF routes included. One PR web, one PR app (after #2554 merges).

## 2026-11-09 18:40 UTC — lead 3
1. #2553 merged. #2554 conflicts again (with #2553: generated inventories / locale files). Merge main, regenerate, push; I merge on green. To avoid this loop: when two of your PRs touch the generated inventories, open the second only after the first merges.

## 2026-11-09 17:40 UTC — lead 3
1. #2552 merged. #2553 and #2554 are green but have merge conflicts with main (generated inventories/locales most likely): merge main into both, regenerate, push.

## 2026-11-09 16:15 UTC — lead 3
1. #2552 green but has a merge conflict with main (after #2549): merge main, push; I merge when green.

## 2026-11-09 15:45 UTC — lead 3
1. #2549 (PT-08 web) merged. #2552/#2553/#2554: I review when green.

## 2026-11-09 15:15 UTC — lead 3
1. #2544 merged (bundle -7.1 MB, budget lowered: good). PT-03 app PR can be opened now. #2543 merged: Z's medical-report API is on main for #2549.

## 2026-11-09 14:45 UTC — lead 3
1. #2537 merged. Patient UI for the new routes when Z's PRs land: "The doctor did not come" button (appears 10 min after the start, only before the visit started), and the refund preview text per the new table.

## 2026-11-09 old lead: OWNER DECISION — NO WALLET. Late cancel (<2 h) = 50% card refund OR one free reschedule within 14 days (details: lead/OWNER_DECISIONS.md, last section). Do not build any wallet/credit.

## 2026-11-09 13:25 UTC — lead 3
1. #2542 merged. #2537 now has a conflict with main (after #2542): merge main, push.
2. PT-08 wording changed by owner decision (lead/OWNER_DECISIONS.md): the patient-side document is "تقرير طبي / Medical report" with a recommended rest period, never "sick leave"; show "Seha registration: pending / Registered on Seha: <n>". Use Z's #2543 API as described in Z's outbox 14:20.
3. Refund: Z adds refund_policy_accepted on paid creates; you add the policy text + "I agree" tick before payment (six languages) when Z posts the key.
4. #2544 is red on 3 checks (component contract 12.A7, icon set 12.A6, Patient Mobile build): fix; never loosen those checks.

## 2026-11-09 old lead: owner decisions on refunds + "medical report" (ex sick leave) — read lead/OWNER_DECISIONS.md (last section) before any PT-08/refund work. Run 109 is LIVE (main@58a1bb6e).

## 2026-11-09 12:45 UTC — lead 3
1. Bundle budget: (a) is NO, I never raise budgets. Do (b) yourself: run a bundle composition report (source-map-explorer or `npx react-native-bundle-visualizer`/metro --sourcemap) on the Android release bundle and list the top 15 modules by size in your outbox; cut ≥6.2 KB from real waste (duplicate deps/polyfills, a whole-library import where one function is used, dead screens/components left after the redesign, big inline SVG/JSON data, duplicated strings). One small PR "app bundle: -N KB" first, then open the PT-03 app PR on top. Do not drop features (no (c)).
2. PT-03 next step (booking for a dependant with family_member_id) is fine after that.
3. The guardian-consent wording and "no birth date at signup" go to the owner; I ask him. Keep your wording until he answers.
4. #2542, #2537: I review when green.

## 2026-11-09 12:30 UTC — lead 3 (OWNER DECISIONS)
OWNER DECISION PT-08 sick leave (2026-11-09): BOTH sides. (a) Patient: when booking a consultation, an option "I need a sick leave" (request, not a guarantee). (b) Doctor: can issue a sick leave with a set period whether or not the patient asked. (c) The leave is a stamped certificate like the invoice: shown in the app and on the web, downloadable as PDF, with: platform name + logo (Noon Dot, tokens only), certificate serial no., issue date/time, doctor name + specialty + license no., patient name + ID/iqama no. (masked in lists, full on the certificate), consultation date + booking ref, leave from-to + number of days, reason (the doctor's wording; diagnosis only if the doctor ticks "show diagnosis"), doctor's e-signature/stamp, and a QR code + short code that opens a public verify page (valid/revoked, name initials, dates; no diagnosis). Rules: no back-dating before the consultation date; a revoke with reason; audit log. Some of this exists already (appointment-outcomes.service.ts, provider.controllers.ts, patient-app AppointmentSections.tsx, sick-leave-read.test.ts): extend it, do not duplicate.
LEGAL NOTE (for owner, not a blocker to build): in KSA the MOH says sick leave reports are legitimate only through Seha/Sehhaty, fakes carry SAR 100,000 fines; facilities connect by registering on Seha or by e-link. Build ours so a Seha reference/link field can be added later; do not label it as a government document.
YOUR PART (patient web + app, after #2537): "I need a sick leave" option in consultation booking; the certificate screen (stamped view like the invoice, download PDF, share), list under the appointment; verify page on the web (/verify/sick-leave/[code], public, minimal). Six languages, tokens only. Wait for Z's API (outbox). PT-08 row → COVERED with a live journey at the end.

## 2026-11-09 12:10 UTC — lead 3
1. #2540 merged (key removal proof accepted). #2537 next when green. Then continue the patient-scenarios list (next 3).

## 2026-11-09 11:20 UTC — lead 3
1. #2539 merged (lighthouse green on re-run).
2. #2537 and #2540 have merge conflicts with main (no CI ran). Merge main into both and push.
3. #2540 removes 27 keys from every patient-app locale file: say in the PR which keys and prove none is still used (grep), or restore them. I merge only after that.

## 2026-11-09 10:50 UTC — lead 3
1. #2539 (PT-09) is red on lighthouse: total-blocking-time 260 ms vs budget 240 on all 3 runs (consistent, not noise). Find what in the PR (or what main now ships on those 3 URLs) adds main-thread work and cut it (code-split, defer, lighter import). Do NOT raise the budget. If main itself is at ~260 without your PR, say so with the main run number and I give it to the owner of that change.
2. #2537/#2540: CI not started yet; I review when green.

## 2026-11-09 10:15 UTC — lead 3
1. #2526 (PT-27) merged; #2525/#2527 already in. Good work.
2. Next: list the patient-side SCENARIOS rows still PARTIAL/MISSING (web+app), ordered by user impact (booking, payment, pharmacy first), in your outbox; then take the top 3, one PR each, same rules (six languages, tokens only, tests for payment/booking).

## 2026-11-09 06:45 — lead 3: next orders (one PR each)
1. PT-29 push permission denied (patient app): clear in-app state + settings link, no crash; test.
2. PT-27 prescription OCR result shown and corrected (web + app): the correction UI on the scanner result if the backend accepts corrections, else a Needs-review line.
3. PT-24 payment return into the APP (deep link back from the gateway lands on the result screen with the payment id); test.

## 2026-11-09 02:45 — lead 3: next orders (one PR each)
1. docs/design/needs-review/m6-blocked.json: rows now unblockable after M3-M8 + decision 1-3 (item names, prefill read by the flows, renew action): build the client parts that have a backend; leave the rest with a one-line reason.
2. PT-54 patient hides/unhides a visit from history (web + app; backend field if exists, else Needs-review line), PT-30 location-permission-denied state on web (clear message + manual address fallback), six languages.

## 2026-11-09 00:45 — lead 3
Decision 1: lane Z adds `family_member_id` to booking/order create (validated to the caller's family). Start the client part now on a new branch, wired to the existing family-members endpoint, default = the patient, sending `family_member_id` only when another member is chosen; keep it unmerged-ready until Z's PR lands (I merge Z first, then yours). Six languages, tokens only, RTL.

## 2026-11-08 18:00 — lead 3
Merged by me: #2420 and #2398 (Y). #2366 now conflicts (inventories, as expected): merge origin/main, regenerate inventories, push; I merge when green.

## 2026-11-08 17:15 — lead 3
Decision 2 ("prescription medicines pre-checked"): apply it literally and in both places with the same intent: (a) pharmacy: items that come from a doctor's prescription are pre-checked; (b) ordering screens (Ord03): the doctor's-order items are pre-checked. Pre-checked, NOT locked: the patient can untick (no hidden forced purchase). Say this in the PR body.

## 2026-11-08 16:25 — lead
OWNER DECISIONS for M6 ordering screens (binding): (1) an order can be for the patient or a family member; default = the patient. (2) Prescription medicines are pre-checked; the patient can uncheck. (3) Show all offers' prices sorted, best offer highlighted. Build them now, one PR per screen group.

## 2026-11-08 16:15 — lead 3
Right not to guess the M6 product rows; I list them for the owner. Next (no product call needed): widen the doctors-page lighthouse margin (1.9 KB): lazy-load the consult card chunk (~10 KB) on /ar/consultations/doctors, new branch `x/doctors-js`, same measuring table in the PR. While merges are stalled you may hold 4 open PRs.

## 2026-11-08 13:15 — lead 3
Merged: #2424 #2445 #2448 #2482. Left: #2420 then #2366 (both green + approved) — keep them merged with main; next: PROGRESS.md "Next" items.

## 2026-11-08 09:45 — lead
Merged: #2424 (site notice), #2445, #2448, #2482. #2420 and #2366 now have MERGE CONFLICTS with main: merge origin/main into each (same branch), resolve, push, keep green.

## 2026-11-08 12:45 — lead 3
All green and approved: #2424 #2445 #2448 #2420 #2366 #2482. Merge order (owner merges): #2424, #2445, #2448, #2482, #2420, #2366. After each landing, re-merge main into the next and regenerate inventories (#2420/#2366 conflict) so they stay green.

## 2026-11-08 11:15 — lead 3
LiveKit download works again (since ~11:00). Re-run failed live-gate jobs once on your PRs now (or merge main after #2479 lands); fix only non-download reds.

## 2026-11-08 10:46 — lead 3
#2376 is merged (main e483e477). Now merge main into #2424 first, then #2445 #2448 #2420 #2366, regenerate inventories, check lighthouse on each.

## 2026-11-08 10:45 — lead 3
Live gate is red on every PR because the LiveKit v1.10.1 download itself is broken (not your code). Lane Y fixes it in #2479. Do not chase those reds; after #2479 lands, merge main into your PRs. Keep working on your next items.

## 2026-11-08 09:15 — lead
#2376 is MERGED (Lighthouse green on main). Now merge origin/main into #2424 (site notice, owner priority), #2445, #2448, #2420, #2366 (same branches) so Lighthouse re-runs green; fix anything still red. #2482 also: CodeQL + live gate.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

## 2026-11-08 09:45 — lead 3
Good margin check. No further cut now. Wait for #2376 to land, then the five PRs in order #2424 (site notice, owner priority), #2445, #2448, #2420, #2366, regenerating inventories after each. Meanwhile start PROGRESS.md "Next" item 0/1 on a new x/ branch (max 3 open of your own counting the takeovers you are actively changing).

## 2026-11-08 09:15 — lead 3
#2376 is fully green (43/43, lighthouse passes) — reviewed and APPROVED; it lands as soon as the merge goes through. Right after it is on main: merge main into #2445 #2448 #2424 #2420 #2366 and make each green (lighthouse included). Meanwhile, check that the margin on the doctors page (1.9 KB) survives those PRs; if not, cut more before they land.

## 2026-11-08 07:50 — lead 3 (new lead): ORDER, supersedes decision B
Policy change: lighthouse-red PRs are NOT merged any more (no exceptions) and the budget is never raised. So nothing of yours lands until `lighthouse` is green; do not wait for landings.
1. Now: on #2376 (`design/web-budget`), cut first-load JS until `resource-summary.script.size` passes the existing budget on every audited page (/ar, /ar/c, doctors). Start the CoreShell split / lazy islands there (or a new `x/` PR stacked on main if cleaner). Measure locally with the same lighthouse config before pushing; paste per-page script KB in the PR body.
2. When #2376 is fully green, tell me in the outbox; I merge it at once, then merge main into #2445 #2448 #2424 #2420 #2366 and make each green.
3. Heartbeat-only checks are not allowed while this order is open. Report progress (KB numbers) every check.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 lead order: lighthouse decision
Decision: B. Do not start the icon-record refactor yet. #2445, #2448, #2424, #2450 are approved for merge (other checks green; lighthouse is on main already). #2376: CodeQL shows red on its tip, check and fix it, then it is approved too. Afterwards re-measure /ar, /ar/c and the doctors page on main and only then size the structural CoreShell split, in its own PR. Keep merging main into #2420/#2366 right after a landing.

## 2026-11-07 11:20 — lead note
RULES.md rule 6 changed: do not wait for CI before starting the next item; keep going without stopping, fix reds as they appear, at most 3 open PRs. Re-read RULES.md.

## 2026-11-07 order 1 (do in this order, one PR each)
Background: the previous design session stopped; its open PRs are yours now. Take each PR over by checking out its branch, merging origin/main in, and pushing to the SAME branch (do not open duplicates).
1. **Lighthouse script budget** (blocks every web PR): CI check `lighthouse` fails `resource-summary.script.size` against `patient-web/.github/lighthouse-budget.json`. Do NOT raise the budget. Finish #2376 (`design/web-budget`, first-load JS split; also red on CodeQL — fix that too), then #2445 (`design/web-lazy-search`, red on live gate shard 2/5) and #2448 (`design/web-lazy-home`, red on "Patient Web build and tests").
2. **Site notice #2424** (`design/site-notice`), owner priority: red "under construction / trial version, not for real orders" bar on every website page; informational only; six languages; design tokens only; admin flag `site_notice_enabled` default ON; no noindex; zero client JS if possible. Make it green.
3. #2420 nursing options UI (`design/nursing-options`), #2366 invoice UI (`design/invoice-ui-2`): merge main, make green.
4. Then `docs/design/PROGRESS.md` "Next": item 0 owner colour stack PRs, item 1 M6 ordering UI rows that are not blocked.
