# Owner product decisions (2026-10-06)

Binding for every session: lead reviewer, review session, OpenCode and design. Each numbered item has one GitHub issue, linked in the table at the end.

**Who does what**
- **Backend and logic:** the review session writes the acceptance spec, OpenCode implements it (`docs/review/OPENCODE_QUEUE.md`, Queue C), and the lead reviewer merges.
- **UI:** the design session, inside the batch that owns the screen.
- **Owner:** the items marked "owner".

**Usual rules**
- One branch and one PR per item. Never force-push. Never revert `[REVIEW-*]` fixes.
- Back up data before any deletion. In production that means the server-ops workflow with the owner's Approve, after a rehearsal.

The decisions are recorded as the owner wrote them. "Notes" are the reviewer's findings from the code on `main` (2026-10-06) and what the implementation needs.

## A. Remove completely

Removal covers code, routes, backend, admin, translations and tests. Data is archived, not dropped silently.

**Exception to the queue rule "never delete a test":** in an A item, the tests of the removed feature are deleted in the same PR, and the PR lists each one.

### 1. Community user posts (`/community/*`)

**Decision**
- Delete community user posts.
- Replace them with doctor-authored articles inside the existing `/articles` module.
- Only verified doctors can write.
- The admin approves an article before it is published.
- No comments.
- No brand names of prescription-only drugs (SFDA bans Rx advertising to the public).
- The author's name links to their profile and to booking.

**Notes**
- `backend/src/modules/community` exists, and so does `modules/articles`.
- The Rx brand-name check reuses the catalogue: names of items with `requires_prescription = true` are blocked at submit and again at approve.
- Before deleting, export the community collections to an archive (local and staging first; production through server-ops).

### 2. Loyalty leaderboard

**Decision:** remove `GET /loyalty/leaderboard` and its screens.

**Notes:** the route is in `loyalty.controller.ts`.

### 3. Family calls (not built)

**Decision:** remove any UI entry for family calls. Family chat stays (it is built and tested).

### 4. AI skin analysis

**Decision:** delete `/ai/skin-analysis`.

**Notes:** `POST /ai/skin-analysis` is in `ai.controller.ts`.

## B. Merge / reduce screens

The design session proposes a merge map first, the owner approves it, and only then is it implemented. **No screen is deleted or merged before the owner approves the map.** Old routes redirect to the merged ones.

### 5. Health and family screens

**Decision**
- Merge duplicates and near-duplicates in `/health` (46 routes) and in `/family` + `/health/family-*` into single screens. Examples:
  - vitals log ×2
  - score / sleep-score / sleep-tracker / sleep
  - family hub / detail / calendar / chat duplicates
  - reminders / smart-reminders / medication-reminder-*
- Redirect old routes to the merged ones.

### 6. Settings

**Decision:** reduce `/settings` (21 routes) to 6–8 screens.

### 7. One AI assistant

**Decision**
- Merge into ONE assistant: `/ai/chat-doctor`, `/ai/symptom-checker`, `/ai/triage`, `/ai/symptom-timeline`, `/ai-assistant`, `/ai/prescription-translator` and `/ai/report`.
- Keep `/ai/monthly-report` separate if it is a report.
- The assistant's behaviour is item 15.

### 8. Mental health

**Decision**
- Keep therapist booking (through consultations), breathing, meditation and the mood journal.
- Remove self-assessment scoring and in-app crisis handling.
- Replace them with one "Need urgent help?" button that opens the phone dialer to the official line. The number comes from admin config and is never hard-coded.

**Notes**
- The backend has `GET /mental-health/assessment-questions` and `GET|POST /mental-health/crisis-contacts`.
- The urgent-help number becomes one admin config value. The owner enters it.

### 9. Loyalty challenges

**Decision**
- Keep only health-habit challenges, for example `target_action` = `vitals_logged` or `checkup_completed`.
- No challenges tied to buying medicines. Rewards stay.

**Notes**
- The server rejects a purchase-type `target_action` when a challenge is created.
- Existing purchase challenges are ended and archived.

## C. Medicines, prescriptions, pricing

### 10. Prescription-only items (`requires_prescription = true`)

