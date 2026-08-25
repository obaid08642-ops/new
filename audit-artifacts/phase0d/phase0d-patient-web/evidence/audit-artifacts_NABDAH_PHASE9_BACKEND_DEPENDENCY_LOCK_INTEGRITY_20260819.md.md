# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE9_BACKEND_DEPENDENCY_LOCK_INTEGRITY_20260819.md`
- **Member SHA-256:** `0e61c63616ce691710b4b03266839c058ed6145a2e2623c6598ebcc90b22cc3c`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: | Branch upload | **PASS** — archive commit `79ad622` (`fix: align backend Terminus dependency lock`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: The first reproducibility gate, `npm ci --dry-run --ignore-scripts`, failed in Backend because `@nestjs/terminus` 11.1.1 declares an optional peer requirement for `@nestjs/mongoose` 11 while the application intentionally uses Nest/Mongoose `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: The first reproducibility gate, `npm ci --dry-run --ignore-scripts`, failed in Backend because `@nestjs/terminus` 11.1.1 declares an optional peer requirement for `@nestjs/mongoose` 11 while the application intentionally uses Nest/Mongoose `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
