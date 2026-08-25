# Phase 0B semantic evidence — Users

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/users/users.service.ts:2–359`
- `src/modules/users/users.controller.ts:2–117`
- `src/modules/users/data-retention.service.ts:2–42`
- `src/modules/users/users.addresses.controller.ts:2–59`
- `src/modules/users/users.insurance.controller.ts:2–81`
- `src/modules/users/user.insurance.controller.ts:2–47`

## Semantic read

`users.service.ts:26–58` implements wishlist and patient profile creation/aliasing; wishlist toggles are read/modify/write and add an id-only item without verifying the referenced product. `:60–135` creates health IDs and returns bounded display data, accepts a whitelist for one web profile update, verifies owned storage avatar URLs and updates User plus PatientProfile in separate writes. `:138–157` has a broader profile editable whitelist including phone/email/national_id/notes/emergency/addresses but passes values with limited field-level validation and uses a separate upsert. `:161–233` normalizes notification settings, but `:273–283` stores privacy/security settings through generic `setSetting` with no equivalent strict allowlist. `:235–270` computes storage from base64 fields but uses a hard-coded 5 GB limit and converts aggregation failures to zero.

`:286–300` changes password by comparing current hash when present and writing a new bcrypt hash, but no explicit re-auth/session revocation/idempotency is shown. `:302–332` enumerates/revokes Redis refresh sessions, returning an empty list on Redis failure and revoking only after set membership, with no visible audit event or token rotation. `:334–357` toggles/deletes other users for admin callers in service methods; deletion audits before deleting only the User document and the retention worker later deletes User records only.

`users.controller.ts:7–37` exposes patient display/profile routes with raw `body:any`; only service allowlists some fields. `:39–47` wishlist mutation has no idempotency or referenced-item validation. `:50–84` exposes notification/privacy/security settings; only notification update has `@RequireIdempotency`, while privacy/security use arbitrary body via generic setSetting. `:86–99` password change has no idempotency marker; session revoke does. `:100–117` admin list/toggle/delete are role protected, but list accepts raw search and toggle/delete have no idempotency or explicit confirmation/re-auth.

`users.addresses.controller.ts:11–57` reads addresses, creates by spreading raw body after a generated id, manually rewrites all defaults, updates by raw merge and returns `null` when missing, and deletes by full-array read/filter/write while always returning success. No DTO/idempotency/coordinate/field bounds/optimistic concurrency or explicit 404 is present.

`users.insurance.controller.ts:15–81` defines a canonical insurance object with `additionalProperties:true`; GET returns profile.insurance and POST merges raw body, resets verified=false and calls `updatePatientProfile({ insurance })`. The service editable whitelist shown above does not include `insurance`, so the controller can return an updated object without persisting it. Sensitive fields include national_id/pdf_url/policy identifiers. `user.insurance.controller.ts:21–46` is a deprecated legacy `GET /user/insurance` reading `insurance_policies[]`, creating a second incompatible shape alongside canonical `/users/me/insurance` and normalized `/insurance/active`.

`data-retention.service.ts:15–40` claims to delete associated PII after configurable days but only runs `User.deleteMany({deleted_at <= cutoff})`; it does not delete PatientProfile, ProviderProfile, refresh/session, media, medical, insurance or audit-linked data in this member, and catches/logs failures without alert/escalation.

## Findings candidates

The read supports: generic privacy/security setting mass assignment, password/session lifecycle gaps, address raw merge/race/false-success behavior, wishlist unverified identifiers, canonical insurance persistence mismatch and legacy duplicate route, retention incompleteness, raw profile PII edits and split user/profile updates, and Redis failure being represented as an empty session list.

No product code was changed and no tests/builds were executed during this semantic read.
