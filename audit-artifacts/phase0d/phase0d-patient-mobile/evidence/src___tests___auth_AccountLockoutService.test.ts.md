# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/__tests__/auth/AccountLockoutService.test.ts`
- **Member SHA-256:** `9427b915b2a53aee6437731fc89a6f7381d6c19d9d505833af0be591304e78d2`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `28: it('should reset attempts on successful login', () => {`
### backend_consumers_or_contracts
- `1: import { AccountLockoutService } from '../../../src/core/platform/auth/AccountLockoutService';`
### auth_ownership
- `28: it('should reset attempts on successful login', () => {`
### state_transitions
- `14: it('should lock after 5 failed attempts', () => {`
- `16: lockoutService.recordFailedAttempt('user1');`
- `23: lockoutService.recordFailedAttempt('user1');`
- `28: it('should reset attempts on successful login', () => {`
- `29: lockoutService.recordFailedAttempt('user1');`
- `32: lockoutService.recordFailedAttempt('user1');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: it('should lock after 5 failed attempts', () => {`
- `16: lockoutService.recordFailedAttempt('user1');`
- `23: lockoutService.recordFailedAttempt('user1');`
- `29: lockoutService.recordFailedAttempt('user1');`
- `32: lockoutService.recordFailedAttempt('user1');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
