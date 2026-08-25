# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_M_PROTECTED_MEDIA_STORAGE_20260819.md`
- **Member SHA-256:** `86e4f15a4f9c33c1fd0258e94de4d6f2dab0ff7a98361500f4148b08c6e153c2`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | Authenticated upload visibility | Generic authenticated upload endpoints ignore client `visibility` and `owner_kind` escalation inputs; every newly created object is private. Public publication is now intentionally outside this client upl`
- `12: | R2/base64 behavior | Private upload requires configured R2-compatible storage. Missing/failed object storage produces a service-unavailable error; it no longer falls back to inline Base64 and silently retains sensitive bytes in MongoDB. |`
- `13: | Cloudinary private media | Cloudinary uploads use `authenticated` delivery, persist private visibility, and return the authenticated API route rather than a direct source/thumbnail URL. |`
- `26: | Branch upload | **PASS** — source commit `4e66354` (`fix: fail closed private media storage`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Phase 5 privacy audit found that the storage module accepted client-selected visibility, could fall back from an R2 failure to inline Base64 storage, returned direct private origins in some read/signing paths, and could return an unsign`
- `11: | Authenticated upload visibility | Generic authenticated upload endpoints ignore client `visibility` and `owner_kind` escalation inputs; every newly created object is private. Public publication is now intentionally outside this client upl`
- `30: This is a deliberately fail-closed change: deployment requires a working private R2-compatible storage configuration and Cloudinary signing material where Cloudinary private media is enabled. Existing public objects/legacy external URLs req`
### state_transitions
- `12: | R2/base64 behavior | Private upload requires configured R2-compatible storage. Missing/failed object storage produces a service-unavailable error; it no longer falls back to inline Base64 and silently retains sensitive bytes in MongoDB. |`
### payment_insurance_relevance
- `5: The Phase 5 privacy audit found that the storage module accepted client-selected visibility, could fall back from an R2 failure to inline Base64 storage, returned direct private origins in some read/signing paths, and could return an unsign`
### error_empty_loading_retry_cancel
- `12: | R2/base64 behavior | Private upload requires configured R2-compatible storage. Missing/failed object storage produces a service-unavailable error; it no longer falls back to inline Base64 and silently retains sensitive bytes in MongoDB. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
