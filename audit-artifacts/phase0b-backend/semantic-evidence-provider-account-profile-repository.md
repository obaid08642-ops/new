# Phase 0B semantic evidence — provideraccountprofile.repository.ts

**Archive member:** `src/modules/provider/services/repositories/provideraccountprofile.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, generic `MongoRepository` and `ProviderProfile`. Lines 8–13 define `ProviderAccountProfileRepository` as a thin subclass of `MongoRepository<ProviderProfile>`, injecting the model by the literal name `ProviderAccountProfile` and delegating to the base constructor.

**Semantic behavior:** no account ownership filter, provider/public projection, field allowlist, PII redaction, version/CAS, soft-delete, tenant boundary, validation, transaction/session support or audit behavior is added here. The literal model name may create a registration/mapping dependency that must be checked against module wiring.

**Security/ownership:** the repository itself does not prove that profile reads/updates are scoped to the authenticated provider or that sensitive profile fields are excluded from public/admin responses. Callers and base repository must provide these controls.

**Truthfulness/financial source:** none visible.

**Test implications:** verify model registration identity, base repository projections and all profile consumers for owner/stranger/unauth, tenant isolation, PII minimization, soft-delete/versioning, concurrent updates and audit. No tests executed during this semantic read.
