# OpenCode work queue (state on 2026-10-06)

Read this file and `AGENTS.md` at the start of every OpenCode session. This file is the task list; `AGENTS.md` holds the rules. If they disagree, this file's **Git rules** win (they are newer, owner 2026-10-06).

## Where your instructions come from (owner, 2026-10-06)

- **Your only task list is this file on `origin/main`.** Read it with `git fetch origin && git show origin/main:docs/review/OPENCODE_QUEUE.md` at the start of every session and before every new item. Copies on other branches are stale.
- **The old phase plan is frozen.** Do not start Phase 22 or any other new phase from `docs/audit/02_AGENT_EXECUTION_PLAN.md`. Phases 13–22 are not approved. They are audited on `oc/phase-audit` by the session that built them (`docs/review/OPENCODE_PHASE_AUDIT.md`); that session uses that file, not this queue.
- The owner's product decisions (`docs/product/OWNER_DECISIONS_2026-10-06.md`) win over the old plan. Never build or keep anything the decisions remove: community posts, leaderboard, family calls, skin analysis, the ambulance system, mental-health scoring or crisis handling.
- **Branch names:** only `oc/<item-id>` (this session) or `oc/phase-audit` (the phase-audit session). Branches named `r12/phase13-*` and direct pushes to `fix/audit-2026-09` are not accepted. The direct push `a0df24b3` (2026-10-06 12:34 UTC) broke rule 3 below and will not be merged as is.

## Git rules (owner, 2026-10-06), binding

1. **One branch per item:** `oc/<item-id>` (for example `oc/Q-1`). Create it from the base named in the item:
   ```
   git fetch origin
   git checkout -b oc/<item-id> origin/<base>
   ```
2. **Open one PR per item** into that base. Title: `[OC <item-id>] <summary>`. The PR body holds the real last lines of every gate command (see **Gate**).
3. **Never push to `main` or `fix/audit-2026-09`.** Push only your own `oc/*` branch: `git push -u origin oc/<item-id>`.
4. **Never force-push**, not even on your own branch. Never rebase or amend after the first push. To bring in the base, run `git merge origin/<base>`.
5. **You never merge.** The reviewer merges after independent checks.
6. **Never edit, skip or delete a test you did not write in this item**, an acceptance file (`*/acceptance/**`), a CI workflow, or a checker (`tools/audit/*`, `tools/design/*`).
   - If one looks wrong, say so in the PR body and stop.
   - Do not invent commit SHAs, action versions, endpoints or fields. Grep before you use a name.
7. **Start every item with a failing test** that reproduces the defect on the base. Paste its red output in the PR body, then make it green.
   - If you cannot reproduce the defect, do not change code. Open the PR with only the test and the note `NOT REPRODUCED: <what you tried>`.
8. **One item per PR.** Do not mix items or "while I was here" changes.
9. **If something is impossible,** write `BLOCKED: <exact reason>` in the PR body and stop on that item. Move to the next item that is not blocked.

Why these rules exist: earlier OpenCode runs force-pushed `fix/audit-2026-09` three times, overwriting reviewed work. They also emptied `auth.service.ts`, rewrote a security test so it passed, and used action SHAs that do not exist. That work is kept on `opencode/snapshot-*` branches and will not be merged as is.

## Gate (paste the last lines of each in the PR body)

```
cd backend
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py            # exit 0
node ../tools/audit/clientbodies.js > /tmp/c.json && node ../tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
```

- On `fix/audit-2026-09` items, also run `node scripts/run-acceptance.mjs --done`.
- For a web or app item, also run that package's `tsc` and tests.
- The boot suites must be 0 failures (65/65 on `main` after Q-1).

## Queue A: base `main` (start now, in this order)

Each item is checked against `main` (2026-10-06) unless marked "verify first".

