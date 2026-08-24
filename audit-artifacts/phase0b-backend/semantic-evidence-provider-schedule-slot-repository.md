# Phase 0B semantic evidence — providerscheduleslot.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerscheduleslot.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderScheduleSlot. Lines 8–13 define an injectable `ProviderScheduleSlotRepository` extending `MongoRepository<ProviderScheduleSlot>` and pass the named model to the superclass.

**Behavioral scope:** No custom slot lookup, provider ownership, active/blocked status, overlap/uniqueness, booking lock, reservation compare-and-set, timezone, or idempotency behavior is defined. These constraints must be enforced by schema/service/database indexes and are not established here.

**Integrity implications:** A generic repository around schedule slots can support duplicate or stale availability and booking races if callers perform read-then-write operations without an atomic conditional update or unique index. It also does not establish least-privilege public projection.

**Test implications:** verify model token resolution, unique provider/time constraints, timezone boundaries, slot state transitions, concurrent reservation/replay, owner/stranger access, and public projection. No tests executed during this semantic read.
