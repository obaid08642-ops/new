# Phase 0B semantic evidence — providersession.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providersession.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–12; full 12-line member covered.

Lines 2–5 import Nest Mongoose, `Model`, the `ProviderSession` schema and generic `MongoRepository`. Lines 7–12 define `ProviderSessionRepository` as a thin subclass of `MongoRepository<ProviderSession>` and pass the injected model to the base constructor.

**Semantic behavior:** no session lookup policy, provider/account scoping, refresh-token hash handling, device binding, expiry enforcement, revocation family, rotation CAS, reuse detection, pagination, projection or transaction/session support is added here. All effective behavior is inherited from the base repository and callers.

**Security/ownership:** this member does not prove that ProviderAuthService session operations are actor-bound or tenant-scoped. In particular, repository availability does not guarantee that logout/refresh cannot act on another provider's session ID.

**Truthfulness/financial source:** none visible.

**Test implications:** verify the base repository and ProviderAuthService integration for provider/session ownership, refresh rotation races, token hash projection, expiry/revocation predicates, device binding, replay/reuse detection, logout authorization and audit. No tests executed during this semantic read.
