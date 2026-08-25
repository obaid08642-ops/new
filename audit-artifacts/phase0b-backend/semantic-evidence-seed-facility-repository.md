# Phase 0B semantic evidence — Facility seed repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/repositories/facility.repository.ts:1–13`

`FacilityRepository` is an injectable typed wrapper around `MongoRepository<FacilityDocument>`, binding `Facility.name` to `Model<FacilityDocument>` (`seed/repositories/facility.repository.ts:2–11`). The wrapper defines no seed-only capability, production hard stop, source snapshot/version, deterministic reconciliation/uniqueness, license/approval readiness, tenant/territory scope, operational status, public projection, soft-delete, optimistic concurrency, audit/provenance or rollback boundary. Generic inherited operations are therefore the only persistence contract; if reused or rerun against production, seeded facility facts can mix with licensed operational records without a boundary visible in this member. The import comment/formatting is non-functional drift. No product code was changed and no tests/builds were executed during this semantic read.
