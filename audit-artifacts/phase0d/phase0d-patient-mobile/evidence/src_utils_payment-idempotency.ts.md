# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/payment-idempotency.ts`
- **Member SHA-256:** `42140e8ab5025ede3c63645fe89ab02863063d4201c8dfc648d3292c0c99756e`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: export function paymentIntentHeaders(kind: string, bookingId: string): Record<string, string> {`
- `7: return { 'Idempotency-Key': `payment-${kind}-${bookingId}-${uuid}`.slice(0, 128) };`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: * Generates a bounded, per-tap idempotency key for a payment-intent mutation.`
- `5: export function paymentIntentHeaders(kind: string, bookingId: string): Record<string, string> {`
- `7: return { 'Idempotency-Key': `payment-${kind}-${bookingId}-${uuid}`.slice(0, 128) };`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
