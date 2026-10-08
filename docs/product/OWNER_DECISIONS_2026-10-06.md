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
- **Owner answer O-1 (2026-10-06):** the ceiling is the catalogue price held in the server database (about 21,000 pharmacy items with full details). So `sfda_price` is filled from the catalogue `price`, with `sfda_price_source = "catalogue (owner 2026-10-06)"` and the import date. The admin can correct an item's price, and every change is audit-logged.
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
- **Owner answer O-2 (2026-10-06): remove the whole ambulance system.** That means:
  - emergency dispatch, missions, claim and tracking;
  - the ambulance fleet (admin);
  - the `drivers` module;
  - the ambulance provider type in the provider app, registration, KYC and admin (6 provider types remain);
  - their screens, translations and tests.
- Data is archived first. Kept: the 997 dial button, and "send my location to my emergency contacts".

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

## G. Added later on 2026-10-06 (owner; details delegated to the reviewer)

### 24. Doctor chat only inside a booked consultation

**Decision**
- There is no free chat with a doctor. Chat exists only for a booking.
- **Online consultation:** full messaging, from the time the booking is confirmed until the follow-up window ends:
  - text, voice notes, images and files;
  - one call where each side turns the camera and microphone on or off (the earlier decision on calls: one LiveKit call, one price).
- **Clinic or home visit:** after the doctor marks the visit completed, the patient can send **text, images and files only (no calls, no voice notes)** to that doctor for a follow-up window.

**Reviewer's settings** (admin-editable)
- The follow-up window is **72 hours** after completion, for every consultation type.
- The doctor can close a thread early, or extend it once.
- Every thread shows "for emergencies call 997".
- Outside the window the thread is read-only, with a "book a follow-up" button.

### 25. Payment method by service

**Decision**
- **Online only (no cash):**
  - online consultations;
  - home doctor visits;
  - home nursing.
  Someone travels to the patient, or there is no meeting, so the payment is taken when booking.
- **Pharmacy delivery:**
  - Online payment is the default.
  - Cash on delivery stays as an option (the market expects it; Nahdi offers it) but only when all of these hold:
    - the order has no prescription item and no insurance;
    - it is under an admin-set cap;
    - the user has at least one completed order;
    - the pharmacy can switch cash off for itself.
- **Clinic visits:** pay online, or at the clinic.

### 26. Cancellation and refund policy

This replaces the earlier Q-14 note.

**Basis**
- Saudi e-commerce law: the consumer may cancel and get a full refund within 7 days if the service has not been used yet. The consumer bears the costs that the cancellation causes, if this was agreed. So a fee that covers a real cost (a held slot, a trip already made) is allowed only when it is shown clearly before payment.
- Vezeeta refunds in full when the patient cancels before the appointment time, and in full when the provider cancels, does not show, or a call fails for technical reasons.
- Nahdi refunds the full amount, including the delivery fee, when an order is cancelled before delivery.

**Policy (every value is admin-editable; refunds go back to the original payment method; the wallet only if the patient chooses it)**

| Service | Patient cancels | Provider cancels / no-show / technical failure |
|---|---|---|
| Clinic and online consultation | 2 h or more before: 100%. Less than 2 h: 50%. Patient no-show: 0%. One free reschedule up to 2 h before. | 100% |
| Home doctor visit, home nursing | Before the provider is "on the way": 100%. After that: 100% minus a fixed trip fee (admin-set, shown before payment). Patient not there when the provider arrives: 0%. | 100% |
| Pharmacy delivery | Before the courier is dispatched: 100%, including the delivery fee. After dispatch: 100% minus the delivery fee. After delivery: medicines are refunded only if wrong, damaged, defective or expired (SFDA requires a refund for defective products). | 100% |

- The terms (plan 19.12) show this table before payment.
- **A lawyer confirms it before launch.**
- This **changes** the current server rule: today it is ">24 h 100% to the card, otherwise 50% to the wallet".

### 27. Fewer screens, second pass

**Decision:** after the approved merge map, the design session proposes a second map for **all** sections (not only health, family, settings, AI and mental health):
- remove duplicates;
- merge screens whose content fits one screen.

The core services keep priority: pharmacy, consultations, labs/radiology, nursing. The reviewer approves (delegated by the owner).

## H. Added 2026-10-08 (owner approved the reviewer's proposals)

### 28. Security sweep S-1 … S-7

The review session writes acceptance tests; OpenCode fixes whatever fails.

