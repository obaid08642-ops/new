# Phase 0B semantic evidence — Family group repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/family/repositories/familygroup.repository.ts:1–13`

`FamilyGroupRepository` binds `FamilyGroup.name` to `Model<any>` and extends `MongoRepository<any>` (`family/repositories/familygroup.repository.ts:2–11`). The use of `any` at both repository and model boundaries removes compile-time guarantees for group identity, owner, members, roles and consent. The member contains no group owner/tenant scope, membership projection, invitation/consent state, role/permission invariant, duplicate-member rule, atomic membership mutation, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or protected sharing boundary. Generic inherited operations therefore leave family-group access and member privacy entirely to callers, with no repository-level defense against cross-family disclosure or concurrent membership corruption. No product code was changed and no tests/builds were executed during this semantic read.
