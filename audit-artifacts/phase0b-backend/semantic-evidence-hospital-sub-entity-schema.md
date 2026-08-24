# Phase 0B semantic evidence — hospital-sub-entity.schema.ts

**Archive member:** `src/modules/providers/schemas/hospital-sub-entity.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–29; full 29-line member covered.

Lines 4–7 define the document type and timestamped `HospitalSubEntity` model. Lines 8–12 require and index `parent_hospital_id` (ProviderProfile reference) and `assigned_branch_id` (ProviderBranch reference), establishing enterprise and branch placement.

Lines 14–15 require, uniquely index, and reference `sub_entity_user_id` (User), described as the credential account. Lines 17–21 require `entity_type` from five values: internal pharmacy, internal lab, internal radiology, branch doctor, or receptionist. Lines 23–24 default `is_active` to true. Lines 26–27 default `custom_branch_permissions` to an empty string array and describe it as fine-grained grants. Line 29 creates the schema.

**Ownership/access model:** The document links a user to a parent hospital profile and branch, but does not encode an explicit tenant key, role authority source, permission enum/schema, grant expiry, approver, or immutable audit trail. `custom_branch_permissions` is a free-form string array; effective authorization must therefore be strictly allowlisted and evaluated server-side. `is_active` alone does not establish immediate session revocation.

**Integrity risks:** Required references are not visibly validated for compatible enterprise/branch ancestry; a document could potentially connect a branch from another hospital unless service-level checks or database constraints prevent it. Unique `sub_entity_user_id` prevents one user from having multiple sub-entities globally, which may or may not match business requirements. No compound unique constraint for parent+branch+entity type, no soft-delete timestamps, and no index on active/permission query patterns are visible.

**Security:** The model creates a high-impact staff delegation surface. If custom permission values are trusted or if parent/branch relationships are not checked on every request, cross-tenant access and privilege escalation are possible. Deactivating the record does not by itself revoke already-issued JWTs.

**Test implications:** require cross-tenant parent/branch mismatch tests, unique-user behavior tests, entity-type allowlist tests, permission allowlist and deny-by-default tests, inactive-session revocation, staff owner/stranger/unauth matrix, compound/index tests and audit coverage. No tests executed during this semantic read.
