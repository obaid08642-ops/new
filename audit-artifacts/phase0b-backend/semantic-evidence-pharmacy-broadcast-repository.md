# Phase 0B semantic evidence — pharmacybroadcast.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacybroadcast.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyBroadcast from the Pharmacy schema. Lines 8–13 define an injectable `PharmacyBroadcastRepository` extending `MongoRepository<PharmacyBroadcast>` and pass the named PharmacyBroadcast model to the superclass.

**Behavioral scope:** No custom recipient/provider/pharmacy/tenant scope, broadcast audience validation, delivery attempt state, read state, expiry, deduplication, retry, transaction, idempotency, projection or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Security/integrity implications:** Generic broadcast CRUD does not itself prevent cross-tenant message reads, unauthorized audience expansion, duplicate delivery, stale notices or exposure of pharmacy/order/PII data. A broadcast pipeline also requires bounded payloads and durable delivery semantics beyond this wrapper.

**Test implications:** verify model/collection mapping, audience/tenant ownership, payload size/content validation, expiry, per-recipient delivery/read state, deduplication/retry, exact-once side effects, redaction and audit linkage. No tests executed during this semantic read.
