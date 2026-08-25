# Phase 0B semantic evidence — Home-care SEO repository wrapper

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seo/repositories/homecareservice.repository.ts:1–13`

`HomeCareServiceRepository` binds `HomeCareService.name` to an injected Mongoose model but extends `MongoRepository<any>` and injects `Model<any>` (`homecareservice.repository.ts:2–12`). The wrapper has no typed document contract, approved/public service filter, provider/coverage-area scope, server-authoritative price/availability rule, locale projection, service safety/credential readiness gate, canonical slug/SEO metadata validation, soft-delete or 404/410 lifecycle, versioning, audit, or role-specific redaction. These invariants are entirely delegated to callers/generic inherited methods. The import comment/formatting is non-functional drift. No product code was changed and no tests/builds were executed during this semantic read.