**Decision**
- A "يحتاج وصفة" badge on the product card and the product page.
- No offers, discounts, banners or loyalty points on these items.
- Adding one to the cart shows a notice.
- In the cart, the item needs either a prescription upload, or a button "استشر طبيب" that opens consultations filtered to a suitable specialty. Never "request a prescription": the doctor decides.
- Controlled drugs are never orderable online.

**Notes**
- `requires_prescription` and `controlled` already exist on `medicine.schema.ts`.
- The server must enforce the rules, not only the UI:
  - no discount, offer or loyalty accrual on Rx items;
  - an order holding an Rx item without an attached prescription is rejected;
  - an order holding a `controlled` item is always rejected.

### 11. Online-only items (`online_exclusive = true`)

**Decision:** an "أونلاين فقط" badge on the card and the product page.

**Notes:** the field exists, so this is UI only.

### 12. Price ceiling on pharmacy offers

**Decision**
- When a pharmacist answers a manual text, box-photo or prescription request, they must map each medicine line to a catalogue item (search or barcode).
- The server rejects any offer above that item's registered SFDA price.
- Lines that cannot be mapped are marked "price not verified" and go to admin review; the admin adds the item to the catalogue.
- Medicine lines cannot be confirmed until they are mapped.
- The source of the ceiling price is stored on the item.

**Notes and open question**
- The catalogue has only `price` (and `old_price`). There is no field showing that `price` is the SFDA registered price, and no source field.
- The implementation adds `sfda_price`, `sfda_price_source` and `sfda_price_updated_at`, and checks the ceiling against `sfda_price` only.
- **Owner decision needed (O-1):** where do the SFDA prices come from? Is the current `price` the SFDA price, or do we import SFDA's published price list?
- Until items have `sfda_price`, every medicine line is "price not verified". Pharmacy orders would wait for admin review, so the import must come before this rule is switched on.

### 13. Offers waiting

**Decision**
- If no pharmacy answers within the configured time, show a clear state: "expanding the search", then "no pharmacy available, try later".
- Never an endless wait.

**Notes**
- The broadcast rounds and expiry exist (`pharmacy-expiry.scheduler.ts`). The server must expose the final "no pharmacy" state; this overlaps queue item Q-3, the governed states.

## D. Safety

### 14. Emergency

**Decision**
- The emergency button opens the phone dialer with 997 (`tel:` link).
- It also offers "send my location to my family", which goes to the user's emergency contacts.
- No ambulance request, dispatch or tracking from our side.
- Remove `/emergency/tracking` and any "ambulance on the way" UI.

**Notes and open question**
- The backend has a full ambulance system:
  - `emergency.controller.ts`: trigger, active, cancel, driver missions, claim, tracking, track;
  - `ambulance-fleet.controller.ts`;
  - the `drivers` module;
  - the **ambulance provider type** in the provider app (one of the 7 types).
- **Owner decision needed (O-2):** remove the ambulance provider type, the fleet and the drivers completely, or keep them for something else? The reviewer recommends removing them all, since the platform does no dispatch.

### 15. AI assistant behaviour

**Decision**
- **Purpose:**
  - route symptoms to a specialty, with a "book a consultation" button filtered by that specialty;
  - explain prescriptions and medicines from our catalogue leaflet, in the user's language.
- **Limits:** it must never diagnose, name a drug to take, or give a dose. This is enforced by a system prompt and an output filter that blocks drug names and doses in advice.
- **Test set:** at least 100 prompts, including Arabic and the 6 locales. It must pass before release.
- **Medicine questions** show the leaflet information plus "اسأل الصيدلي".
- **Red-flag symptoms** show the emergency / urgent-help button first: chest pain, breathing difficulty, stroke signs, suicidal thoughts.
- **A disclaimer** on every answer.

**Notes**
- The filter has two modes. In symptom advice, every drug name and dose is blocked. In leaflet mode, the answer may name only the medicine the user asked about or that is on their prescription, and only with text taken from that item's leaflet.
- The test set lives in the repo and runs in CI.

## E. Product and UX

### 16. Module switches

**Decision**
- Every module can be turned off from admin instantly, without an app update: pharmacy, consultations, labs/radiology, nursing, nutrition, maternity, mental health, family, insurance, loyalty, AI, articles.
- Hidden modules disappear from navigation, and deep links show a friendly state.

