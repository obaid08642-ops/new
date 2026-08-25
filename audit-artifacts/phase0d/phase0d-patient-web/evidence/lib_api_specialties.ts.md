# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/specialties.ts`
- **Member SHA-256:** `124c9d429d39fd26a73dbf9d7b8ae679edb7bf9eb03fea03be602479ce08630d`
- **Line count:** 40
- **Read range:** `1-40`
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
- `33: if (!parsed.success) return [];`
### payment_insurance_relevance
- `19: function rowsFrom(payload: unknown): unknown[] {`
- `20: if (Array.isArray(payload)) return payload;`
- `21: if (payload && typeof payload === "object" && !Array.isArray(payload)) {`
- `22: const root = payload as Record<string, unknown>;`
- `30: export function extractSpecialties(payload: unknown): SpecialtyRow[] {`
- `31: return rowsFrom(payload).flatMap((value) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
