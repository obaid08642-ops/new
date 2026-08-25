# Phase 0B semantic evidence — Lab service seed repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/repositories/labservice.repository.ts:1–13`

`LabServiceRepository` is an injectable wrapper around `MongoRepository<LabService>`, binding `LabService.name` to `Model<LabService>` (`seed/repositories/labservice.repository.ts:2–11`). The model is typed as the schema class rather than an explicit document type, and the wrapper defines no seed-only capability, production hard stop, source snapshot/version, deterministic reconciliation key, duplicate/idempotency policy, approved/public readiness, facility scope, operational availability/booking eligibility, server-authoritative price separation, soft-delete, optimistic concurrency, audit/provenance or rollback marker. Generic inherited persistence is therefore the only contract; if reused or rerun in production, seeded services can mix with operational catalog truth without a boundary visible in this member. The import comment/formatting is non-functional drift. No product code was changed and no tests/builds were executed during this semantic read.
