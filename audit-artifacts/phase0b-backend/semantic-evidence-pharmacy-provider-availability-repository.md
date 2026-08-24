# Phase 0B semantic evidence — pharmacy provideravailability.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/provideravailability.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–15; full 15-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderAvailability from the Provider request schemas. Lines 8–8 define a local document type as ProviderAvailability plus a Mongoose Document. Lines 10–15 define an injectable repository extending `MongoRepository<ProviderAvailabilityDocument>` and pass the named ProviderAvailability model to the superclass.

**Behavioral scope:** No custom provider/pharmacy ownership, status transition, heartbeat, expiry/staleness, compare-and-set, multi-device conflict, tenant, projection, audit or idempotency behavior is implemented here. All availability semantics are inherited or delegated to callers.

**Integrity implications:** A Pharmacy generic availability wrapper does not itself ensure one authoritative status, stale-client protection, automatic offline expiry or correct provider identity. Concurrent devices or workers may overwrite state if callers use read-then-write operations.

**Test implications:** verify model/collection mapping, provider/pharmacy tenant binding, status allowlist/CAS, heartbeat and stale expiry, concurrent device updates, replay/idempotency and safe public projection. No tests executed during this semantic read.
