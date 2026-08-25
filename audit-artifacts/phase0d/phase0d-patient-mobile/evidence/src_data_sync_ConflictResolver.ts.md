# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/ConflictResolver.ts`
- **Member SHA-256:** `3a12d816633964d72539c788b8e6749573495502d6cbba0338c020ed0eba10ad`
- **Line count:** 71
- **Read range:** `1-71`
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
- `6: localState: any;`
- `7: serverState: any;`
- `29: * Returns the "winning" state that should be persisted.`
- `38: return context.serverState;`
- `41: return context.localState;`
- `45: const localTime = context.localState.updated_at || 0;`
- `46: const serverTime = context.serverState.updated_at || 0;`
- `47: return localTime > serverTime ? context.localState : context.serverState;`
- `51: return { ...context.serverState, ...context.localState };`
- `55: console.error('[ConflictResolver] MANUAL strategy requested but no hook provided. Falling back to SERVER_WINS.');`
- `56: return context.serverState;`
- `61: return context.serverState;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `55: console.error('[ConflictResolver] MANUAL strategy requested but no hook provided. Falling back to SERVER_WINS.');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
