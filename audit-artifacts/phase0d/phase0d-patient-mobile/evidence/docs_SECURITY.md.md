# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/SECURITY.md`
- **Member SHA-256:** `3e3dce0894e93ac8825907013f3190789dd48f4e06220cdf5108828dce5beefe`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `26: - Action (LOGIN_SUCCESS, LOGIN_FAILED, USER_LOGOUT)`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `26: - Action (LOGIN_SUCCESS, LOGIN_FAILED, USER_LOGOUT)`
- `27: - Session ID & Device ID`
- `32: **No secrets** (passwords, tokens, OTPs) are ever logged.`
### state_transitions
- `4: To prevent Brute Force and Credential Stuffing attacks, `AccountLockoutService` tracks failed attempts per identifier. After 5 failed attempts, the account is locked for 15 minutes.`
- `22: `AppLockService` tracks `AppState` and implements a 5-minute inactivity timeout. If exceeded, the app is locked and requires biometric/passcode unlock.`
- `26: - Action (LOGIN_SUCCESS, LOGIN_FAILED, USER_LOGOUT)`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: To prevent Brute Force and Credential Stuffing attacks, `AccountLockoutService` tracks failed attempts per identifier. After 5 failed attempts, the account is locked for 15 minutes.`
- `21: ## 4. App Lock (Idle Timeout)`
- `22: `AppLockService` tracks `AppState` and implements a 5-minute inactivity timeout. If exceeded, the app is locked and requires biometric/passcode unlock.`
- `26: - Action (LOGIN_SUCCESS, LOGIN_FAILED, USER_LOGOUT)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
