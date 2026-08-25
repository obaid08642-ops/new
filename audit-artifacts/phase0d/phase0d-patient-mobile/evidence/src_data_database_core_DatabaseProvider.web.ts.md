# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/core/DatabaseProvider.web.ts`
- **Member SHA-256:** `21ae683711e7a96e915df2acfc9b699b8764c2085bbf1f77bb10363e397e810c`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: * Web export does not use the native SQLite driver. Web screens read/write`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: * through the API; this empty driver exists only so shared startup migrations`
- `12: async executeSql(_sqlStatement: string, _args: any[] = []): Promise<IDatabaseResult> {`
- `16: async executeBatch(_sqlStatements: string[]): Promise<void> {}`
- `30: throw new Error('SQLCipher driver is not available on web');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: * through the API; this empty driver exists only so shared startup migrations`
- `30: throw new Error('SQLCipher driver is not available on web');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
