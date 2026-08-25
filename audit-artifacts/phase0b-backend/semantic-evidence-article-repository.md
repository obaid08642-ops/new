# Phase 0B semantic evidence — Article SEO repository wrapper

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seo/repositories/article.repository.ts:1–12`

`ArticleRepository` injects the Mongoose model under `Article.name`, but extends `MongoRepository<any>` and injects `Model<any>` rather than a typed `ArticleDocument` (`article.repository.ts:2–10`). This removes compile-time schema guarantees at the repository boundary. The wrapper declares no publication-status filter, body-readiness check, canonical/slug uniqueness policy, locale availability, SEO metadata validation, indexing lifecycle, soft-delete/410 behavior, tenant/author scope, safe projection, versioning or audit trail (`7–12`). All such invariants are delegated to callers or the generic repository. No product code was changed and no tests/builds were executed during this semantic read.
