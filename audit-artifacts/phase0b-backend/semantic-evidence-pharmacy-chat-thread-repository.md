# Phase 0B semantic evidence — pharmacychatthread.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacychatthread.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyChatThread from the Pharmacy schema. Lines 8–13 define an injectable `PharmacyChatThreadRepository` extending `MongoRepository<PharmacyChatThread>` and pass the named PharmacyChatThread model to the superclass.

**Behavioral scope:** No custom participant membership, patient/pharmacy/provider tenant scope, thread status transition, archive/retention, visibility, projection, message count/last-message consistency, duplicate conversation prevention, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Security/PII implications:** Generic thread CRUD does not itself prevent cross-party conversation reads/writes, unauthorized participant insertion, exposure of patient/pharmacy context, stale archived-thread writes or duplicate thread creation. Consumers must enforce membership and private projection.

**Test implications:** verify model/collection mapping, participant membership and tenant scope, thread creation uniqueness, status/archive/retention, safe projections, message/thread consistency, concurrency, replay/idempotency and audit linkage. No tests executed during this semantic read.
