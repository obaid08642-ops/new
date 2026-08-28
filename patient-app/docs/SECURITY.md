# Security Architecture

## 1. Account Lockout
To prevent Brute Force and Credential Stuffing attacks, `AccountLockoutService` tracks failed attempts per identifier. After 5 failed attempts, the account is locked for 15 minutes.

## 2. Password Policy
`PasswordPolicyService` enforces strict password rules globally:
- Minimum length (8)
- Requires uppercase
- Requires lowercase
- Requires numbers
- Requires special characters
- Password age tracking

## 3. Biometrics
`BiometricService` provides native integration:
- Enrollment change detection (invalidates trust if user adds a new fingerprint to the OS).
- Passcode fallback.
- Explicit re-verification for sensitive actions (e.g. viewing medical history).

## 4. App Lock (Idle Timeout)
`AppLockService` tracks `AppState` and implements a 5-minute inactivity timeout. If exceeded, the app is locked and requires biometric/passcode unlock.

## 5. Audit Logging
`AuthAuditLogger` sends secure logs to `AuditManager`. Logs include:
- Action (LOGIN_SUCCESS, LOGIN_FAILED, USER_LOGOUT)
- Session ID & Device ID
- IP Address (Placeholder for networking layer)
- Timestamp
- Method / Reason

**No secrets** (passwords, tokens, OTPs) are ever logged.
