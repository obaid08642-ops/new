# Phase 0B semantic evidence — order.repository.ts

**Archive member:** `src/modules/orders/repositories/order.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and Order/OrderDocument. Lines 8–13 define an injectable `OrderRepository` extending `MongoRepository<OrderDocument>` and pass the named Order model to the superclass.

**Behavioral scope:** No custom patient/provider/pharmacy ownership predicate, public/private projection, state-transition CAS, idempotency, payment/settlement/refund linkage, inventory reservation, order event/outbox, transaction or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity/security implications:** A generic CRUD wrapper for orders does not itself prevent cross-patient/provider reads or writes, illegal financial transitions, duplicate order creation, repeated payment/stock effects, or exposure of delivery/prescription/PII fields. Consumers must enforce authenticated ownership and server-authoritative order/payment state.

**Test implications:** verify model token resolution, patient/provider/pharmacy scope, least-privilege projections, state CAS, idempotent creation/payment/cancellation, inventory/order transactionality, refund/settlement provenance, event/outbox delivery and audit linkage. No tests executed during this semantic read.
