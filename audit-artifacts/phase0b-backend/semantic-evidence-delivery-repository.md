# Phase 0B semantic evidence — delivery.repository.ts

**Archive member:** `src/modules/orders/repositories/delivery.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and Delivery/DeliveryDocument from the delivery schema. Lines 8–13 define an injectable `DeliveryRepository` extending `MongoRepository<DeliveryDocument>` and pass the named Delivery model to the superclass.

**Behavioral scope:** No custom order/patient/provider/driver ownership predicate, delivery state transition, location validation, assignment/claim CAS, proof-of-delivery, cancellation/refund linkage, idempotency, transaction, projection or audit policy is implemented here. All semantics are inherited or delegated to callers.

**Integrity/security implications:** Generic delivery CRUD does not prevent cross-party reads/writes, invalid or stale location updates, concurrent driver claims, illegal status changes, repeated delivery/cancellation side effects, or exposure of recipient address/phone. These are high-impact order and PII controls that must be enforced above this wrapper.

**Test implications:** verify model/collection mapping, patient/order/provider/driver scope, address redaction, status-transition CAS, geo/time validation, claim/release concurrency, proof-of-delivery integrity, cancel/refund exact-once and audit linkage. No tests executed during this semantic read.
