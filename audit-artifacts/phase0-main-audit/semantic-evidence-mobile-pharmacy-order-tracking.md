# Semantic evidence — Mobile Pharmacy Order Tracking

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:66–85` polls `GET /orders/{orderId}/tracking` immediately and every 30 seconds, preserving the last known state on failure rather than injecting demo data. This is a positive truthfulness control. However, the source does not visibly validate the identifier, prove owner-scoped 404 for strangers, distinguish 401/403/404/network errors, expose a retry action, or handle polling backoff, app background/resume, stale timestamps, cancellation/refund/failed states, terminal polling stop, or realtime updates.

`buildSteps` (`:28–51`) maps a small local state set into a fixed delivery/pickup timeline. Unknown states default to level zero, which can falsely present a newly introduced/error/cancelled state as “received”. Step times reuse `updated_at` for multiple transitions rather than per-event timestamps. Pickup considers several delivery states as ready and marks only `DELIVERED`/`COMPLETED` done, while backend state vocabulary and delivery-mode contract are not verified. The screen supplies explanatory descriptions locally, not from a state/event contract.

The header and pharmacy card render backend pharmacy name, delivery mode, total and ETA (`:87–131,188–201`), but `pharmacyName` falls back to “pharmacy being assigned” and delivery mode falls back to DELIVERY, which can conceal missing server fields. ETA is treated as a number without expiry/freshness or timezone semantics. The chat button routes to `/pharmacy/chat-with-pharmacist` without passing `orderId` (`:124–130`), so the chat screen’s required thread context may be absent and the wrong order/thread could be opened.

The rating button appears for `DELIVERED` and routes to reviews with pharmacy/provider parameters (`:203–217`), but no proof of one-review-per-order, patient ownership, rating contract, duplicate prevention or post-delivery eligibility exists here. No cancellation, reorder, support, refund or prescription/order detail action is visible. No Phase 0 remediation was made.
