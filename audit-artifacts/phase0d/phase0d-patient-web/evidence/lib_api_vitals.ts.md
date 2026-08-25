# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/vitals.ts`
- **Member SHA-256:** `da5cbf0d2d65cd9c481891e55f5d6b47c002e7aadb19f4c5906a3cb1e3ccedf5`
- **Line count:** 41
- **Read range:** `1-41`
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
- No matching static signal found in this member.
### payment_insurance_relevance
- `10: function listFrom(payload: unknown): unknown[] {`
- `11: if (Array.isArray(payload)) return payload;`
- `12: const root = asRecord(payload);`
- `27: export function extractVitalSummary(payload: unknown) {`
- `28: return listFrom(payload).flatMap((item) => {`
- `35: export function extractVitalHistory(payload: unknown): VitalHistoryItem[] {`
- `36: return listFrom(payload).flatMap((item,index)=>{`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
