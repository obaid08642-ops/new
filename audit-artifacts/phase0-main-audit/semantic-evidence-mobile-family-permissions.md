# Semantic evidence — Mobile Family Permissions

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/permissions.tsx:1–25` is marked `@ts-nocheck` and uses `apiFetch`, `showLocalizedAlert`, and route params. The screen defines nine permissions covering vitals, medication, reports, appointments, booking on behalf, pharmacy ordering, proxy payment, location and emergency notifications (`:27–99`). These are high-impact health, commerce, payment and location scopes.

The member identifier is read directly from `params.id`; name/relation also come from route params with fallbacks (`:101–110`). Current permissions are loaded by fetching `/family/my-group` and searching `group.members` locally (`:115–130`). Load failure logs to console and keeps default-disabled switches; it does not distinguish unavailable from no grants or prove member ownership/role.

Switches update local state immediately (`:132–138`). Save first attempts `PATCH /family/member/{memberId}/permissions` with the full active key set; on any error, including network/server errors, it falls back to `POST /family/permissions/request` (`:140–160`). This conflates authorization failure with transport/contract failure and could submit an approval request after a failed owner mutation. Neither request shows an `Idempotency-Key`, confirmation nonce, re-authentication, version/ETag or audit reference.

The UI reports success and says a request was sent regardless of whether the owner PATCH or approval POST was actually semantically accepted (`:162–170,326–370`). Removing a member uses `DELETE /family/remove-member/{memberId}` after a confirmation alert, but on failure it logs the error and still navigates back (`:174–199`), creating a false-success/hidden-failure path with no idempotency or recovery.

The permission labels include proxy booking, pharmacy ordering, proxy payment and location-at-emergency claims (`:65–97`) that require explicit consent, role, financial authorization, emergency policy and audit evidence. No Phase 0 remediation was made.
