# Phase 0B semantic evidence — orders.service.spec.ts

**Archive member:** `src/modules/orders/orders.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–129; full 129-line member covered.

Lines 2–11 import OrdersService, dependencies, exceptions and schemas. Lines 13–55 build a TestingModule with OrdersService and a single reusable `mockModel` for Order, Medicine, Delivery and PharmacyBid repositories. The model mocks include find/findOne/create/updateOne/updateMany/lean/sort/countDocuments. EventEmitter is mocked, DispatchService and WorkflowEngineService are empty objects, and finance dependencies are mocked with bare methods. The test therefore validates service behavior against mocks rather than real database/workflow/finance integration.

Lines 57–59 assert service definition. Lines 61–90 cover order ownership/BOLA with a patient-owned order: foreign patient reads receive 404/order_not_found; owner reads succeed; foreign cancellation and PDF generation are rejected before side effects; owner PDF generation returns a Buffer beginning `%PDF-`.

Lines 92–118 cover placeBid authorization and creation: a patient is rejected with ForbiddenException; a pharmacy can create a bid using a request containing empty/loosely shaped items and client total_price, and the mocked model response is returned. No bid ownership against the target prescription/order or server-side price recomputation is asserted.

Lines 121–128 cover only the not-found branch of acceptBid, expecting NotFoundException. There is no positive acceptance or pharmacy/patient ownership test.

**What is covered:** basic service construction; a meaningful patient BOLA read/cancel/PDF negative boundary; owner PDF output signature; role check for placeBid; and missing-bid error.

**Coverage gaps:** no unauthenticated cases, provider/pharmacy stranger cases, admin role boundaries, order creation, cart/checkout, inventory reservation, payment authorization/capture/refund, cancellation/reschedule state machine, idempotency/replay, delivery claims, prescription/insurance ownership, financial totals, transaction rollback, concurrency, event/outbox, PDF content authorization beyond Buffer prefix, or data redaction. Shared mutable mocks are not reset in the shown beforeEach, so call/state leakage must be checked. Empty dependency objects and bare finance mocks can mask runtime integration failures.

**Truthfulness/security:** The BOLA tests are mock-driven and prove only the service's current findOne path under a synthetic order. They do not prove repository projections, database query scoping, controller guards, or real error serialization. The placeBid test accepts client-supplied total_price in its payload without asserting it is ignored/recomputed.

**Test implications:** add real integration/contract tests for unauth/owner/stranger/admin across every order route; exact-once create/charge/stock effects under replay; server-authoritative totals; bid authorization/expiry/CAS; state transitions and rollback; inventory/delivery concurrency; prescription/insurance/address ownership; PDF content/PII redaction; event/outbox and failure recovery. No tests executed during this semantic read.
