# Phase 0B semantic evidence — Care facility repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/repositories/facility.repository.ts:1–13`

`FacilityRepository` is an injectable typed wrapper around `MongoRepository<FacilityDocument>`, binding `Facility.name` to `Model<FacilityDocument>` (`care/repositories/facility.repository.ts:2–11`). The member defines no facility-specific methods or invariants: no license/registration/readiness/approval gate, owner/tenant scope, geospatial/serviceability validation, linked provider/service verification, public/private projection, privacy redaction, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or publication lifecycle. Generic inherited operations therefore leave facility identity, operational readiness and patient-facing facility facts entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
