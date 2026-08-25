# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/breathing.ts`
- **Member SHA-256:** `088d54becc8c2f49395e9fdbeb870d00bca46ff67b55c85529fec240f10f38f5`
- **Line count:** 2
- **Read range:** `1-2`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: export type BreathingSessionSummary={id:string;technique?:string;rounds?:number;durationSeconds?:number;loggedAt?:string};`
- `2: export function parseBreathingHistory(payload:unknown):BreathingSessionSummary[]{const rows: unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Re`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: export function parseBreathingHistory(payload:unknown):BreathingSessionSummary[]{const rows: unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Re`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
