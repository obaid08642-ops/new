# Phase 0B semantic evidence — Care user repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/repositories/user.repository.ts:1–13`

`UserRepository` is an injectable typed wrapper around `MongoRepository<UserDocument>`, binding `User.name` to `Model<UserDocument>` (`care/repositories/user.repository.ts:2–11`). The member defines no user-specific methods or safe projections: no password/token/credential exclusion, patient/provider/tenant scope, role/permission boundary, account-status lifecycle, identity verification, consent, minimum-necessary profile projection, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or authentication-sensitive mutation boundary. Generic inherited operations therefore leave the protection and correctness of user records entirely to callers, including callers inside care workflows. No product code was changed and no tests/builds were executed during this semantic read.
