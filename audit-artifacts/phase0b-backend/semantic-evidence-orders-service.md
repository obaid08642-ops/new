# Phase 0B semantic evidence — OrdersService

**Archive member:** `src/modules/orders/orders.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–253, 255–550, and 553–798 from the baseline archive extraction; the service was read in overlapping bounded ranges to cover the truncation boundary.

Lines 2–39 define PDF generation, order/medicine/delivery/bid repositories, dispatch/workflow, Mongo connection, coupons, loyalty, refund executor, and cancellation policy dependencies. Lines 41–251 implement pharmacy order creation. Input items may be `items` or `cartItems`; delivery requires lat/lng; delivery mode is normalized to PICKUP/DELIVERY. Known medicines are batch fetched by IDs; unknown manual entries with names are created as unverified patient-sourced medicines and marked for review. Unit prices use the catalog medicine price when found, otherwise client-provided manual-entry price or zero.

Order creation dispatches by geo/inventory, creates a primary order with patient identity, selected pharmacy, delivery data, payment/insurance state, and dispatch record. Server computes pre-discount total from persisted order subtotal plus delivery fee, validates coupons, quotes loyalty points, computes final total, applies coupon/loyalty mutations, and can debit patient wallet atomically by balance predicate. Failure compensates coupon and loyalty changes. No client total is trusted for the persisted total.

Creation emits order/workflow events, escalates when dispatch fails, transitions successful primary orders through VALIDATED and PHARMACY_RECEIVED, and creates split sub-orders for missing items. The split sub-order total is recomputed from missing items and delivery fee is bundled as zero.

Lines 254–306 implement the order state machine through WorkflowEngine. Non-admin/non-system actors must use ORDER_TRANSITIONS; rejection auto-escalates; READY creates delivery; delivery states emit events; DELIVERED fulfills pending medication reminder linkage; ACCEPTED deducts pharmacy stock; all transitions append state history and save.

Lines 308–350 implement queries and ownership. `assertOrderAccess` returns 404 for unrelated patients/providers, while admin/super-admin can access. Patient and pharmacy listings are scoped and bounded; admin listings support state/search and bounded results. Lines 352–403 implement pharmacy acceptance/rejection/preparation/ready/partial fulfillment. Rejection can redispatch to another pharmacy. Partial fulfillment changes item availability/total and attempts an idempotent refund by derived refund ID, but refund failure emits an event and does not block the operational transition.

Lines 405–486 implement cancellation. Policy controls stage/fee/stock restoration. Paid detection uses order status or paid Moyasar record; gateway refund covers card remainder after fee; wallet-applied funds are recovered from persisted field or wallet ledger and credited once by `cancel_${orderId}` reference; payment/refund fields are updated. Loyalty redemption and coupon use are released best-effort; stock restoration is best-effort; final state transition is CANCELLED.

Lines 488–550 implement owner-scoped PDF generation. PDF includes order metadata and result rows, labels abnormal values, and returns a generated buffer. Lines 553–574 implement delivery assignment/update; assignment creates or updates delivery and transitions order, while update writes state/location and emits event without visible actor/ownership check in this service method.

Lines 576–610 implement full and partial reorder. Both require patient ownership of the source order; partial reorder validates a non-empty array but forwards optional client price/name fields for manual/catalog resolution through create. Lines 612–636 implement patient basket approval/rejection; both are patient-scoped, require submitted-for-approval state, and rejection directly sets CANCELLED without invoking the normal cancellation policy/refund workflow.

Lines 638–713 implement pharmacy bidding. Place-bid role check allows admin/pharmacy, accepts client `total_price` and item payload, and creates expiring pending bids. Accept-bid does not visibly verify caller ownership of the pharmacy bid; it updates bid/order state, replaces items/pricing from accepted bid, and records state history with `from` equal to the already-updated state. Bid listing is not visibly scoped to the requesting user in `listBids`.

Lines 715–747 implement tracking. Patient or assigned pharmacy may access; foreign users receive 403 rather than the order-not-found privacy form used elsewhere. Tracking returns delivery state/ETA/driver/location, pharmacy name, order state/updated time, mode, and total.

Lines 750–782 implement insurance approval updates. Order existence is checked but visible method-level ownership/provider authorization is absent here; status can invoke transition, copay and per-item coverage/rejection/cash fields are updated, and order is saved.

Lines 784–798 implement patient cash opt-in with patient/order/item ownership and item-level opt-in flag persistence.

**Auth/ownership:** patient/provider/admin access differs by method; owner 404 is used for order detail/cancel/reorder, while tracking uses 403 for foreign users; delivery/insurance/bid methods need controller/guard verification; basket rejection and cancellation use different financial paths.

**State transitions:** create → dispatch/escalate → validated/pharmacy received → accepted/preparing/ready/assigned/out/delivered; reject → auto-escalate/redispatch; cancel; partial fulfillment; basket approval/rejection; bid acceptance.

**Price/payment/insurance source:** catalog medicine price preferred; manual entries can carry client price; server total/coupon/loyalty/wallet/cardless refund logic; Moyasar payment records; insurance copay/coverage fields; pharmacy bid client total accepted.

**Security/truthfulness observations:** manual medicine creation is unverified but explicit; partial/refund and wallet updates are intended idempotent but several operational mutations have no visible idempotency key; basket rejection bypasses normal refund/coupon/loyalty/stock policy; bid accept/list ownership is incomplete at service layer; tracking leaks existence via 403; delivery update lacks visible actor check; client bid total and manual-entry price require contract validation.

**Test implications:** price tampering/manual entries, dispatch/split order integrity, transitions/stock/reminder events, wallet/card/coupon/loyalty refund replay, cancellation policy, basket reject financial effects, reorder ownership, bid owner/stranger/unauth, tracking 404/403, insurance provider authorization, cash opt-in, PDF privacy, and delivery mutation idempotency. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
