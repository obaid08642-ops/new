# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/Interfaces.ts`
- **Member SHA-256:** `cf5418cbe918eb0fca70a90d513e6360c3b41f446db3eaba6bd8a1b891fef269`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `37: getById(id: string, forceRefresh?: boolean): Promise<TModel>;`
- `38: getAll(params?: any, forceRefresh?: boolean): Promise<TModel[]>;`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `7: // Base interface for all network payloads/responses`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
