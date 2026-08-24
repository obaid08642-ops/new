# Semantic evidence — Backend user/settings contracts

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:7–117` is globally JWT guarded. It exposes patient display/profile/health-id/wishlist reads and mutations, notification settings GET/PATCH, storage/privacy/security reads, password change, sessions read/revoke, plus Admin user list/toggle/delete.

Exact relevant routes:

| Method | Path | Guard/idempotency evidence |
|---|---|---|
| GET | `/users/me/notification-settings` | JWT guard; no route-level DTO shown |
| PATCH | `/users/me/notification-settings` | JWT; `@RequireIdempotency()` |
| GET | `/users/me/storage` | JWT |
| GET/PATCH | `/users/me/privacy-settings` | JWT; PATCH has no visible `@RequireIdempotency()` |
| GET/PATCH | `/users/me/security-settings` | JWT; PATCH has no visible `@RequireIdempotency()` |
| POST | `/users/me/change-password` | JWT; no visible `@RequireIdempotency()` or re-auth annotation |
| GET | `/users/me/sessions` | JWT |
| DELETE | `/users/me/sessions/:jti` | JWT; `@RequireIdempotency()` |

The controller uses `body: any` for settings/profile/password mutations (`:19–21,34–36,55–58,71–73,81–88`) rather than explicit DTO classes in the read source. This does not prove that service validation is absent, but it is a contract/type trace gap. It also establishes that backend mutations exist even though Patient Web Settings is explicitly read-only and Mobile Settings exposes navigation to privacy/security/notification screens.

## Reconciliation consequence

The Web/Mobile read-only boundary is a product/launch decision, not evidence that backend mutations do not exist. Before enabling them, verify DTO validation, field allowlists, re-authentication for password/security changes, idempotency consistency, session ownership, audit events, and owner/stranger/unauth behavior.

No Phase 0 remediation was made.
