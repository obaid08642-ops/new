# H scenarios, status B: PT-25

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-25 | Delivery tracking | PARTIAL | `patient-app/src/utils/orderTrackingStages.test.ts` (new, 19 tests); `patient-app/src/utils/orderTracking.test.ts` and `src/__tests__/orders/orders-screens.test.tsx` "order tracking" (existing) | Stage mapping and missing-field behaviour covered; no failed-delivery state exists in the backend order; no polling or push on the screen |

## What exists
- `app/pharmacy/order-tracking.tsx` draws `readTracking` (`src/utils/orderTracking.ts`) of GET `/patient/pharmacy/orders/:id`, with a legacy path (`readLegacyTracking`, GET `/orders/:id/tracking`).
- Delivery steps accepted, preparing, onTheWay, delivered; pickup steps accepted, preparing, ready, collected. Courier name/phone and `courier_eta` only from `delivery`. Cancelled shows a danger notice; delivered offers the rating.
- Refresh: on screen focus and pull-to-refresh only (`order-tracking.tsx:75`, `:115`, `:191`); the file header states "no timer decides anything". No polling, no push-driven refresh on this screen.

## What I tested (new file)
- Full status to stage table for delivery (confirmed, in_fulfillment, out_for_delivery, delivered, completed) and pickup (incl. `ready_for_pickup` allocation, no courier/eta on pickup even if sent).
- Cancelled: no progress, no eta. Unknown status such as `delivery_failed`: no progress, no eta, same neutral status word as any unknown status. `effective_status` wins over `status`.
- Missing/malformed: no delivery object, blank courier name, short phone (no call number), unreadable eta, missing or malformed timeline, non-order payloads, legacy eta minutes (0, negative, string).
- Existing screen tests already cover: courier, eta, call via `tel:`, no courier when absent, rate, cancelled, not found, continue-to-pay.

## What I fixed
Nothing in app code: no defect found in the mapping.

## Backend gaps (not changed)
- No failed-delivery state on the pharmacy order: `DELIVERY_FAILED` exists only as an event name in `backend/src/common/events.ts:39`; the order enum has no failed-delivery state. A failed delivery therefore cannot be drawn distinctly; the client shows the neutral unknown state.

## Client gaps (reported)
- No periodic refresh while out for delivery: the patient must pull to refresh or refocus. Adding polling is business logic outside this design batch; propose to reviewer.

## Not verified
- Live `tools/live/j_pharmacy.py` (no backend here); push notification path; on-device rendering of the screen for the pickup case (only the pure mapping is tested for pickup).
