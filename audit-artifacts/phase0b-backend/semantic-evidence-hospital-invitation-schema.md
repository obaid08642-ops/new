# Phase 0B semantic evidence — HospitalInvitation schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/hospital/schemas/hospital-invitation.schema.ts:1–37`

The schema models a facility-to-provider invitation in collection `facility_invitations` with timestamps and a generated UUID-like business `id` (`7–15,37`). It stores required string `facility_id` and `invitee_id`, an optional raw `invitee_identifier`, a free string `role` defaulting to doctor, an object-valued boolean permission map defaulting to `{}`, a four-value status enum defaulting to pending, and optional `responded_at` (`17–34`). Comments describe acceptance creating a HospitalStaff link, but comments do not enforce that side effect.

The schema does not declare uniqueness/idempotency for an active facility→invitee→role invitation, nonce/token, expiry, cancellation actor, acceptance actor or invitation version. It has no TTL/expiration field, so pending invitations may remain valid indefinitely unless service code applies a hidden policy (`31–34`). `invitee_identifier` may retain phone/email/raw identifiers without hashing, normalization, masking or retention policy (`23–24`).

`role` is unconstrained beyond a default string and `permissions` is an open Object type despite the comment claiming whitelisted keys (`26–29`). There is no schema-level capability allowlist, least-privilege check, facility/provider-type validation, or proof that the invitee belongs to the intended account. The `facility_id`/`invitee_id` strings use a business-ID convention distinct from hospital schemas' ObjectId fields, creating an identifier-boundary risk that callers must normalize deliberately (`18,21`).

Status enum values exist, but transition actor, reason, timestamps for rejection/cancellation, optimistic concurrency and replay protection are absent (`31–34`). The schema does not enforce that accepted invitations produce exactly one staff membership or that repeated accept/retry is harmless. No code was changed and no build/test/database operation was performed during this read.
