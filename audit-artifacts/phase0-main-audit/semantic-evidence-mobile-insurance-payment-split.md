# Semantic evidence — Mobile Insurance Payment Split

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/payment-split.tsx:16–33` requires a route `request_id`, loads `/insurance/requests/{requestId}`, and parses it with `parseInsuranceCopayRequest`. Unlike older insurance surfaces, this screen has an explicit error/retry state and displays server-derived price/copay values (`:23–30,57–69`). However, this source does not prove owner/stranger/unauth response behavior, request state/version preconditions, booking/order linkage, policy context, expiry or provider authorization.

For zero copay, `continueFlow` calls `POST /insurance/requests/{request.id}/pay-copay` with an empty body and no visible `paymentIntentHeaders` (`:35–42`). Repeated taps are guarded locally by `submitting`, but no idempotency/replay evidence is visible for this mutation, and the response is ignored before reloading. For payable copay, the payment intent uses `/payments/intent/insurance/{request.id}` and `paymentIntentHeaders('insurance', request.id)` (`:43–50`); it validates only `txn.id` before routing to processing, with no explicit amount/request/owner/status reconciliation beyond the server response.

The UI labels the figures as server-approved and has provider-review, zero-copay, checkout-copay and paid branches (`:53–69`), but the source does not show stale/expired/rejected/reversed/partial coverage, payment cancellation/return, webhook delay, duplicate intent, settlement failure or booking confirmation semantics. Paid state routes to tabs without preserving request/booking/payment context (`:69`). No Phase 0 remediation was made.
