# Semantic evidence — Mobile Pharmacy Payment

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx:38–60` loads `/orders/{orderId}` and derives the displayed amount from server order total or insurance copay, subtracting server-reported wallet application. This is stronger than checkout display, but ownership/404 semantics and order payment state contract still require backend/runtime proof.

For cash orders, already-paid orders, or zero remaining amount, `handlePay` clears the local cart and navigates directly to tracking without a server-side transition in this screen (`:64–81`). For card-like payment, it posts `/payments/intent/pharmacy/{orderId}` with `paymentIntentHeaders('pharmacy', orderId)` and requires a transaction ID before routing to `/payments/processing` (`:83–96`). The actual header implementation and processing/verify contract must be reconciled separately; this screen does not prove replay behavior, intent ownership, order status eligibility, or compensation when cart clearing/navigation fails.

Insurance orders are blocked when status is not APPROVED or PARTIAL_APPROVAL (`:53–56,175–183,222–240`), but the screen has no polling/refresh path for a pending approval and no explicit rejected/expired/partial coverage workflow. It displays provider/security claims about a licensed Moyasar gateway (`:195–217`) that require approved legal/provider evidence.

The screen has load-error retry and a generic intent failure alert (`:104–126,97–101`), but no explicit handling for 401/403/404 ownership, stale order, duplicate intent, provider timeout after authorization, cancellation/return, webhook delay, amount mismatch, or payment reconciliation. No Phase 0 remediation was made.
