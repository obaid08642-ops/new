# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/auth/RegistrationTransaction.ts`
- **Member SHA-256:** `5b6ebf2a5042a7340dbd754af565136b6cf10e574129c47fe20c279119fba0ca`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: * invalidates the transaction and requires the user to register again.`
- `25: /** Consumes the transaction exactly once so an OTP screen cannot replay credentials. */`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `25: /** Consumes the transaction exactly once so an OTP screen cannot replay credentials. */`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `1: export interface RegistrationPayload {`
- `9: const transactions = new Map<string, { payload: RegistrationPayload; expiresAt: number }>();`
- `19: export function createRegistrationTransaction(payload: RegistrationPayload): string {`
- `21: transactions.set(transactionId, { payload, expiresAt: Date.now() + TTL_MS });`
- `26: export function consumeRegistrationTransaction(transactionId?: string): RegistrationPayload | null {`
- `31: return record.payload;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
