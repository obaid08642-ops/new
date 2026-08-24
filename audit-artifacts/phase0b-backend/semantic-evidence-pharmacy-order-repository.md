# Phase 0B semantic evidence — pharmacyorder.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacyorder.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyOrder from the Pharmacy schema. Lines 8–13 define an injectable `PharmacyOrderRepository` extending `MongoRepository<PharmacyOrder>` and pass the named PharmacyOrder model to the superclass.

**Behavioral scope:** No custom patient/pharmacy/provider ownership, order state-transition CAS, item/price/currency snapshot, payment/settlement/refund linkage, delivery linkage, inventory reservation, idempotency, transaction, projection or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity/security implications:** Generic pharmacy-order CRUD does not itself prevent cross-patient/pharmacy reads or writes, stale or illegal state changes, duplicate order/payment/stock effects, client-price drift, or exposure of prescription/address/PII fields. The PharmacyOrder model must also be reconciled with Orders-domain Order to avoid divergent order truth.

**Test implications:** verify model/collection mapping, patient/pharmacy/provider scope, immutable item/price/currency snapshots, state CAS, payment/refund and delivery linkage, inventory reservation, exact-once replay, transaction/outbox, least-privilege projection and audit linkage. No tests executed during this semantic read.
