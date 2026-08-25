# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_DIRECT_BACKEND_BUILD_ENV_BLOCKER_20260818.md`
- **Member SHA-256:** `f5cbb53726cb03e8e323f3beeb10997f7354a75c45f64ad43cc370cb2574ef96`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: A clean `npm ci` initially hit the Nest peer conflict (`@nestjs/terminus@11.1.1` versus `@nestjs/mongoose@10.1.0`). A one-time `--legacy-peer-deps` retry then hit the sandbox filesystem inode limit while unpacking dependencies. The disk had`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: A clean `npm ci` initially hit the Nest peer conflict (`@nestjs/terminus@11.1.1` versus `@nestjs/mongoose@10.1.0`). A one-time `--legacy-peer-deps` retry then hit the sandbox filesystem inode limit while unpacking dependencies. The disk had`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: A clean `npm ci` initially hit the Nest peer conflict (`@nestjs/terminus@11.1.1` versus `@nestjs/mongoose@10.1.0`). A one-time `--legacy-peer-deps` retry then hit the sandbox filesystem inode limit while unpacking dependencies. The disk had`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
