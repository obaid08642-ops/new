# Phase 8 — Batch T: insurance copay and payment-split integrity

## Purpose

The Patient insurance payment-split screen computed coverage and patient/company shares from route parameters and a generic coverage check, then posted those client-derived values to `/insurance/payment-confirm` without the authoritative insurance request ID. Consultation insurance booking also treated insurance like cash and navigated directly to success. This bypassed the intended provider decision gate and could not safely settle an approved copay.

## Source change

| Surface | Implemented control |
|---|---|
| Consultation insurance booking | After the server creates the appointment, the app creates an insurance request with only the owned appointment ID and `consultation` kind. It navigates to the insurance request summary instead of auto-confirming the booking. |
| Request-bound summary | Payment split now requires `request_id`, reads `/insurance/requests/:id`, and accepts only a valid owned server request containing booking identity, state, price, and copay. It no longer trusts route amount, service name, patient/company amounts, generic coverage percent, saved card data, or cash selection. |
| Decision gate | Provider review is rendered as a non-payable waiting state; partial approval opens the existing idempotent payment-intent route for `insurance/<request-id>`; full approval submits only the request ID to the canonical copay settlement endpoint; already-paid requests are status-only. |
| Client payment safety | The checkout transition carries the server intent ID, server checkout URL, request ID and server amount. No transaction ID, payment success, appointment confirmation, or financial share is manufactured in the client. |
| Appointment detail | The old `/patient/pay-copay` call with the appointment ID and immediate local `CONFIRMED` mutation was removed. The user first resolves a matching active insurance request and then opens its reviewed server state. |
| Regression coverage | A pure contract test covers request shape validation, provider-review blocking, checkout eligibility, and invalid/missing request data. |

## Verification

| Gate | Result |
|---|---|
| Focused Patient insurance copay contract | **PASS** — 2 tests. |
| Patient TypeScript check | **PASS**. |
| Production Expo web export | **PASS**. |
| Full Patient Jest suite | **PASS** — 19 suites, 51 tests. |
| Archive integrity | **PASS** — rebuilt Patient archive validates with `unzip -tq`; dependencies and build outputs are excluded. |
| Patient archive SHA-256 | `5f9cbb1631459d957c753606f3f4940e1cf08f4366313a82d47766c27a1e12f1` |
| Existing Backend authority | **Confirmed source contract** — `InsuranceFlowService` checks request ownership, requires `COPAY_PENDING` plus a paid matching transaction for non-zero copay, and settles verified checkout events fail-closed. The previous full Backend gate remains passing (54 suites/336); no Backend source changed in this batch. |
| Branch upload | **PASS** — source commit `edc625c` (`fix: bind insurance copay to owned request`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No payment intent, policy, insurance request, appointment, or other production record was created or changed. Real card payment is still deferred pending Moyasar activation. Phase 11 must verify an owned sandbox appointment through request creation, provider full/partial/reject decision, foreign-patient denial, intent idempotency, signed webhook settlement, callback rendering, and non-payment transition behavior. The approved legal/payment-contract review remains fail-closed.
