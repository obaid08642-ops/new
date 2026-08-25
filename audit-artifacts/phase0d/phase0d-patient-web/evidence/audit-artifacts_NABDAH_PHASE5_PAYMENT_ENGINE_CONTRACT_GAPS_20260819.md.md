# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_PAYMENT_ENGINE_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `4b145de1bdfe250843dff8713fd800ce7f97dec974792051805de4493b98379a`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The engine calculates amount server-side, prevents an obvious already-paid booking intent, masks gateway errors as `payment_gateway_unavailable`, and keeps transaction records. It also performs a live gateway verification before marking an `
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
- `12: | **P0** | Payment verification and transaction listing authorize broad staff roles without assignment/scope | Any `provider`, `pharmacy` or `doctor` can verify any transaction and list transactions for any booking, without confirming servi`
- `13: | **P0** | Public webhook does not verify provider identity/signature and ignores route provider | `POST /payments/webhook/:provider` is public; handler accepts arbitrary payload, does not validate signature/timestamp/replay or compare prov`
- `14: | **P0** | Intent creation has no durable idempotency or atomic pending-intent reservation | It first looks for pending transaction, then calls gateway, then inserts a transaction. Concurrent calls can create multiple gateway intents/charge`
- `15: | **P1** | Paid/refund state updates, realtime and event emissions are not transactionally coupled | Payment status writes, transaction saves, event emitter and realtime calls happen independently; partial failures can produce paid booking/`
- `16: | **P1** | Refund path lacks maker-checker, remaining-refund atomic guard and payment execution audit | Admin can refund directly; amount/remaining refund concurrency and actor/evidence/receipt/reconciliation are not guarded in a transactio`
- `21: Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect cont`
### backend_consumers_or_contracts
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
### auth_ownership
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
- `12: | **P0** | Payment verification and transaction listing authorize broad staff roles without assignment/scope | Any `provider`, `pharmacy` or `doctor` can verify any transaction and list transactions for any booking, without confirming servi`
- `16: | **P1** | Refund path lacks maker-checker, remaining-refund atomic guard and payment execution audit | Admin can refund directly; amount/remaining refund concurrency and actor/evidence/receipt/reconciliation are not guarded in a transactio`
- `17: | **P1** | Gateway configuration is selected at service construction with no readiness state | No configured key throws during service initialization; platform readiness/degraded payment contract is not surfaced as a typed capability state.`
- `21: Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect cont`
### state_transitions
- `3: ## Confirmed strengths`
- `5: The engine calculates amount server-side, prevents an obvious already-paid booking intent, masks gateway errors as `payment_gateway_unavailable`, and keeps transaction records. It also performs a live gateway verification before marking an `
- `7: ## Confirmed defects`
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
- `14: | **P0** | Intent creation has no durable idempotency or atomic pending-intent reservation | It first looks for pending transaction, then calls gateway, then inserts a transaction. Concurrent calls can create multiple gateway intents/charge`
- `15: | **P1** | Paid/refund state updates, realtime and event emissions are not transactionally coupled | Payment status writes, transaction saves, event emitter and realtime calls happen independently; partial failures can produce paid booking/`
- `16: | **P1** | Refund path lacks maker-checker, remaining-refund atomic guard and payment execution audit | Admin can refund directly; amount/remaining refund concurrency and actor/evidence/receipt/reconciliation are not guarded in a transactio`
- `17: | **P1** | Gateway configuration is selected at service construction with no readiness state | No configured key throws during service initialization; platform readiness/degraded payment contract is not surfaced as a typed capability state.`
- `21: Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect cont`
### payment_insurance_relevance
- `1: # Phase 5 Backend/Database — payment-engine contract gaps`
- `5: The engine calculates amount server-side, prevents an obvious already-paid booking intent, masks gateway errors as `payment_gateway_unavailable`, and keeps transaction records. It also performs a live gateway verification before marking an `
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
- `12: | **P0** | Payment verification and transaction listing authorize broad staff roles without assignment/scope | Any `provider`, `pharmacy` or `doctor` can verify any transaction and list transactions for any booking, without confirming servi`
- `13: | **P0** | Public webhook does not verify provider identity/signature and ignores route provider | `POST /payments/webhook/:provider` is public; handler accepts arbitrary payload, does not validate signature/timestamp/replay or compare prov`
- `14: | **P0** | Intent creation has no durable idempotency or atomic pending-intent reservation | It first looks for pending transaction, then calls gateway, then inserts a transaction. Concurrent calls can create multiple gateway intents/charge`
- `15: | **P1** | Paid/refund state updates, realtime and event emissions are not transactionally coupled | Payment status writes, transaction saves, event emitter and realtime calls happen independently; partial failures can produce paid booking/`
- `16: | **P1** | Refund path lacks maker-checker, remaining-refund atomic guard and payment execution audit | Admin can refund directly; amount/remaining refund concurrency and actor/evidence/receipt/reconciliation are not guarded in a transactio`
- `17: | **P1** | Gateway configuration is selected at service construction with no readiness state | No configured key throws during service initialization; platform readiness/degraded payment contract is not surfaced as a typed capability state.`
- `21: Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect cont`
### error_empty_loading_retry_cancel
- `5: The engine calculates amount server-side, prevents an obvious already-paid booking intent, masks gateway errors as `payment_gateway_unavailable`, and keeps transaction records. It also performs a live gateway verification before marking an `
- `11: | **P0** | Payment retry cancels other users’ pending/failed transactions before ownership is checked | `retryPayment` performs `updateMany({booking_id})` before `createPaymentIntent` verifies that caller owns the booking. A caller with a g`
- `14: | **P0** | Intent creation has no durable idempotency or atomic pending-intent reservation | It first looks for pending transaction, then calls gateway, then inserts a transaction. Concurrent calls can create multiple gateway intents/charge`
- `21: Payment engine is **P0 FIX/BLOCKED**. Live money movement remains deferred until the owner activates Moyasar, and source remediation must first establish strict ownership, signed webhooks, idempotent intent/retry and atomic side-effect cont`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
