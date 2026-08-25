# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/live-api-baseline-20260822.md`
- **Member SHA-256:** `6e3af4bdaff5dd765aab54c623cdb9db3353bae70600d57b0363a36ec6261cb1`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: No authentication data or patient data was sent. The root health response confirms the live base is reachable; OTP route schemas still require independent verification before implementation.`
### backend_consumers_or_contracts
- `3: Checked `https://api.nabd.plus/api/v1` in the browser.`
### auth_ownership
- `11: No authentication data or patient data was sent. The root health response confirms the live base is reachable; OTP route schemas still require independent verification before implementation.`
### state_transitions
- `8: {"app":"Nabd Healthcare OS (NestJS)","status":"ok","time":"2026-08-22T21:13:12.581Z","version":"1.0.0"}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
