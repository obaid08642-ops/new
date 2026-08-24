# Phase 0B semantic evidence — OrdersController

**Archive member:** `src/modules/orders/orders.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–187 from the baseline archive extraction.

Lines 1–11 define a JWT-guarded `orders` controller, inject `OrdersService`, import role/state enums and `RequireIdempotency`, and use `CreateOrderDto` only for order creation. Lines 13–18 expose `POST /orders/create`, restricted to patient/admin roles, delegating the authenticated user and validated DTO to the service.

Lines 21–35 expose patient-facing `GET /orders/mine`, `POST /orders/:id/reorder`, and `POST /orders/:id/reorder-partial`. The reorder mutations require `RequireIdempotency`; the partial reorder body is untyped. Lines 38–52 expose idempotent cancel and non-idempotent basket approve/reject routes. Cancel defaults the reason to `patient-cancel`; basket mutations do not visibly require idempotency in this controller.

Lines 54–63 expose pharmacy queue and `GET /orders/:id`. Pharmacy queue is role-restricted to pharmacy/admin and accepts an `OrderState`; detail delegates user context to the service, so ownership/non-disclosure is service-dependent from this member’s perspective. Lines 66–76 expose a PDF report download and tracking read. The PDF response sets content type and a filename containing the caller-supplied order ID.

Lines 79–90 expose cash opt-in for a specific order item and insurance approval. Cash opt-in has an untyped body and no visible idempotency decorator. Insurance approval is restricted to lab/pharmacy/hospital/radiology/admin roles, but body validation is untyped and the service must enforce order/provider ownership.

Lines 92–120 expose pharmacy/admin lifecycle transitions accept, reject, preparing, ready, partial. These are role-restricted but do not visibly use `RequireIdempotency`; reject defaults a reason and partial defaults unavailable medicine IDs to an empty array.

Lines 122–145 expose delivery assignment and delivery transitions. Assignment permits pharmacy/admin/delivery and takes a typed driver ID body; delivery update accepts a typed state plus arbitrary location but does not accept current user context in the controller; dispatch/delivered call service transitions with role restrictions.

Lines 147–164 expose admin list, escalated list, and arbitrary admin state transition with an optional reason. Lines 166–185 expose bid placement/acceptance/listing for pharmacy/admin contexts; the bid acceptance route has no visible `Roles` decorator and relies on the controller-level JWT guard plus service authorization.

**Routes/events:** create, mine, reorder, reorder-partial, cancel, approve/reject basket, pharmacy queue, detail, PDF, tracking, cash opt-in, insurance approval, pharmacy lifecycle, delivery lifecycle, admin transitions, and pharmacy bids.

**Auth/ownership:** controller-level JWT guard; role decorators restrict many operational routes. Patient detail/reorder/cancel ownership is delegated to `OrdersService`; this controller does not prove stranger 404 behavior. Bid acceptance lacks an explicit role decorator. Delivery update lacks `CurrentUser` in the controller signature.

**State transitions:** order creation → basket review → pharmacy acceptance/rejection/preparing/ready/partial → dispatch/delivery → delivered; patient cancellation/reorder and insurance approval are side transitions; bids support place → accept. The exact transition matrix is delegated to service.

**Price/payment/insurance source:** order creation uses a DTO but controller does not calculate totals; cash opt-in and insurance approval are separate mutations. Payment/idempotency is visibly enforced only on reorder/reorder-partial/cancel via `RequireIdempotency` in this member.

**Test implications:** require unauth 401; patient owner/stranger non-disclosure for detail, tracking, PDF, reorder, cancel and basket operations; method/path verification; idempotency replay for every financial/order mutation; role matrix for pharmacy/provider/delivery/admin; state-machine invalid transitions; insurance ownership; cash opt-in validation; PDF authorization and content disposition; bid-accept role enforcement; and delivery actor attribution. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
