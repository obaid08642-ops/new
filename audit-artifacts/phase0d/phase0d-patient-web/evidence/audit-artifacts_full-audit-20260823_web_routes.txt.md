# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/web_routes.txt`
- **Member SHA-256:** `8dfb546b28826008f841c5e1494ce5d78d73c1e009840037185b212ddee9b3a3`
- **Line count:** 69
- **Read range:** `1-69`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: /[locale]/articles/bookmarks`
- `6: /[locale]/cart/checkout`
- `15: /[locale]/diagnostics/[domain]/[bookingId]`
- `35: /[locale]/login`
- `56: API /api/appointments/[appointmentId]/cancel`
- `58: API /api/appointments/[appointmentId]/reschedule`
- `59: API /api/appointments/book`
- `60: API /api/auth/login`
- `61: API /api/auth/logout`
### backend_consumers_or_contracts
- `1: /[locale]/appointments/[appointmentId]`
- `2: /[locale]/appointments`
- `16: /[locale]/diagnostics/labs`
- `20: /[locale]/diagnostics/radiology`
- `31: /[locale]/home-care`
- `32: /[locale]/home-care/services/[serviceId]`
- `33: /[locale]/home-care/services`
- `34: /[locale]/insurance`
- `44: /[locale]/notifications`
- `45: /[locale]/notifications/settings`
- `46: /[locale]/orders/[orderId]`
- `47: /[locale]/orders/[orderId]/tracking`
### auth_ownership
- `35: /[locale]/login`
- `55: API /api/appointments/[appointmentId]/call-token`
- `60: API /api/auth/login`
- `61: API /api/auth/logout`
- `62: API /api/auth/otp/request`
- `63: API /api/auth/otp/verify`
- `64: API /api/auth/session/exchange`
- `65: API /api/auth/session`
### state_transitions
- `56: API /api/appointments/[appointmentId]/cancel`
### payment_insurance_relevance
- `34: /[locale]/insurance`
- `57: API /api/appointments/[appointmentId]/payment-intent`
### error_empty_loading_retry_cancel
- `56: API /api/appointments/[appointmentId]/cancel`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
