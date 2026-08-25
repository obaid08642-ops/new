# Phase 0B semantic evidence — care ProviderProfile repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/repositories/providerprofile.repository.ts:1–13`

The member declares an injectable `ProviderProfileRepository` extending the generic `MongoRepository<ProviderProfileDocument>` and injects the Mongoose model for `ProviderProfile` (`1–12`). It contains no repository-specific methods, filters, projections, active/published/public eligibility constraints, branch scope, ownership predicate, pagination, sort, field minimization, transaction/session handling, optimistic concurrency, or error translation. Those policies therefore cannot be attributed to this member; they must be proven in the generic repository and calling service/controller layers.

The import contains a comment `Ensure correct import` and extra spacing in the named import (`5–6`), which is hygiene only and not itself a security defect. The repository delegates all behavior to the generic base (`9–12`), so the key audit risk is architectural: a generic base can be reused for public/discovery and private/owned provider contexts unless callers impose explicit policy. No code was changed, no build/test/database query was run and no product behavior was modified during this semantic read.
