# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_D_PRIVILEGED_JWT_IMPERSONATION_20260819.md`
- **Member SHA-256:** `8a4a93368a5e14c2a58071db87f8c7b8eb2a368ee982f5c34268b41c7836b9d6`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: | Branch upload | **PASS** — source commit `aeb6062` (`fix: fail closed legacy impersonation`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | Header-based impersonation | The legacy `x-impersonate-user-id` path is now rejected for every actor with `impersonation_session_required`. It no longer looks up target users, writes a best-effort audit record, or substitutes `req.user`. `
- `13: | Privilege model | Existing effective-role normalization remains at the guard boundary. A future impersonation feature must be a separately approved server-side session/case contract with purpose, step-up, target scope, expiry, revocation `
- `19: | Focused JWT guard regression | **PASS** — `auth.guard.spec.ts`: 1 suite, 13 tests. The former successful admin-header impersonation test is replaced by an explicit fail-closed rejection test with no database lookup/audit attempt. |`
- `28: The platform currently has **no enabled impersonation mechanism**, intentionally. This is safer than retaining ungoverned access. If product/legal governance approves impersonation later, it must be specified, implemented and negatively tes`
### state_transitions
- `11: | Header-based impersonation | The legacy `x-impersonate-user-id` path is now rejected for every actor with `impersonation_session_required`. It no longer looks up target users, writes a best-effort audit record, or substitutes `req.user`. `
- `13: | Privilege model | Existing effective-role normalization remains at the guard boundary. A future impersonation feature must be a separately approved server-side session/case contract with purpose, step-up, target scope, expiry, revocation `
- `19: | Focused JWT guard regression | **PASS** — `auth.guard.spec.ts`: 1 suite, 13 tests. The former successful admin-header impersonation test is replaced by an explicit fail-closed rejection test with no database lookup/audit attempt. |`
- `28: The platform currently has **no enabled impersonation mechanism**, intentionally. This is safer than retaining ungoverned access. If product/legal governance approves impersonation later, it must be specified, implemented and negatively tes`
### payment_insurance_relevance
- `20: | Combined Phase 8 regressions | **PASS** — 4 suites, 32 tests across public discovery, Realtime, payment and JWT controls. |`
### error_empty_loading_retry_cancel
- `19: | Focused JWT guard regression | **PASS** — `auth.guard.spec.ts`: 1 suite, 13 tests. The former successful admin-header impersonation test is replaced by an explicit fail-closed rejection test with no database lookup/audit attempt. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
