# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_CHRONIC_REFILL_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `c5a5ece0c7fa3c4e133fe1134135fe71dfd4cf17e682da1711627a9dcaeb2ea8`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Patient `health/refills.tsx` calls the real owned `POST /health/reminders/:id/refill` route. Backend resolves a patient address, creates a pharmacy order, tags it as a refill, and returns `order_id`. The core route exists, but the end-to-en`
- `9: | Patient receives `res.order_id` then opens `/pharmacy/order-tracking` without route parameters | Tracking screen requires `orderId` and otherwise never fetches `/orders/:orderId/tracking`, displaying an unavailable order number | **P0 FIX`
- `10: | Backend creates a pharmacy order, then immediately sets `pills_remaining: 30` and next refill date +30 days | Inventory is represented as replenished before pharmacy acceptance, payment, preparation, delivery, or pickup completion | **P0 `
- `14: | The operation creates a real pharmacy order but the client has no visible request idempotency contract | Double confirmation/retry may create multiple broadcast orders unless the downstream order service deduplicates exactly this case | *`
- `18: Chronic refill is a partially real workflow, not a placeholder. It must remain **workflow-gated** until tracking receives the real ID, stock transition follows fulfillment, business thresholds align, eligible medication identity is verified`
### backend_consumers_or_contracts
- `9: | Patient receives `res.order_id` then opens `/pharmacy/order-tracking` without route parameters | Tracking screen requires `orderId` and otherwise never fetches `/orders/:orderId/tracking`, displaying an unavailable order number | **P0 FIX`
### auth_ownership
- `9: | Patient receives `res.order_id` then opens `/pharmacy/order-tracking` without route parameters | Tracking screen requires `orderId` and otherwise never fetches `/orders/:orderId/tracking`, displaying an unavailable order number | **P0 FIX`
- `13: | Backend verifies reminder ownership and default address coordinates; UI handles the missing-address error | Positive control: cross-patient reminder use is scoped by `patient_id`, and no-address flow directs patient to address management `
### state_transitions
- `9: | Patient receives `res.order_id` then opens `/pharmacy/order-tracking` without route parameters | Tracking screen requires `orderId` and otherwise never fetches `/orders/:orderId/tracking`, displaying an unavailable order number | **P0 FIX`
- `10: | Backend creates a pharmacy order, then immediately sets `pills_remaining: 30` and next refill date +30 days | Inventory is represented as replenished before pharmacy acceptance, payment, preparation, delivery, or pickup completion | **P0 `
- `11: | Patient copy states automatic alert at seven days | Backend enriched `needs_refill_soon` uses three days when `refill_date` exists | Product copy and operational threshold conflict | **FIX — select one contract and derive all UI copy/noti`
- `13: | Backend verifies reminder ownership and default address coordinates; UI handles the missing-address error | Positive control: cross-patient reminder use is scoped by `patient_id`, and no-address flow directs patient to address management `
- `14: | The operation creates a real pharmacy order but the client has no visible request idempotency contract | Double confirmation/retry may create multiple broadcast orders unless the downstream order service deduplicates exactly this case | *`
- `18: Chronic refill is a partially real workflow, not a placeholder. It must remain **workflow-gated** until tracking receives the real ID, stock transition follows fulfillment, business thresholds align, eligible medication identity is verified`
### payment_insurance_relevance
- `10: | Backend creates a pharmacy order, then immediately sets `pills_remaining: 30` and next refill date +30 days | Inventory is represented as replenished before pharmacy acceptance, payment, preparation, delivery, or pickup completion | **P0 `
### error_empty_loading_retry_cancel
- `10: | Backend creates a pharmacy order, then immediately sets `pills_remaining: 30` and next refill date +30 days | Inventory is represented as replenished before pharmacy acceptance, payment, preparation, delivery, or pickup completion | **P0 `
- `13: | Backend verifies reminder ownership and default address coordinates; UI handles the missing-address error | Positive control: cross-patient reminder use is scoped by `patient_id`, and no-address flow directs patient to address management `
- `14: | The operation creates a real pharmacy order but the client has no visible request idempotency contract | Double confirmation/retry may create multiple broadcast orders unless the downstream order service deduplicates exactly this case | *`
- `18: Chronic refill is a partially real workflow, not a placeholder. It must remain **workflow-gated** until tracking receives the real ID, stock transition follows fulfillment, business thresholds align, eligible medication identity is verified`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
