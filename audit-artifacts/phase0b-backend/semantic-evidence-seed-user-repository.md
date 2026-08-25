# Phase 0B semantic evidence — User seed repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/repositories/user.repository.ts:1–13`

`UserRepository` is an injectable typed wrapper around `MongoRepository<UserDocument>`, binding `User.name` to `Model<UserDocument>` (`seed/repositories/user.repository.ts:2–11`). The wrapper itself defines no seed-only capability, production hard stop, environment allowlist, deterministic reconciliation key, uniqueness/idempotency policy, password/credential redaction, role/tenant scope, publication/activation lifecycle, audit/provenance, versioning or rollback boundary. Because the entity is the identity root, generic inherited operations are especially sensitive: if reachable outside controlled bootstrap code they can read or write PII, roles or authentication material without a repository-level safe projection or actor policy. The import comment/formatting is non-functional drift. No product code was changed and no tests/builds were executed during this semantic read.
