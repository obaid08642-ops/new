# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/BaseRepository.ts`
- **Member SHA-256:** `03e5deb2b127da9a490c5ab54bebe0dca59d5945b95d5710830706381c6deaf8`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: async getById(id: string, forceRefresh: boolean = false): Promise<TModel> {`
- `15: if (!forceRefresh) {`
- `26: async getAll(params?: any, forceRefresh: boolean = false): Promise<TModel[]> {`
- `27: if (!forceRefresh) {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: * Base Repository Implementation with Offline-First support`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
