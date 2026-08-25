# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/meditation.ts`
- **Member SHA-256:** `9d1aee531c94c97243263f42fb58e63d1b1b0909bea39f7f68f849db474d91f8`
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
- `1: export type MeditationSessionSummary={id:string;type?:string;durationMinutes?:number;completed?:boolean;loggedAt?:string};`
- `2: export function parseMeditationHistory(payload:unknown):MeditationSessionSummary[]{const rows:unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as R`
### state_transitions
- `1: export type MeditationSessionSummary={id:string;type?:string;durationMinutes?:number;completed?:boolean;loggedAt?:string};`
- `2: export function parseMeditationHistory(payload:unknown):MeditationSessionSummary[]{const rows:unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as R`
### payment_insurance_relevance
- `2: export function parseMeditationHistory(payload:unknown):MeditationSessionSummary[]{const rows:unknown[]=Array.isArray(payload)?payload:payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as R`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
