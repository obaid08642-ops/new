# Phase 0B semantic evidence — provideraccount.repository.ts

**Archive member:** `src/modules/provider/services/repositories/provideraccount.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, generic `MongoRepository` and the `ProviderAccount` schema. Lines 8–13 define `ProviderAccountRepository` as a thin subclass of `MongoRepository<ProviderAccount>` and pass the injected model to the base constructor.

**Semantic behavior:** no provider-account filters, status policy, password/credential projection, email normalization, tenant boundary, soft delete, version/CAS, transaction/session support or audit behavior is added here. All behavior is inherited from the base repository and callers.

**Security/ownership:** this member does not prove that account lookups in ProviderAuthService or ProviderAdminService are safely scoped, that password hashes are excluded by default, or that status/credential updates are authorized. Callers frequently request account records directly and must be audited separately.

**Truthfulness/financial source:** none visible.

**Test implications:** verify base repository and all account consumers for secret projection, status/tenant scoping, email normalization, lockout atomicity, versioning, soft delete, authorization and audit. No tests executed during this semantic read.
