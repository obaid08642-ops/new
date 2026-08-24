# Semantic evidence — Mobile Pharmacy Reorder

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/reorder.tsx:22–40` loads `/orders/{orderId}` and maps returned items into local state. Any load error is swallowed, leaving an empty screen without a distinct unavailable/not-found/unauthorized state. Item identity falls back from `medicine_id` to `id`, name falls back to `Unknown`, price to `0`, and quantity to `1` (`:26–35`).

The screen calculates a local total from mapped item prices and quantities (`:42–46`) and allows local selection/quantity changes. It does not revalidate stock, current price, prescription requirement, substitution, availability, or pharmacy before submission. The explanatory text states that the prior order’s address, delivery and payment methods will be reused (`:126–131`), but no server-confirmed eligibility or explicit review/consent for reusing sensitive delivery/payment context is shown.

All-selected reorder sends `POST /orders/{orderId}/reorder`; partial reorder sends `POST /orders/{orderId}/reorder-partial` with selected medicine IDs and quantities (`:52–67`). No visible idempotency key, replay handling, ownership/stranger test, or precondition/state validation is present. It requires a returned order ID before navigating to waiting-for-pharmacy, but all errors are only logged to console with no user-visible error/retry (`:65–72`).

No explicit handling exists for cancelled/expired/returned original orders, unavailable medicines, changed prescription requirements, partial fulfillment, price/stock mismatch, duplicate reorder, payment reauthorization, address invalidation, or insurance/cash branch changes. No Phase 0 remediation was made.
