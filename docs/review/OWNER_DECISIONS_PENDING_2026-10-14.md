# Owner decisions (2026-10-14)

**Answered 2026-10-14: the owner approved all 28 recommendations of section B as written.** The fix session applies them; section C stays with the owner.

Every `owner-decision` line of `docs/design/needs-review/*.json` (63 lines) and every open issue labelled
`route:owner` (45 issues), grouped into one question each, with the lead reviewer's recommendation. The owner answers
by number ("1 yes, 2 no, …"). The fix session applies each answer: it builds what is approved, removes what is not,
and sets every line to `fixed #PR` or `not-a-problem: owner decided … `.

## A. Already decided (nothing to answer; the fix session verifies on `main` and closes)

| Lines / issues | Decision already taken |
|---|---|
| 13-web#12 (issue 797) | /medicine-catalog redirects to /c (done). |
| 1e-app#4, 1e-app#5 | Orders kind chips and reorder carry-over: approved 2026-10-10. |
| 2-app#12 (issue 394) | Urdu font (Noto Nastaliq Urdu): approved and fixed 2026-10-10. |
| 2-app#16, 2-web#6, 2-web#11 | "Doctors in {city}", specialty and payment filters: approved 2026-10-10. |
| 7-app#0, 7-app#12, 7-web#14 | Insurance refunds tab, claims tab and claim form removed (decision 35). |
| 7-app#2, 7-web#0 (issues 821, 833) | No cash after an insurance decline for online consultations (decision 25). |
| admin-customers-growth#1 (issue 918) | Community moderation page removed with community posts (decision 1). |
| admin-journeys#12, #15 (issues 949, 952) | One medicine editor, one refund path: removed 2026-10-10. |
| admin-public-directories #3 #5 #7 #8 #10 #12 #13 (issues 983–993) | Public pages removed from the admin app 2026-10-10. |
| rx-rules-app#3, rx-rules-web#5 | Not an owner question: the add paths that do not send `online_exclusive` are client fixes (moved to `open`). |

## B. Decisions needed (with the reviewer's recommendation)

| # | Question | Lines / issues | Recommendation |
|---:|---|---|---|
| 1 | Terms and privacy before sign-in: load from the legal service, show retry when offline; bundle the approved text as an offline copy only after the lawyer approves it. | 12-app#2, 13-app#1, 13-web#13 (issues 755, 783) | **Yes.** Signed-in users go to Settings → About → Legal. |
| 2 | Privacy actions "copy of my data in 24 h" and "transfer to another platform (FHIR)". | 12-app#3 (issue 756) | **Build "download my data" and "delete my account"** (PDPL rights; endpoints exist: `/privacy/requests`). **Drop FHIR transfer** for now. |
| 3 | Saved payment cards row (app and web). | 12-app#10, 12-web#1 (issues 763, 771) | **No, not now.** Card saving needs Moyasar tokenisation and PCI work; remove the row from the boards. |
| 4 | Camera and microphone on/off in calls; verify the connected call screens with a real call. | 14a-app#1, 2-web#9 (issues 800, 407) | **Yes**: toggles inside the call screen (LiveKit already supports them), and a real-call test on our own LiveKit/TURN. |
| 5 | Diagnostics payment filter (insurance / self-pay). | 3-app#0, 3-web#3 (issues 622, 635) | **Yes, after D-30** (it adds which lab accepts which insurance and class). Labs carousel and add toggle: **no** for now. |
| 6 | Diagnostics "compare prices" opens the test search first. | 3-app#3 (issue 625) | **Keep** (a comparison needs a test). |
| 7 | Live map of the sample collector. | 3-web#6 (issue 638) | **No** until the provider app sends the collector's position; keep the status steps. |
| 8 | Fixed medical texts (fasting and preparation, collector tips, sleep tips). | 14b-app#4, 3-app#6, 3-app#7, 5-app#14 (issues 628, 629, 669) | **Keep, but one doctor reviews all fixed medical texts before launch.** |
| 9 | Nursing tracking back button: back, else Home. | 4-app#6 (issue 646) | **Confirm.** |
| 10 | Health ID QR: never the national id; a token QR (/reports/passport). | 5-app#8 (issue 663) | **Confirm** (privacy). |
| 11 | Wearables hub redirects to Vitals. | 5-app#11 (issue 666) | **Confirm.** |
| 12 | Vitals "Today" tab shows the latest reading of each vital. | 5-web#6 (issue 679) | **Rename the tab to "Latest"** instead of changing the data. |
| 13 | Book for a family member. | 6-app#0 (issue 684) | **Yes, build it** (the "booking" permission exists, nothing uses it); booking takes the member as beneficiary. |
| 14 | Family permissions: per-member grant count instead of the board's full / managed / view chips and group row. | 6-app#1, 6-web#2 (issues 685, 696) | **Confirm** the per-member grants. |
| 15 | Emergency contacts entry in the family hub opens the medical profile Emergency tab. | 6-app#8 (issue 692) | **Confirm.** |
| 16 | Family web screens follow the closest templates (the board has only the mobile hub). | 6-web#6 (issue 701) | **Confirm.** |
| 17 | Insurance policy card OCR on web. | 7-web#10 (issue 843) | **No.** Typed fields plus a card photo are enough. |
| 18 | Mental health Relax screen (breathing, meditation). | 8-app#2 (issue 851) | **No** (needs clinical content); the unused endpoints can go. |
| 19 | Voice input (mic) in the assistant, app and web. | 9-app#4, 9-web#4 (issues 875, 883) | **No, not now.** |
| 20 | Home AI tools row: three entries (skin analysis and virtual doctor removed, decisions 4 and 24). | 9-app#7 (issue 878) | **Confirm.** |
| 21 | Pharmacy offer: the pharmacist may enter their own unit price. | provider-journeys#2 (issue 1138) | **Yes, capped by the SFDA ceiling** (decision 12 already enforces it) and logged; fix the screen text that says prices are never typed. |
| 22 | Doctor e-prescription ends at "created"; the patient orders the medicines (decision 18). | provider-journeys#10 (issue 1155) | **Confirm**; remove the dead "Pharmacy on Nabd Plus" row. |
| 23 | Facility settings "Ambulance fee" field. | provider-journeys#26 | **Remove** (decision 14). |
| 24 | Radiology home visit (GPS tracking) order button. | provider-journeys#27 | **Keep removed.** |
| 25 | Terms checkbox at registration for doctors and facilities (the other four types have it). | provider-journeys#31 | **Yes, all six provider types accept the terms.** |
| 26 | "Consult a doctor" from an Rx item opens the mapped specialty only when the admin fills the category → specialty mapping. | rx-rules-app#4, rx-rules-web#6 | **The fix session proposes the mapping; the owner approves it in admin.** |
| 27 | Chat thread: show the text of the patient's own messages and the doctor's replies inside the thread (not in list previews). | 2-web#13 | **Yes.** |
| 28 | "Cash only" doctor filter means "does not accept insurance". | 2-web#12 | **Replace it with Insurance / Self-pay** (D-30). |

