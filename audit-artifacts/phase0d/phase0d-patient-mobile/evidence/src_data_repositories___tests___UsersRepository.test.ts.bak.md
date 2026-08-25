# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/repositories/__tests__/UsersRepository.test.ts.bak`
- **Member SHA-256:** `91cb7848fb6edb49882f2fb43d5aa24c67fef094209ab1abfe9ce45f7d1c6817`
- **Line count:** 91
- **Read range:** `1-91`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `41: subscribe: jest.fn(),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `57: it('should initialize successfully', () => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
