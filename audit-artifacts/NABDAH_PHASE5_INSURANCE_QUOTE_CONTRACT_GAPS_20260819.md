# Phase 5 Backend/Database — insurance and booking-quote contract gaps

## Confirmed design strength

The insurance module records request history, scopes patient/provider reads, requires a provider decision for review state, calculates partial copay from stored request price, and models appeal/resubmission states. The quote endpoint centrally declares online-only versus clinic payment modes.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Quote endpoint accepts price and service details directly from query parameters | `/bookings/quote` returns the supplied client `price` and assumes insurance applicability, without authoritative service/provider/location/slot lookup, tax/fee/currency or insurance eligibility calculation. | Generate signed server quotes from canonical service/slot/provider/policy data with expiry/version and reject client-supplied monetary truth. |
| **P0** | Insurance request accepts arbitrary provider, booking and price without linkage validation | `createRequest` checks only provider ID/positive price and stored policy; it does not load the booking, prove patient/provider/service/channel relationship, calculate price or bind policy eligibility. | Create requests only from an owned canonical booking/quote, validate provider assignment/service/amount/policy/document references and enforce one active request per booking version. |
| **P0** | Copay “payment” accepts an arbitrary payment identifier without verifying it | Patient can submit any `payment_id`; service records `COPAY_PAID` and emits service-start event without looking up a paid transaction, amount, patient or insurance-request binding. | Bind copay completion to verified payment-engine webhook/transaction with exact amount/currency/patient/request checks and idempotent durable event handoff. |
| **P1** | Insurance decision and lifecycle are not atomically projected to the booking/payment workflow | Request save and event emit are separate; approved/rejected/copay states do not visibly update linked booking insurance/payment/universal state under a transaction/outbox. | Use a shared insurance-booking state machine/outbox, atomic decision/version guard and reconciliation for requests, booking, payment and notifications. |
| **P1** | Policy save permits unverified member data and raw external card image URL | Profile policy accepts `member_id`, `policy_number` and `card_image_url` without secure owned upload/reference, verification, expiration or purpose/retention controls. | Use verified insurer/manual-review policy evidence with private storage object references, document validation, expiry, consent and field-level masking. |
| **P1** | Requests are vulnerable to duplicate concurrent creation/decision attempts | No active request uniqueness/idempotency key is evident; decision uses read/mutate/save rather than conditional state version. | Add compound active-request constraints and idempotency, conditional state transitions and race tests. |
| **P1** | Default commission/insurance pricing fallbacks are hard-coded in source | Commission rate falls back to static defaults when no rule exists, rather than an approved versioned finance policy bound to quote/booking. | Require versioned approved commission/tax/insurance rules and retain immutable applied rule snapshot with every booking/ledger entry. |

## Decision

Insurance and quote backend contracts are **P0 FIX/BLOCKED**. No client or provider decision can be treated as real coverage/payment truth until quote, booking, policy and verified copay are bound atomically to authoritative records.
