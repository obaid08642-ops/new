# Phase 8 — Batch L: insurance request and copay integrity

## Purpose

The confirmed Phase 5 contract gaps allowed an insurance request to accept client-supplied provider, booking context and price, and allowed `COPAY_PENDING` to become `COPAY_PAID` solely from a client-supplied payment identifier. This batch binds the executable request and copay settlement to server-owned resources.

## Source change

| Surface | Implemented control |
|---|---|
| Insurance request creation | A request now requires a canonical booking ID/kind owned by the authenticated patient. Backend loads the booking and derives provider assignment, price, service type and channel from that persisted record; client `provider_id` and `price` do not control the created request. |
| Active request duplicate | A current request for the same patient/booking/kind in an active review/approval/copay state is returned instead of creating a parallel request. |
| Copay manual settlement | `COPAY_PENDING` accepts only a transaction ID that belongs to the request patient, has `booking_kind=insurance`, the same request ID as booking, `status=paid`, and exactly matches the stored `copay_amount`. Unmatched/foreign/pending/wrong-amount IDs cannot transition state. |
| Standard settlement path | A verified `payment.completed` event can settle a matching `COPAY_PENDING` request from the persisted payment transaction. |
| Patient UX | The insurance copay screen now opens the hosted payment processing route after intent creation. It no longer calls `/patient/pay-copay` and locally reports a service as paid from a client-held transaction ID. |

## Verification

| Gate | Result |
|---|---|
| Insurance-flow regression | **PASS** — 1 suite, 46 tests. New coverage proves server-derived provider/price and rejects nonmatching client payment IDs; existing decision/refund/quote coverage remains green. |
| Combined Backend Phase 8 regressions | **PASS** — 10 suites, 101 tests. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Archive integrity | **PASS** — both rebuilt archives validate with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `580d2763ff41ac3e34850fc226adcec220906af08cb64dc11b1abf792011ff1b` |
| Patient archive SHA-256 | `808f35ed4f66d5235f3075131553295858d25712272db762f5efbcb7ba8f811a` |
| Branch upload | **PASS** — source commit `69d6b56` (`fix: bind insurance copay to verified payment`) is on `manus/on-live-reconciliation`. |

## Remaining constraints

The public quote preview endpoint remains an informational eligibility/payment-method view and must not be used as a financial authorization. Full production acceptance still requires an owner-approved, live-configured payment provider; no insurer call, policy verification, payment, capture, refund or production migration was made. Phase 9/11 must validate sandbox lifecycle: owned booking → one request → provider decision → hosted verified payment event → copay state/event, with foreign patient/provider and forged payment ID negative tests.
