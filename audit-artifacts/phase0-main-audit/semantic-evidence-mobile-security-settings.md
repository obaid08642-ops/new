# Semantic evidence — Mobile Security Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/security.tsx:1–25` is marked `@ts-nocheck` and uses `apiFetch`. It loads `/users/me/security-settings` (`:39–49`) and then performs optimistic PATCHes to the same endpoint for biometric and two-factor switches (`:51–59`), swallowing failures without rollback or visible error. This can leave the UI claiming a changed security setting when the server rejected it.

Password change posts `/users/me/change-password` with current/new password (`:61–82`), shows success and closes the form after a successful response, but the page shows no explicit re-authentication step, idempotency key or password policy/strength validation. Active sessions load `/users/me/sessions` and session revocation deletes `/users/me/sessions/{id}` (`:84–116`); load failures become an empty session list, and the client uses `s.id` while the backend contract names the route parameter `jti`, requiring identifier reconciliation.

The screen exposes device/location/time metadata for sessions (`:273–325`) and has no visible retry for session loading. Security claims, especially 2FA SMS behavior, require backend enforcement and delivery evidence; a toggle alone is not proof.

No Phase 0 remediation was made.
