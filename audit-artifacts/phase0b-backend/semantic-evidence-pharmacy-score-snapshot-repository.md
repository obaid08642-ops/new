# Phase 0B semantic evidence — pharmacy providerscoresnapshot.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/providerscoresnapshot.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderScoreSnapshot from the Provider capability schemas. Lines 8–13 define an injectable `ProviderScoreSnapshotRepository` extending `MongoRepository<ProviderScoreSnapshot>` and pass the named model to the superclass.

**Behavioral scope:** No custom provider/pharmacy ownership, KPI calculation window, algorithm/version provenance, immutable historical snapshot, bounds, atomic aggregation, uniqueness beyond schema, projection, transaction or audit behavior is implemented here. All semantics are delegated to callers/schema/database.

**Integrity implications:** Pharmacy consumers may rely on KPI snapshots for routing or trust decisions. Generic CRUD does not ensure rates/scores are bounded and nonnegative, tied to a defined period/algorithm, updated atomically, or protected from cross-provider reads/writes and later mutation.

**Test implications:** verify model/collection mapping, provider/pharmacy tenant scope, KPI bounds, calculation window/version/source events, atomic updates, duplicate prevention, immutable history, projections and audit linkage. No tests executed during this semantic read.
