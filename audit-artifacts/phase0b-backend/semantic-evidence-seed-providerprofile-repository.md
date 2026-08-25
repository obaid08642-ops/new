# Phase 0B semantic evidence — Provider profile seed repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/repositories/providerprofile.repository.ts:1–13`

`ProviderProfileRepository` is an injectable typed wrapper around `MongoRepository<ProviderProfileDocument>`, binding `ProviderProfile.name` to `Model<ProviderProfileDocument>` (`seed/repositories/providerprofile.repository.ts:2–11`). It declares no seed-only capability, production hard stop, credential/license verification boundary, privacy-safe projection, user/facility scope, deterministic reconciliation/uniqueness, approval/publication lifecycle, optimistic versioning, audit/provenance, soft-delete or rollback marker. Generic inherited operations therefore remain the only persistence contract; if reused or rerun against production, seeded provider profiles could be mistaken for verified operational identities or expose private/provider credential fields. The import comment/formatting is non-functional drift. No product code was changed and no tests/builds were executed during this semantic read.
