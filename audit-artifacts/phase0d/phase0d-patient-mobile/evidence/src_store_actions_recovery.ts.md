# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/actions/recovery.ts`
- **Member SHA-256:** `42089ecb636b17ff8a480c809648164c144f1b0adb7e5fe373eac86efe883afc`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: // Commonly dispatched on logout, or if corruption is detected.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: // Commonly dispatched on logout, or if corruption is detected.`
- `13: export const resetUserSessionAction = createAction('STORE/RESET_USER_SESSION');`
### state_transitions
- `8: // Resets all state to initial values, except for whitelisted persistent non-user configs.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
