# Semantic evidence — Mobile Family Permission Request

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/permission-request.tsx:1–10` is marked `@ts-nocheck`; it imports React Native/UI helpers and `showLocalizedAlert`, but no `apiFetch` import is present. The component nevertheless calls `apiFetch` in its effect and submit handler (`:23–25,52–55`). Unless `apiFetch` is globally injected by the build, this is an unresolved runtime/compile contract error that must be verified in the actual mobile build.

The screen reads `requestId` from route params but on a successful pending-list response selects the matching request or silently falls back to the first request when the ID is absent/not found (`:16–18,23–30`). This can display/respond to the wrong permission request. It does not preserve a distinct not-found or stale-request state.

Permissions are mapped from server values, but descriptions are generated locally as `الوصول لبيانات ` plus the raw key and all permissions default to `granted: true` (`:30–37`). The user can toggle them locally, then the response uses `PUT /family/permissions/respond/{id}` with `decision`, empty `note`, and selected keys (`:48–55`). There is no visible idempotency key, version/ETag, step-up authentication, replay handling, confirmation for sensitive scopes, or audit correlation.

Any successful HTTP completion leads to local `responded=true` and a success screen; there is no verification that the server accepted the exact permission semantics or that notification delivery occurred (`:57–64,69–77`). The screen has loading and no-request text but no explicit error state for failed GET, and the generic alert path depends on the undefined/unproven API helper. No Phase 0 remediation was made.
