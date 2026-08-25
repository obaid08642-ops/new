# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/reports.ts`
- **Member SHA-256:** `cc46e6fca1482682a83f04dee28dbaed0aa194ffc0265bfd0e08e199f2ef3418`
- **Line count:** 4
- **Read range:** `1-4`
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
- `4: export function parseReports(payload: unknown): ReportSummary[] { const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null; const list=Array.isArray(payload)?payload:Array.isArray(root?.d`
### payment_insurance_relevance
- `4: export function parseReports(payload: unknown): ReportSummary[] { const root=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as Record<string,unknown>:null; const list=Array.isArray(payload)?payload:Array.isArray(root?.d`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