**Notes**
- `backend/src/modules/feature-flags` exists; it needs one flag per module plus a public read endpoint.
- The server also refuses the routes of a module that is off.

### 17. Doctor profile

**Decision**
- The doctor profile shows the SCFHS licence number, and a "verified" badge after admin approval.
- It never shows the national ID, phone or email.

**Notes:** `scfhs_license_no` was added earlier by the reviewer.

### 18. Order the prescription's medicines

**Decision:** after a consultation with a prescription, a button "اطلب الأدوية دي" fills the cart from the prescription.

**Notes**
- The cart is local-first.
- That prescription counts as the uploaded prescription for its Rx items (item 10).

### 19. Lab results

**Decision:** a push notification opens the result, with a "ناقش النتيجة مع طبيب" button.

### 20. Nearest / Available now

**Decision:** as already sent: geo sort for clinic and home visit; `available_within=15` with the type.

**Notes:** these are queue items Q-12 and Q-13.

## F. Data and legal (owner tasks, no code now; tracked as issues)

### 21. Hosting

**Decision**
- Development stays on OVH Germany.
- Write a migration plan to an in-Kingdom host (database, files, backups, logs), to be carried out before the official launch.

### 22. PDPL

**Decision**
- List every personal and health data type, with its consent, retention and who can access it.
- Keep an access log for health records.

### 23. Licensing

**Decision**
- The owner is handling licensing with a lawyer: commercial registration, the MOH telehealth licence or a partnership model with licensed facilities, and SDAIA registration.
- Nafath and Wasfaty integrations wait until then. Do not start them.

## Order of work (reviewer's proposal)

1. **Item 16 (module switches) first.** It lets the owner hide a module at once while its removal or merge is still being built.
2. **The safety and legal-risk items:**
   - 14: emergency, after O-2;
   - 10: Rx rules on the server;
   - 15: AI limits;
   - 1: community off;
   - 8: mental-health crisis handling.
3. **The other removals:** 2, 3, 4 and 9.
4. **Pricing and offers:** 12, after O-1 and the SFDA price import, then 13 (with Q-3).
5. **Additions:** 17, 18, 19 and 20.
6. **Screen merges:** 5, 6 and 7, after the owner approves the design session's merge map.

## Open owner decisions

- **O-1 (item 12):** the source of SFDA registered prices.
- **O-2 (item 14):** remove the ambulance provider type, fleet and drivers completely?
- **Q-14 (refund rules):** the refund rule values per consultation type.

## Issues

| Item | Issue | Who |
|---|---|---|
| 1 | #320 | backend: OpenCode (spec first) + UI: design |
| 2 | #321 | backend: OpenCode + UI: design |
| 3 | #322 | UI: design |
| 4 | #323 | backend: OpenCode + UI: design |
| 5 | #324 | design proposes the map → owner approves → design implements (+ redirects) |
| 6 | #325 | design proposes the map → owner approves → design implements |
| 7 | #326 | design (screens) + OpenCode (one assistant endpoint); behaviour is #15 |
| 8 | #327 | backend: OpenCode + UI: design; owner enters the number in admin |
| 9 | #328 | backend: OpenCode (+ admin form) |
| 10 | #329 | backend rules: OpenCode (spec first) + UI: design |
| 11 | #330 | UI: design |
| 12 | #331 | backend: OpenCode (spec first) + provider-app/admin UI; waits for owner decision O-1 |
| 13 | #332 | backend: OpenCode (with Q-3) + UI: design |
| 14 | #333 | backend: OpenCode + UI: design; waits for owner decision O-2 |
| 15 | #334 | backend: OpenCode (spec + test set first) |
| 16 | #335 | backend: OpenCode + UI: design (nav + deep-link state); do first |
| 17 | #336 | backend: OpenCode + UI: design |
| 18 | #337 | UI: design (+ backend check by OpenCode if needed) |
| 19 | #338 | backend: OpenCode + UI: design |
| 20 | #339 | backend: OpenCode (queue Q-12, Q-13) + design removes the hub flag |
| 21 | #340 | owner (no code now) |
| 22 | #341 | owner (no code now) |
| 23 | #342 | owner (no code now) |
