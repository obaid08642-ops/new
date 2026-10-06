# OpenCode work queue (state on 2026-10-06)

Read this file and `AGENTS.md` at the start of every OpenCode session. This file is the task list; `AGENTS.md` holds the rules. If they disagree, this file's **Git rules** win (they are newer, owner 2026-10-06).

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
- Until Q-1 is merged, the boot suite has 20 known failures on `main` (from Q-1). Your PR must not add any. After Q-1 it must be 0.

## Queue A: base `main` (start now, in this order)

Each item is checked against `main` (2026-10-06) unless marked "verify first".

| Id | Size | Defect (evidence) | Done when |
|---|---|---|---|
| Q-1 | S–M | Boot tests are red on `main`: 20 failures in `test/journeys/provider-onboarding.e2e-spec.ts`, `test/security/p3-provider-credential.e2e-spec.ts` and `test/security/p3-credential-rotation.e2e-spec.ts`. Cause 1: `UsersController` now injects `PdplService` (commit `51ae8e7b`, "[P10.1] WIP salvaged") and the test modules do not provide it. Cause 2: onboarding expects 403/201 where the API now answers differently. | All 65 boot tests pass. Fix the cause, not the expectations. If a behaviour change was intended, say which commit and why in the PR, and stop. |
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
| Q-14 | M | Cancel and reschedule refund rules are hard-coded in the clients: 12/24 h in cancel-reschedule and 4/24 h in clinic-confirm. There is no server rule; `system-config` holds only a free-text `cancellation_policy`. | One server rule per consultation type, used by the refund calculation and returned with the appointment, so the clients show it. The two hard-coded rules are removed from patient-app and patient-web. **Ask the owner for the rule values through the reviewer. Do not invent them.** |
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

Closed, do not do:
- **Barcode `$regex`:** already escaped on `main`.
- **Pharmacy expiry scheduler:** exists (`pharmacy-expiry.scheduler.ts`, every 15 s).
- **Moyasar sync owner check, verify re-emitting `payment.completed`, raw gateway data in responses:** fixed in #310.
- **`GET /payments/status/:ref`:** comes with #282 (Q86) on the fix branch.

## Queue B: base `fix/audit-2026-09` (wait for the reviewer's "go")

Do not start until the reviewer says the branch is protected and restored. Items:
- The auth fixes sent back in #298 (read its report and acceptance tests).
- Re-deliver the phase 13–21 work from `opencode/phases-13-21-snapshot`, one item per PR. Every item is reviewed on its own.
- F82-4 (real-user LCP measurement).
- Nutrition plan: AI-generated, with a button to the nutrition doctors. This one waits for the acceptance spec.

Already open, keep them updated and do not open duplicates: #294/#300 (e64ec70), #299 (N7), #311 (social-xs, X and Snapchat sign-in).
