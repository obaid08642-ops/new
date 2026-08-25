# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/web_api_routes_files.txt`
- **Member SHA-256:** `c985b91c364edcf3cefd4f4893aeeb799d0e579df0f0c346ba267dd87944ba3f`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: api/appointments/[appointmentId]/call-token/route.ts`
- `2: api/appointments/[appointmentId]/cancel/route.ts`
- `3: api/appointments/[appointmentId]/payment-intent/route.ts`
- `4: api/appointments/[appointmentId]/reschedule/route.ts`
- `5: api/appointments/book/route.ts`
- `6: api/auth/login/route.ts`
- `7: api/auth/logout/route.ts`
- `8: api/auth/otp/request/route.ts`
- `9: api/auth/otp/verify/route.ts`
- `10: api/auth/session/exchange/route.ts`
- `11: api/auth/session/route.ts`
- `12: api/auth/verify-2fa/route.ts`
### backend_consumers_or_contracts
- `1: api/appointments/[appointmentId]/call-token/route.ts`
- `2: api/appointments/[appointmentId]/cancel/route.ts`
- `3: api/appointments/[appointmentId]/payment-intent/route.ts`
- `4: api/appointments/[appointmentId]/reschedule/route.ts`
- `5: api/appointments/book/route.ts`
- `6: api/auth/login/route.ts`
- `7: api/auth/logout/route.ts`
- `8: api/auth/otp/request/route.ts`
- `9: api/auth/otp/verify/route.ts`
- `10: api/auth/session/exchange/route.ts`
- `11: api/auth/session/route.ts`
- `12: api/auth/verify-2fa/route.ts`
### auth_ownership
- `1: api/appointments/[appointmentId]/call-token/route.ts`
- `6: api/auth/login/route.ts`
- `7: api/auth/logout/route.ts`
- `8: api/auth/otp/request/route.ts`
- `9: api/auth/otp/verify/route.ts`
- `10: api/auth/session/exchange/route.ts`
- `11: api/auth/session/route.ts`
### state_transitions
- `2: api/appointments/[appointmentId]/cancel/route.ts`
### payment_insurance_relevance
- `3: api/appointments/[appointmentId]/payment-intent/route.ts`
### error_empty_loading_retry_cancel
- `2: api/appointments/[appointmentId]/cancel/route.ts`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
