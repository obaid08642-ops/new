# Phase 5 Backend/Database — authentication and authorization guard gaps

## Confirmed strengths

The shared guard validates JWT signatures, supports HTTP-only admin cookie fallback, normalizes provider role aliases, checks declared roles/permissions and supports reusable ownership decorators. It also blocks guests where `NoGuestsGuard` is applied.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Impersonation continues even when its audit record cannot be written | Guard catches audit-log failure, logs to console and still substitutes the target user. Privileged viewing/action can therefore occur without required audit evidence. | Fail closed on audit persistence failure for impersonation, require reason/case/step-up/short TTL, record start/stop/session scope and alert target/oversight policy as approved. |
| **P1** | Impersonation header has no case/purpose, target-sensitivity, time or action restriction | An admin/super-admin can supply any target ID; no delegated purpose, allowed endpoint set, break-glass context, PHI redaction or session expiry is visible. | Replace header impersonation with server-issued, scoped, expiring impersonation sessions governed by permission/purpose/case, data minimization and immutable audit. |
| **P1** | Admin/super-admin bypass generic ownership checks completely | Ownership decorator skips those roles, with no facility/branch/purpose constraint. This makes every correct Controller decorator insufficient for least-privilege multi-facility data. | Add scope-aware admin/finance/support/facility policies and resource-level branch/tenant filters; audit broad overrides and test cross-facility access denial. |
| **P1** | Client-controlled forwarded IP is trusted without proxy normalization | `x-forwarded-for` is accepted directly for security/audit metadata; without trusted proxy configuration it can be spoofed. | Configure trusted proxy/edge headers, parse verified client IP safely and record proxy chain integrity. |
| **P1** | Token/session revocation and permission freshness are not checked in the guard | Verified JWT payload permissions/roles are trusted until expiration; no session/device revocation, user-status, role-version or forced logout lookup is shown. | Add session ID/version, revoked-token/session checks, active-user/role-version validation and key rotation/expiry policy; integrate device/2FA revocation. |
| **P1** | Public routes accept invalid/expired bearer tokens as anonymous traffic | For a `@Public` handler, invalid token returns true rather than rejecting or clearly discarding token. | Define explicit public-optional-auth behavior: ignore malformed credential only where intentional, never set partial identity, and test endpoints with invalid tokens. |

## Decision

Shared authorization is **P0 FIX/BLOCKED** for privileged impersonation and multi-facility least privilege. Controller-level roles cannot compensate for non-audited impersonation or unscoped admin bypass.
