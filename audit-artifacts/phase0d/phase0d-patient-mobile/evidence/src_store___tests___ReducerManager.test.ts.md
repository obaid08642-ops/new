# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/__tests__/ReducerManager.test.ts`
- **Member SHA-256:** `905e8e5276071e542db1e5dd7d9841f049bf17680af26b7db55f3ba8466e33b7`
- **Line count:** 62
- **Read range:** `1-62`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: initialState: { value: 1 },`
- `12: initialState: { value: 2 },`
- `19: const state = manager.reduce(undefined, { type: 'INIT' });`
- `20: expect(state).toHaveProperty('dummy1');`
- `21: expect(state.dummy1.value).toBe(1);`
- `27: const state = manager.reduce(undefined, { type: 'INIT' });`
- `28: expect(state).toHaveProperty('dummy2');`
- `29: expect(state.dummy2.value).toBe(2);`
- `32: it('should remove a reducer and clean up its state', () => {`
- `38: // Initial state setup`
- `39: let state = manager.reduce(undefined, { type: 'INIT' });`
- `40: expect(state).toHaveProperty('dummy2');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
