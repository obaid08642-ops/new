# Phase 0B semantic evidence — Crisis contact repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/mental-health/repositories/crisiscontact.repository.ts:1–13`

`CrisisContactRepository` is an injectable typed wrapper around `MongoRepository<CrisisContactDocument>`, binding `CrisisContact.name` to `Model<CrisisContactDocument>` (`mental-health/repositories/crisiscontact.repository.ts:2–11`). The member contains no patient owner/tenant scope, consent or relationship policy, emergency-purpose access rule, contact identity/phone verification, minimum-necessary projection, redaction, duplicate/primary-contact invariant, optimistic concurrency, retention/deletion/anonymization, audit/provenance or notification-safety boundary. Generic inherited operations therefore leave protection of crisis-contact PII and emergency data entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
