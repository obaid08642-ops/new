# Phase 0B semantic evidence — provideroperator.repository.ts

**Archive member:** `src/modules/provider/services/repositories/provideroperator.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderOperator. Lines 8–13 define an injectable `ProviderOperatorRepository` extending `MongoRepository<ProviderOperator>` and pass the named model to the superclass.

**Behavioral scope:** No custom parent-provider ownership, role/permission allowlist, invitation/activation/revocation, expiry, actor audit, tenant scope, projection, transaction or idempotency behavior is implemented here. All semantics are inherited or delegated to callers.

**Security implications:** Operator records are a high-impact delegation surface. Generic CRUD does not itself prevent cross-provider operator access, privilege escalation, stale active operators, or assignment of permissions outside an allowlist. Deactivation may not revoke existing sessions unless consumers explicitly enforce it.

**Test implications:** verify model token resolution, parent-provider/tenant binding, role and permission allowlists, activation/revocation/session invalidation, self-approval/separation, duplicate operator prevention, projections and audit linkage. No tests executed during this semantic read.
