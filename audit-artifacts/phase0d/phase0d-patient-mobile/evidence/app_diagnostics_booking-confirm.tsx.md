# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/booking-confirm.tsx`
- **Member SHA-256:** `3d5459f0d8ea8ad79516c632a20a1ec186b1a42011dbfd4a59b5f46a22988ae3`
- **Line count:** 6
- **Read range:** `1-6`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: import { Redirect } from 'expo-router';`
- `3: /** Booking confirmation needs provider availability, an authenticated address, and verified payment or insurance data. */`
- `4: export default function DiagnosticsBookingConfirmRedirect() {`
- `5: return <Redirect href="/(tabs)/diagnostics" />;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `3: /** Booking confirmation needs provider availability, an authenticated address, and verified payment or insurance data. */`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
