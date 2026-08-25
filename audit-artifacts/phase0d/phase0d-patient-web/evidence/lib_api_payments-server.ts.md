# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/payments-server.ts`
- **Member SHA-256:** `85750e9bd9f2fcd7e88250183f17632c9a6811024bf98799fb343fc44e3804f5`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export function createPatientPaymentIntent(accessToken: string, type: string, bookingId: string, idempotencyKey: string) {`
- `5: const kind = parsePaymentType(type); if (!kind.success || !bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) return null;`
- `6: return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);`
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `4: export function createPatientPaymentIntent(accessToken: string, type: string, bookingId: string, idempotencyKey: string) {`
- `6: return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);`
### state_transitions
- `5: const kind = parsePaymentType(type); if (!kind.success || !bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) return null;`
### payment_insurance_relevance
- `2: import { parsePaymentType } from "./payments";`
- `4: export function createPatientPaymentIntent(accessToken: string, type: string, bookingId: string, idempotencyKey: string) {`
- `5: const kind = parsePaymentType(type); if (!kind.success || !bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) return null;`
- `6: return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
