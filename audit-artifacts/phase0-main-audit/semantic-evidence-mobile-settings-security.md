# Semantic evidence — Mobile Settings Security

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/security.tsx:31–49` initializes biometric as `true` and two-factor as `false`, then reads `/users/me/security-settings`; GET failure is swallowed, so local defaults may be shown as the account’s actual security posture. There is no loading/error/stale state, device capability check, SecureStore/biometric enrollment proof, or explanation of fallback behavior.

Both biometric and 2FA toggles optimistically update local state and send `PATCH /users/me/security-settings` (`:51–59`) without visible Idempotency-Key, rollback, version/conflict handling, retry, device registration, step-up/re-authentication, recovery codes, factor enrollment/verification, or proof that the server enforces the safety policy. A failed mutation leaves a false local state. The claim that 2FA uses SMS at every login (`:169–186`) is not contractually verified.

Password change posts current/new passwords to `/users/me/change-password` (`:61–81`) and checks only equality of new and confirmation. There is no client-side policy/length/breach/strength validation, rate-limit/lockout UX, re-authentication/session revocation policy, Idempotency-Key, password visibility toggle behavior, or post-change session/token invalidation proof. The action has a loading flag but no retry or unknown-outcome handling.

Sessions read `/users/me/sessions` (`:84–95`) and failure becomes an empty list. Revoke calls `DELETE /users/me/sessions/{id}` (`:97–115`) without visible Idempotency-Key, ownership/active-session invariant, confirmation of server deletion, refresh, pagination, or per-response schema validation. Rows use index keys and display raw device/location/time, which may expose sensitive metadata without formatting/privacy policy (`:273–326`). No Phase 0 remediation was made.
