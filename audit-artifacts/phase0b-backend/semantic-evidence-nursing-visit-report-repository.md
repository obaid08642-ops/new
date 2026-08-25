# Phase 0B semantic evidence — Nursing visit report repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/repositories/nursingvisitreport.repository.ts:1–13`

`NursingVisitReportRepository` is an injectable typed wrapper around `MongoRepository<NursingVisitReport>`, binding `NursingVisitReport.name` to `Model<NursingVisitReport>` (`home-care/repositories/nursingvisitreport.repository.ts:2–11`). The member contains no visit/booking/patient/nurse/tenant scope, minimum-necessary projection, clinical-field validation, vital-sign bounds, attachment/source provenance, draft/sign/finalize/lock lifecycle, amendment policy, optimistic concurrency, idempotency, retention/deletion/anonymization, audit or role/purpose boundary. Generic inherited operations therefore leave the correctness, immutability and protection of home-nursing clinical reports entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
