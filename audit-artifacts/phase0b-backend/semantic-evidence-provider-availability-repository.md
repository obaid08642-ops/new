# Phase 0B semantic evidence — provideravailability.repository.ts

**Archive member:** `src/modules/provider/services/repositories/provideravailability.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–15; full 15-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderAvailability from the request schemas. Lines 8–8 define the local document type as ProviderAvailability plus a Mongoose Document. Lines 10–15 define an injectable repository extending `MongoRepository<ProviderAvailabilityDocument>` and pass the named ProviderAvailability model to the superclass.

**Behavioral scope:** No custom provider ownership, status-transition, heartbeat, expiry/staleness, compare-and-set, multi-device conflict, tenant, projection, audit, or idempotency behavior is implemented here. All availability semantics are inherited or delegated to callers.

**Integrity implications:** A generic CRUD wrapper around a unique provider availability record does not itself guarantee one authoritative state, monotonic transitions, stale-client protection or automatic offline expiry. Read-then-write callers may overwrite a newer device/session state.

**Test implications:** verify model token resolution, provider/tenant binding, status transition policy, heartbeat/expiry, concurrent device updates, replay/idempotency, and public projection. No tests executed during this semantic read.