| Id | What is proved |
|---|---|
| S-1 | **Secrets.** An inventory of every env var, marking which reach a browser or app (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`): none may be a secret. Every secret that was ever committed (the repo is public) is rotated by the owner through server-ops. gitleaks stays on every PR. |
| S-2 | **Ownership.** A table of every route and where it checks that the caller owns the id it touches. No route trusts a user id from the body or the query. |
| S-3 | **Database rules.** MongoDB has no RLS; S-2 plus S-7 replace it. Every query on user data filters by the authenticated owner on the server. |
| S-4 | **Mass assignment.** A strict DTO on every write route; unknown fields are rejected (`forbidNonWhitelisted`, already on). A list per route of the fields a user may never set: price, amount, status, owner id, role, verified, payment_status. |
| S-5 | **Payments.** Every amount is looked up on the server from the booking, order or offer, never from the client. Every payment webhook verifies its signature (Moyasar HMAC); `MOYASAR_WEBHOOK_SECRET` is added on the server. |
| S-6 | **Rate limits.** Login, sign-up, OTP, password reset, and every route that calls a paid service (AI, SMS, email, OCR, maps). The limit per route is documented, and a client that exceeds it gets 429 with `Retry-After`. |
| S-7 | **Proof.** For every user-owned record type, user A creates a record and user B tries to read, update and delete it. Every attempt answers 403 or 404. The output goes in the PR. |

### 29. Search

**Where search looks**
- Each section searches its own content: pharmacy → medicines and products; consultations → specialties and doctors; labs/radiology → tests and packages; nursing → services.
- Home searches everything and shows the results grouped by type.

**Engine:** Meilisearch, self-hosted on our server (about 300 MB of RAM; Elasticsearch is too heavy for the server). It gives:
- full-text search;
- relevance ranking;
- typo tolerance;
- filters and facets;
- autocomplete;
- highlighting.

**Arabic and the 6 languages**
- Arabic normalisation: أ/إ/آ→ا, ى→ي, ة→ه, diacritics and tatweel removed.
- Synonyms:
  - brand ↔ active ingredient;
  - Arabic ↔ English names;
  - common misspellings.
- Every result is searchable in all 6 locales (ar, en, ur, hi, bn, fil); the index has one document per item, with its fields for every locale.

**Rules**
- Prescription-only items are never promoted or boosted in results.
- Only active, approved items and providers appear.
- MongoDB stays the source of truth: the index is rebuilt from it, and every change is pushed to the index.

### 30. Insurance chosen first

1. The patient saves their insurance once in the profile: company, plan class (VIP/A/B/C…) and policy number. Insurance networks already store plan tiers (`tier_level`).
2. At the start of every service (pharmacy, consultation, labs/radiology, nursing) the patient picks **Insurance** or **Self-pay**.
3. With **Insurance**, lists show only providers contracted with that company **and that class**. A pharmacy order is broadcast only to in-network pharmacies.
4. At checkout the final eligibility is checked (approval and co-pay). If it is refused, self-pay is offered.
5. Every provider records the companies **and classes** it accepts.

### 31. Double taps and bad networks (verify and prove)

**Already built**
- Payment, booking and order writes use an idempotency key: 64 backend routes, plus the clients' API helpers.
- A repeated request with the same key returns the first result instead of acting twice.
- Payment intents also refuse a second live intent for the same booking.

**What has to be proved, as tests**
- Tapping Pay, Book or Send twice, even with a slow network, charges or books **once**.
- Every action button is disabled while its request is in flight.
- On a timeout or lost connection:
  - the same key is retried, never a new one;
  - the screen shows a clear state ("checking your payment…") and asks the server for the result, instead of asking the user to pay again.
- Offline:
  - browsing shows the cached copy;
  - the cart works locally;
  - actions that need the server show a clear error and keep the user's input.
- Tests run on throttled 3G and on an offline/online flip, on web (Playwright) and app (unit plus Maestro where possible).

### 32. Where data and files live

This becomes a document, `docs/architecture/DATA_MAP.md`, written by the review session.

**Data**
- All records live in MongoDB on the server:
  - medicines (`medicines`);
  - providers (`provider_accounts`, `provider_profiles`, `provider_settings`, `provider_contracts`);
  - availability (`provideravailability`, `provider_schedule_slots`);
  - facilities;
  - insurance (`insurance_networks`, `insuranceservicerequests`);
  - bookings, orders and payments.

**Files**
- Files go to object storage (Cloudflare R2, through the S3 API).
- Each file has a visibility:
  - **Public:** product, doctor and clinic photos, served through the CDN.
  - **Private:** licences, KYC documents, prescriptions and reports. They are served only through the authenticated API, after an owner or admin check, and never as a public link.

**Owner question:** none. The document lists, per entity, every field, where it is stored, who can read it and how long it is kept (decision 22, PDPL).

## I. Added 2026-10-08 (delegated to the reviewer: "take the best decision")

### 33. Backups and secrets after the 2026-10-08 incident

Background: `docs/review/INCIDENT_2026-10-08_PUBLIC_BACKUPS.md`.

**Backups**
- The nightly `mongodump` (whole database) stays on the server for 14 days.
- An off-server copy goes **only** to a separate, private bucket (`nabd-backups`): no public domain, its own API token limited to that bucket, and old copies expire after 30 days.
- The medicine catalogue also gets a weekly separate export: JSON plus the image list. It is the most valuable data.
- A monthly restore test proves the backups work, using `restore-drill.sh` on a scratch database.

**Secrets**
- `JWT_SECRET` is rotated during the next deploy: everyone signs in again, and today that is only test accounts.
- Any secret stored inside the database (system config, provider integrations) is listed and rotated.
- The secrets list (S-1, decision 28) records each secret's last rotation date.

**Test data:** test accounts may be deleted before launch (owner). The medicine catalogue is never touched.

### 34. An "Operations & Security" page in admin (read-only for most admins)

| Section | What it shows |
|---|---|
| Backups | Time and size of the last local and off-server backup, the last restore-test result, red when older than 26 h. |
| Security | Failed sign-ins, rate-limit hits, blocked requests, new admin devices, step-up failures (24 h / 7 d). |
| Secrets | Name, last rotation date and owner of each secret, with a reminder when one is older than 180 days. **Never the values.** |
| PDPL | Data export and erasure requests with their status; who accessed which health records (decision 22). |
| Incidents | A list of incidents with their status, linked to the incident notes. |

This page reports what happened. It does not replace the alerts: a backup failure or an error spike also sends an email or push to the owner.

## I. Added 2026-10-08 (owner)

### 35. Insurance is relay-only

1. Nabd+ has **no integration with any insurer** and never contacts one. There is no NPHIES or insurer-portal connection, now or planned.
2. When the patient picks **Insurance**, the request and the data the provider needs (company, class, policy number, card image, the order or booking) go **only to the provider contracted with that company and class** (decision 30).
3. The provider requests the approval **in its own systems** (NPHIES or the insurer portal), then updates the request in the provider app:
   - approved in full, approved in part, or rejected;
   - the approval number, and the co-pay (percentage or amount);
   - the reason, when rejected.
4. The patient is notified at every change. On a partial approval they pay the co-pay; on a rejection they pay themselves or cancel at no charge.
5. The provider-app inbox is the shared `InsuranceRequestsScreen` (`/insurance/requests/provider/queue`, `/insurance/requests/:id/decide`). The old doctor `InsuranceClaimScreen` (unrouted, sent a hard-coded "APPROVED" and an invented 80 %) is removed (#712).
6. Backend endpoints named `nphies*` answer from data stored on file. They are renamed or removed so that nothing implies a live check (queue D-37).

### 36. Legal documents are published now

1. The five texts in `docs/legal/` (patient terms, privacy policy, provider agreement, telehealth consent, cancellation and refund) are published in the apps now, as version 1.0. There are no real users yet.
2. A lawyer reviews them later. Any change after that is a new version; a new major version forces re-acceptance.
3. Every app screen that shows a legal text reads it from `legal_policies` (`/legal/policy/:key`). Nothing is hard-coded in a screen (queue D-38).
4. The placeholders (trade name, CR number, address, email) are filled from admin before launch.

### 37. Licensing model: a pure marketplace

1. Every provider is a **licensed facility**, or a licensed practitioner listed **under** a licensed facility: doctors, nurses, lab and radiology staff, pharmacists.
   - SCFHS registration for each practitioner.
   - A MOH (or SFDA, for pharmacies) facility licence that is valid on the day of every order.
2. Nabd+ employs nobody who provides care. It does not sell medicine or hold stock.
3. Online consultations only go through a facility licensed for telehealth. Home visits, nursing, labs, radiology and pharmacy go through facilities licensed for that service.
4. Expired licences block the provider automatically (licence expiry date stored and checked).
5. The legal entity for Nabd+ is a **commercial registration** (an individual establishment is enough to start), not a freelance document (see `LEGAL_RESEARCH_2026-10-08.md` §6–7).
6. Patient payments are **not held** by Nabd+. The payment gateway settles each provider's share directly (marketplace/split settlement), and Nabd+ receives only its commission. This avoids the need for a SAMA payment licence.

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

- **O-1 (item 12):** answered. The catalogue price in the server database is the ceiling.
- **O-2 (item 14):** answered. Remove the whole ambulance system.
- **Q-14 (refund rules):** replaced by decision 26.

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
