# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/inspect-openapi-gap-contracts.mjs`
- **Member SHA-256:** `9eaa55c16c2f46c24da514f685028c832214cf25594cad8cbbdcbe89b5672299`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: "/home/ubuntu/upload/nabd-patient-api-openapi.json",`
- `6: "/home/ubuntu/upload/nabd-patient-api-openapi(2).json",`
- `10: homeCareDetail: /^\/api\/v1\/home-care\/bookings\/\{[^}]+\}$/,`
### backend_consumers_or_contracts
- `10: homeCareDetail: /^\/api\/v1\/home-care\/bookings\/\{[^}]+\}$/,`
- `13: otpVerify: /^\/api\/v1\/auth\/verify-otp$/,`
### auth_ownership
- `13: otpVerify: /^\/api\/v1\/auth\/verify-otp$/,`
### state_transitions
- `28: responseStatusCodes: Object.keys(operation.responses ?? {}).sort(),`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
