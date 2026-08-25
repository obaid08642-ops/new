# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_R_CHRONIC_REFILL_INTEGRITY_20260819.md`
- **Member SHA-256:** `ba9d49a304377f55cb02d691e3ed64d81dad0743534b00f35b44160904438ca5`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient audit found that a chronic refill created a real pharmacy order but opened the tracking screen without the returned `order_id`. More seriously, the Backend immediately replaced the reminder’s stock with a fixed `30` pills and ad`
- `11: | Patient tracking handoff | The refill screen accepts tracking only when the server response contains `ok: true` and a non-empty `order_id`, then routes with the real `orderId` parameter expected by the tracking screen. Incomplete response`
- `14: | Duplicate prevention | The service returns an existing pending order on retry and uses a conditional server-side creation lock before creating a new order. The lock is released if order creation fails. |`
- `17: | Radiology regression repair | The full Backend suite exposed an ordering issue in the intentionally disabled legacy radiology raw-URL endpoint. It now checks provider booking ownership before returning the migration error, preserving fore`
- `32: | Branch upload | **PASS** — source commit `0633f61` (`fix: preserve chronic refill fulfillment integrity`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `36: No refill, order, payment, inventory record, or patient data was created on production in this batch. The remaining pharmacy acceptance evidence requires a real linked sandbox patient/pharmacy request, a verified pharmacy dispense/quantity `
### auth_ownership
- `17: | Radiology regression repair | The full Backend suite exposed an ordering issue in the intentionally disabled legacy radiology raw-URL endpoint. It now checks provider booking ownership before returning the migration error, preserving fore`
### state_transitions
- `5: The Patient audit found that a chronic refill created a real pharmacy order but opened the tracking screen without the returned `order_id`. More seriously, the Backend immediately replaced the reminder’s stock with a fixed `30` pills and ad`
- `11: | Patient tracking handoff | The refill screen accepts tracking only when the server response contains `ok: true` and a non-empty `order_id`, then routes with the real `orderId` parameter expected by the tracking screen. Incomplete response`
- `12: | Patient claims | Refill copy now states that pricing, availability, and dispensed quantity are confirmed inside the pharmacy order. It does not claim a local restock, automatic dosage inference, or a changed medication state after order c`
- `14: | Duplicate prevention | The service returns an existing pending order on retry and uses a conditional server-side creation lock before creating a new order. The lock is released if order creation fails. |`
- `15: | Reminder persistence | After a successful order creation, the reminder stores only `refill_pending_order_id`; the previous fixed `pills_remaining: 30` and synthetic next-refill date update were removed. |`
- `16: | Fulfilment boundary | On verified pharmacy `DELIVERED`, the order transition clears the pending link and records `refill_fulfilled_at`/`order_id`. It deliberately does **not** invent a dispensed quantity or next-refill date, because that `
- `17: | Radiology regression repair | The full Backend suite exposed an ordering issue in the intentionally disabled legacy radiology raw-URL endpoint. It now checks provider booking ownership before returning the migration error, preserving fore`
### payment_insurance_relevance
- `36: No refill, order, payment, inventory record, or patient data was created on production in this batch. The remaining pharmacy acceptance evidence requires a real linked sandbox patient/pharmacy request, a verified pharmacy dispense/quantity `
### error_empty_loading_retry_cancel
- `11: | Patient tracking handoff | The refill screen accepts tracking only when the server response contains `ok: true` and a non-empty `order_id`, then routes with the real `orderId` parameter expected by the tracking screen. Incomplete response`
- `14: | Duplicate prevention | The service returns an existing pending order on retry and uses a conditional server-side creation lock before creating a new order. The lock is released if order creation fails. |`
- `15: | Reminder persistence | After a successful order creation, the reminder stores only `refill_pending_order_id`; the previous fixed `pills_remaining: 30` and synthetic next-refill date update were removed. |`
- `16: | Fulfilment boundary | On verified pharmacy `DELIVERED`, the order transition clears the pending link and records `refill_fulfilled_at`/`order_id`. It deliberately does **not** invent a dispensed quantity or next-refill date, because that `
- `17: | Radiology regression repair | The full Backend suite exposed an ordering issue in the intentionally disabled legacy radiology raw-URL endpoint. It now checks provider booking ownership before returning the migration error, preserving fore`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
