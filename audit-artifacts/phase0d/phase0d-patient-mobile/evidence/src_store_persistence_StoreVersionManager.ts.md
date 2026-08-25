# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/persistence/StoreVersionManager.ts`
- **Member SHA-256:** `75c897596bc58cc98e3b0303fffdd1dd3a8c5d493781f52953d44cba9c3e4647`
- **Line count:** 38
- **Read range:** `1-38`
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
- `3: export const CURRENT_STATE_SCHEMA_VERSION = 1;`
- `6: * Define state migrations from version N to version N+1.`
- `11: 1: (state: any) => {`
- `13: ...state,`
- `14: // Modify state shape here`
- `18: // 2: (state: any) => { ... }`
- `24: export const storeVersionManager = async (state: any, currentVersion: number) => {`
- `27: return await migrator(state, currentVersion);`
- `28: } catch (error) {`
- `29: console.error('[StoreVersionManager] Migration failed, executing rollback', error);`
- `30: // Rollback: return undefined to completely wipe corrupted state and start fresh.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `28: } catch (error) {`
- `29: console.error('[StoreVersionManager] Migration failed, executing rollback', error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
