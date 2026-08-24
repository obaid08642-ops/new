# Phase 0B semantic evidence — PharmacyOrdersProviderService

**Archive member:** `src/modules/pharmacy/services/pharmacy-orders-provider.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–140 from the baseline archive extraction.

Lines 1–20 define order-level provider dependencies: Redis, EventBus, PharmacyAllocationService, PharmacyOrderRepository. The service comments state that persistence occurs on allocation and pharmacy_orders documents and that actions are intended to be real rather than simulated.

Lines 22–52 implement acceptOrder. A Redis SETNX lock keyed by order ID prevents multiple acceptance attempts and receives a 300-second expiry. Provider allocation lookup and confirmation are delegated to PharmacyAllocationService; a system event is emitted and success/status/order/allocation IDs returned. Lock cleanup on downstream failure is not visible.

Lines 54–89 implement submitBasket. The order is loaded by ID, basket/items are accepted from opaque payload, subtotal is calculated from client-supplied price/unit_price and quantity, delivery fee is read from persisted order totals, insurance status/copay are written, and timeline/event records are appended. No visible provider ownership check or server catalog-price resolution exists in this method.

Lines 91–118 implement evaluateInsurance. Order is loaded by ID; client status, copay, NPHIES code, and notes are persisted together with evaluator identity/time and timeline. No visible provider ownership/role or transition validation exists in this method.

Lines 120–140 implement preparing/ready/dispatch. Each resolves the provider’s allocation through `findByOrderForProvider`, delegates allocation transition, and returns allocation state. Dispatch forwards driver/courier name/phone and delivery mode from payload.

**Auth/ownership:** accept/preparing/ready/dispatch depend on provider allocation lookup; basket and insurance methods only load by order ID in visible code and lack explicit provider ownership predicates.

**State transitions:** acceptance uses Redis lock then allocation confirm; basket/insurance are timeline/status side effects; preparing/ready/out-for-delivery delegate allocation state machine.

**Price/payment/insurance source:** basket subtotal/total uses client price fields plus persisted delivery fee; insurance status/copay/NPHIES metadata is client-provided and persisted; no payment/refund logic visible.

**Security/truthfulness observations:** opaque bodies; client-controlled basket prices and copay; submitBasket/evaluateInsurance have no visible provider ownership check; accept lock can remain until TTL after failure; no visible Idempotency-Key or replay claim beyond acceptance lock; courier phone is persisted from body; events swallow bus errors.

**Test implications:** provider owner/stranger/unauth on every action, acceptance lock release/replay, price/copay tampering, basket state/order status validation, insurance role/ownership, allocation transitions, courier metadata validation, and idempotency. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
