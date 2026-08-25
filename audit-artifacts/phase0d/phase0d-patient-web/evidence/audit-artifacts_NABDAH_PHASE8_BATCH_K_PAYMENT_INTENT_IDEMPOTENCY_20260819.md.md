# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_K_PAYMENT_INTENT_IDEMPOTENCY_20260819.md`
- **Member SHA-256:** `f3d2bdaecbaab99baa9b586f4c24e2323e89c8e0d55d0e6ce632b5524461dd55`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Phase 5 audit found that payment intent creation used a read-then-create pattern without a database-enforced idempotency/active-intent constraint. Concurrent or repeated requests could create multiple PSP intents for one booking. This b`
- `12: | Controller | `POST /payments/intent/:type/:id` and retry use the existing authenticated `IdempotencyInterceptor`; a missing/invalid key is rejected by payment service/interceptor rather than creating a silent new attempt. |`
- `13: | Application reservation | The service verifies owned booking/payment state, then persists an `initiating` transaction reservation before PSP creation. A duplicate-key race returns the canonical active transaction rather than calling the g`
- `14: | Existing active intent | A booking-kind-scoped `initiating`, `pending` or `authorized` transaction is safely returned and no second gateway intent is created. |`
- `15: | Schema declarations | Transaction records now include `idempotency_key` and declare partial unique indexes for one active intent per booking, per booking/client idempotency key, and gateway/intent reference. |`
- `28: | Branch upload | **PASS** — source commit `09d3225` (`fix: enforce idempotent payment intents`) is on `manus/on-live-reconciliation`. |`
- `34: 1. Query for duplicate active transactions by `(booking_kind, booking_id)` and duplicate non-null `(gateway, gateway_intent_id)` / booking idempotency records.`
- `35: 2. Reconcile or cancel duplicates through governed finance workflow; do not delete payment records blindly.`
- `39: Moyasar remains owner-deferred. No live intent, payment, capture, refund or production migration was run in this batch.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `21: | Focused payment/idempotency tests | **PASS** — 2 suites, 16 tests. Coverage includes ownership, safe 502, webhook verification, interceptor replay/in-flight behavior, required key, and return of active intent without a second gateway call`
- `37: 4. Configure/verify Redis availability for the interceptor, deploy the source candidate, and exercise only owner-approved sandbox payment behavior after Moyasar activation.`
- `39: Moyasar remains owner-deferred. No live intent, payment, capture, refund or production migration was run in this batch.`
### state_transitions
- `12: | Controller | `POST /payments/intent/:type/:id` and retry use the existing authenticated `IdempotencyInterceptor`; a missing/invalid key is rejected by payment service/interceptor rather than creating a silent new attempt. |`
- `13: | Application reservation | The service verifies owned booking/payment state, then persists an `initiating` transaction reservation before PSP creation. A duplicate-key race returns the canonical active transaction rather than calling the g`
- `14: | Existing active intent | A booking-kind-scoped `initiating`, `pending` or `authorized` transaction is safely returned and no second gateway intent is created. |`
- `35: 2. Reconcile or cancel duplicates through governed finance workflow; do not delete payment records blindly.`
- `37: 4. Configure/verify Redis availability for the interceptor, deploy the source candidate, and exercise only owner-approved sandbox payment behavior after Moyasar activation.`
- `39: Moyasar remains owner-deferred. No live intent, payment, capture, refund or production migration was run in this batch.`
### payment_insurance_relevance
- `1: # Phase 8 — Batch K: payment-intent idempotency`
- `5: The Phase 5 audit found that payment intent creation used a read-then-create pattern without a database-enforced idempotency/active-intent constraint. Concurrent or repeated requests could create multiple PSP intents for one booking. This b`
- `11: | Patient callers | Consultation, pharmacy and insurance-copay intent requests now send a bounded per-tap `Idempotency-Key`. The shared helper’s key is a replay-safety identifier, not authentication material. |`
- `12: | Controller | `POST /payments/intent/:type/:id` and retry use the existing authenticated `IdempotencyInterceptor`; a missing/invalid key is rejected by payment service/interceptor rather than creating a silent new attempt. |`
- `13: | Application reservation | The service verifies owned booking/payment state, then persists an `initiating` transaction reservation before PSP creation. A duplicate-key race returns the canonical active transaction rather than calling the g`
- `21: | Focused payment/idempotency tests | **PASS** — 2 suites, 16 tests. Coverage includes ownership, safe 502, webhook verification, interceptor replay/in-flight behavior, required key, and return of active intent without a second gateway call`
- `28: | Branch upload | **PASS** — source commit `09d3225` (`fix: enforce idempotent payment intents`) is on `manus/on-live-reconciliation`. |`
- `35: 2. Reconcile or cancel duplicates through governed finance workflow; do not delete payment records blindly.`
- `37: 4. Configure/verify Redis availability for the interceptor, deploy the source candidate, and exercise only owner-approved sandbox payment behavior after Moyasar activation.`
- `39: Moyasar remains owner-deferred. No live intent, payment, capture, refund or production migration was run in this batch.`
### error_empty_loading_retry_cancel
- `12: | Controller | `POST /payments/intent/:type/:id` and retry use the existing authenticated `IdempotencyInterceptor`; a missing/invalid key is rejected by payment service/interceptor rather than creating a silent new attempt. |`
- `13: | Application reservation | The service verifies owned booking/payment state, then persists an `initiating` transaction reservation before PSP creation. A duplicate-key race returns the canonical active transaction rather than calling the g`
- `14: | Existing active intent | A booking-kind-scoped `initiating`, `pending` or `authorized` transaction is safely returned and no second gateway intent is created. |`
- `35: 2. Reconcile or cancel duplicates through governed finance workflow; do not delete payment records blindly.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
