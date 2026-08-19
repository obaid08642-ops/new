# Phase 2 Patient — chronic refill workflow gap

## Scope

Patient `health/refills.tsx` calls the real owned `POST /health/reminders/:id/refill` route. Backend resolves a patient address, creates a pharmacy order, tags it as a refill, and returns `order_id`. The core route exists, but the end-to-end lifecycle has correctness gaps.

| Patient / Backend behavior | Finding | Required disposition |
|---|---|---|
| Patient receives `res.order_id` then opens `/pharmacy/order-tracking` without route parameters | Tracking screen requires `orderId` and otherwise never fetches `/orders/:orderId/tracking`, displaying an unavailable order number | **P0 FIX — navigate with the returned `orderId` and test tracker ownership/state transitions** |
| Backend creates a pharmacy order, then immediately sets `pills_remaining: 30` and next refill date +30 days | Inventory is represented as replenished before pharmacy acceptance, payment, preparation, delivery, or pickup completion | **P0 FIX — advance stock/refill schedule only after the appropriate fulfillment event; reverse/retain state on reject/cancel/payment failure** |
| Patient copy states automatic alert at seven days | Backend enriched `needs_refill_soon` uses three days when `refill_date` exists | Product copy and operational threshold conflict | **FIX — select one contract and derive all UI copy/notification behavior from it** |
| Refill uses a single item at quantity 1 from the reminder | Manual reminders may lack a medicine identifier/prescription/order linkage; Backend prepares an item with possibly undefined identity | The order can be clinically or commercially ambiguous | **FIX/VERIFY — require an eligible linked medicine/prescription, clear manual-reminder handling, and inventory/catalog validation** |
| Backend verifies reminder ownership and default address coordinates; UI handles the missing-address error | Positive control: cross-patient reminder use is scoped by `patient_id`, and no-address flow directs patient to address management | **PASS — retain and test after address-create remediation** |
| The operation creates a real pharmacy order but the client has no visible request idempotency contract | Double confirmation/retry may create multiple broadcast orders unless the downstream order service deduplicates exactly this case | **VERIFY/FIX — enforce idempotency key or server duplicate protection for refill source/reminder state** |

## Decision

Chronic refill is a partially real workflow, not a placeholder. It must remain **workflow-gated** until tracking receives the real ID, stock transition follows fulfillment, business thresholds align, eligible medication identity is verified, and retry/idempotency behavior is tested.
