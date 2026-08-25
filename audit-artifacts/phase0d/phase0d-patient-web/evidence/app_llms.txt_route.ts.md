# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/llms.txt/route.ts`
- **Member SHA-256:** `cef8743549b72232864cb47a61dea0650ca3533792cc3d9ccb9ae8471c47c546`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `19: - Public pages do not provide medical diagnosis, treatment recommendations, pricing promises, or patient-specific advice.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: > Nabd Plus is a patient web portal. Public content is limited to the published website entry points; patient data always requires an authenticated server session.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
