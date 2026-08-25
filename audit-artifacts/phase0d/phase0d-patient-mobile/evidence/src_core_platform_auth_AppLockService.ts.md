# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/AppLockService.ts`
- **Member SHA-256:** `6a8e6758594ba4d1bd41cbdeaf15c52e8f92bac8aa69fb032e7b2cf5eee551c2`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `37: this.onLockCallback(); // Triggers UI to show AppLock screen`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { AppState, AppStateStatus } from 'react-native';`
- `14: * Initializes AppState listener to track background/foreground transitions`
- `19: AppState.addEventListener('change', this.handleAppStateChange.bind(this));`
- `23: private handleAppStateChange(nextAppState: AppStateStatus): void {`
- `24: if (nextAppState === 'background' || nextAppState === 'inactive') {`
- `26: } else if (nextAppState === 'active') {`
- `43: * Unlocks the app (typically called after successful Biometric verification)`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: private TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout`
- `27: this.checkTimeout();`
- `31: private checkTimeout(): void {`
- `33: if (inactiveDuration > this.TIMEOUT_MS && !this.isLocked) {`
- `34: this.log.warn('App timeout reached. Locking app.');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
