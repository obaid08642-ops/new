# Semantic evidence — Mobile Pharmacy Order Confirm

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/order-confirm.tsx:34–48` loads `/orders/{orderId}` and has a visible load-error state, but the source does not validate the route ID or prove owner/stranger/unauth behavior. The page renders pharmacy name, distance, estimated time, item availability and prices directly from the order response (`:96–170`), with no schema validation or freshness/quote expiry treatment.

Approve sends `POST /orders/{orderId}/approve-basket` without a visible idempotency key and, on transport success, routes to `/pharmacy/payment` while passing `total: order?.total || 0` in route params (`:50–61`). The payment screen later re-reads the order, but the route parameter is an unnecessary client-derived value and the approval transition/state eligibility/replay behavior are not proven here.

Reject sends `POST /orders/{orderId}/reject-basket` with a fixed reason and routes back to waiting on success (`:63–70`). There is no explicit confirmation, idempotency, state/version precondition, ownership test, or handling for already accepted/rejected/expired orders. Failures show a localized alert but do not expose retry-specific domain state.

The source claims missing items will be sourced from another pharmacy or removed (`:145–153`) but no actual patient choice, substitution consent, partial-order quote, or server transition is shown. No Phase 0 remediation was made.