## C. Business and legal (owner action, not code)

| Issue | What | Recommendation |
|---|---|---|
| 340 (decision 21) | In-Kingdom hosting before launch | Plan the move once the licence path is known; staging first. |
| 341 (decision 22) | PDPL inventory, consent, retention, access log | `docs/architecture/DATA_MAP.md` plus D-34's access log; a lawyer reviews. |
| 342 (decision 23) | Licensing (CR, MOH telehealth or partner model, SDAIA) | With the lawyer; Nafath and Wasfaty wait for it. |
| legal texts (13-web#13) | Policies are drafts with placeholders | The lawyer approves `docs/legal`, then the bundled copy is generated. |

## D. New questions from the fix session (2026-10-14, open)

| # | Question | Where | Recommendation |
|---:|---|---|---|
| 29 | Admin roles: today every admin holds the whole admin permission set (role `admin`; custom roles only add permissions), so a "restricted" admin cannot exist and 128 admin write routes are role-only (no permission named). Should custom roles become restrictive (an admin gets only the permissions of their roles)? | fix session, PR fix/admin-guards (security sweep) | **Yes, before staff other than the owner get admin accounts**: make custom roles restrictive and name a permission on every admin write route in one PR; until then the panel already hides every control whose backend permission the role lacks. |
| 30 | Pharmacy order chat (substitute negotiation): the patient app and web have the screens and the four actions, and the provider app has an "Order chat" button on the order card (PharmacyDashboard.tsx:1050) that reads and writes an existing thread, but no route opens a thread (openOrGetThread has no caller), so both sides always show an empty chat. Substitutes already travel in the offer lines (the patient decides by choosing the offer, P13-R2). The hub tile "Pharmacist consult" and the product page "Ask a pharmacist" open it with no order. | batch-1b-app#0, #1 (issues 479, 480) | **Build it for orders only** (as decision 24 does for doctors): the pharmacy opens a thread on an order line from its existing Order chat (and may attach a substitute from its inventory, checked against the prescription), the patient answers in the existing screens; remove the two entry points that open it with no order. If you prefer no chat at all, the fix session removes the screens, the routes and the entry points instead. |

## E. Decided 2026-10-15 (the owner asked the reviewer to decide and approve)

- **Medical fixed texts (B8: issues 628, 629, 669).** No fixed medical text in the apps.
  - Lab and radiology preparation comes per test from the catalogue: a new `preparation` field in six languages,
    edited by admin and the lab, shown on sample tracking. A test without one shows only "the lab will confirm any
    preparation with you".
  - The sample-tracking steps come from the booking's real status timeline.
  - The collector tips on the redirected technician screen are removed.
  - The four sleep tips are replaced by published articles tagged sleep (content API), or nothing when there are none.
  - Owner of the work: the fix session (lines set back to `open` with this decision).
- **Legal texts (terms, privacy).** Stays an owner action: a Saudi lawyer approves `docs/legal` before launch. Until
  then the embedded fallback stays off. This is a launch blocker and cannot be decided in code.

## D2. More questions from the fix session (2026-10-15, open)

Found while sweeping the open needs-review lines. Each line is set to `owner-decision` with the question number; the fix
session builds the answer once it is given.

| # | Question | Where | Recommendation |
|---:|---|---|---|
| 31 | The app's order centre also lists insurance claims and pharmacy returns; the web order centre lists the five services only (claims and returns have their own pages). Merge them on the web too? | 1e-web#9 | **Yes, for parity**: two more kinds in the web order centre, read from the same backend lists, each row opening its existing page. |
| 32 | The web onboarding (`/welcome`, `/onboarding`) is reached by no link and finishing it saves nothing. Keep it (shown once after sign-up, completion saved on the account) or remove it from the web? | batch-0-web#7 (issue 436) | **Remove it from the web**: the site opens on the home page; location and notifications are asked where they are used (web push is being wired by the fix session for batch-0-web#9). |
| 33 | The product board draws a delivery/pickup switch with times on the product page, but the mode is only known once a pharmacy answers with an offer. | batch-1a-app#7 (issue 455) | **No switch on the product page**; delivery or pickup is chosen at checkout from the chosen offer (as today). |
| 34 | The en, ur, hi, bn and fil pharmacy texts (177 keys) were written by the sessions, not by native speakers. | batch-1a-app#18 (issue 466) | **Owner action**: a native reviewer per language before launch; the keys stay as they are until then. |
| 35 | The cart board draws unit prices, an estimated total, points and a delivery row; pharmacy prices exist only once pharmacies answer with offers. | batch-1b-app#2 (issue 481) | **Keep the cart without prices** (decision: pharmacies answer with offers); the cart says the prices come with the offers. |
| 36 | The web barcode page has only a typed field; the app scans with the camera. | batch-1b-web#8 (issue 499) | **Use the browser's BarcodeDetector where it exists** (Chrome/Android), with the typed field everywhere; no extra decoding library. |
| 37 | The Success board is a dark full-bleed page with lime (#D7FF00) and confetti colours, which are not tokens. | batch-1d-app#18 (issue 548) | **Tokens only** (identity rule A): the success screen uses the existing canvas, action and service tones, no lime and no confetti. |
| 38 | Hosted checkout, return and webhook were checked only against a local stand-in: no Moyasar test keys in the environment. | batch-1d-web#1 (issue 551) | **Owner action**: put the Moyasar test keys in the CI secrets so one run per release pays in the sandbox end to end. |
| 39 | Prescription items in the cart: the web cart goes straight to checkout with the "active" prescription; the app first opens rx-order to pick the prescription. From a doctor's prescription, the web opens rx-order (broadcast at once) while the app opens checkout on that prescription. Which is the one flow? | journeys#22 (issue 1031), journeys#34 (issue 1043) | **The app's flow on both**: the patient picks the prescription in rx-order before checkout, so a line is never sent with the wrong prescription. |
| 40 | **Same item as question 30 (issue 480): answer it there.** "Ask a pharmacist" (app pharmacy hub tile and product page) opens the substitute chat of an order, which exists only when a pharmacy proposes a substitute; opened without an order it can only say "open the chat from an order". There is no general pharmacist chat. | batch-1b-app#1 (issue 480) | **Remove the two entry points** (as decision 24 does for doctors: chat only inside an order); the order page keeps its pharmacist chat. Building a general pharmacist chat is a new service (staffing, hours, liability) for the owner to plan. |
| 41 | The pharmacy dashboard still holds a quick-offer screen that is never shown (the offer composer is `PharmacyBroadcastResponse`). The release contract `provider-app/provider-app.contracts.test.js` expects the offer calls in `PharmacyDashboard.tsx`, and only that screen has them, so it cannot be removed without changing the contract test. | provider-journeys#5 (issue 1146), #1474 | **Remove the unrendered screen and point the contract at the live composer** (`shared/blueprint/PharmacyBroadcastResponse.tsx`): the contract should check the code the pharmacist actually uses. Needs the owner (or reviewer) to approve the change to the acceptance test. |
| 42 | The app's nurse booking offers "the nurse provides transport" or "I will send a car for the nurse". The choice is not saved on the booking and changes no price: the trip fee (decision 26) is charged either way. | 4-app#1 (issue 641) | **Remove the choice**: the nurse always comes to the patient and the trip fee applies, as the refund policy already says. If the owner wants "I send a car", it needs a booking field, a trip-fee waiver and the nurse's consent, which is a new feature. |
