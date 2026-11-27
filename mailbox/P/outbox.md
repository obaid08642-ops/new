# Lane P outbox (newest on top)

## 2026-11-27 P: #2788 merged; no open PRs of mine. QUEUE EMPTY stands (blocked list in the 2026-11-26 entry: rows 49/51/46/52 need the render tool on a working machine, 57/63 a seeded backend, 60/62/105 decisions; app side of row 78 on request).

## 2026-11-26 P: #2788 conflict resolved (#2787 merged)
- Merged origin/main into p2/web-home-care-nearest; conflicts were WIRING_REPORT.md (generated) and the reconciliation doc (took main's, re-applied row 79). Inventories regenerated with `screen-inventory.mjs` (provider files left as main). Nursing tests 22/22, parity ok. GitHub shows conflict-free, waiting for CI and your merge.

## 2026-11-26 P: QUEUE EMPTY (what is left is blocked; list below)
Done and merged or open: rows 1 (#2785 merged), 11 (#2780), 20/101/102 (#2783), 103/104 (#2781), 78 (#2787 open), 79 (#2788 open), 6/28/59/35/36 (already on main, recorded in #2787). Wake-list items (provider literals, https-only, social login, token audit, parity round 2) were done earlier; multi-country Phase 1 audit done (#2776), Phase 3 is lane M's. CI of #2787 and #2788 is still running, no failure so far; I keep them green.
BLOCKED (nothing I can do from this session):
1. Rows 49, 51, 46, 52 (app design slices on the booking/payment path and the test hub): they need the board comparison with `tools/design/render-native-screen.mjs`, which does not run in this sandbox. Missing `@react-native/assets-registry`, then esbuild fails on `expo-modules-core` ts-declarations and `react-native-web` `TurboModuleRegistry` (the installed node_modules do not match what the tool bundles). I will not change screens that pay without the visual check. Needs a machine where the tool runs, or the lead/owner telling me to go on without the render.
2. Rows 57, 63 (web desktop hub with sticky basket card): need a seeded backend for the Playwright board comparison; none here.
3. Rows 60 (flow change), 62 (needs a rating endpoint), 105 (needs a design decision on the dark web header): owner/lead decisions.
4. App side of row 78 (radiology report-file list in the app): small, can be done on request, not in the queue.
The hourly wake will check #2787/#2788 CI and conflicts (inventory files conflict between them: re-sync after the first merges) and stop otherwise.

## 2026-11-26 P: resumed. #2785 merged; PRs #2787 (row 78) and #2788 (row 79)
- #2787 patient web: radiology booking page shows the technician and the published report files (backend already returned them; opened through the signed-link route), 3 keys x 6 languages, test. Rows 6, 28, 59, 35, 36 were ALREADY ON MAIN (evidence file:line in the doc), updated inside this PR, no docs-only PR.
- #2788 patient web: nurse list Nearest sort + "{km} km away" (backend `sort=nearest&lat&lng`, `distance_km`), 3 keys x 6 languages, test. Row 79 FIXED.
- Open on the app side (noted in row 78): the app's radiology order screen has no report-file list. Both PRs regenerate the same inventory files: whichever merges second needs a re-sync, I will do it.
- Open: #2787, #2788. Baselines 105 / 335 unchanged, parity ok. Next: 49 + 51 (booking path, high effort), then 46, 52, 57, 63.

## 2026-11-20 P: #2785 bundle fix pushed (0b0fddcf1)
- Red check was "Patient Mobile build and tests": tests 2488/2488 green, the Android bundle step failed (15,436,958 bytes, 43,888 over budget 15,393,070). Budget untouched.
- Cause: the new route importing a separate `ConnectedAppsView` module made the Hermes bundle +113 KB raw (+9 KB gzip, mostly zero bytes: layout, not code). Moving the view into `SettingsViews.tsx` (where every other settings view lives; route is a thin wrapper) gives 15,329,272 bytes locally = 63,798 under budget. Local figures match CI (the failing run reproduced to the byte). Tests (connected-apps + notification-settings) green.
- Unused-locale-key scan finds only 10 keys left (earlier trim passes took the rest), so no key trim was needed. Paused again, nothing else started.

## RESUME AFTER 2026-11-26 (paused by owner decision, 2026-11-20 12:17 UTC)
Open PRs I keep green and do not extend: #2781 (provider scan state, rows 103/104), #2785 (app Connected AI apps, row 1). Nothing new started.
Next items, in this order (each as one code PR with its own reconciliation-row update, no docs-only PRs):
1. Row 6: web "Book requested tests" on the appointment page (patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:205), existing endpoint, six languages.
2. Rows 28/59: family-member ("for whom") selector in the web ordering context bar (ordering-context.tsx), same as the app.
3. Rows 35/36: results link and per-value trend on the booking card (web booking-status-client.tsx:272; backend ordering-lifecycle.service.ts:312 gives the data).
4. Row 78: radiology technician name and report files on the web booking page; row 79: nearest-first sort with distance on home-care booking (web).
5. Design rows 49 + 51 together (booking path, high effort), then 46, 52, 57, 63 with their boards; 60 (flow change) and 62 (needs rating endpoint), 105 (needs design decision) wait for the lead/owner.
Waiting on owner/lead: row 20 (hub entry for service-home, needs a decision).

## 2026-11-20 12:20 UTC P: PR #2785 patient app Connected AI apps (row 1)
- App screen for GET/DELETE /patient/agent-connections (same endpoints and parser as the web), hub row, 11 keys in six languages from the web translations, 3 tests, row 1 FIXED inside the PR (no separate docs PR). Baselines 105 / 335 unchanged, parity ok.
- Open: #2781, #2785. Next: row 6, 28/59, 35/36, 78, 79, then 49+51.

## 2026-11-20 11:30 UTC P: #2781 conflict resolved
- Merged origin/main into p2/provider-scan-103-104 (only the reconciliation doc conflicted: kept main's rows 101/102/105, my FIXED rows 103/104), pushed. #2780 and #2783 are merged. Understood: from now on reconciliation-row updates go inside the code PR they belong to, no separate docs-only PRs on that file.
- Free slots: 2. Next: rows 1, 6, 28/59, 35/36, 78, 79 (each as one code PR with its own row update), then 49+51.

## 2026-11-20 10:50 UTC P: PR #2783 (docs rows 20/101/102); #2779 merged
- Open: #2780 (row 11), #2781 (rows 103/104), #2783 (rows 20/101/102): cap 3 reached. Wake list items all done earlier (see 09:55 entry). Next after a merge: rows 1, 6, 28/59, 35/36, 78, 79, then 49+51.

## 2026-11-20 09:55 UTC P: PR #2781 (rows 103, 104) + queue state
- #2781 provider app: radiology report upload shows StoredFileScan; nursing visit uploads record/announce the scan state (existing strings, no new keys, test added). Baselines 105 / 335 unchanged.
- Your wake list (provider literals, https-only links, social login, token audit, parity round 2) is all DONE earlier (literals 5277 -> 105, #2711, #2719, #2723, social login backend-verify only). What is left is my own section 7 backlog.
- Row 20 (service-home has no hub entry): the hub tab already draws the same catalogue; an entry would be a new element on no board -> NEEDS OWNER DECISION. Rows 101/102 already on main (ScanStatusBadge in SupportViews / ReturnsViews). Branch `p2/client-recon-20-101-102` is pushed (docs only); its PR waits because 3 PRs are open (#2779, #2780, #2781).
- Next after a merge: rows 1, 6, 28/59, 35/36, 78, 79, then 49+51.

## 2026-11-20 P: row 11 closed as not a defect (PR #2780)
`/consultations/clinic/[id]` already is the facility page (GET /care/facilities/:id); `app/facility/[slug].tsx` is only the link resolver. Docs-only PR, baselines 105 / 335 unchanged. Open PRs: #2779, #2780. Next: rows 1, 6, 20, 28/59, 35/36, 78, 79, 101-104, then 49+51 unless you direct otherwise.

## 2026-11-20 11:00 UTC — design lines triaged (#2779)
- #2779: the design lines read one by one against their original review notes and the code. Row 47 FIXED (the line under the ordering context bar shows only after a change, as the board; test 1). Row 58 NOT REPRODUCED (the shell pads the page for the tab bar at 390, the CTA bars sit in the shell's bottom area, the basket bar lifts by the measured height; the note came from full-page screenshots; a real 390 check is left to the runtime check). The others now carry their real reason in the reconciliation doc: 46, 49, 51, 52, 57, 63 are own slices (shared TestRow/TimeTile, booking path, new range-bar/sparkline components, desktop two-column hub, each needs its board and a visual check); 60 is not a restyle (it changes the choosePartial flow); 62 needs a rating endpoint first (backend); 105 needs a design decision (no dark web header on the boards: a colour cannot be invented).
- Rows 13 and 14 are in #2775. Gates unchanged (literal 105, token-sync 335, parity ok).
- Open PRs: #2775, #2776, #2779 (cap). Decision for the lead: the 9 remaining design rows are real slices that need their boards (46, 49, 51, 52, 57, 63) or a decision (60, 62, 105). Tell me which to take first, or point me at the board files; otherwise I take 49 + 51 together (the booking path, high effort) after the open PRs merge.

## 2026-11-20 09:30 UTC — #2773 and #2774 merged; multi-country Phase 1 client audit (#2776)
- #2773 (row 90) and #2774 (rows 64/93) merged. #2775 (rows 13/14/21/25) is open, waiting for review.
- #2776: the multi-country Phase 1 audit for the four clients, READ-ONLY, docs only, in docs/platform/mc-audit/: `client-journeys.md` (item 3, 14 steps), `ui-impact.md` (item 11, 10 concerns, about 90 rows, file:line, change, Phase 3 step), `provider-admin-matrix.md` (item 12, all 70 admin pages with their guard line, provider app by type, staff roles, gaps), `ui-evidence.md` (all 625 scan hits as file: lines). All 357 citations were checked against the repo (file exists, line within the file); lines carrying a claim were read.
- Main findings: (1) no client has any market concept (0 files mention market / country_code / MarketContext); (2) the web already sends raw phone input to the server and reads the emergency number from it, while the app and provider app hard-code +966 and Saudi validators; (3) the web is locked to SAR in format-price.ts:18 (29 callers) and in three payment-capability routes (z.literal("SAR")); (4) roles and permissions have no scope dimension on either side; (5) the payment-host guard already lists Moyasar, Tap and Stripe, and a gateway interface exists in the app: good seams for step 9.
- Open PRs: #2775, #2776. Left from my queue: the 11 design lines (rows 46, 47, 49, 51, 52, 57, 58, 60, 62, 63, 105: board restyles that need render + board comparison, tokens only) and rows 1, 6, 11, 20, 28/59, 35/36, 78, 79, 101-104 of section 7 that the lead's list did not name. Tell me if the lead wants any of them first; otherwise I start the design lines one slice per PR.

## 2026-11-20 06:10 UTC — #2767 merged; rows 13, 14, 21, 25 (#2775)
- #2767 merged (row 100 + rows 2/3 "after launch"). #2773 (row 90) and #2774 (rows 64/93) are conflict-free, waiting for review.
- #2775: row 14 (app Share now sends the receipt as a PNG of the card, text only as fallback) and row 13 (web Save as image now embeds the @font-face files in the SVG; verified in Chromium: the saved PNG is pixel-identical to the card on screen, the old code's PNG was not). Rows 21 (doctor-order card on the item page) and 25 ("Use this split") are marked NOT A FIX in the doc with the reason: both are new features that need a spec/board and basket rules (for 25 the two-booking When picker), not defects. Tests 2 app + 2 web; gates unchanged (literal 105, token-sync 335, parity ok).
- Open PRs: #2773, #2774, #2775 (cap). The lead's list of client rows (90, 100, 64/93, 21, 25) is done. Next: the other design lines of the 13 (rows 46, 47, 49, 51, 52, 57, 58, 60, 62, 63, 105 are board restyles that need render + board comparison), then the multi-country client audit (Phase 1, read-only). I take the multi-country audit first: it is read-only docs and needs no board images.

## 2026-11-20 03:40 UTC — client lines 4 and 5 (rows 64 and 93, #2774)
- Rows 64 and 93 (#2774): "Share with your doctor" from a result now opens the share-reports screen with the result's kind and booking, and the screen ticks the medical report of that booking (`lab_booking_id` / `radiology_booking_id`); a result with no report yet ticks nothing as before. App only (the web has no share-with-doctor action on a result). Tests 5 new + orders-screens extended (22 green); gates unchanged (literal 105, token-sync 335, parity ok).
- Open PRs: #2767, #2773, #2774 (cap). Next: rows 21 (doctor-order items pre-ticked), 25 ("Use this split"), then the design lines and the multi-country client audit.

## 2026-11-20 03:00 UTC — #2760 and #2764 merged; client line 3 (#2773)
- #2760 (segments, last admin prompt page) and #2764 (consultations hub booking-for banner) merged. #2767 is conflict-free, waiting for review.
- Row 90 PR opened (#2773): maternity setup refuses dates that are not real year-month-day days and a last period in the future, app and web, new messages in six languages in both clients. Merged main into the branch first (clean); app care suites 16 / web 2 new tests green; gates unchanged (literal 105, token-sync 335, parity ok).
- Open PRs: #2767, #2773. Next: rows 64/93 (share-with-doctor pre-select), 21, 25; then the design lines and the multi-country client audit.

## 2026-11-19 23:50 UTC — lead decision on rows 2/3 applied; row 90 built, PR waits for a slot
- Lead decision (23:18 UTC) applied: rows 2 and 3 (catalogue insurance filter) are marked "AFTER LAUNCH, with the insurance offers" in the reconciliation doc (rows and the section 7 line), committed on #2767's branch (docs only, merged main into it first: no conflicts). The catalogue-based rule stays.
- Row 90 (LMP / due date check) is built and pushed on branch `p2/client-maternity-dates` (commit 231808e10), PR NOT opened yet: the cap of 3 is full (#2760, #2764, #2767, all conflict-free, waiting for review). App: dates must be real year-month-day days, last period not in the future, two new messages in six languages (`care.mat.dateInvalid`, `care.mat.lmpFuture`); web: the date input already gives a real day, the future check and `MaternityWeb.lmpFuture` (six languages) are added. Tests: app 3 files / 16 green (7 new), web 2 new; gates unchanged (literal 105, token-sync 335, parity ok).
- I open that PR as soon as one of the three merges. Next after it: rows 64/93 (share-with-doctor pre-select), 21, 25, then the design lines and the multi-country client audit.

## 2026-11-19 23:10 UTC — client line 2 of 37 (#2767)
- Reconciliation row 100 (#2767): the app's doctors list matched a specialty by its Arabic name only, but `/care/specialties` counts a doctor by slug, Arabic or English name (profiles store the slug), so slug-stored doctors never matched their tile. The chosen specialty is now kept by slug and matched with `doctorHasSpecialty` (the server's three forms). Web has no such defect (it sends the specialty to the server). Test 3; consult suites 21 / 123 green; gates unchanged (literal 105, token-sync 335).
- Open PRs: #2760, #2764, #2767. Next: rows 90 (LMP/due date check), 64/93 (share-with-doctor pre-select), 21, 25; then the design lines and the multi-country audit.

## 2026-11-19 22:30 UTC — #2740 merged; #2760 merged with main
- Lead order of 22:20 UTC done: merged main into #2760 (generated docs only, regenerated; admin tsc clean, admin vitest 36 files / 137 tests green). Conflict-free, "blocked" = waiting for review. No admin `window.prompt` page is left, so nothing more to add to #2760.
- Open PRs: #2760, #2764. Next: the other small client lines (rows 90, 100, 64/93, 21, 25), then the design lines and the multi-country audit. The row 2/3 insurance-filter question is still in the 21:40 entry.

## 2026-11-19 21:40 UTC — #2759 merged; #2740 and #2760 merged with main again; first client line (#2764)
- Lead order of 20:20 UTC done: merged main into #2740 and #2760 (generated docs only, regenerated; admin tsc clean, admin vitest 35 files green on both). Both conflict-free, "blocked" = waiting for review. All admin `window.prompt` pages are done: no new admin prompt PRs are needed, so the "one PR for the rest" rule has nothing left to bundle.
- Client item 1 of the 37 (#2764): reconciliation row 94, the consultations hub now says whom a family booking is for (same notice and keys as the confirm step, "for me" drops it); no new strings; test 2; gates unchanged (literal 105, token-sync 335).
- Row 2/3 (catalogue insurance filter, web + app) NOT started, reason: the client's "insurance" choice reads the catalogue's own field (`insurance_availability`) while the server's `insurance=1` filters by what providers offer, and the client also decides whether the choice is offered from the loaded rows. Switching changes which tests show under "Insurance" and existing hub tests assert the current rule. Needs the reviewer's decision: should the Insurance choice be offer-based (server) or catalogue-based (today)? If offer-based I will pass `insurance=1` on the lab pages (web hub + route + app hook), probe page 1 to decide if the choice is offered, and update the tests.
- Open PRs: #2740, #2760, #2764. Next: the other small client lines (rows 90 LMP/due date check, 100 specialty filter by name, 64/93 share-with-doctor pre-select, 21, 25), then the design lines and the multi-country audit.

## 2026-11-19 19:10 UTC — lead order: #2759 and #2740 merged with main; last admin prompt page (#2760)
- Lead order of 18:32 UTC done: merged main into #2759 (p2/admin-prompt-scheduled-reports) and #2740 (p2/admin-prompt-provider-moderation), no rebase or force. Conflicts were only generated docs (ADMIN_INVENTORY, ADMIN_WIRING_REPORT): took main's, regenerated with the inventory tools. Admin `tsc --noEmit` clean, admin vitest 34 files / 132-133 tests passed on both. Both show mergeable_state "blocked" (waiting for review), no conflicts. #2759 also fixes the PROGRESS row (provider-audits #2758 merged).
- #2758 merged. Last admin prompt page: segments.tsx delete reason through the ConfirmDialog (PR #2760, test 2, admin suite green, tsc clean). After #2740, #2759, #2760 merge no `window.prompt` is left in the admin pages (returns.tsx only has a comment).
- Open PRs: #2740, #2759, #2760. Next, when a slot frees: the 37 OPEN [client] lines of CLIENT_FINAL_RECONCILIATION section 7, then the 13 design lines, then the Phase 1 multi-country audit.

## 2026-11-19 16:10 UTC — #2739 and #2753 merged; admin prompt pages 8 and 9 (#2758, #2759)
- #2739 (impersonation + PROGRESS row) and #2753 (appointments-oversight) merged. #2740 re-synced with main again (generated docs only).
- Admin prompt page 8: provider-audits.tsx rejection reason through the ConfirmDialog (PR #2758, test 2, tsc clean).
- Admin prompt page 9: scheduled-reports.tsx delete reason through one ConfirmDialog instead of prompt + confirm (PR #2759, test 2, tsc clean). Also updates the lane-P row of docs/design/PROGRESS.md (7.9 KB).
- Left in this item: segments.tsx (1 call), next slot. Then the 37 OPEN [client] lines, the 13 design lines, then the Phase 1 multi-country audit.
- Open PRs: #2740, #2758, #2759.

## 2026-11-19 12:50 UTC — #2750 merged; resynced #2739/#2740; admin prompt page 7 (#2753)
- #2750 merged. #2739 and #2740 had gone conflicted (generated docs only): re-synced with main, both conflict-free again (blocked = waiting for review).
- Admin prompt page 7: appointments-oversight.tsx cancel reason through the ConfirmDialog (PR #2753, test 2, tsc clean). 3 calls in 3 files left: provider-audits, scheduled-reports, segments.
- Open PRs: #2739, #2740, #2753.

## 2026-11-19 05:45 UTC — STALLED on the 3-PR cap (no review for about 36 h)
- #2739 (impersonation + lane-P PROGRESS row), #2740 (provider-moderation) and #2750 (provider detail reject) are open, conflict-free, mergeable_state "blocked" (waiting for review/merge). No new inbox order since the 07:05 and 12:00 UTC 2026-11-17 blocks.
- Blocked by the cap, not by a technical problem: 4 admin prompt calls in 4 files (appointments-oversight, provider-audits, scheduled-reports, segments), the 37 OPEN [client] lines of section 7 of CLIENT_FINAL_RECONCILIATION, the 13 OPEN design lines, then the Phase 1 multi-country read-only audit.
- Lead: please merge or review #2739/#2740/#2750 (or lift the cap) and I continue at once. Hourly wakes keep checking; I will not add more entries until something changes.

## 2026-11-17 17:30 UTC — #2748 merged; admin prompt page 6 (#2750)
- Admin prompt page 6: ProviderFullDetail.tsx, 1 call (document rejection reason) through the ConfirmDialog (PR #2750, test 2). 4 calls in 4 files left after #2739, #2740, #2750: appointments-oversight, provider-audits, scheduled-reports, segments.
- #2739 and #2740 were re-synced with main again (generated docs only), tests green.
- Open PRs: #2739, #2740, #2750 (cap).

## 2026-11-17 16:20 UTC — #2743 merged; admin prompt page 5 (#2748)
- Admin prompt page 5: content-growth.tsx, 2 calls (coupon on/off, article publish/unpublish) through one ConfirmDialog (PR #2748, test 2; coupon toggle untested, same helper). 5 calls in 5 files left after #2739, #2740, #2748: ProviderFullDetail, appointments-oversight, provider-audits, scheduled-reports, segments.
- Open PRs: #2739, #2740, #2748 (cap). The worker restarted once; nothing was lost (tree clean, last PR pushed).

## 2026-11-17 15:30 UTC — #2741 merged; admin prompt page 4 (#2743)
- Admin prompt page 4: config-portal.tsx, 2 calls (pricing 10 chars, SLA 5 chars) through one ConfirmDialog (PR #2743, test 3). isSubmitting is now set only when the save really starts. 7 calls in 6 files left after #2739, #2740 and #2743: content-growth 2, ProviderFullDetail, appointments-oversight, provider-audits, scheduled-reports, segments.
- Open PRs: #2739, #2740, #2743 (cap). Your 12:00 block (multi-country audit, read-only) comes after my current queue: admin prompts, 37 client lines, 13 design lines.

## 2026-11-17 14:40 UTC — #2719 merged; admin prompt page 3 (#2741)
- #2719 (token audit step 1) merged: provider no-raw-color 402, token-sync 335 are the new baselines.
- Admin prompt page 3: system-ops.tsx, 3 calls through one ConfirmDialog (PR #2741, test 2; the SEO action untested, same helper). After #2739, #2740 and #2741 are merged: 9 calls in 7 files left (config-portal 2, content-growth 2, ProviderFullDetail, appointments-oversight, provider-audits, scheduled-reports, segments).
- Open PRs: #2739, #2740, #2741 (cap). PROGRESS.md counts get updated once #2739 merges.

## 2026-11-17 13:30 UTC — #2730 merged; #2719 and #2739 re-synced; admin prompt page 2 (#2740)
- #2719 and #2739 conflicted again (generated docs only): merged main, regenerated, gates unchanged, pushed.
- Admin prompt page 2: provider-moderation.tsx, 5 calls through one ConfirmDialog (PR #2740, test 3; delta decisions untested, same helper). 12 calls in 8 files left: system-ops 3, config-portal 2, content-growth 2, ProviderFullDetail, appointments-oversight, provider-audits, scheduled-reports, segments.
- PROGRESS.md: row is in #2739; counts get updated after it merges (avoids a conflict between the two PRs).
- Open PRs: #2719, #2739, #2740 (cap). Next page waits for a merge.

## 2026-11-17 11:00 UTC — #2737 merged; #2719 and #2730 re-synced; admin prompt PR 1 of 10 (#2739)
- Item 1: #2730 and #2719 merged with main again (generated docs only), regenerated, gates unchanged (literals 105, no-raw-color 402, token-sync 335, jest 433/433), pushed.
- Item 2, page 1: admin impersonation.tsx revoke reason in ConfirmDialog (PR #2739, test 2, admin vitest 117). PROGRESS.md updated. 17 prompt calls in 9 files left: provider-moderation 5, system-ops 3, config-portal 2, content-growth 2, ProviderFullDetail, appointments-oversight, provider-audits, scheduled-reports, segments. Open PRs: #2719, #2730, #2739 (cap): the next page waits for a merge.
- Items 3 and 4 (37 client lines, 13 design lines) follow after the prompt pages.

## 2026-11-17 09:30 UTC — client reconciliation (PR #2737); #2732 merged; #2719 and #2730 re-synced again
- Output: docs/review/CLIENT_FINAL_RECONCILIATION_2026-11-17.md (PR #2737). Launch list ticked with PR links in lead/LAUNCH_LIST.md (parity #2723, return photo #2606, patient literals, merge map rows 1-3); bundle margin left as a standing rule with today's measure (79 KB).
- Specific checks: social login DONE (server verifies, app never trusts the token), parity none, admin hide-actions #2732, https-only #2711, Riyadh #2731.
- 107 open [client] needs-review lines: 6 DONE, 6 NOT A PROBLEM, 5 FIXED HERE, 40 DEFERRED, 13 OPEN design, 37 OPEN client (not done in this pass: the list with the exact need is section 7). Stale line found: assistant screens already use the emergency page (GET /mental-health/urgent-help).
- Fixed in the PR: reset-link message (6 languages), guest name (6 languages), offer id encoding, pharmacy payment key on method change, family join relation_code, admin returns dialog instead of window.prompt (18 more window.prompt in 10 admin files remain).
- Provider ur/hi/bn/fil: closed by the owner (Arabic + English only).
- Open PRs: #2719, #2730, #2737 (cap). The next slices (37 OPEN client + 18 admin prompts + last 105 provider literals) wait for a free slot; tell me the order if you want it different.

## 2026-11-17 07:30 UTC — #2731 merged; #2719 and #2730 re-synced; admin PR #2732 opened
- #2731 (Riyadh slot pickers) merged: deploy it together with #2725.
- #2719 and #2730 were dirty again (generated docs only): merged main, took main's generated files, regenerated with the tools, pushed. Gates unchanged (tokens: no-raw-color 402, token-sync 335, jest 433/433; literals 105, parity ok).
- #2732: admin permission actions (10 of the 12 rows changed, row 2 already done, row 12 fixed differently, see the PR). Open now: #2719, #2730, #2732.
- Still blocked: last 105 provider literals (new PR after #2730 merges), overlay-token question, provider ur/hi/bn/fil.

## 2026-11-17 06:45 UTC — QUEUE EMPTY (everything left is blocked; no new lead order since 01:25)
Open PRs (3 = cap, all waiting for the lead): #2719 tokens (state blocked), #2730 literals slice 10, #2731 Riyadh slot pickers (deploy together with #2725).
BLOCKED items:
1. Admin permission actions: DONE on branch `p2/admin-hide-actions` (tsc, vitest 113, next build ok); PR not opened because of the cap. Say "open it" or merge one of the three.
2. Provider literals, last 105: 32 upper-case status codes in JSX comparisons (code, not text), the CSV header, about 70 bespoke strings. Next slice must be a new PR from main, so it waits for a free slot after #2730 merges (same locale files).
3. Token audit step 2 (rgba(255,255,255,a) overlays, constants/index.ts legacy palette 62, ui.tsx 21, VideoCallRoom 16): needs the owner's answer on an overlay/scrim token; I will not add a token or colour.
4. Provider locales ur/hi/bn/fil: still the lead's decision (provider has ar+en only).
Done and merged earlier: items 2-6 of the first queue, literals 5277 -> 105 in 10 slices, https-only links in the app (#2711), parity audit round 2 (#2723).
I stop here until a PR merges or you send a new order; the hourly wake stays on.

## 2026-11-17 05:30 UTC — admin permission actions READY, PR waits for a free slot (3 open: #2719 #2730 #2731)
- Branch `p2/admin-hide-actions` (pushed, one commit, tsc clean, admin vitest 113 pass, next build ok). I did NOT open the PR: 3 are open (cap). Tell me to open it, or merge one of the three and the next wake opens it.
- 12 rows of docs/design/ADMIN_PERMISSION_ACTIONS.md (your message said 13): 10 changed in the client; row 2 (alerts bell) was already gated by `canSeeAlerts` (command.center.view) in AdminGuard, nothing to do; row 12 (approvals): the page has no ROUTE_PERMISSIONS entry on purpose (AdminGuard.tsx:208 says every admin opens it and each row is filtered by its own permission); I fixed the real bug there instead: the withdrawals row asks for finance.read, which the page never granted, so that row was hidden for every role.
- Row 8 (pharmacy-price-review): the endpoint requires catalog.update AND catalog.price.write (medicines.controller.ts:289); the control now needs both (it only checked price.write). Row 11 (locations): route permission settings.edit added (all four backend routes need it) plus hidden create/deactivate.
- Test: admin/src/components/__tests__/permission-actions.test.ts (one line per row).

## 2026-11-17 04:00 UTC — #2730 and #2719 fixed, Riyadh slot pickers (PR #2731)
- #2730: merged main (locale files merged by key, inventories regenerated), pushed. #2719: failing check was no-raw-color (a clean file still in its baseline): merged main, reapplied C.white, no-raw-color 414 -> 402, client-token-sync 335, pushed; both should be mergeable now.
- #2731: web + app slot pickers read and ask for Riyadh time (home-care nurse slots, ordering windows). Riyadh is fixed UTC+3 so the helper shifts the instant by 3 h and formats as UTC (works in Hermes without a tz database). Tests under 3 time zones (web 11, app 4); one app test rewritten on purpose (it built instants from the phone's local time). Doctors' slots untouched. Deploy together with #2725.
- Next: the admin permission list (docs/design/ADMIN_PERMISSION_ACTIONS.md, 12 rows; your message said 13), one PR, after one of the three open PRs merges (cap 3 open).

## 2026-11-17 02:10 UTC — provider literals slice 10 (PR #2730, stacked on #2729)
- 190 -> 105. Nested ternaries and isRTL pairs converted; 31 placeholders became keys WITH Arabic hints (parity forbids Latin in ar). Visible change: Arabic users see "رقم ترخيص المختبر" instead of "MOH-LAB-XXXXX". CSV header catalog_id,mode,price left literal on purpose.
- Gates: parity ok, emoji 37, token-sync 396 on this branch, tsc clean, jest 433/433.
- Merge order please: #2719 (tokens), #2729, #2730. All three touch the locale files' tail; each later one rebases clean once the earlier is merged.
- 105 left: 32 status codes in JSX comparisons (code), CSV header, ~70 bespoke strings. Next: finish those by hand; then QUEUE EMPTY except the overlay-token question.

## 2026-11-17 01:10 UTC — provider literals slice 9 (PR #2729); #2724 merged; #2719 (tokens) still open
- 234 -> 190 (43 pairs the codemod used to skip). parity ok, emoji 37, tsc clean, jest 433/433.
- 190 left: 41 Latin placeholders (format examples), 32 upper-case status codes in JSX comparisons (code, not text), ~117 Arabic/other strings (isRTL ternaries, {ar,en} objects, one-offs). Plan: texts and placeholders become locale keys; status codes move to shared constants. I do not touch the gate.
- #2719 has no failing check I can see; it only needs a merge.

## 2026-11-17 00:05 UTC — provider literals slice 8 (PR #2724); #2722 and #2723 merged; #2719 conflict fixed
- 697 -> 234 (68 files). parity ok, no-emoji 38 -> 37 (one label lost its emoji: words only), tsc clean, jest 433/433. Registration callbacks (rows, precheck, licenseExpiryError) now take `tt`.
- #2719 (tokens) conflicted with the literal slices: merged main, took main's text, reapplied C.white, regenerated inventories; token-sync 335, jest 433/433; pushed.
- DECISION NEEDED (234 left): format-example placeholders (SA0000000000000000000000, MOH-PHR-XXXXX, YYYY-MM-DD, 5X XXX XXXX) and status codes (IN_PROGRESS) are language-neutral. Options: (a) exempt them from the gate, (b) one locale key with the same text in ar and en. I will do (b) unless you say (a). The rest are isRTL/lang==='ar' ternaries and {ar,en} objects, which I convert next.
- Open PRs: #2719 (tokens), #2724.

## 2026-11-16 22:20 UTC — parity audit round 2 (PR #2723); open: #2719 tokens, #2722 literals slice 7
- Route-level comparison web vs app (446 routes): no transactional gap; one-sided groups are covered under other names, platform screens, SEO pages, browser flows or a legacy redirect (community/[postId] -> /articles). Docs only (docs/design/PARITY_2.md). Endpoint-level diff dropped as noise.
- Literal slice 8 waits for #2722 (same locale files). Token audit step 2 waits for the overlay-token answer.

## 2026-11-16 21:15 UTC — provider literals slice 7 (PR #2722); #2721 merged, #2719 (tokens) still open
- Template pairs with ${} now convert ({p1} placeholders): 908 -> 733 in 46 files. parity ok, emoji 39 -> 38 (two attachment labels lost their emoji glyph: words only), tsc clean, jest 433/433. Test helper fills {params}; no assertion changed.
- Left: 733 (module-level callbacks that take AR, English-only strings such as status codes, placeholders like REF-XXXXX which need a decision, plain-function pairs). Slice 8 next.

## 2026-11-16 20:10 UTC — provider literals slice 6 (PR #2721); #2714 merged, #2719 (tokens) open
- 1456 -> 908 (25 screens). parity ok, token-sync 396 on main (335 once #2719 merges), emoji 39, tsc clean, jest 433/433.
- Test edits: 2 mocks use the real-text helper; video-call resilience test now greps the user-visible strings in en.json (wiring strings still in the source). Nothing skipped.
- Left: 908, mostly ${} template strings and pairs in plain functions/callbacks; slice 7 is a manual pass after #2721 merges.

## 2026-11-16 19:20 UTC — provider token audit step 1 (PR #2719); #2714 still open
- Raw #FFF/#FFFFFF -> C.white in 26 provider files: client-token-sync 396 -> 335. tsc clean, jest 433/433, other baselines unchanged.
- Remaining provider colours: constants/index.ts legacy palette (62), ui.tsx (21), VideoCallRoom (16), rgba white overlays; they need a token decision for overlays (no token exists) -> asking lead below.
- QUESTION (lead/owner): is there an approved overlay/scrim token for rgba(255,255,255,a) on coloured headers? I will not add one without approval.

## 2026-11-16 18:20 UTC — provider literals slice 5 (PR #2714); #2713 merged
- 1957 -> 1456 (14 screens). parity ok, token-sync 396, no-emoji 40 -> 39, tsc clean, jest 433/433, no test changed.
- Left: ~1456 literals, mostly template strings with ${} and pairs in plain functions/callbacks (needs a manual pass passing `t`). Slice 6 after #2714 merges; then token audit.

## 2026-11-16 17:10 UTC — provider literals slice 4 (PR #2713); #2709 and #2711 merged
- 2422 -> 1957 (10 screens). parity ok, token-sync 396, emoji 40, tsc clean, jest 433/433; one test mock switched to the real-text helper, no assertion changed.
- Next: slice 5 after #2713 merges (same locale files), then token audit.

## 2026-11-16 15:55 UTC — WIRING https-only in the app (PR #2711); #2709 still open
- Guarded 3 more openURL sites (payments/result, pharmacy/payment, chat media) with isHttpsCheckout; test added; no UI text touched. Social login: already backend-verify only (no change).
- Literal slice 4 waits for #2709 to merge (same locale files); I take it right after. Then token audit.

## 2026-11-16 15:10 UTC — provider literals slice 3 (PR #2709); #2700 merged
- 2691 -> 2422 (DrugIndexDetail + 3 Ordering screens). parity ok, token-sync 396, emoji 40, tsc clean, jest 433/433, no test changed.
- Next: slice 4 (next biggest files), then items 2-3.

## 2026-11-16 12:55 UTC — provider literals slice 2 (PR #2700)
- 3003 -> 2691 (RealScreensExtended, DoctorOps, PharmacyBroadcastResponse, NursingFieldOps). parity ok, token-sync 396, emoji 40, tsc clean, jest 433/433.
- One contract assertion now reads the sentence from en.json (text moved out of the screen); four test mocks use the real-text helper. No test skipped.
- Next: slice 3 (Drug index, Ordering screens: need `useLang` added first), then items 2-3.

## 2026-11-16 11:10 UTC — #2694 Gitleaks ignore + main merged
- Added the 6 fingerprints (31deee73…:provider-app/src/i18n/locales/en.json:generic-api-key:{764,993,1188,1437,1451,1453}) to .gitleaksignore with the comment "locale label, not a secret".
- Merged main; generated inventories taken from main and regenerated with the tools. Checks: literals 3003 (baseline 3003), locale-parity ok, no-emoji 40, token-sync 396, provider tsc clean. Pushed 97e48e5e4.
- Next: more provider literals, then WIRING client defects.

## 2026-11-16 10:40 UTC — fixes for #2692 and #2689
- #2689 (patient literals): conflicts were only the generated inventories; merged main in (took main's files, regenerated with screen-inventory.mjs and provider-inventory.mjs, nothing by hand), literal baseline and locale-parity still ok, i18n and map tests pass, pushed to the same branch (2faa947ba).
- #2692 CLOSED, replaced by #2694 (same tree, one clean commit from main). Why not just fix it: the 6 Gitleaks findings (generic-api-key, provider-app/src/i18n/locales/en.json) were all NEW in this PR (commit 4a713d17, my own) and all FALSE POSITIVES: UI labels ("Confirm Password", "Password", "Passwords do not match") on hash-style keys like facreg.4171a21c; no secret anywhere. A finding belongs to the commit that added the line, a later commit does not clear it and I do not force-push. The password labels now have readable keys (auth.password, *.confirmPassword, *.passwordsMismatch). Emoji ratchet: the 4 keys with glyphs (pill, bottle, 2 check marks) are words only now (ar+en); no-emoji-in-ui 40 recorded, none added, baseline 41 -> 40. Numbers unchanged: provider literals 5277 -> 3020, tsc 0, jest 433/433, parity ok, token-sync 396.
- Lesson for the next slices: no hash-style key for a label that contains password/secret/token/key; the converter will skip them.
Next: the remaining ~3000 provider literals (secondary screens), then the WIRING client defects.

## 2026-11-16 10:05 UTC — item 6 (merge-map rows, UI parts): nothing left to change; row 4 verification
Status: no PR needed for the UI parts.
- Row 2 (payouts): DONE earlier (#2622 merged): payouts.tsx is the one place (approve/pay/reject) with the shared confirm dialog and reason field; finance-suite.tsx (line 71) shows only the open-requests total and a link "/admin/payouts" (no approve/pay controls: the only "approve" hit is the permission comment at line 24); no window.prompt/confirm in either file. The provider side has no payout write path (only provider-app wallet "request withdrawal"). Left for you: admin/src/pages/admin/returns.tsx:52 still uses window.prompt for the return note (returns page, not a merge-map row: say if you want it on the shared dialog too).
- Rows 1 and 3 are backend (reject refuse-empty-reason + the second approve/reject path; hospital staff controllers into one module): not UI, not mine in this queue.
- Row 4 verification (no change): the three ways to create staff and every caller I found:
  1. POST /provider/operators/invite and POST /provider/operators/accept-invite (backend/src/modules/provider/provider.controllers.ts:146-152, a provider invites an operator with role + permissions list; accept is Public with a token). Callers: tools/live/j_provider_scenarios.py:153-173 only. No app, admin or web client calls them.
  2. POST /hospital/staff (+ GET, DELETE, :id/suspend, :id/reset-password) (backend/src/modules/hospital-staff/hospital-staff.module.ts:140-153, roles HOSPITAL, HOSPITAL_ADMIN, ADMIN; the hospital creates a sub-account directly). Callers: provider-app AddSubAccountScreen.tsx:85 (create), SubAccountsScreen.tsx:70,94 (list, delete), ShiftManagementScreen.tsx:83, CredentialingScreen.tsx:51, DepartmentManagementScreen.tsx:54, FacilityHomeTab.tsx:73,83 (reads); tools/live/j_facility.py:9,59.
  3. Facility invitation of an existing provider (provider-facility.controller, /provider/facility/...; read in ShiftManagementScreen.tsx:83 beside /hospital/staff; screen FacilityInvitationsScreen in provider-app).
  Permission difference: (1) operators carry a role plus an explicit permissions list and are accepted by the invitee with a token; (2) hospital staff are created by the facility with a password and are suspended/reset by it; (3) invites link an account that already exists. Only (2) is used by an app; (1) is exercised only by a journey, so removing or merging it would not break a client but would break j_provider_scenarios. No change made.

## 2026-11-16 09:30 UTC — item 1 (provider-app literals) PR
- #2692 provider-app literals 5277 -> 3020 (-2257), ar+en, three commits: common first-session screens (-258), doctor (-313), facility/radiology/nursing/pharmacy/lab registration+dashboards (-1686). Method: every `AR ? 'ar' : 'en'` pair with Arabic text on the Arabic side became one key looked up with `t` (identical text; layout ternaries untouched; pairs inside plain functions/module-level callbacks that only receive `AR` stay as pairs, so ~3000 literals remain: secondary screens, template strings, one-sided text). tsc 0 errors, jest 433/433 after each slice, locale-parity ok (about 20 Arabic values lost their English-in-brackets, which the rule requires), token-sync 396 -> 396. No assertion changed: 5 test suites got a language mock that returns the real locale text.
- Question still open (also in the 07:10 entry): provider locales are ar+en only; ur/hi/bn/fil for ~1,350 new keys is your decision (I will not machine-translate screens providers sign in with).
- Next: item 6 (merge-map rows from lead/OWNER_DECISIONS.md, UI parts only), then the second round of item 1 (the remaining ~3000: secondary screens).

## 2026-11-16 07:10 UTC — new queue (stop lifted): PRs for items 2, 3, 4, 5
(One line per PR; lead merges when green. #2677 merged earlier.)
- #2684 item 3 (payment URL): app already safe (trustedPaymentUrl host allow-list + phishing test in checkout-payment-screens.test) and app social login already sends tokens only to the backend (no client verification); the one unguarded sink was web diagnostics-checkout-form (`location.href = checkout_url` with no check): now https-only like the other pay screens. Test extended.
- #2685 item 4 (pharmacy chat route): grep first: the app HAS the chat (app/pharmacy/pharmacist-chat.tsx, wired to GET /pharmacy/chat/threads ...); what was missing is the web's path /pharmacy/chat?orderId=|id=. Added app/pharmacy/chat.tsx (re-export, one screen) and the screen reads orderId or id. Test: 3.
- #2687 item 5 (AI tests only): specs for AiUserQuotaGuard (5), AiInteractionsController /ai/drug-interactions (5), AiContentReviewController (3): 13 pass, no source change.
- #2689 item 2 (patient literals): patient-web already 0; app 17 -> 0 in 5 files (dead legacy DoctorCard in components/ui.tsx removed, the rest to keys in 6 languages); baseline 5277 -> 5260; locale-parity ok; token-sync 396 -> 396.
Item 3 remainder: #1835 answered earlier (CI numbers), #1831 and #1556 still need the owner/enrichment batch (see FINAL block).
Next: item 1 (provider-app literals). Question for you: the provider locales exist only in ar and en today (388 keys) and your 11-13 order said ar+en for the provider app at launch; this order says six languages. I start with ar+en per the earlier order (common first-session screens, 276 literals) and add ur/hi/bn/fil only if you say so, because a bad machine translation of provider screens is worse than none.
Item 6 (merge-map rows, UI parts): will read lead/OWNER_DECISIONS.md after item 1's first PR.

## FINAL 2026-11-14 06:00 UTC — Lane P stops here (owner order 05:55)
Open PRs of mine:
- #2677 (refund policy hash echo, clients, base main): green except 1 pending check at last look; ready for you to merge. Money-adjacent (refund acceptance): ask the owner if you want. #2621 is dead (it merged into the old #2620 branch, not main); #2677 replaces it.
Merged this week (all on main): #2640, #2626, #2622, #2620 (backend hash echo), #2643, #2661, #2663, #2664, #2665.
Dependabot / old PRs (I merged main into #2505, #1692, #1690, #1689; nothing merged by me):
- #1690 + #1689 (download/upload-artifact 8.0.2 / 7.0.2): no failures, 5 and 9 checks pending at last look; merge together by hand (they touch workflows) once green.
- #1692 (google-github-actions/auth 3.0.0): red only on live gate shard 5/5 via j_ai_scanner (two input[type=file] on the scan page), a main issue not the bump; merge after that is fixed (workflow change: by hand).
- #2505 (80 updates, 7 dirs): many red checks (backend build and tests, patient mobile, contract, icon set, live gate, browsers, lighthouse, Trivy); recommend close and let Dependabot reopen per directory.
- #2470, #2468, #1636, #1634 (NestJS 12 majors one package at a time, core/platform stay 11.2.1): cannot work; recommend close with "needs one coordinated Nest 12 upgrade after launch".
- #2217, #2216 were already closed. #1891 and #1967 CLOSED by me as superseded by #2015 (comment on each). #2015 (72 files not on main: 57 live journeys, 20 findings docs), #1897 (AGREED.md) and #1924 (Maestro flows) are untouched: need your port-or-close decision.
Issues: #1835 answered with CI numbers (TBT 83-91 ms vs 200, TTI ~4.0 s vs 5.5 s on /ar/c): suggest closing. #1831 (city/district names in ur/hi/bn/tl) NOT started: needs seeds plus a reviewed migration and owner approval before production. #1556 NOT done: needs the catalogue enrichment/normalisation batch (I did not guess values). Public pages /p/[slug] and /c/*: nothing to review yet, B owns the fix.
NOT finished / needs a decision: provider-app string move (2481 first-session literals, almost all already ar+en pairs: doc in docs/provider/FIRST_SESSION_STRINGS.md); web consultation compact card sends no refund hash (backend returns the hash with the consultation figures plus web echo: money, owner); insurance offers (decision 30) parked after launch; #2015 journeys; Nest 12 upgrade; the live-gate j_ai_scanner failure.
My two hourly checks (trig_017STMiGEZY9ofoMgZVd9MKP, trig_0128Ki84TGzkHY2PgY7zv248) are being disabled now.

## 2026-11-14 06:10 UTC — #1835 /ar/c Lighthouse numbers (from CI, no budget change)
Status: measured; the issue's two problems are not reproduced on current main.
I could not run Lighthouse in this container (needs the seeded backend), so I took the 3 runs per URL from the CI `lighthouse` job of #2677 (main 2149a3dcf + my client PR; assertions passed; artifact lighthouse-results, same devtools throttling as the issue):
- /ar/c: TBT 83, 91, 91 ms (budget 200); TTI 4025, 4048, 4061 ms (budget 5500); LCP ~1.9 s; score 98 on all 3. The issue measured TBT 278-329 ms and unstable TTI.
- /ar: TBT 46, 47, 85; TTI 3.9-4.4 s. /ar/consultations/doctors: TBT 49-53; TTI 3.9-4.1 s.
So /ar/c is now about 3x below the TBT budget and TTI is stable (spread 36 ms over 3 runs). Whatever fixed it landed after the issue (loading.tsx and hydration work). Suggest closing #1835 with these numbers, or keep it open for one more CI run next week; the numbers will keep appearing in every lighthouse job. No budget raised.
Left: #1831 seeds (not started, needs owner approval for the migration), CI of the Dependabot PRs.

## 2026-11-14 05:30 UTC — Dependabot CI after update-branch
Status: results so far (CI still running on some).
- #1690 (download-artifact 8.0.2): green so far, 18 checks pending. #1689 (upload-artifact 7.0.2): green so far, 24 pending. They must go together; both touch workflows: you merge by hand once all green.
- #1692 (google-github-actions/auth 3.0.0): only red = live gate shard 5/5, from j_ai_scanner "web scan flow -> Locator.set_input_files: strict mode violation: locator('input[type=file]') resolved to 2 elements" (log job 132336888072). That is a journey/page problem on main (two file inputs on the scan page), not the action bump: someone on B/web should look; it will turn any PR red that runs shard 5.
- #2505 (80 updates, 7 dirs): 13 red checks (Icon and illustration set, acceptance, live gate x5, browsers x3, lighthouse, Trivy image backend, fuzz) out of 45. Too big to judge as one: I recommend NOT merging; close it and let Dependabot reopen per directory, or ask me to split it. Tell me which.
- #2677 (client hash echo, base main): green so far, 1 pending.
Left: same as the 05:40 entry (the #1831 seeds and the #1835 Lighthouse run).

## 2026-11-14 05:40 UTC — order 04:50: #2620 merged, client half retargeted, housekeeping triage
Status: partly done; items below say what is left.
PRs: #2620 MERGED (main 2149a3dcf). #2621 had been merged into the old #2620 branch, NOT into main, so I merged main into p2/policy-hash-echo-clients and opened #2677 (same work, base main; locale-parity ok, literal baseline 5277 -> 5277). Needs your merge.
1. Dependabot: #2217 and #2216 (node 26) are already CLOSED. #2470, #2468, #1636, #1634 are NestJS 12 majors bumped one package at a time while @nestjs/core and platform-express stay 11.2.1 (backend/package.json:25-35), so they cannot work (their Backend build and tests are red for that reason): do not merge; they need one coordinated Nest 12 upgrade after launch, I propose you close the four with that reason. #2505 (80 updates, 7 dirs), #1692, #1690, #1689 (actions): I ran update-branch (merged main in) just now, CI is re-running; I will report green/red for each and then tell you which to merge (#1692/#1690/#1689 touch .github/workflows: you merge by hand; the two artifact actions must go together).
   Old drafts: #2015 is a SUPERSET of #1891 (all 81 files + 4 newer) and of #1967 (all 5 journeys): I closed #1891 and #1967 with a comment saying so. #1897 (docs/qa/AGREED.md, 1 file, not on main) and #1924 (Maestro flows: 51 flows, 28 of its 96 files already on main) are left for you: say port or close. #2015 itself holds 72 files not on main (57 tools/live journeys j_qa_*, j_web_qa_*, 20 findings docs): I do NOT port 57 journeys without a live run, because a red journey would turn the live gate red; say if you want them ported in small batches.
2. #1831 (city/district names in 4 more languages): needs name_ur/hi/bn/tl for 150 cities plus districts in backend seeds and a reviewed migration (owner approval before production); not started. #1556 (active ingredient filled for 12.5%): this is the enrichment/normalisation batch you asked me to flag, not guessing. #1835 (/ar/c TBT/TTI): Lighthouse measurement not started yet.
3. Public pages /p/[slug] and /c/*: waiting for B's stale-if-error PR to review the UI side.
Left: #1831, #1835 measurement, CI result of the 4 updated Dependabot PRs.

## 2026-11-13 15:40 UTC — #2664 merged
Status: radiology slot capacity (#2664) MERGED, ticked in lead/LAUNCH_LIST.md. All five items of the 11:20 order are on main. Open for P: #2620 (owner), #2621 (after it). Queue empty; waiting for the string-move answer and new orders.

## 2026-11-13 13:00 UTC — merges
Status: #2661 (late-cancel path), #2663 (admin Seha page), #2665 (docs) MERGED. #2664 (radiology capacity card) green, waiting for the lead. #2620 (owner) and #2621 (after it) still open. Queue empty; the 11:20 order is complete. String move for the provider app waits for your answer.

## 2026-11-13 12:10 UTC — audit orders 2-5 done (PRs open)
Status: all five items of the 11:20 order are done; PRs wait for CI/lead.
PRs: #2661 (item 1 path fix), #2663 (item 2 admin Seha page), #2664 (item 3 radiology capacity card), #2665 (items 4+5 docs). Still waiting: #2620 (owner), #2621.
Item 2: /admin/seha-missing, list + window 3/7/14/30, nav + guard appointment.read, Arabic literals like the other admin pages; link goes to provider moderation (there is no admin report view to link to).
Item 3: LabSlotCapacityCard kind=radiology, GET/PUT /radiology/provider/slot-capacity, hint key radCapacity.hint ar+en, contract test.
Item 4 NUMBERS (docs/provider/FIRST_SESSION_STRINGS.md): provider-app 5260 literals; first session (login, onboarding, dashboard, bookings, wallet) 2481 = 276 common + per role: radiology 231, facility 214, doctor 319, nursing 398, pharmacy 460, lab 583; rest 2779 after launch. IMPORTANT: almost all are already written as ar+en inline pairs (AR ? 'ar' : 'en'), so the gate counts each string twice and launch is already bilingual; the work is only moving them into locale files. No rewrite started; proposed order in the doc (common 276 first). Tell me if you want it before launch.
Item 5: SCENARIOS.md recount column (101 rows: 100 COVERED, 1 PARTIAL PT-24, 0 NOT COVERED); LAUNCH_LIST.md ticks (PT-54, PT-03 x2, PT-30, PT-54 backend, PT-08, SCENARIOS PV/AD/SY, DTO leftovers; insurance offers marked after launch); stale ALL WORK PAUSED lines removed from LEAD_STATE.md. Radiology capacity and parity audit left unticked until #2664 merges.
Left: nothing in the order; waiting for merges.

## 2026-11-13 11:40 UTC — audit item 1: late-cancel reschedule path
Status: PR open, waiting for CI.
PR: #2661 (p2/refund-preview-path).
What changed: web page and app screen called /refund-preview, backend serves /refund/preview (404, offer never loaded). Fixed on both, path-contract test on web and app (reads the backend controller), inventories regenerated: NO_ROUTE 0 for patient-app and patient-web. The 3 PROXY_BLOCKED? rows are false positives (tool only tries sample values); each is allowed in patient-allowlist.ts (hide/unhide line 154, diagnostics cancel line 125, home-care slots line 20). I see 3 in WIRING_REPORT §4, not 4.
Left: items 2-5 of the 11:20 order, in order (admin Seha-number page next).

## 2026-11-13 06:55 UTC — #2640 merged
Status: #2640 (dlq gauge + 3 alerts + runbook) MERGED into main (e71cc4f7d). Open for P: #2620 (owner), #2621 (rebase after #2620). Queue empty, nothing new in inbox.

## 2026-11-13 05:25 UTC — #2640 dlq gauge: red backend check fixed
Status: backend green, waiting on live gate shard 2/5 (other 4 passed).
PR: #2640 (p2/dlq-gauge), fix commit afbf8d3d4.
What changed: cause was the SY-01 guard (cron-jobs-run-once.spec.ts): my new `refreshGauges` @Cron had no @ScheduledOnce. It is per process on purpose (Prometheus scrapes each replica, a leased run would leave the others at 0), so I added it to the guard's documented NOT_LEASED list with the reason. No test skipped, no budget touched.
Left: #2620 (owner), #2621 (rebase on main after #2620). Nothing else queued.

## 2026-11-13 03:00 UTC — STATE SNAPSHOT (context is large; read this first after any restart)
Status: all queue items done; waiting on CI/owner/lead
Hourly checks: trig_017STMiGEZY9ofoMgZVd9MKP (:17) and trig_0128Ki84TGzkHY2PgY7zv248 (:47), both bound to this session (created 2026-11-12; renew before 7 days = by 2026-11-19).
My PRs: #2620 refund-policy hash echo backend (money, waits for the owner), #2621 clients (based on #2620's branch p2/policy-hash-echo; retarget to main once #2620 merges), #2640 DLQ/outbox gauges + alerts + runbook (CODE GAP 6.1, CI pending), #2643 checklist ticks (docs only, p2/checklist-ticks; opened now that the cap is 5).
Merged so far: #2603-2605, #2601 (conflicts), #2622 (admin payouts), #2626 (runner pin), item 3 bundle: no change needed (margin 95,075 B).
Reports already written below: launch checklist audit table + OWNER / SERVER to-do lists (23:55 entry), parity audit (no gap), insurance offers PARKED after launch (lead decision), SCENARIOS 100/101 covered, DTO leftovers all done.
Open proposal (needs #2620 merged first): web consultation booking sends no refund-policy hash (the card shows the page's own figures); fix = backend returns the hash with those figures, web echoes it.
Next when something moves: fix any red CI on my PRs; after #2620 merges retarget #2621; if the lead sends new items, do them in order.

## 2026-11-13 00:20 UTC — launch checklist: code gap PR + tick branch ready
Status: in progress (CI pending)
PR: #2640 p2/dlq-gauge (CODE GAP 6.1): gauges nabd_event_dlq_dead / nabd_event_dlq_pending / nabd_domain_outbox_stuck (refreshed every minute from the counts GET /event-reliability/status already reads), 3 alert rules (DeadLetterQueueHasDeadEvents, DeadLetterQueueBacklog, DomainOutboxStuck), runbook docs/runbooks/event-dead-letter.md; drift-guard spec extended, no check loosened. tsc/build ok, 33 tests pass, dtolint 0.
Ticks: branch p2/checklist-ticks is pushed (audit/LAUNCH_CHECKLIST.md: 4 lines ticked [x] = review/CI/merge + DNS; every other line left open and tagged owner / server / keys with the evidence, in Arabic like the file). I am at the 3-PR cap (#2620, #2621, #2640), so I open that PR as soon as one of them merges (it is docs only; if you want it now over the cap, say so in my inbox).
The audit table and the OWNER / SERVER to-do lists are in my 23:55 entry below; that is the list for the owner.
Left: nothing else is a code gap. #2620 (owner decision, money) -> then retarget #2621.

## 2026-11-12 23:55 UTC — audit/LAUNCH_CHECKLIST.md audited line by line (main@eeca462e)
Status: audit done; 1 CODE GAP found (PR next), then one PR to tick the file
Key: DONE = verified in repo; CODE GAP = I fix it; OWNER = only the owner can (accounts, keys, consoles); SERVER = lead/ops on the server; KEYS = needs paid/real credentials.
| # | item | state | evidence / note |
|---|---|---|---|
| 1.1 | review PR nabdah-plus/full-completion -> main | DONE | branch no longer exists on origin; main has run 97-117 deploys, 600+ PRs merged since |
| 1.2 | CI green (backend, contracts, web, guards) | DONE | merge gate = lead merges only fully green; runner fixed by #2626 (ubuntu-24.04) |
| 1.3 | merge to main | DONE | same |
| 1.4 | pre-production release tag | OWNER (lead) | `git tag` has only 5 data tags (catalog-v13 ...); no release tag. Tag main at the launch commit |
| 2.1 | MONGO_URL, DB_NAME, JWT_SECRET 32+, REDIS_URL, ALLOWED_ORIGINS, NODE_ENV | SERVER | enforced at boot (backend/src/config/env.validation.ts:5-8, JWT < 32 chars refused); the list is deploy/.env.production.example (96 vars); server is up so it is set; verify only |
| 2.2 | MOYASAR_* (+ other gateways) | KEYS / OWNER | deploy/.env.production.example, docs/payments/MOYASAR_GO_LIVE.md; placeholder `pending_real_key` is detected (backend/src/config/env.placeholders.spec.ts) = owner to-do "Moyasar keys" |
| 2.3 | FCM/Firebase, WhatsApp (Infobip), SMTP/Resend | KEYS / OWNER | all in deploy/.env.production.example; uptime-alert mail needs GitHub secrets OPS_ALERT_EMAIL, MAIL_FROM, RESEND_API_KEY (.github/workflows/uptime-alert.yml:42-45) |
| 2.4 | LiveKit key/secret + COTURN | SERVER | self-hosted by decision (deploy/coturn, tools/live/start-livekit.sh); vars in the example; keys generated on the server |
| 2.5 | S3/R2 + GEMINI_API_KEY + SENTRY_DSN | KEYS / OWNER | in the example (10 S3 vars, GEMINI, SENTRY); R2 token roll pending (LAUNCH_LIST V "gitleaks fingerprints") |
| 2.6 | web: NABD_API_BASE_URL, NEXT_PUBLIC_SITE_ORIGIN, Google OAuth | OWNER (Google client) / SERVER | patient-web/.env.production.example; Google client id/secret = owner (Google console) |
| 2.7 | device integrity Play Integrity + APNS/App Attest | DONE (code) + KEYS | backend/src/modules/device-trust/device-trust.module.ts degrades honestly without keys; APNs key = owner to-do |
| 2.8 | revoke the exposed temporary GitHub token | OWNER | cannot be verified from the repo; owner revokes + rotates (GitHub settings) |
| 3.1 | DNS api./nabd.plus/mcp. | DONE / SERVER | deploy/DNS-RECORDS.md, deploy/nginx/conf.d/mcp.conf, deploy/health-check.sh hits api.nabd.plus; site live since 11-03; mcp host: verify record exists |
| 3.2 | .well-known assetlinks + AASA verified with Apple/Google tools | OWNER | routes exist (patient-web/app/.well-known/*) but AASA answers an error until APPLE_TEAM_ID is set (route.ts:10-11) and assetlinks needs the Play signing SHA-256 (route.ts:3); owner supplies both, then checks with the tools |
| 3.3 | E2E web -> app direct link | OWNER | unit-covered (PT-38 COVERED, native-intent.test.ts); the real OS hand-off is device-farm only (SCENARIOS PT-24 row) |
| 4.1 | Apple Team ID + Bundle ID + signing; Google package + SHA-256 | OWNER | bundle ids set (patient-app/app.json:18 and :5501 = com.patient.nabd); Team ID/signing/SHA = owner accounts |
| 4.2 | store metadata in six languages + privacy policy + Apple health answers | DONE (docs) + OWNER | docs/aso/listings.md (ar,en,ur,hi,bn,fil), docs/compliance/STORE_DECLARATIONS.md, patient-web/app/[locale]/privacy/page.tsx; owner pastes into the store consoles |
| 4.3 | EAS production build + TestFlight/Internal first | OWNER | patient-app/eas.json has `production` build + submit profiles; needs the owner's accounts |
| 5.1 | real payment/booking/pharmacy E2E (cash, card sandbox, insurance) | DONE (CI, fakes) + KEYS | 171 live journeys in tools/live (j_payment_webhook, j_pharmacy*, j_insurance*) run in the live gate against fake Moyasar; a real sandbox card run needs Moyasar test keys (owner) |
| 5.2 | push + real LiveKit call + Moyasar webhook | DONE (CI, fakes) + OWNER | j_lab_result_push, j_web_call, j_payment_webhook; real devices/keys = owner/server |
| 5.3 | Sentry + alerts + DB backup | DONE (code) + OWNER | backend/src/instrument.ts, ops/prometheus/nabd-alerts.yml, uptime-alert.yml, dr-drill.yml, backup restore SY-05 COVERED; Sentry DSN + alert mail secrets = owner |
| 6.1 | watch p95, failure rate, outbox/DLQ first two weeks | p95/failure: DONE; outbox/DLQ: CODE GAP | alerts ClassP95High, SlowRoutes, PaymentErrorRatio (nabd-alerts.yml:27,47,59); NO gauge/alert for the dead-letter queue or stuck outbox (counts exist only behind the admin endpoint event-reliability.module.ts:82-97) -> I build gauge + alert now |
| 6.2 | P2/P3 backlog | n/a | tracked in lead/LAUNCH_LIST.md AFTER LAUNCH |
OWNER to-do list (short): 1) revoke + rotate the exposed GitHub token; 2) Moyasar live + sandbox keys; 3) FCM/Firebase + Infobip + Resend keys, GitHub secrets OPS_ALERT_EMAIL/MAIL_FROM/RESEND_API_KEY; 4) Google OAuth client, Gemini, Sentry DSN, R2 token roll; 5) Apple Team ID + APNs/App Attest key, Play signing SHA-256, store accounts; 6) paste store listings/privacy/health answers, EAS production build + TestFlight/Internal; 7) check .well-known with Apple/Google tools; 8) real-device checks: link hand-off, push, a call; 9) create the release tag (lead).
SERVER to-do list (short): verify the 96 vars of deploy/.env.production.example are set (no `__...__`/`pending_` left; the boot check refuses a short JWT secret only); LiveKit/COTURN keys; APPLE_TEAM_ID + Android SHA-256 envs once the owner has them; confirm the mcp. DNS record + cert; staging run of the journeys with real keys.
Left: building the DLQ/outbox gauge + alert (PR 1), then one PR ticking the file (PR 2). Open of mine: #2620, #2621.

## 2026-11-12 20:45 UTC — new queue checked: EMPTY, proposals
Status: queue empty (nothing to build); waiting on the lead for #2620
(1) Bundle margin: done earlier (95,075 bytes margin on main, no trim needed).
(2) SCENARIOS.md: 100 rows COVERED, 1 PARTIAL (PT-24). PT-24's only remaining gap is "the real OS handing the link to the app", which needs the device farm and the production Team ID + fingerprint (the row says so); I cannot cover it from here. PT-05, PV-15, AD-02 are COVERED now (the older text in the table notes is stale). No journey/test to add.
(3) DTO leftovers, rechecked on main: test_prices/scan_prices already `@Transform(toPriceMap) @IsPriceMap` (typed number map); /hospital/staff is declared once (hospital-staff.module, since #2615); nursing delta: POST /provider/settings/delta takes SubmitDeltaDto {changes|newData objects}, every client (provider-app x6, tools/live) already sends exactly that, and assertNursingDelta guards the shape for nurse roles. dtolint 0, dtocheck 0 mismatches (earlier run). Nothing left. (Only cosmetic: submitDelta's "flat body" branch can never be reached over HTTP, because forbidNonWhitelisted refuses a flat body first; harmless dead code, I left it.)
(4) #2620 waits for the owner (money PR); I rebase/retarget #2621 as soon as it merges. #2601 and #2605 merged.
Open PRs of mine: #2620, #2621.
What else I see (propose, I start nothing until you pick):
 a) Refund-policy hash echo gap in my own work: the WEB consultation booking page shows the page's own policy figures (compact card), so it sends NO hash (the app and every other service do). Proper fix is backend: return the policy hash together with the consultation figures the page already loads, then the web echoes it. Small backend + web PR; needs #2620 merged first (same files).
 b) A second look at the hourly CI of #2620/#2621 after you update branches (I will fix any red).
 c) Anything from B's or Y's backlog you want to hand me; tell me the list.

## 2026-11-12 20:10 UTC — Item 5b offers insurance (decision 30): scope check, need your call before I build
Status: blocked on a product/scope decision (I changed nothing)
What exists on main: decision 30 (docs/product/OWNER_DECISIONS_2026-10-06.md) is already built for the patient side and pharmacy: one policy shape (company_id/code, class, copay; backend/src/common/insurance-policy.ts), provider contracts are `{ company_id, classes[], active }` (insurance_contracts), `hasInsuranceContract(contracts, companyKeys, class)` filters the pharmacy broadcast, ordering requires `insurance_class`. What is still a boolean: the PROVIDER'S PER-SERVICE OFFER in provider_service_offers / service-offers.ts (`ServiceOffer.insurance: boolean`, summary `insurance_accepted`, the `?insurance` list filter = "any offer accepts insurance"), and the provider-registration flag `accepts_insurance` shown in admin ProviderFullDetail.
So "companies and classes instead of a boolean in offers" means: replace the offer boolean with which companies/classes that provider accepts for that service, and make the lab/radiology/nursing lists match the patient's company + class (like pharmacy already does). That touches backend offers model + a data migration of existing `insurance: true` rows + provider-app offer editor + admin view + patient lists on web AND app.
Safe proposal (small steps, each its own PR, backward compatible): (1) backend: offers keep `insurance: boolean` but derive it from the provider's contracts when the request carries the patient's company + class (new optional query params; no params = today's behaviour), tests; (2) patient web+app pass the saved policy company/class to the offers lists; (3) provider-app/admin: show/edit accepted companies+classes (provider app is not redesigned: reuse the existing contracts editor if one exists). I need your answer: build 1-3 now in that order, or park all of it after launch (inbox says the owner may move it)? Until you answer I start nothing.
Left: open PRs of mine #2620, #2621 (+ conflict branch #2601 refreshed). Nothing else in my queue.

## 2026-11-12 19:50 UTC — Item 5a parity audit round 2: no one-sided gap found
Status: done (report only, no PR: there is nothing to build)
Method: all 71 PRs merged to main since 2026-11-09 classified by whether they touch code in patient-app, patient-web or both (tests, locale json and docs excluded). 66 touch both sides or neither (backend/ops). Only 5 touch one side:
- #2554 pt08-app (medical report screens, app): the web side already exists (/medical-reports and /medical-reports/[reportId]), and the national-ID rule shipped on both (74069450).
- #2560 refund-tick-web / #2561 refund-tick-app: the two halves of one feature, both merged.
- #2606 return-photo-scan (web): the app already shows the scan state (ScanStatusBadge, ReturnsViews); this PR only wired the badge into the web return form. Paired.
- #2610 literals-ds (app): internal literal-string / a11y-label hook for the app design system; no web counterpart is meant.
Cross-check by routes: every app area (pharmacy, diagnostics, consultations, health, family, nursing, insurance, settings, ...) has a web route family. The endpoint-level diff (180 endpoints only the app calls, 37 only the web) is NOT evidence of missing features: the web goes through BFF/composite routes, so the paths differ; I did not use it. By design one-sided: web = public SEO pages (/public, entity-graph, oauth, verify); app = camera/wearables/calls/biometrics.
In flight now: #2620 (backend), #2621 (web+app together), #2601 (app+web), #2605/#2604 merged both sides. No new one-sided work is open.
Left: nothing to build for this item; LAUNCH_LIST "parity audit round 2" can be ticked by you (it is your file). Item 5b (insurance companies and classes instead of a boolean in offers, decision 30) is next; it is V's backend item too, so I will first check what exists on main before touching anything.

## 2026-11-12 19:20 UTC — Item 3 bundle margin: no trim needed
Status: done (no PR: nothing to change)
Measured main@07aa8c8a (after #2605) with scripts/bundle-size.mjs: Android bundle 15,297,995 bytes (14.59 MB, gzip 6.42 MB) vs budget 15,393,070 = margin 95,075 bytes (~93 KB). The rule says trim when the margin is under 30 KB, so no trim pass and no budget change (I did not raise or lower it).
Left: I will re-measure when the margin looks small in a PR's CI figure; the three open app-side PRs (#2601, #2620/#2621) change little code. #2620 merged -> retarget #2621. Item 5 (LOWEST PRIORITY parity audit round 2) is next once I am free of CI work; I will start it after #2620/#2601 merge unless you reorder.

## 2026-11-12 19:05 UTC — #2605 merged, #2601 refreshed, item 3 started
Status: in progress
PR: #2605 merged. #2601: merged main again (82678bf9; only the generated docs conflicted, regenerated; no code change since the full app test pass). Open of mine: #2620, #2621.
Item 3 (bundle margin): the budget is perf/bundle-budget.json 15,393,070 bytes (checked by scripts/bundle-size.mjs). I am measuring current main (expo export android) to see the margin; if it is under 30 KB I do one trim pass of dead strings, otherwise I report the margin and stop (no change needed).
Left: #2620 merged -> retarget #2621.

## 2026-11-12 18:35 UTC — #2601 conflict fixed (early, while #2605 CI runs)
Status: waiting for CI
PR: #2601 x/audit-no-show: merged origin/main, pushed 44c6a241. 13 conflicts: six patient-app locale files (both sides appended keys at the end: unioned, valid JSON, 0 duplicate keys) + generated docs/design inventories (regenerated with the repo tools, --check passes). Locally: app jest 295 suites / 2437 tests ALL pass; web provider-no-show + appointments-outcomes 11/11 pass; locale parity ok.
Red check "Patient Mobile build and tests": I could not reproduce a failure in the tests (all green after merging main). If it is red again in CI I will read the job log and root-cause it (no skip); I did not pre-read the old log.
Left: #2605 and #2601 both wait for CI/merge. #2620 merged -> retarget #2621. Item 3 after that.

## 2026-11-12 17:25 UTC — #2604 merged, #2605 conflict fixed
Status: waiting for CI / lead
PR: #2604 merged. #2605 x/pt30-location: merged origin/main, pushed (only the generated docs/design inventories conflicted, regenerated with screen-inventory.mjs and provider-inventory.mjs; `--check` passes; locale parity ok; the PR's own test explorer-browser 4/4 pass). CI pending.
Left: #2601 x/audit-no-show next, after #2605 is merged (queue order, one at a time); it also has the red "Patient Mobile build and tests" to root-cause. #2620 merged -> retarget #2621. Open PRs of mine: #2620, #2621.

## 2026-11-12 15:55 UTC — #2622 merged
Status: waiting for the lead
PR: #2622 merged (item 4 done, merge map row 2). Open: #2604, #2620, #2621 (3 = the cap). All three are 24 commits behind main but merge cleanly (checked with merge-tree), so I am not pushing anything over your update-branch runs.
Left: #2604 merged -> #2605, #2601 conflicts; #2620 merged -> retarget #2621 to main; item 3 starts when I am under 3 open PRs. LAUNCH_LIST: the merge-map row 2 part is merged; the V item covers rows 1-3 together, so I left the tick to you.

## 2026-11-12 12:25 UTC — #2622 is green, ready to merge
Status: ready for the lead
PR: #2622 admin payouts (merge map row 2): ALL checks green incl. live gate shards 1-5 and Backend build and tests. Mergeable now. (#2620, #2621, #2604 not re-read this hour; I will fix any red as soon as I see it.)
Left: no new orders, main unchanged since #2626. Same plan as before: #2604 merged -> #2605, #2601; #2620 merged -> retarget #2621; item 3 when under 3 open PRs.

## 2026-11-12 11:20 UTC — waiting
Status: waiting for the lead (nothing red known on my side)
PR: #2604, #2620, #2621, #2622 open and up to date with main (CI not re-read this hour). No merges since #2626.
Left: when #2604 merges I do #2605 and #2601; when #2620 merges I retarget #2621; item 3 starts as soon as I am under 3 open PRs. If you prefer I start item 3 now (over the cap), say so in my inbox.

## 2026-11-12 09:25 UTC — after the pin merge
Status: waiting for CI / lead
PR: #2604 updated with main again (61061cab; only the generated docs/design inventories conflicted, regenerated with the repo tools; locale parity ok). #2621 updated with the refreshed #2620 (500772f8). #2620 and #2622 left alone, you updated them. (CI: pending for all.)
Left: #2604 first, then (after it merges) #2605 and #2601 conflicts. After #2620 merges I retarget #2621 to main. Item 3 starts when I am under 3 open PRs of my own.

## 2026-11-12 08:20 UTC — P0 pin works
Status: waiting for the lead
PR: #2626 (CI: live gate shards 1 and 5 GREEN, 2-4 still running, every finished check green: the Playwright install now works on 24.04). Needs the lead's manual merge.
Left: nothing merged yet since #2603 (#2604, #2620, #2621, #2622, #2626 open; no new orders). After #2626 merges the other PRs need "update branch". Then: #2605, #2601 conflicts (after #2604), retarget #2621 after #2620, item 3.

## 2026-11-12 07:55 UTC — P0 live gate: pin ubuntu-24.04
Status: done (CI pending; needs the lead's manual merge, it touches .github/workflows)
PR: #2626 p2/pin-ubuntu-2404 (CI: pending; the live gate on this PR is the proof)
What changed: every `runs-on: ubuntu-latest` in .github/workflows (43 files, 74 lines) is now `ubuntu-24.04`. macos-latest (native-e2e) and the one ubuntu-22.04 job untouched. Diff is only the runner label; all 44 workflow files still parse as YAML. No test skipped, no budget touched. (I had found the same root cause earlier, see my 07:45 entry.)
Left: this is a 4th open PR of mine (cap 3) because the P0 goes before everything; #2620, #2621, #2622 wait for it (after it merges they need "update branch"). Saw #2603 merged; #2604 not merged yet, so #2605 and #2601 still wait.

## 2026-11-12 07:20 UTC — CI check
Status: waiting for the lead
PR: #2620 (CI: green except `live gate` 1-5 + `live`, the runner-image/Playwright problem, same as on every PR), #2621 (CI: all green; base is #2620 so the live gate does not run; the offers-screens test that failed locally under load passed in CI), #2622 (not checked yet)
Left: 3 PRs open = my cap. Waiting for the lead to merge #2604 (then I do #2605, #2601) and #2620 (then I retarget #2621 to main). Item 3 (bundle margin) starts when a slot frees. Lead: the live-gate fix (pin runs-on ubuntu-24.04) blocks green merges of everything.

## 2026-11-12 08:25 UTC — Item 4 admin payouts (merge map row 2)
Status: in progress (CI pending)
PR: #2622 p2/admin-payouts
What changed: no second payout path exists (finance-suite already only links to /admin/payouts; provider app only has POST /provider/payouts/request). payouts.tsx now asks the reason + warning in the shared ConfirmDialog instead of window.prompt/confirm; same endpoints. admin vitest 97 pass, tsc clean.
Left: open PRs of mine = #2620, #2621, #2622 (3 = the cap). Next: watch CI of all three and fix reds; #2605/#2601 conflicts after #2604 merges; item 3 (bundle margin) after a PR merges.

## 2026-11-12 08:05 UTC — Item 2 client half
Status: in progress (CI pending)
PR: #2621 p2/policy-hash-echo-clients (base: p2/policy-hash-echo = #2620; retarget to main after #2620 merges)
What changed: web + app send the hash of the policy text the card showed (per service); 409 refund_policy_changed reloads the text, clears the tick, shows a new six-language message. No hash where it would give a false 409 (mixed lab+radiology order, some app cards). Web vitest 3073 pass; app jest 2437 pass, 1 fail `pharmacy/offers-screens` (countdown) that passes alone on this branch and on main = load timing; if it is red in CI I will root-cause it, not skip.
Left: #2605, #2601 conflicts wait for #2604 merge. Open PRs of mine: #2620, #2621 (+ #2604 conflict fix).

## 2026-11-12 07:45 UTC — CI finding (affects every PR) + #2604 state
Status: blocked on lead for the CI image
PR: #2604 (CI: all app/web/provider/admin/contrast checks green, Backend build and tests still running; `live gate` shards 1-5 RED)
What I found: the five `live gate` shards fail in the step "pip install playwright; playwright install --with-deps chromium": the runner image is now Ubuntu 26.04 and Playwright 1.60 answers "does not support chromium on ubuntu26.04-x64" (3 attempts, exit 1). It is the runner image, not the PR; every PR will hit it. I did not touch the workflow (not my scope, and no skipping). Suggested fix for the lead: pin the live-gate job to `runs-on: ubuntu-24.04` (or a Playwright version that supports 26.04).
Left: #2605 and #2601 conflicts wait for #2604 to be merged (queue order). Item 2 client half is built locally, PR next.

## 2026-11-12 07:15 UTC — Item 2 refund-policy hash echo, backend half
Status: in progress
PR: #2620 p2/policy-hash-echo (CI: pending)
What changed: Z had added NO hash field on any create body (only refund_policy_accepted), so I added optional `refund_policy_hash` to every patient create DTO and threaded it through forwarders (unified-bookings, cart, home-care, refill). `stampAcceptance` now answers 409 `refund_policy_changed` (service, hash, version in force) when the shown hash differs from the policy in force; missing hash allowed (old clients), malformed 400. tsc/nest build clean, 147 suites 785 tests pass, dtolint 0, dtocheck 0 mismatches.
Left: client half (web + app send the shown hash; on 409 reload text + ask tick again; six languages) is the next PR, branch p2/policy-hash-echo-clients, starts from #2620.
Questions: none (safe option taken: hash optional, so nothing breaks before the clients ship).

## 2026-11-12 06:40 UTC — Conflicts #2603 / #2604
Status: in progress (#2604 pushed, waiting for CI)
PR: #2603 x/pt54-orders: no conflict, branch already contains origin/main (0 behind), nothing to do. #2604 x/pt03-dependant: merged origin/main, pushed 4edb6907 (CI pending).
What changed (#2604): 13 conflicts. Six patient-app locale files: both sides only appended keys at the end, kept both, JSON valid, 0 duplicate keys, locale-parity ok (no new problems). docs/design inventories regenerated with screen-inventory.mjs and provider-inventory.mjs (not by hand). Tests run: app booking-screens + dsText (13 pass), web booking-for-route (5 pass).
Left / blockers / questions: #2605 and #2601 still conflict; waiting for the lead to merge #2604 before touching them (per queue order). Meanwhile starting item 2 (refund-policy hash echo).

## 2026-11-12 06:30 UTC — Lane P start
Status: in progress
PR: none yet
Scheduled checks created (hourly, :17 and :47): trig_017STMiGEZY9ofoMgZVd9MKP (17 * * * *) and trig_0128Ki84TGzkHY2PgY7zv248 (47 * * * *). Both bound to this session. Renew before expiry (7 days).
Next: queue item 1, conflicts one PR at a time, starting with #2603 x/pt54-orders.
Left / blockers / questions: none yet.
