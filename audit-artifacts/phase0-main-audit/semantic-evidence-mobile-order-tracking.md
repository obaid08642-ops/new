# Semantic evidence — Mobile Pharmacy Order Tracking

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:28–51` maps backend states to a four-step timeline. Unknown states default to level 0 (`:31–37`), which can render a newly observed, cancelled, rejected, refunded, expired, or failed order as if it were newly received. Pickup completion treats `DELIVERED`/`COMPLETED` as done even though pickup may have a different terminal state (`:43–46`). All timestamps for steps use the same `updated_at` rather than per-transition timestamps (`:28–49`).

The screen polls `/orders/{orderId}/tracking` every 30 seconds and retains the last known state on failure (`:66–85`). It sets `fetchError` on exceptions but does not clear `orderData`, so a stale order can remain presented without a visible stale timestamp or retry control (`:71–79,135–140`). Ownership/404 behavior is not proven, and the raw route order ID is not visibly validated beyond truthiness.

The UI uses fallback labels such as `الصيدلية قيد التعيين`, `غير متاح`, and `—` when data is absent (`:87–91,188–200`), and renders ETA if numeric without freshness/accuracy/source semantics (`:90,117–121`). The only operational action beyond home/chat/rating is navigation to pharmacist chat; no cancel, reorder, refund/return, receipt, contact delivery, or escalation path is present (`:124–130,203–217`).

No explicit handling is shown for cancelled/rejected/refunded/partially fulfilled/out-of-stock/failed delivery, payment reversal, pharmacy reassignment, stale polling, unauthorized/stranger access, or delivery dispute. No Phase 0 remediation was made.
