# Phase 5 Backend/Database — payment-engine contract gaps

## Confirmed strengths

The engine calculates amount server-side, prevents an obvious already-paid booking intent, masks gateway errors as `payment_gateway_unavailable`, and keeps transaction records. It also performs a live gateway verification before marking an intent paid.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a guessed type/id can cancel another patient’s pending payment attempts. | Authenticate/authorize booking ownership before every write, scope update by booking kind/patient/transaction state, use idempotency and add cross-patient negative tests. |
| **P0** | Payment verification and transaction listing authorize broad staff roles without assignment/scope | Any `provider`, `pharmacy` or `doctor` can verify any transaction and list transactions for any booking, without confirming service assignment, facility scope or finance entitlement. | Enforce patient owner or explicitly assigned provider/facility/finance role on each transaction; return minimum payment DTOs and test foreign provider/facility access denial. |
| **P0** | Public webhook does not verify provider identity/signature and ignores route provider | `POST /payments/webhook/:provider` is public; handler accepts arbitrary payload, does not validate signature/timestamp/replay or compare provider, then triggers gateway verification. | Implement gateway-specific signature, timestamp/replay, provider/intent/amount/currency metadata validation, idempotent event persistence and audit/alert on mismatch. |
| **P0** | Intent creation has no durable idempotency or atomic pending-intent reservation | It first looks for pending transaction, then calls gateway, then inserts a transaction. Concurrent calls can create multiple gateway intents/charges. | Use a unique booking-kind/payment-attempt key and atomic reservation/idempotency key before gateway call; handle abandoned intents and return the same active intent safely. |
| **P1** | Paid/refund state updates, realtime and event emissions are not transactionally coupled | Payment status writes, transaction saves, event emitter and realtime calls happen independently; partial failures can produce paid booking/no event, event/no durable state or duplicate notifications. | Use transactional outbox/reconciliation and idempotent side-effect consumers with gateway/payment state versioning. |
| **P1** | Refund path lacks maker-checker, remaining-refund atomic guard and payment execution audit | Admin can refund directly; amount/remaining refund concurrency and actor/evidence/receipt/reconciliation are not guarded in a transaction. | Route refund through approved dispute/refund state machine, atomic remaining amount ledger, maker-checker where policy requires, PSP evidence and patient/provider notifications. |
| **P1** | Gateway configuration is selected at service construction with no readiness state | No configured key throws during service initialization; platform readiness/degraded payment contract is not surfaced as a typed capability state. | Implement lazy/readiness-checked gateway configuration with health/readiness endpoint and predictable 502 capability response, while keeping payments disabled until owner activation. |

## Decision

Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect contracts.
