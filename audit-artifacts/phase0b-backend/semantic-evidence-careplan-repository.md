# Phase 0B semantic evidence — CarePlan repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/repositories/careplan.repository.ts:1–13`

`CarePlanRepository` is an injectable typed wrapper around `MongoRepository<CarePlan>`, binding `CarePlan.name` to `Model<CarePlan>` (`home-care/repositories/careplan.repository.ts:2–11`). The member defines no care-plan-specific methods or invariants: no patient/clinician/nurse/booking/tenant scope, clinical goal and intervention validation, visit/task linkage, consent or approval boundary, plan versioning/effective dates, guarded active/paused/completed/closed lifecycle, minimum-necessary projection, optimistic concurrency, idempotency, retention/deletion/anonymization or audit/provenance. Generic inherited operations therefore leave the safety, correctness and privacy of home-care clinical plans entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
