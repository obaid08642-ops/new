# Phase 8 — Batch D: privileged JWT and impersonation integrity

## Purpose

The legacy `x-impersonate-user-id` path enabled a privileged request to replace its request identity based only on a caller-supplied target identifier. Its audit write was best-effort: audit persistence failure was logged but the impersonation still proceeded. That lacks a case, purpose, target scope, approval, duration, revocation model and fail-closed audit boundary.

## Source change

| Surface | Implemented control |
|---|---|
| Header-based impersonation | The legacy `x-impersonate-user-id` path is now rejected for every actor with `impersonation_session_required`. It no longer looks up target users, writes a best-effort audit record, or substitutes `req.user`. |
| Audit source address | The guard records `req.ip`, which is processed through Express’s configured trusted-proxy policy, rather than directly trusting caller-supplied `X-Forwarded-For`. |
| Privilege model | Existing effective-role normalization remains at the guard boundary. A future impersonation feature must be a separately approved server-side session/case contract with purpose, step-up, target scope, expiry, revocation and durable audit persistence. It must not restore the header shortcut. |

## Verification

| Gate | Result |
|---|---|
| Focused JWT guard regression | **PASS** — `auth.guard.spec.ts`: 1 suite, 13 tests. The former successful admin-header impersonation test is replaced by an explicit fail-closed rejection test with no database lookup/audit attempt. |
| Combined Phase 8 regressions | **PASS** — 4 suites, 32 tests across public discovery, Realtime, payment and JWT controls. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt `nabdah-backend.zip` validates with `unzip -tq`; dependency/build artifacts are excluded. |
| Source archive SHA-256 | `ac4ac68d90d0f16606d6622acd24bdca6c0a9a20eb7e24766b0da065e0d0f217` |
| Branch upload | **PASS** — source commit `aeb6062` (`fix: fail closed legacy impersonation`) is on `manus/on-live-reconciliation`. |

## Remaining acceptance

The platform currently has **no enabled impersonation mechanism**, intentionally. This is safer than retaining ungoverned access. If product/legal governance approves impersonation later, it must be specified, implemented and negatively tested as a time-limited server-owned session. Phase 11 will confirm that header attempts against a deployed sandbox instance are rejected and never produce a target-user response or audit-success claim.
