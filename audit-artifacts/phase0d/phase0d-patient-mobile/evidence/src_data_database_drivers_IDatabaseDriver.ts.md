# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/drivers/IDatabaseDriver.ts`
- **Member SHA-256:** `899a6f3649dd4e0cd676889e07de7a2648bb2087bb20f8c8ab8c12feb30fe7a9`
- **Line count:** 26
- **Read range:** `1-26`
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
- `12: executeSql(sqlStatement: string, args?: any[]): Promise<IDatabaseResult>;`
- `15: executeBatch(sqlStatements: string[]): Promise<void>;`
- `25: executeSql(sqlStatement: string, args?: any[]): Promise<IDatabaseResult>;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
