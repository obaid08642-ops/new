# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/ReducerManager.ts`
- **Member SHA-256:** `d47675915b4df726f204e9474f0db1596911a11d0fc17975c078e7b1486cebfb`
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
- No matching static signal found in this member.
### state_transitions
- `5: reduce: (state: any, action: UnknownAction) => any;`
- `19: reduce: (state: any, action: UnknownAction) => {`
- `21: state = { ...state };`
- `23: delete state[key];`
- `27: return combinedReducer(state, action);`
- `43: // Push to keysToRemove to strip the state of this feature`
- `48: : (state: any) => state; // fallback if all reducers removed`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
