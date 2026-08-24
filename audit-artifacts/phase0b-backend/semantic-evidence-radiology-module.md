# Phase 0B semantic evidence — radiology.module.ts

**Archive member:** `src/modules/radiology/radiology.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–72; full 72-line member covered.

Lines 2–20 import Mongoose, seed data, two imports of `RadiologyController` under different aliases, `RadiologyOpsService`, provider controller, legacy and center booking schemas, service/machine schemas, User/LabResult/StorageObject schemas, workflow module, repositories, notification listener and reminder cron. Lines 22–44 define `RadiologySeed` as an `OnModuleInit` provider. On boot it counts service documents where `id` is non-null; if count is below the seed length, it loops over `RADIOLOGY_SEED` and performs `$setOnInsert` upserts keyed by `short_code`, assigning a UUID and `active: true` when inserting, logging failures and a final seeded count.

Lines 46–58 import WorkflowEngineModule and register eight models: RadiologyService, legacy RadiologyBooking, RadiologyCenterBooking, RadiologyMachine, LabResult, ProviderNotification, User and StorageObject. Lines 60–70 register `RadiologyController` from `./controllers/radiology.controller`, `RadiologyProviderController`, and `RadiologyPublicController` imported from `./radiology.controller`, plus RadiologyOpsService, notification listener, reminder cron, seed and three repositories; only RadiologyOpsService is exported.

**Wiring/security:** two controllers are registered, one under `controllers/radiology.controller` and one under module-root `radiology.controller`; the current baseline must be checked for route overlap/duplicate prefixes. The module itself applies no class-level guards/interceptors/idempotency. Boot-time seed mutation is active through `OnModuleInit`, with a count-based threshold rather than a versioned migration or explicit environment guard.

**Model split:** both legacy and center booking schemas are registered, matching the service's dual-collection lookup. This creates a cross-model consistency surface; state vocabularies, IDs, ownership and report fields must remain aligned. StorageObject and public/legacy URL fields are both present elsewhere in the module's consumers.

**Truthfulness/data source:** the seed operation can insert source-controlled catalog entries when the count is below seed length. This is not evidence of live licensing, provider availability, current price, medical approval or catalog freshness. Failure logging does not show rollback or deployment blocking; partial seed completion is possible.

**Operational behavior:** listener and cron are registered as providers, but this member does not prove their schedules, idempotency, locking, or failure handling. Repositories are thin wiring providers and do not add policy in this module.

**Price/payment/insurance source:** no direct computation; seed and schemas/services may supply catalog and booking commercial fields, but this module has no ledger/payment/insurance verification.

**Test implications:** require module integration tests for duplicate/overlapping routes, intended controller/model mapping, environment-safe seed behavior, partial seed failure, concurrent boot, dual booking schema consistency, listener/cron registration and failure/retry semantics, and guard/interceptor coverage. No tests executed during this semantic read.
