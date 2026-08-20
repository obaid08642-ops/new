# Phase 8 — Batch K: payment-intent idempotency

## Purpose

The Phase 5 audit found that payment intent creation used a read-then-create pattern without a database-enforced idempotency/active-intent constraint. Concurrent or repeated requests could create multiple PSP intents for one booking. This batch introduces an authenticated client key, application replay protection and schema-level uniqueness declarations.

## Source change

| Layer | Implemented control |
|---|---|
| Patient callers | Consultation, pharmacy and insurance-copay intent requests now send a bounded per-tap `Idempotency-Key`. The shared helper’s key is a replay-safety identifier, not authentication material. |
| Controller | `POST /payments/intent/:type/:id` and retry use the existing authenticated `IdempotencyInterceptor`; a missing/invalid key is rejected by payment service/interceptor rather than creating a silent new attempt. |
| Application reservation | The service verifies owned booking/payment state, then persists an `initiating` transaction reservation before PSP creation. A duplicate-key race returns the canonical active transaction rather than calling the gateway again. Gateway failure marks only that reservation failed. |
| Existing active intent | A booking-kind-scoped `initiating`, `pending` or `authorized` transaction is safely returned and no second gateway intent is created. |
| Schema declarations | Transaction records now include `idempotency_key` and declare partial unique indexes for one active intent per booking, per booking/client idempotency key, and gateway/intent reference. |

## Verification

| Gate | Result |
|---|---|
| Focused payment/idempotency tests | **PASS** — 2 suites, 16 tests. Coverage includes ownership, safe 502, webhook verification, interceptor replay/in-flight behavior, required key, and return of active intent without a second gateway call. |
| Combined Backend Phase 8 regressions | **PASS** — 9 suites, 55 tests. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Archive integrity | **PASS** — both rebuilt archives validate with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `3584927e306267f79f3210f25f06484f29d9b461a812a30153afe85f69962fa5` |
| Patient archive SHA-256 | `d631b49af91bcb325e3a6d7a7c1267277b579e3f2feee3af12022a3667d3b281` |
| Branch upload | **PASS** — source commit `09d3225` (`fix: enforce idempotent payment intents`) is on `manus/on-live-reconciliation`. |

## Required deployment/migration gate

This source change declares Mongo partial unique indexes but **does not apply them to production**. Before any deployment, a reviewer must:

1. Query for duplicate active transactions by `(booking_kind, booking_id)` and duplicate non-null `(gateway, gateway_intent_id)` / booking idempotency records.
2. Reconcile or cancel duplicates through governed finance workflow; do not delete payment records blindly.
3. Create/verify indexes in the production maintenance window and retain the index-build/output evidence.
4. Configure/verify Redis availability for the interceptor, deploy the source candidate, and exercise only owner-approved sandbox payment behavior after Moyasar activation.

Moyasar remains owner-deferred. No live intent, payment, capture, refund or production migration was run in this batch.
