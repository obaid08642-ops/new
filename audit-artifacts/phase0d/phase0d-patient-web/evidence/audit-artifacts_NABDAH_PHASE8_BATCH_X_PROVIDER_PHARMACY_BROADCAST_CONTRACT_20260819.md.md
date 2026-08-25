# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_X_PROVIDER_PHARMACY_BROADCAST_CONTRACT_20260819.md`
- **Member SHA-256:** `52c2569b44bfebab281d59a09b5f24e4b5c021ca12e58684b23e3171e1964a99`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Two Provider pharmacy broadcast screens listed `/provider/pharmacy/broadcasts` but accepted an order using the separate legacy order-accept route. The broadcast service owns winner locking, notification membership, inventory reservation and`
- `11: | Broadcast acceptance | Both live radar and secondary broadcast screens now call `POST /provider/pharmacy/broadcasts/:orderId/i-have-all`, the canonical winner-lock route. |`
- `13: | Broadcast identity | The secondary screen resolves `order_id`/nested order ID only, not the broadcast document ID. Rows lacking a valid order identity are not actionable. |`
- `14: | Rejection | Rejection remains on the canonical broadcast route with an explicit error state. The modal closes in `finally` and clears its local selection only after the attempt, rather than silently swallowing failure. |`
- `29: | Branch upload | **PASS** — source commit `6836563` (`fix: use pharmacy broadcast allocation contract`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `5: Two Provider pharmacy broadcast screens listed `/provider/pharmacy/broadcasts` but accepted an order using the separate legacy order-accept route. The broadcast service owns winner locking, notification membership, inventory reservation and`
- `11: | Broadcast acceptance | Both live radar and secondary broadcast screens now call `POST /provider/pharmacy/broadcasts/:orderId/i-have-all`, the canonical winner-lock route. |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: Two Provider pharmacy broadcast screens listed `/provider/pharmacy/broadcasts` but accepted an order using the separate legacy order-accept route. The broadcast service owns winner locking, notification membership, inventory reservation and`
- `12: | Response contract | The UI requires a server-returned allocation ID before considering acceptance successful. It carries the actual order ID and allocation ID forward; no local terminal order state is manufactured. |`
- `14: | Rejection | Rejection remains on the canonical broadcast route with an explicit error state. The modal closes in `finally` and clears its local selection only after the attempt, rather than silently swallowing failure. |`
- `33: No broadcast, inventory, allocation, order, patient record, or production provider account was changed. Phase 11 must exercise a linked sandbox pharmacy broadcast through listed → rejected → partial → full accept/race → allocation review → `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: Two Provider pharmacy broadcast screens listed `/provider/pharmacy/broadcasts` but accepted an order using the separate legacy order-accept route. The broadcast service owns winner locking, notification membership, inventory reservation and`
- `14: | Rejection | Rejection remains on the canonical broadcast route with an explicit error state. The modal closes in `finally` and clears its local selection only after the attempt, rather than silently swallowing failure. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
