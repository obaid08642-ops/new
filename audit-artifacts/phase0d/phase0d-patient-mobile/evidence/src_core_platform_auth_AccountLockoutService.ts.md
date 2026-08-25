# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/AccountLockoutService.ts`
- **Member SHA-256:** `6a502ff2e26567b70fca0cf3dc9bf5de0ab2c926890ff3d6dfd19775ed88b6de`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `32: * Record a failed login attempt. Automatically locks if max attempts reached.`
- `49: * Reset attempts on successful login`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `32: * Record a failed login attempt. Automatically locks if max attempts reached.`
- `49: * Reset attempts on successful login`
### state_transitions
- `4: failedAttempts: number;`
- `12: private MAX_FAILED_ATTEMPTS = 5;`
- `32: * Record a failed login attempt. Automatically locks if max attempts reached.`
- `34: public recordFailedAttempt(identifier: string): void {`
- `35: const record = this.attemptsTracker.get(identifier) || { failedAttempts: 0, lockedUntil: null };`
- `36: record.failedAttempts += 1;`
- `38: if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {`
- `42: this.log.debug(`Failed attempt recorded for ${identifier}. Total: ${record.failedAttempts}`);`
- `49: * Reset attempts on successful login`
- `53: this.log.debug(`Resetting failed attempts for ${identifier}`);`
### payment_insurance_relevance
- `42: this.log.debug(`Failed attempt recorded for ${identifier}. Total: ${record.failedAttempts}`);`
### error_empty_loading_retry_cancel
- `4: failedAttempts: number;`
- `12: private MAX_FAILED_ATTEMPTS = 5;`
- `32: * Record a failed login attempt. Automatically locks if max attempts reached.`
- `34: public recordFailedAttempt(identifier: string): void {`
- `35: const record = this.attemptsTracker.get(identifier) || { failedAttempts: 0, lockedUntil: null };`
- `36: record.failedAttempts += 1;`
- `38: if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {`
- `42: this.log.debug(`Failed attempt recorded for ${identifier}. Total: ${record.failedAttempts}`);`
- `53: this.log.debug(`Resetting failed attempts for ${identifier}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
