# Client final reconciliation (2026-11-17, lane P)

Ordered by the lead (2026-11-17 05:00 UTC): go through the launch list, `docs/design/PROGRESS.md` "Next", the `[client]` needs-review lines (WIRING_REPORT section 7), `docs/review/*GAPS*`, the owner decision files and every item answered "waiting for", and state for each CLIENT item **DONE (PR) / OPEN (what exactly) / DEFERRED (owner's word)**. Read from `origin/main` at the time of writing; the code was read for every row marked `code`, and rows marked `line` are classified from the text of the needs-review line itself (the line was not re-read against the code in this pass).

## 1. Counts

The `[client]` lines that were still `open` in `docs/design/needs-review/*.json`: **107** (the generated status table says 93 for the `client` tag; this pass also counts lines that carry the tag in their text).

| State | Lines |
|---|---:|
| DEFERRED | 40 |
| OPEN | 37 |
| OPEN (design) | 13 |
| DONE | 6 |
| NOT A PROBLEM | 6 |
| FIXED HERE | 5 |

## 2. Launch list (`lead/LAUNCH_LIST.md`), client items

| Item | State | Evidence |
|---|---|---|
| Web/app parity audit round 2 | **DONE** | #2723 (`docs/design/PARITY_2.md`): no transactional screen on one side only; `community/[postId]` is a redirect |
| Pharmacy return photo: scan badge on the web form + app photo-step test | **DONE** | #2606 (`4ebca784a`): `return-request-form.tsx` shows `ScanStatusBadge`; `pharmacy-return-form.test.tsx` covers the photo step |
| Bundle margin | **DONE for now (a standing rule)** | measured today with `scripts/bundle-size.mjs`: 15,311,956 bytes against the budget 15,393,070 = 81,114 bytes (79 KB) of margin, above the 30 KB trigger, so no trim pass is due |
| Patient literal UI strings | **DONE** | the literal-string baseline holds no `patient-app` or `patient-web` file (only `provider-app`: 105); #2700 .. #2730 cleared the provider app from 5277 to 105 |
| Provider/admin merge map rows 1, 2, 3 (+ row 4 verification) | **DONE** | row 1 `585f91b4b`, row 2 #2622 (admin payouts: confirm dialog instead of `window.prompt`), row 3 #2615 (hospital/staff); row 4 verification is in `docs/design/MERGE_MAP.md` |
| Admin jobs board: list and moderate facility jobs | **DONE** | ticked on the list, on main (`guest-job-review.spec.ts`); client page under `admin/src/pages/admin` |

## 3. The specific checks of the order

| Check | State | Evidence |
|---|---|---|
| Pharmacy return photo scan badge (web) + app photo-step test | **DONE** | #2606 (see above) |
| Admin jobs board (list / moderate facility jobs) | **DONE** | on main, see above |
| Android bundle margin | **DONE** | 79 KB margin, see above |
| Social login token verification in the app | **DONE** | the app posts the provider token to `POST /auth/social-login` and nowhere else (`useSocialLogin.ts:74`); the server verifies it (`auth.service.ts:1552-1553` `verifyGoogleToken` / `verifyAppleToken`); the app never trusts a token it holds |
| Web/app parity gaps from #2723 | **DONE** | #2723 found none |
| The admin hide-actions (#2732) | **DONE** | #2732 (10 of the 12 rows changed, row 2 already gated by `canSeeAlerts`, row 12 fixed differently: the withdrawals row asked for `finance.read` that the page never granted) |
| Payment and attachment links open only when https | **DONE** | #2711 |
| Slot pickers read and ask for Riyadh time | **DONE** | #2731 (deploy with #2725) |

## 4. Items I answered "waiting for"

| Item | State | What it needs |
|---|---|---|
| Provider app languages ur / hi / bn / fil | **CLOSED** | owner 2026-11-17: provider app is Arabic + English only |
| Admin `returns.tsx:52` `window.prompt` | **FIXED HERE** | the note is asked in the shared `ConfirmDialog` (the same one `payouts.tsx` uses), 5-character minimum for a rejection kept, test `returns-decision-dialog.test.tsx`. 18 other `window.prompt` calls remain in the admin app, in 10 files (same fix, one page each): they are OPEN, listed in section 7 |
| Overlay / scrim token for white at partial opacity (provider-app token audit step 2) | **DEFERRED (owner)** | I will not add a token or a colour; `rgba(255,255,255,a)` overlays, the legacy palette in `provider-app/src/constants/index.ts` (62), `ui.tsx` (21), `VideoCallRoom.tsx` (16) wait for the answer |
| The last 105 provider-app literals | **OPEN** | 32 upper-case status codes in JSX comparisons (code, not text), the CSV header `catalog_id,mode,price`, about 70 bespoke strings; a new PR from main after #2730 merges |
| Open PRs waiting for the lead | **WAITING** | #2719 (token audit step 1), #2730 (literals slice 10) |

## 5. Other sources read

| Source | Result |
|---|---|
| `docs/design/PROGRESS.md` "Next" | no client defect is open there that is not a row below; items 0-5 are design history (invoice UI, the owner colour stack, ordering M6, refs triage, web = app parity "done", on hold D-12 / C12 / `/onboarding/permissions`) and are DEFERRED to the owner |
| `docs/review/BACKEND_GAPS_TRIAGE_2026-11-16.md` | its client item "the assistant screens read `/system-config/public` for the urgent-help number" is **stale / DONE**: both assistant screens send a red flag to the emergency page (`AssistantView.tsx:34,156`, `symptoms-client.tsx:111`), and that page reads `GET /mental-health/urgent-help` (`UrgentHelpView.tsx:38`, `urgent-call.tsx`). Its "13 lines" of admin permission mismatches are #2732 |
| `docs/review/PROVIDER_ADMIN_GAPS.md` | provider/admin gaps G1-G7 are DONE per its own state table (the last item, G6 reject + resubmit, #2555) |
| `docs/review/OWNER_DECISIONS_PENDING_2026-10-14.md` | section A "already decided" lines were closed by the fix sessions; the section B questions are owner decisions (DEFERRED); one client note ("the add paths that do not send `online_exclusive` are client fixes") was **not re-verified** in this pass: the read paths carry the flag (`searchResults.ts:60`, `pharmacyCatalog.ts:28`) |
| `WIRING_REPORT.md` section 7 | these are the rows of section 6 below |

## 6. The `[client]` needs-review lines

| # | file:line | element | state | what | basis |
|---:|---|---|---|---|---|
| 1 | `backend/src/modules/agent-oauth/agent-oauth.controller.ts:100` | List and disconnect connected AI assistants | **OPEN** | web has Settings > Connected apps (`settings/connected-apps`); the APP has no screen for `GET /patient/agent-connections` + `DELETE` | code |
| 2 | `patient-web/components-next/diagnostics/catalog-load.ts:67` | insurance filter is applied on the loaded rows | **AFTER LAUNCH** | lead decision 2026-11-19: keep today's catalogue-based rule (`insurance_availability`); the offer-based filter (`insurance=1`) waits for the insurance offers (decision 30, parked after launch), it would show nothing now | line |
| 3 | `patient-app/app/(tabs)/diagnostics.tsx:157` | insurance filter on loaded rows | **AFTER LAUNCH** | lead decision 2026-11-19: keep today's catalogue-based rule (`insurance_availability`); the offer-based filter (`insurance=1`) waits for the insurance offers (decision 30, parked after launch), it would show nothing now | line |
| 4 | `patient-web/components-next/diagnostics/notify-me-button.tsx:1` | notify-me confirmation and sign-in | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 5 | `patient-app/src/components/diagnostics/CatalogueKit.tsx:122` | signed-out sign-in state of Notify me | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 6 | `patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:205` | Web: Book requested tests | **OPEN** | client change, not done in this pass | line |
| 7 | `patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:99` | One-tap follow-up buttons (order prescription, boo | **OPEN** | client change, not done in this pass | line |
| 8 | `patient-web/components-next/ordering/confirm-client.tsx:204` | Insurer / patient share lines still use the server | **DEFERRED** | owner / reviewer decision | line |
| 9 | `patient-web/components-next/insurance/add-policy-form.tsx:1` | Edit policy (copay % and cap) | **DEFERRED** | owner / reviewer decision | line |
| 10 | `patient-app/src/components/views/DoctorSearchView.tsx:117` | Price band filter | **DEFERRED** | owner / reviewer decision | line |
| 11 | `patient-app/src/components/account/ProvidersMapView.tsx:297` | hospital sheet link | **NOT A DEFECT** | `/consultations/clinic/[id]` is the facility page itself (`app/consultations/clinic/[id].tsx` reads `GET /care/facilities/:id`, covered by `facility-page.test.tsx`); `app/facility/[slug].tsx` is only the link resolver that routes to it, so there is no second facility screen to relink to | code |
| 12 | `patient-app/src/components/MapPrimitives.native.tsx:122` | hologram layers on device | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 13 | `patient-web/lib/receipt/capture.ts:30` | Save as image on the web: Readex Pro is not embedd | **FIXED** | the saved image carries the card's @font-face files as data URLs (`lib/receipt/capture.ts`); checked in Chromium: the saved PNG is pixel-identical to the card on screen, the old one differed (system font) | line |
| 14 | `patient-app/app/receipts/[kind]/[bookingId].tsx:58` | App Share sends text, not the receipt file | **FIXED** | Share sends the receipt as an image (the card captured to a PNG, as Save as image does) and falls back to the text lines when it cannot be captured (`app/receipts/[kind]/[bookingId].tsx`) | line |
| 15 | `patient-app/src/components/views/DoctorSearchView.tsx:122` | Sort and gender chip rows on the 'View all doctors | **DEFERRED** | owner / reviewer decision | line |
| 16 | `patient-web/app/[locale]/diagnostics/page.tsx:225` | Payment filter option "Self-pay" | **DEFERRED** | owner / reviewer decision | line |
| 17 | `patient-app/app/diagnostics/discuss.tsx:56` | Waiting state uses polling | **OPEN** | client change, not done in this pass | line |
| 18 | `patient-app/app/diagnostics/lab-result.tsx:124` | Discuss button for results without a booking | **DEFERRED** | owner / reviewer decision | line |
| 19 | `patient-app/src/components/ordering/OrderingKit.tsx:39` | First-ask for a new patient shows only on the 'set | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 20 | `patient-app/app/diagnostics/service-home.tsx:35` | Route is not linked | **OPEN** | `/diagnostics/service-home` is opened only from `booking-status` and a test; no hub entry points to it | code |
| 21 | `patient-app/app/diagnostics/test-detail.tsx:107` | Doctor-order items pre-ticked / Later | **NOT A FIX** | a new feature, not a defect: a doctor-order card on the item page (items pre-ticked, untick = later) wired into the basket needs the board, the basket rules for "later" and six-language strings; the screen `medical-orders/[id]` already handles the order. Needs a spec | line |
| 22 | `patient-app/src/utils/useOrderingContext.ts:13` | Context not kept between screens | **OPEN** | client change, not done in this pass | line |
| 23 | `patient-app/app/diagnostics/cart.tsx:52` | Choose a provider | **DEFERRED** | owner / reviewer decision | line |
| 24 | `patient-app/app/diagnostics/lab-comparison.tsx:53` | Choose this provider | **OPEN** | client change, not done in this pass | line |
| 25 | `patient-app/app/diagnostics/lab-comparison.tsx:86` | Use this split | **NOT A FIX** | a new feature: booking two providers from the suggested split needs the When picker for two bookings (Ord06) and a two-booking basket rule; the split is shown, the button is left out on purpose. Needs a spec | line |
| 26 | `patient-web/app/[locale]/nursing/catalog/page.tsx:100` | Nursing entry: item page link | **DEFERRED** | owner / reviewer decision | line |
| 27 | `patient-web/lib/ordering/server.ts:15` | Quote needs a saved address with coordinates | **OPEN** | client change, not done in this pass | line |
| 28 | `patient-web/components-next/ordering/ordering-context.tsx:12` | 'For whom' (family member) in the context | **OPEN** | client change, not done in this pass | line |
| 29 | `patient-app/app/diagnostics/when.tsx:205` | ASAP fallback from another provider | **OPEN** | client change, not done in this pass | line |
| 30 | `patient-app/app/diagnostics/when.tsx:112` | Left ASAP search open on exit | **DEFERRED** | owner / reviewer decision | line |
| 31 | `patient-app/app/diagnostics/confirm.tsx:267` | Home fee line | **OPEN** | client change, not done in this pass | line |
| 32 | `patient-web/components-next/ordering/confirm-client.tsx:201` | Price lines for a provider that is not the best ma | **OPEN** | client change, not done in this pass | line |
| 33 | `patient-app/app/diagnostics/booking-status.tsx:42` | ASAP search clock | **OPEN** | client change, not done in this pass | line |
| 34 | `patient-web/components-next/ordering/booking-status-client.tsx:167` | Rebook for an earlier time | **DEFERRED** | owner / reviewer decision | line |
| 35 | `patient-web/components-next/ordering/booking-status-client.tsx:272` | Results link | **OPEN** | client change, not done in this pass | line |
| 36 | `backend/src/modules/ordering/ordering-lifecycle.service.ts:312` | Trend per value on booking results card | **OPEN** | client change, not done in this pass | line |
| 37 | `patient-web/app/[locale]/diagnostics/results/[resultId]/page.tsx:128` | Lab result page booking link | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 38 | `provider-app/src/screens/doctor/doctor/MedicalOrderComposer.tsx:47` | Catalogue search | **OPEN** | client change, not done in this pass | line |
| 39 | `provider-app/src/screens/doctor/doctor/MedicalOrderComposer.tsx:1` | Strings | **DEFERRED** | owner / reviewer decision | line |
| 40 | `provider-app/src/api/ordering.ts:81` | Insurer company id | **OPEN** | client change, not done in this pass | line |
| 41 | `provider-app/src/screens/ordering/OrderingBulkScreen.tsx:80` | CSV export save | **DEFERRED** | owner / reviewer decision | line |
| 42 | `provider-app/src/screens/ordering/OrderingBulkScreen.tsx:44` | Before/after preview | **DEFERRED** | needs a backend change first | line |
| 43 | `provider-app/src/screens/ordering/OrderingCompletenessScreen.tsx:36` | Photo and licence task | **OPEN** | client change, not done in this pass | line |
| 44 | `provider-app/src/screens/ordering/logic.ts:191` | Points per task | **DEFERRED** | needs a backend change first | line |
| 45 | `provider-app/src/screens/ordering/index.tsx:1` | Render entry and board comparison | **DEFERRED** | tooling (a provider-app render path), not a product defect | line |
| 46 | `patient-app/app/diagnostics/service-home.tsx:142` | Packages strip and most-requested rows | **OPEN (design)** | own slice: the board's package strip and round add button change the shared `TestRow`/`AddToggle`, which `ServiceHub` also uses; needs the board and a visual check of both screens | line |
| 47 | `patient-app/src/components/ordering/ContextBar.tsx:73` | Hint line under the context bar | **FIXED** | the line under the context bar shows only after a choice was changed, as the board (nothing under the bar) (`ContextBar.tsx`, test `context-bar-hint.test.tsx`) | line |
| 48 | `patient-app/app/diagnostics/when.tsx:175` | Context bar | **DEFERRED** | owner / reviewer decision | line |
| 49 | `patient-app/app/diagnostics/when.tsx:287` | Booking summary section and day-card two-line labe | **OPEN (design)** | own slice, booking path (high effort): two-line day tiles need a second line in the shared `TimeTile`, and moving the chosen time into the sticky bar drops the summary block of the When screen; needs the board and a booking-flow check | line |
| 50 | `patient-app/app/diagnostics/confirm.tsx:303` | Payment method card and context bar | **DEFERRED** | owner / reviewer decision | line |
| 51 | `patient-app/app/diagnostics/confirm.tsx:245` | Doctor-order card and gender control | **OPEN (design)** | own slice, booking path (high effort): the doctor-order card and the staff-gender segmented control are on the confirm screen; restyle only, but it is the screen that pays | line |
| 52 | `patient-app/app/diagnostics/lab-result.tsx:75` | Values list | **OPEN (design)** | own slice: needs new range-bar and sparkline components, share/download buttons (no route) and a new six-language string for the "values within range" line | line |
| 53 | `patient-app/app/diagnostics/lab-comparison.tsx:87` | Home/centre segmented control and default sort | **DEFERRED** | owner / reviewer decision | line |
| 54 | `patient-app/src/utils/dates.ts:97` | fmtDate / fmtTime of utils/dates.ts | **DONE** | no screen imports the Arabic-only `fmtDate`/`fmtTime` of utils/dates any more (the screens use `dateFormatterFor(lang)`); nothing to switch | code |
| 55 | `tools/design/render-native-screen.mjs:1` | No render path | **DEFERRED** | tooling (a provider-app render path), not a product defect | line |
| 56 | `provider-app/src/screens/doctor/doctor/MedicalOrderComposer.tsx:187` | Code read against boards | **OPEN** | client change, not done in this pass | line |
| 57 | `patient-web/app/[locale]/diagnostics/page.tsx:282` | Desktop layout: board = list column plus a sticky | **OPEN (design)** | own slice: a two-column desktop hub with a sticky basket card; needs the basket-lines component in a side variant | line |
| 58 | `patient-web/app/[locale]/labs/layout.tsx:1` | Fixed floating tab bar covers the last card and th | **NOT REPRODUCED** | the shell already pads the page for the tab bar at 390 (`app/globals.css:149-150`), the page CTA bars live in the shell's bottom area above the tab bar (`ui-generated/shells/shells.css:82-98`) and the basket bar lifts itself by the measured bottom-area height (`components-next/ordering/basket-bar.tsx:18-24`); the note came from full-page screenshots; a real 390 interaction check is left to the runtime check | line |
| 59 | `patient-web/components-next/ordering/ordering-context.tsx:33` | 'For whom' chip (family member) not drawn | **OPEN** | client change, not done in this pass | line |
| 60 | `patient-web/components-next/ordering/booking-status-client.tsx:150` | Choices are three immediate buttons; board = radio | **OPEN (design)** | not a restyle: select-then-confirm changes the `choosePartial` flow (decision logic); needs the Ord09 slice and a high-effort review | line |
| 61 | `patient-web/app/[locale]/medical-orders/page.tsx:58` | List rows are one-line summaries; board = cards pe | **DEFERRED** | needs a backend change first | line |
| 62 | `patient-web/components-next/ordering/booking-status-client.tsx:270` | Results live inside the booking page; the board ha | **OPEN (design)** | needs the backend first: the results screen's rating form has no rating endpoint | line |
| 63 | `patient-web/components-next/ordering/basket-bar.tsx:1` | Sticky basket side card still not drawn | **OPEN (design)** | own slice: the same two-column hub as row 57 (sticky basket side card) | line |
| 64 | `patient-app/src/components/orders/ResultsPanel.tsx:102` | Share with your doctor | **FIXED** | the share button carries the result's kind and booking and the share-reports screen ticks the medical report of that booking (`shareReportPreselect.ts`; a result with no report yet ticks nothing) | line |
| 65 | `patient-app/src/components/orders/ResultsPanel.tsx:64` | Book a consultation with the result as context | **OPEN** | client change, not done in this pass | line |
| 66 | `patient-app/app/diagnostics/service-home.tsx:117` | Cart button on the nursing screens | **DEFERRED** | owner / reviewer decision | line |
| 67 | `patient-app/app/(tabs)/diagnostics.tsx:224` | My orders and results top-bar button | **DEFERRED** | owner / reviewer decision | line |
| 68 | `patient-web/app/[locale]/diagnostics/page.tsx:161` | My orders and results top-bar button | **DEFERRED** | owner / reviewer decision | line |
| 69 | `patient-app/app/diagnostics/package-detail.tsx:83` | Order now on the package page | **DEFERRED** | owner / reviewer decision | line |
| 70 | `patient-app/app/(tabs)/diagnostics.tsx:153` | Scan-type chips (GET /radiology/modalities) replac | **DEFERRED** | owner / reviewer decision | line |
| 71 | `patient-app/app/(tabs)/diagnostics.tsx:280` | Infinite list on the app | **DEFERRED** | owner / reviewer decision | line |
| 72 | `patient-web/app/[locale]/diagnostics/page.tsx:119` | Most requested strip | **DEFERRED** | owner / reviewer decision | line |
| 73 | `patient-web/components-next/diagnostics/catalog-load.ts:52` | Place and payment hide rows after the server page | **DEFERRED** | needs a backend change first | line |
| 74 | `patient-app/app/(tabs)/nursing.tsx:39` | cart summary bar (count / view cart) absent on the | **DEFERRED** | owner / reviewer decision | line |
| 75 | `packages/ui/components/contract.ts:248` | Filter badge on web search field | **DEFERRED** | owner / reviewer decision | line |
| 76 | `patient-web/app/[locale]/family/[memberRef]/page.tsx:62` | Book for this member | **DONE** | web carries `family_member_id` through basket, providers and when (PT-03 #2604) | code |
| 77 | `patient-app/app/pharmacy/barcode-scanner.tsx:60` | interaction check scans only one medicine | **DEFERRED** | owner / reviewer decision | line |
| 78 | `patient-web/app/[locale]/diagnostics/bookings/[domain]/[bookingId]/page.tsx:112` | radiology technician name and report files | **OPEN** | client change, not done in this pass | line |
| 79 | `patient-web/app/[locale]/home-care/services/[serviceId]/book/page.tsx:80` | nearest-first sort with distance | **OPEN** | client change, not done in this pass | line |
| 80 | `patient-app/app/nursing/service-details.tsx:62` | availability and nationality parameters of the app | **DONE** | the app already sends `available=true` for "available now" (`service-details.tsx:63`) | code |
| 81 | `patient-web/components-next/map-explorer-client.tsx:201` | Map pane | **DEFERRED** | owner / reviewer decision | line |
| 82 | `patient-app/app/(auth)/reset-password.tsx:36` | Expired reset link message | **FIXED HERE** | `reset_token_invalid` now maps to `errors.resetLinkInvalid` (six languages), test in `serverMessage.test.ts` | code |
| 83 | `patient-app/src/utils/guestSession.ts:33` | Guest display name fallback | **FIXED HERE** | the guest fallback name is `deviceText("auth.guestName")` (six languages), test in `guestSession.test.ts` | code |
| 84 | `patient-app/app/(auth)/login.tsx:168` | Example e-mail placeholder | **NOT A PROBLEM** | an example address (`name@example.com`) is language-neutral, like a phone number format | decision |
| 85 | `patient-app/app/consultations/doctor-profile.tsx:1` | Legacy screen | **NOT A PROBLEM** | the file only redirects (its own line says so) | line |
| 86 | `patient-app/src/components/loyalty/OffersViews.tsx:112` | Offer page behind the redirect | **FIXED HERE** | `offerId` goes through `encodeURIComponent` in both calls (`OffersViews.tsx`) | code |
| 87 | `patient-app/app/diagnostics/booking-status.tsx:228` | Pay now: payment kind | **NOT A PROBLEM** | `booking-status` is the lab ordering booking; a radiology booking opens `/diagnostics/order/[id]` (`bookingHref`) and is paid on its own kind in `confirm.tsx:155` | code |
| 88 | `patient-app/app/diagnostics/booking-confirm.tsx:5` | Route kept as a bare redirect | **NOT A PROBLEM** | kept on purpose (its own line says "Keep the redirect") | line |
| 89 | `patient-app/app/diagnostics/lab-result.tsx:41` | Mine list error swallowed | **NOT A PROBLEM** | by design: a failed history read only hides the trend (comment at `lab-result.tsx:36`) | code |
| 90 | `patient-app/src/components/care/MaternityViews.tsx:228` | LMP and due date typed as text | **FIXED** | app: the typed dates must be real year-month-day days and the last period not in the future (`maternityDates.ts`, two new messages in six languages); web: the date input already gives a real day, the future check is added (`lib/maternity-dates.ts`) | line |
| 91 | `patient-app/src/components/health/SleepView.tsx:159` | Sleep score is typed by the person | **DONE** | the source of a score is shown (`health.sleep.manual` / `device`, `SleepView.tsx:80`) | code |
| 92 | `patient-app/src/components/family/FamilyAddView.tsx:155` | Relation and display name sent as Arabic text | **FIXED HERE** | `POST /family/join` now also sends `relation_code` (the six codes are all valid in `family.service.ts:36`); the Arabic `relation` text stays for the stored label | code |
| 93 | `patient-app/src/components/orders/ResultsPanel.tsx:104` | Share with your doctor does not pre-select the res | **FIXED** | the share button carries the result's kind and booking and the share-reports screen ticks the medical report of that booking (`shareReportPreselect.ts`; a result with no report yet ticks nothing) | line |
| 94 | `patient-app/src/components/family/FamilyMemberView.tsx:103` | Book on their behalf only opens the consultations | **FIXED** | the consultations hub now says whom the booking is for (same notice and keys as the confirm step) with a "for me" action (`consultations/index.tsx`, test in `consultations-top-bar.test.tsx`) | line |
| 95 | `patient-app/src/components/account/ReturnsViews.tsx:352` | Reason sends the translated label | **DONE** | the pharmacy return sends `reason_code` for the four defect reasons (#2606); the free text stays as the display reason | code |
| 96 | `patient-app/app/payments/result.tsx:94` | Hosted payment page opener | **DONE** | the opened link must be https (#2711, `isHttpsCheckout`) and the route param is already filtered by `trustedPaymentUrl` | code |
| 97 | `patient-app/app/payments/result.tsx:59` | Verify only with our id | **NOT A PROBLEM** | `POST /payments/verify/:txn` takes our own transaction id only (`payments.module.ts:791`); with only the gateway id the screen reads `GET /payments/status/:ref` (accepts both) and the webhook settles it | code |
| 98 | `patient-app/app/pharmacy/payment.tsx:99` | Pay button | **FIXED HERE** | choosing another payment method now drops the kept idempotency key (`pharmacy/payment.tsx`), so a different body never reuses a key | code |
| 99 | `patient-web/lib/map/explorer-browser.ts:29` | Centre of the map when the position is not allowed | **DEFERRED** | owner / reviewer decision | line |
| 100 | `patient-app/app/(tabs)/consultations/index.tsx:323` | Doctors filtered by the Arabic specialty name | **FIXED** | the chosen specialty is kept by its slug and a doctor matches on slug, Arabic or English name (`doctorHasSpecialty`, the rule `/care/specialties` counts by); web already sends the specialty to the server | line |
| 101 | `patient-app/src/components/account/SupportViews.tsx:113` | Attachment pending badge | **OPEN** | client change, not done in this pass | line |
| 102 | `patient-app/src/components/account/ReturnsViews.tsx:374` | Return photo pending badge | **OPEN** | client change, not done in this pass | line |
| 103 | `provider-app/src/screens/radiology/RadiologyDashboard.tsx:432` | Report file upload | **OPEN** | client change, not done in this pass | line |
| 104 | `provider-app/src/screens/nursing/visitFiles.ts:30` | Visit file upload | **OPEN** | client change, not done in this pass | line |
| 105 | `patient-web/components-next/home/home.module.css:22` | active nav pill and Sign in button | **OPEN (design)** | needs a design decision: the boards define no dark web header, so the dark treatment of the active nav pill is not defined; a token or colour cannot be invented (owner decision A) | line |
| 106 | `patient-web/components-next/diagnostics/diag-parts.tsx:85` | data-driven cards and rows | **DEFERRED** | runtime / device check (nothing to fix in code) | line |
| 107 | `patient-web/app/[locale]/chat/[threadId]/page.tsx:106` | voice note recorder and player | **DEFERRED** | runtime / device check (nothing to fix in code) | line |

## 7. What is still OPEN and technical (not done in this pass)

Not fixed here, one line each (the exact need is in the row above):
- **App: Connected AI assistants screen** (row 1): the web has Settings > Connected apps, the app has no screen for `GET/DELETE /patient/agent-connections`.
- **Catalogue insurance filter** (rows 2, 3): AFTER LAUNCH, with the insurance offers (lead decision 2026-11-19): web and app keep filtering on the loaded rows by `insurance_availability`; the backend takes `insurance=1` and filters by what providers offer, which shows nothing until offers exist.
- **Web: referral codes into the lab basket** (row 6), **hospital sheet link to a facility route** (row 11), **`/diagnostics/service-home` has no hub entry** (row 20), **doctor-order items pre-ticked** (row 21), **"Use this split"** (row 25), **family selector in the web context bar** (rows 28, 59), **results link / trend on the booking card** (rows 35, 36), **radiology technician name and report files on the web** (row 78), **nearest-first sort with the address coordinates** (row 79), **LMP / due date format check before POST** (row 90), **share-with-doctor pre-selecting the result** (rows 64, 93), **book on behalf lands on the tab root** (row 94), **doctors filtered by the Arabic specialty name** (row 100), **pending / rejected scan state for support attachments, return photos, provider report and visit files** (rows 101-104).
- **Admin: 18 remaining `window.prompt` calls in 10 files** (same `ConfirmDialog` fix as returns and payouts, one page each).

I did not open a PR for these because the cap of three open PRs is full (#2719, #2730 and this one); they are the next slices, in the order above, when a slot frees.

## 8. Fixed in this PR

- Reset link: `reset_token_invalid` maps to a translated message (`errors.resetLinkInvalid`, six languages) instead of the generic save-failed text.
- Guest fallback name: no Arabic literal; `auth.guestName` in six languages through the device language.
- Offer page: the offer id is URL-encoded in both calls.
- Pharmacy payment: choosing another method drops the kept idempotency key.
- Family join: sends `relation_code` next to the stored Arabic label.
- Admin returns: the decision note is asked in the confirm dialog, not `window.prompt`.
- Tests: `serverMessage.test.ts` (reset case), `guestSession.test.ts` (localized fallback name; mocks `react-native-localize`, no assertion changed), `returns-decision-dialog.test.tsx` (2).
