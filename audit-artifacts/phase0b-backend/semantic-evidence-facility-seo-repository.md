# Phase 0B semantic evidence — Facility SEO repository wrapper

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seo/repositories/facility.repository.ts:1–13`

`FacilityRepository` binds `Facility.name` to a Mongoose model but extends `MongoRepository<any>` and injects `Model<any>` (`facility.repository.ts:8–11`). The wrapper defines no typed schema contract, licensed/approved/public filter, operational-status or service-availability gate, location/coverage projection, safe public field projection, locale handling, canonical slug/SEO metadata validation, structured-data parity, soft-delete/404/410 lifecycle, versioning, audit or tenant/role scope (`8–13`). Public/index-facing facility facts therefore depend on callers and generic inherited behavior, with no repository-level protection against exposing unlicensed/closed facilities, stale locations or internal operational data. No product code was changed and no tests/builds were executed during this semantic read.
