# Phase 0B semantic evidence — Maternity profile repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/maternity/repositories/maternityprofile.repository.ts:1–13`

`MaternityProfileRepository` is an injectable typed wrapper around `MongoRepository<MaternityProfileDocument>`, binding `MaternityProfile.name` to `Model<MaternityProfileDocument>` (`maternity/repositories/maternityprofile.repository.ts:2–11`). The member contains no patient owner/tenant scope, pregnancy/clinical consent or purpose policy, family/clinician participant authorization, minimum-necessary projection, sensitive-field redaction, pregnancy-state invariants, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or sharing boundary. Generic inherited operations therefore leave protection of pregnancy and reproductive-health records entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
