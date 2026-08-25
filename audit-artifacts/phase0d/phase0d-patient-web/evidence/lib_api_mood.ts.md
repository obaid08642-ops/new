# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/mood.ts`
- **Member SHA-256:** `46d3de46222bad130a45226932e886790d5e14f0653e969c24fd755faecd9ec3`
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
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: export function parseMoodHistory(payload:unknown):MoodEntrySummary[]{const rows:unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Record<string,u`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
