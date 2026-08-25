# Phase 0B semantic evidence — Family permission request repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/family/repositories/familypermissionrequest.repository.ts:1–13`

`FamilyPermissionRequestRepository` binds `FamilyPermissionRequest.name` to `Model<any>` and extends `MongoRepository<any>` (`family/repositories/familypermissionrequest.repository.ts:2–11`). The use of `any` removes compile-time guarantees for requestor, recipient, family group, requested scope, consent, status and expiry. The member contains no requestor/recipient/group/tenant scope, scope allowlist, consent/purpose rule, request state machine, expiry/revocation lifecycle, duplicate pending-request invariant, atomic accept/reject operation, optimistic concurrency, idempotency, retention/deletion/anonymization, audit/provenance or minimum-necessary projection. Generic inherited operations therefore leave authorization and family-health sharing safety entirely to callers. No product code was changed and no tests/builds were executed during this semantic read.
