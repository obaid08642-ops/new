# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_AUTHORIZATION_GUARD_GAPS_20260819.md`
- **Member SHA-256:** `f64b5e14df89e86b08785a810aac47389f5749a7c9cac47d6334f397a2a8c76c`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: | **P1** | Token/session revocation and permission freshness are not checked in the guard | Verified JWT payload permissions/roles are trusted until expiration; no session/device revocation, user-status, role-version or forced logout lookup`
- `16: | **P1** | Public routes accept invalid/expired bearer tokens as anonymous traffic | For a `@Public` handler, invalid token returns true rather than rejecting or clearly discarding token. | Define explicit public-optional-auth behavior: ign`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 5 Backend/Database — authentication and authorization guard gaps`
- `5: The shared guard validates JWT signatures, supports HTTP-only admin cookie fallback, normalizes provider role aliases, checks declared roles/permissions and supports reusable ownership decorators. It also blocks guests where `NoGuestsGuard``
- `11: | **P0** | Impersonation continues even when its audit record cannot be written | Guard catches audit-log failure, logs to console and still substitutes the target user. Privileged viewing/action can therefore occur without required audit e`
- `12: | **P1** | Impersonation header has no case/purpose, target-sensitivity, time or action restriction | An admin/super-admin can supply any target ID; no delegated purpose, allowed endpoint set, break-glass context, PHI redaction or session e`
- `13: | **P1** | Admin/super-admin bypass generic ownership checks completely | Ownership decorator skips those roles, with no facility/branch/purpose constraint. This makes every correct Controller decorator insufficient for least-privilege mult`
- `15: | **P1** | Token/session revocation and permission freshness are not checked in the guard | Verified JWT payload permissions/roles are trusted until expiration; no session/device revocation, user-status, role-version or forced logout lookup`
- `16: | **P1** | Public routes accept invalid/expired bearer tokens as anonymous traffic | For a `@Public` handler, invalid token returns true rather than rejecting or clearly discarding token. | Define explicit public-optional-auth behavior: ign`
- `20: Shared authorization is **P0 FIX/BLOCKED** for privileged impersonation and multi-facility least privilege. Controller-level roles cannot compensate for non-audited impersonation or unscoped admin bypass.`
### state_transitions
- `3: ## Confirmed strengths`
- `7: ## Confirmed defects`
- `11: | **P0** | Impersonation continues even when its audit record cannot be written | Guard catches audit-log failure, logs to console and still substitutes the target user. Privileged viewing/action can therefore occur without required audit e`
- `15: | **P1** | Token/session revocation and permission freshness are not checked in the guard | Verified JWT payload permissions/roles are trusted until expiration; no session/device revocation, user-status, role-version or forced logout lookup`
### payment_insurance_relevance
- `15: | **P1** | Token/session revocation and permission freshness are not checked in the guard | Verified JWT payload permissions/roles are trusted until expiration; no session/device revocation, user-status, role-version or forced logout lookup`
- `16: | **P1** | Public routes accept invalid/expired bearer tokens as anonymous traffic | For a `@Public` handler, invalid token returns true rather than rejecting or clearly discarding token. | Define explicit public-optional-auth behavior: ign`
### error_empty_loading_retry_cancel
- `11: | **P0** | Impersonation continues even when its audit record cannot be written | Guard catches audit-log failure, logs to console and still substitutes the target user. Privileged viewing/action can therefore occur without required audit e`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
