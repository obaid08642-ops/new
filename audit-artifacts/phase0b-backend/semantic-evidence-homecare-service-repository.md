# Phase 0B semantic evidence — Home-care service repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care/repositories/homecareservice.repository.ts:1–13`

`HomeCareServiceRepository` is an injectable typed wrapper around `MongoRepository<HomeCareService>`, binding `HomeCareService.name` to `Model<HomeCareService>` (`home-care/repositories/homecareservice.repository.ts:2–11`). Although typed unlike several neighboring repositories, the member defines no service-specific methods or constraints: no canonical identity/source/provenance, publication/approval/readiness gate, category/specialty allowlist, clinical eligibility, region/serviceability, capacity, price/currency/tax/version, insurance coverage, locale/content review, minimum-necessary projection, optimistic concurrency, idempotency, retention/deletion/anonymization or audit boundary. Generic inherited operations therefore leave catalog truth and patient-facing service claims entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
