# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/appointments.ts`
- **Member SHA-256:** `4252faaa8b5b68ebb0c4a3917f69c82981517e4bd92bd627aa5a9ccb6115c637`
- **Line count:** 62
- **Read range:** `1-62`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: status?: string;`
- `37: if (!id.success) return null;`
- `40: status: firstText(record as Record<string, unknown>, ["status"]),`
### payment_insurance_relevance
- `18: function rowsFrom(payload: unknown): unknown[] {`
- `19: if (Array.isArray(payload)) return payload;`
- `20: const root = asRecord(payload);`
- `52: export function extractAppointmentRows(payload: unknown) {`
- `53: return rowsFrom(payload).flatMap((item) => {`
- `59: export function extractAppointmentDetail(payload: unknown) {`
- `60: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
