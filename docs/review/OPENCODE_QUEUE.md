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
| Q-2 | M | Patients cannot act in their own pharmacy chat. In `backend/src/modules/pharmacy/pharmacy.controllers.ts` (`PharmacyChatController`), post message, accept-substitute, reject and remove-item carry `@Roles(PHARMACY, ADMIN)`, so the patient gets 403. | **Wait for the acceptance spec** `backend/acceptance/q-2/` from the reviewer. The order's patient can do the four actions on their own thread; another patient gets 403 or 404; the pharmacy still can. |
| Q-3 | L | The governed pharmacy states `ORDER_BROADCASTING`, `OFFERS_READY` and `CO_PAY_PENDING` (from `packages/shared-contracts/src/state-machines.ts`) are never written by the backend (0 references in `backend/src`). `FINAL_QUOTE_READY` is written in one place only. | **Wait for the acceptance spec** `backend/acceptance/q-3/`. |
| Q-4 | M | Offer read model fakes data. `backend/src/modules/pharmacy/services/pharmacy-offer.service.ts` around lines 298–308 returns `insurance_ready: true`, `cod_allowed: true` and `approx_delivery.eta_minutes: 60` as constants. | The values come from the pharmacy's offer or profile. Where there is no data, return `null` (the clients hide null). A test proves two pharmacies with different settings give different values. |
| Q-5 | M | Verify first. Insurance acceptance needs payment capabilities, which are refused until acceptance (circular). | Reproduce with a test. If confirmed, **wait for the acceptance spec**. |
| Q-6 | M | Verify first. The payment intent ignores the method the patient chose (`createPaymentIntent` uses the stored `booking.payment_method`; the body `method` of `POST /payments/intent/diagnostics` is never read). | The chosen method is validated against the order's allowed methods and used. Test both. |
| Q-7 | S | `PATCH /users/me/addresses/:id` with an unknown id answers 200 `null` (verify first). | 404 `address_not_found`. Test. |
| Q-8 | M | `GET /orders/:id/tracking` always returns 404 for pharmacy orders; they live in `pharmacy_orders` (verify first). | The order's patient gets tracking for a governed pharmacy order; another user gets 403 or 404. Test. |
| Q-9 | M | OCR field names that the app sends are not read by the prescription upload endpoint, so every OCR'd prescription from the app is saved empty (verify first; compare `patient-app` request bodies with the DTO). | The DTO accepts the client's field names (DTO rules in `AGENTS.md`); the fields are saved. `dtocheck` shows 0 mismatches. |
| Q-10 | M | Prescription lists return base64 photos (verify first). | Lists return metadata plus an attachment id. The photo comes from a separate owner-checked GET. Update every client that reads the list in the same PR. |
| Q-11 | S | Verify first. The `prescription_attachments` shape differs between writer and readers. | One shape, documented in the DTO. Test. |

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
