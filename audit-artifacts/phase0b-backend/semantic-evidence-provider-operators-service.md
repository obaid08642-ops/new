# Phase 0B semantic evidence — provider-operators.service.ts

**Archive member:** `src/modules/provider/services/provider-operators.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–98; full 98-line member covered.

Lines 2–19 import operator/account/audit schemas and repositories, bcrypt, crypto, role/permission enums and mailer. Lines 21–23 list operators by provider account while projecting out password hash and invite token, but no role assertion is visible in this member. Lines 25–40 validate invite email/role, forbid OWNER invites, reject duplicate provider/email, generate a 32-byte invitation token, filter or default permissions, create an INVITED operator with 72-hour expiry, send an acceptance URL containing token and email, audit and return non-secret fields.

Lines 42–57 accept an invitation by token/email/status, validate only password presence and length, hash the password, set profile/status active, clear invite token/expiry, save, audit and return ID/status/role. Lines 59–70 update a provider-scoped non-owner operator, permit role and permission changes using enum filters, update name/phone, save and audit. Lines 72–80 disable a provider-scoped non-owner operator and record reason/actor. Lines 82–88 enable a scoped operator and clear disable fields without an audit event. Lines 90–97 revoke a scoped non-owner operator and return success without an audit event.

**Security/ownership:** list/invite/update/disable/enable/revoke rely on `user.id` but do not visibly assert provider role or operator-management permission; controller guards are required. Invite acceptance is public by token/email and has no visible rate limit, password composition/MFA, token-attempt tracking or token hash-at-rest. OWNER protection exists for invite/update/disable/revoke but not enable. Operator/account tenant linkage is repository-filter dependent.

**Token/privacy:** raw invite token is embedded in an email URL and stored directly in the operator document until acceptance; logs/referers/browser history may expose it. Email, phone and role are returned/handled without explicit minimization. Password hash is excluded only in list projection; update/accept responses return operator objects or selected fields depending method.

**Integrity/reliability:** invite create and mail send are sequential without transaction/outbox/compensation; a failed mail leaves a live invitation and a repeated call can create/send another after state changes. Enable/revoke have no audit, idempotency, CAS or session invalidation visible. Disable/revoke do not visibly terminate existing operator sessions or tokens. Concurrent updates can overwrite permissions/name/status.

**Permissions/truthfulness:** caller-supplied permissions are filtered to known enum values but there is no role-permission ceiling beyond default assignment on role change, no immutable OWNER boundary for all operations, and no authorization proof that the selected role is permitted for the tenant. Active status indicates operator record state, not identity verification or training/license validity.

**Price/payment/insurance source:** none visible.

**Test implications:** require provider owner/stranger/operator-role/unauth tests, token secrecy/hash/expiry/rate-limit/replay tests, password policy, role-permission matrix and OWNER invariants, invitation outbox/retry, enable/revoke audit/session invalidation, concurrent updates/CAS, PII projection and tenant isolation tests. No tests executed during this semantic read.
