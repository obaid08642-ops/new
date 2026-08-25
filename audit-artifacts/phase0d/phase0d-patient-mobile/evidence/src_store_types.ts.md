# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/types.ts`
- **Member SHA-256:** `0a929c0930280a0f9f212c2ae0587ec17424759d86937afc3add4e8ffdbfa11f`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: *    - Events: `[Domain] [Action] [Status]` (e.g., `auth/login/pending`)`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: *    - Events: `[Domain] [Action] [Status]` (e.g., `auth/login/pending`)`
- `8: *    - Commands: `[Domain]/[Verb][Subject]` (e.g., `auth/setToken`)`
### state_transitions
- `2: * Nabdah Plus - Global State Architecture Types & Conventions`
- `7: *    - Events: `[Domain] [Action] [Status]` (e.g., `auth/login/pending`)`
- `19: * RootState will be built dynamically by ReducerManager.`
- `22: export interface DynamicRootState {`
- `27: * Common Loading State Enum`
- `29: export enum LoadingState {`
- `31: PENDING = 'pending',`
- `33: FAILED = 'failed',`
- `37: * Generic Slice State Structure for Async Entities`
- `39: export interface AsyncEntityState<T, E = string> {`
- `41: loading: LoadingState;`
- `42: error: E | null;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: *    - Events: `[Domain] [Action] [Status]` (e.g., `auth/login/pending`)`
- `27: * Common Loading State Enum`
- `29: export enum LoadingState {`
- `31: PENDING = 'pending',`
- `33: FAILED = 'failed',`
- `41: loading: LoadingState;`
- `42: error: E | null;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