| Id | Size | Defect (evidence) | Done when |
|---|---|---|---|
| Q-1 | — | **Done by the reviewer (2026-10-06), do not do.** The failures were test setup, not product bugs: the journey's admin had no enrolled admin device (`device_not_enrolled`, the C2 rule), and the two credential suites did not provide `PdplService`. The boot suites are 65/65. | — |
| Q-2 | M | Patients cannot act in their own pharmacy chat. In `backend/src/modules/pharmacy/pharmacy.controllers.ts` (`PharmacyChatController`), post message, accept-substitute, reject and remove-item carry `@Roles(PHARMACY, ADMIN)`, so the patient gets 403. | Spec ready: PR #315, `backend/acceptance/q-2/` (17 tests). Start once #315 is merged; make it pass without editing it. |
| Q-3 | L | The governed pharmacy states `ORDER_BROADCASTING`, `OFFERS_READY` and `CO_PAY_PENDING` (from `packages/shared-contracts/src/state-machines.ts`) are never written by the backend (0 references in `backend/src`). `FINAL_QUOTE_READY` is written in one place only. | Spec ready: PR #316, `backend/acceptance/q-3/` (10 tests). Start once #316 is merged. |
| Q-4 | M | Offer read model fakes data. `backend/src/modules/pharmacy/services/pharmacy-offer.service.ts` around lines 298–308 returns `insurance_ready: true`, `cod_allowed: true` and `approx_delivery.eta_minutes: 60` as constants. | The values come from the pharmacy's offer or profile. Where there is no data, return `null` (the clients hide null). A test proves two pharmacies with different settings give different values. |
| Q-5 | M | Verify first. Insurance acceptance needs payment capabilities, which are refused until acceptance (circular). | **Closed, not reproduced (review 2026-10-06).** The capabilities refusal before acceptance is intended (`pharmacyDueAmount`); both clients now accept without asking for capabilities first (design Batch 1). Nothing to do. |
| Q-6 | M | Verify first. The payment intent ignores the method the patient chose (`createPaymentIntent` uses the stored `booking.payment_method`; the body `method` of `POST /payments/intent/diagnostics` is never read). | The chosen method is validated against the order's allowed methods and used. Test both. |
| Q-7 | S | `PATCH /users/me/addresses/:id` with an unknown id answers 200 `null` (verify first). | 404 `address_not_found`. Test. |
| Q-8 | M | `GET /orders/:id/tracking` always returns 404 for pharmacy orders; they live in `pharmacy_orders` (verify first). | The order's patient gets tracking for a governed pharmacy order; another user gets 403 or 404. Test. |
| Q-9 | M | OCR field names that the app sends are not read by the prescription upload endpoint, so every OCR'd prescription from the app is saved empty (verify first; compare `patient-app` request bodies with the DTO). | The DTO accepts the client's field names (DTO rules in `AGENTS.md`); the fields are saved. `dtocheck` shows 0 mismatches. |
| Q-10 | M | Prescription lists return base64 photos (verify first). | Lists return metadata plus an attachment id. The photo comes from a separate owner-checked GET. Update every client that reads the list in the same PR. |
| Q-11 | S | Verify first. The `prescription_attachments` shape differs between writer and readers. | One shape, documented in the DTO. Test. |
| Q-12 | L | Owner feature "Nearest". Doctors and providers store a geo point for each clinic, with a `2dsphere` index. The list endpoint accepts `sort=distance&lat=&lng=` and returns `distance_km`. With no location it falls back to the patient's city. Applies to clinic and home-visit only. | Spec ready: PR #317, `backend/acceptance/q-12/` (9 tests). Start once #317 is merged. |
| Q-13 | L | Owner feature "Available now". The list endpoint accepts `available_within=<minutes>` (for example 15) and `type=clinic\|video\|home_visit`. It returns doctors with a free slot starting within that window, computed from `weekly_schedule`, `blocked_dates` and slot locks, using the one shared availability function (Q37). For video, a doctor who is online and accepting also counts. Each result carries `next_slot_at`. | Spec ready: PR #343, `backend/acceptance/q-13/` (7 tests). **Also waits for #306** (the shared availability function) to reach `main`; build on it, no second slot engine. |

