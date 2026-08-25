# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/syncSlice.ts`
- **Member SHA-256:** `a390a5386f4b0a5f51df191920ffe70a09a6e039acf01cb42ac43ee5da2eec3d`
- **Line count:** 55
- **Read range:** `1-55`
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
- `4: * Offline Sync State Tracking`
- `5: * Used to track the status of offline pending operations and sync conflicts.`
- `7: interface SyncState {`
- `9: pendingOperationsCount: number;`
- `14: const initialState: SyncState = {`
- `16: pendingOperationsCount: 0,`
- `23: initialState,`
- `25: syncStarted: (state) => {`
- `26: state.isSyncing = true;`
- `28: syncCompleted: (state) => {`
- `29: state.isSyncing = false;`
- `30: state.lastSyncTime = Date.now();`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `39: conflictDetected: (state, action: PayloadAction<any>) => {`
- `40: state.conflicts.push(action.payload);`
### error_empty_loading_retry_cancel
- `4: * Offline Sync State Tracking`
- `5: * Used to track the status of offline pending operations and sync conflicts.`
- `9: pendingOperationsCount: number;`
- `16: pendingOperationsCount: 0,`
- `31: state.pendingOperationsCount = 0;`
- `33: syncFailed: (state) => {`
- `37: state.pendingOperationsCount += 1;`
- `49: syncFailed,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
