# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/profile.ts`
- **Member SHA-256:** `e83cece99666fee90e0d161f4cdf5d312c6996bdd23b999541882c16e3a7381c`
- **Line count:** 28
- **Read range:** `1-28`
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
- `2: export type ProfileDomainState = "available" | "empty" | "forbidden" | "error";`
- `24: export function profileDomainState(status: number, fieldCount: number): ProfileDomainState {`
- `25: if (status === 403 || status === 404) return "forbidden";`
- `26: if (status < 200 || status >= 300) return "error";`
- `27: return fieldCount > 0 ? "available" : "empty";`
### payment_insurance_relevance
- `8: export function extractRecord(payload: unknown) {`
- `9: const root = asRecord(payload);`
### error_empty_loading_retry_cancel
- `2: export type ProfileDomainState = "available" | "empty" | "forbidden" | "error";`
- `26: if (status < 200 || status >= 300) return "error";`
- `27: return fieldCount > 0 ? "available" : "empty";`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