Backend lines from the design Batch 2 (#313) "Needs review". The client screens are already built; each item also updates the screen that reads it, in the same PR.

| Id | Size | Defect (evidence) | Done when |
|---|---|---|---|
| Q-14 | M | The cancel/refund rule exists twice and the copies disagree (server `care/appointments.service.ts`: >24 h 100% to the card, otherwise 50% to the wallet; app `cancel-reschedule.tsx`: ≥24 h 100%, 12–24 h 50%, <12 h 0%). | **Replaced by Queue C item D-26** (owner decision 26). Do not do it separately. |
| Q-15 | M | Home-visit tracking never shows "on the way" or "arrived": `PROVIDER_EN_ROUTE` and `PROVIDER_ARRIVED` are never sent by the backend (0 references in `backend/src`). | The provider app's start-trip and arrived actions set these states, and the patient receives them (API and realtime). Test the full sequence. |
| Q-16 | M | The video call is not reachable. The launcher opens nothing, and the appointment page does not link to the call. There is no call-record endpoint: call history is just finished appointments. | Verify first which part is backend and which is client. The appointment response carries what the call screen needs (room or join token route). A call-record endpoint lists the patient's calls (owner-checked). |
| Q-17 | S | Online reschedule asks for clinic slots (verify first: client query or backend default). | Reschedule of a video appointment offers video slots only. Test. |
| Q-18 | S | Appointments in pending-payment, scheduled, in-progress and no-show appear in no tab. | Verify first. If the cause is the status names in the API, document one status list in shared-contracts and map it. If it is client-only, write `CLIENT` in the PR and the reviewer passes it to the design session. |
| Q-19 | S | The appointment row carries `specialty_ar` only. | It carries the specialty id plus every locale's name the specialty catalog has, from the catalog (single source). |
| Q-20 | M | No data or endpoint for: favourite doctor (heart); booking-confirm reports, points and duration rows; doctor rating breakdown, verified badge and clinic photos. | Verify each. Add only what has a real source (for example `verified` from the admin KYC approval). For anything with no source, write `NO SOURCE` in the PR and the screen hides it. Never invent values. |

Found while writing the Q-3 spec (review 2026-10-06):

| Id | Size | Defect (evidence) | Done when |
|---|---|---|---|
| Q-21 | M | A paid pharmacy order never reaches a confirmed governed state. Card: after payment `governed_state` stays `FINAL_QUOTE_ACCEPTED` (`PAYMENT_PENDING` is never produced) and `status` stays `cash_card_payment_pending`. Insurance co-pay: after the co-pay is paid `status` stays `waiting_copay`. Only `payment_status` changes (`payments.module.ts` `finalizeGovernedPharmacyPaid`). The apps work around it with `payment_status`. | Wait for the acceptance spec `backend/acceptance/q-21/` (after Q-3). |

| Q-22 | M | `GET /nursing/nurses/:id` (`home-care/nurse-profile.controller.ts`) needs a token, so the public nurse page shows "unavailable" to visitors (design Batch 4). It also returns the **whole** `nurses` document (`const { _id, ...out } = doc`) to any signed-in user, which can hold a phone, address or identity data and breaks the N7 rule (individual providers' public views hold no phone, address or internal id). | The endpoint is public and returns only an explicit allow-list of public fields (name, photo, specialties, languages, rating, verified, SCFHS licence; decision 17). Never the national ID, phone, email or address. Tests: anonymous 200 with only those keys, and an unknown id 404. |

Closed, do not do:
- **Barcode `$regex`:** already escaped on `main`.
- **Pharmacy expiry scheduler:** exists (`pharmacy-expiry.scheduler.ts`, every 15 s).
- **Moyasar sync owner check, verify re-emitting `payment.completed`, raw gateway data in responses:** fixed in #310.
- **`GET /payments/status/:ref`:** comes with #282 (Q86) on the fix branch.

## Queue C: owner product decisions 2026-10-06 (base `main`)

Source: `docs/product/OWNER_DECISIONS_2026-10-06.md`. Each item is a GitHub issue; put `Closes #<issue>` in the PR body.

**Scope:** backend and logic only, including admin forms that only expose a backend field. Patient-app and patient-web screens belong to the design session: in the PR, list the UI change the design session must make.

**Specs first:** every C item waits for the acceptance spec `backend/acceptance/d-<n>/`, written by the review session. Start an item only when its spec is merged.

**Removal items (A):** deleting the tests of the removed feature is allowed in that PR, and the PR lists every deleted test. Before any data is dropped:
1. a migration exports the collection to an archive collection or a file;
2. the PR body shows the archive step;
3. production data is never touched by a PR (the reviewer runs it through server-ops).

Order (do not skip ahead):

| Id | Issue | Item | Waits for |
|---|---|---|---|
| D-16 | #335 | Module switches: one flag per module, a public read endpoint, and the server refuses a switched-off module's routes. | spec |
| D-14 | #333 | Emergency: remove the whole ambulance system: dispatch, missions, tracking, fleet, the `drivers` module, and the ambulance provider type in the provider app, registration, KYC and admin. Archive the data first. Keep "send my location to my emergency contacts". | spec (owner O-2 answered: remove) |
| D-10 | #329 | Rx rules on the server: no promo, offer or points on Rx items; an order with an Rx item needs an attached prescription; `controlled` items are never orderable. | spec |
| D-15 | #334 | AI assistant limits: specialty routing, leaflet mode, the output filter, red flags, the disclaimer, and a 100+ prompt test set in CI. | spec + test set |
| D-1 | #320 | Community removed (archive first). Doctor articles: verified doctors only, admin approval, no comments, Rx brand-name block. | spec |
| D-8 | #327 | Mental health: remove assessment scoring and crisis handling; urgent-help number in admin config. | spec |
| D-2 | #321 | Remove the loyalty leaderboard. | spec |
| D-4 | #323 | Remove AI skin analysis. | spec |
| D-9 | #328 | Loyalty challenges: health-habit `target_action` only; existing purchase challenges ended and archived. | spec |
| D-12 | #331 | SFDA price ceiling: `sfda_price` and its source; line mapping; reject offers over the ceiling; unmapped lines go to admin review. | spec (owner O-1 answered: the catalogue `price` in the server DB is the ceiling) |
| D-13 | #332 | Offers waiting: the final "no pharmacy available" state (with Q-3). | spec, Q-3 |
| D-17 | #336 | Doctor public view: SCFHS licence and `verified`; never national ID, phone or email. | spec |
| D-19 | #338 | Lab result push deep link to the result. | spec |
| D-7 | #326 | One assistant endpoint replacing the seven AI routes. | owner-approved merge map |

| D-26 | — | Cancellation and refund policy (decision 26). One admin-editable policy per service type: consultations, home visit and nursing, pharmacy delivery. Used by every cancel path, returned with each booking or order (the rule plus the refund the patient would get now), refunded to the original payment method. The clients show only the server value; remove the hard-coded copies. | spec |
| D-25 | — | Payment method by service (decision 25). The server refuses cash for online consultations, home visits and nursing. Pharmacy cash on delivery only under all of its conditions. | spec |
| D-24 | — | Doctor chat only inside a booking (decision 24). Online: text, voice, images, files and the call. Clinic or home: text, images and files for 72 h after completion. The doctor can close or extend once. Read-only after the window. | spec |

| D-28 | — | Security sweep S-1 … S-7 (decision 28): fix whatever the reviewer's S-specs show failing. | spec |
| D-29 | — | Search (decision 29): self-hosted Meilisearch, index rebuild from MongoDB plus change sync, Arabic normalisation and synonyms, 6 locales, a scoped search per section and a grouped global search. | spec |
| D-30 | — | Insurance first (decision 30): profile insurance with class; provider networks with companies and classes; list and broadcast filters; final eligibility at checkout. | spec |
| D-31 | — | Double taps and bad networks (decision 31): close whatever the reviewer's tests show (one charge or booking per key, the same key on retry, a result check instead of a re-pay). | spec |

| D-35 | — | Admin on two devices (owner): at most 2 active enrolled admin devices per admin (the owner's iPhone and MacBook). A third device is refused until one is revoked. Enrolling a new device needs approval from an already-enrolled device plus email step-up. Every enrolment and revoke is audit-logged and shown on the decision-34 page. | spec |

Items 3, 5, 6, 11 and 18 are UI only (design session). Items 21–23 are owner tasks. Item 20 is Q-12 / Q-13.

## Queue B: replaced by the phase audit (owner, 2026-10-06)

The phase 13–22 work on `fix/audit-2026-09` is audited by the OpenCode session that built it, on the single branch `oc/phase-audit`, following `docs/review/OPENCODE_PHASE_AUDIT.md`. That work includes the #298 FAIL items, the nutrition plan, X/Snapchat sign-in and the re-delivery of the phases.

**This session (Queue A/C) does not touch `fix/audit-2026-09` or `oc/phase-audit`.**

The PRs already open into the fix branch (#294/#300, #299, #311) stay as they are; the reviewer handles them.
