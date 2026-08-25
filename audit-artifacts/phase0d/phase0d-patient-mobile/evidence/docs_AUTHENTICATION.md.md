# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/AUTHENTICATION.md`
- **Member SHA-256:** `5680b13fbe154cafde408487229d3392cde76f7f1458a35a67474a5fdb6351ac`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: - `refreshToken()``
- `14: - `revokeSession()``
- `17: - `verifyOTP()``
- `23: ## Session Management`
- `24: Sessions are handled by `SessionManager` which includes:`
- `25: - **Refresh Token Rotation**: Tokens are rotated on use to prevent replay attacks.`
- `26: - **Concurrent Refresh Queue**: Prevents multiple rapid refresh requests from causing race conditions.`
- `27: - **Session Versioning**: Sessions track a version number allowing instant global invalidation remotely.`
- `28: - **Device Binding**: Sessions are bound to unique device IDs via `DeviceTracker`.`
- `29: - **Absolute Session Lifetime**: Sessions have a hard limit (e.g. 14 days) after which forced re-authentication is required regardless of idle time.`
- `32: No tokens are stored in `AsyncStorage`. All tokens are encrypted and persisted securely via `SecureStorageService` (Keychain/Keystore).`
### state_transitions
- `6: The authentication flow uses a deterministic `AuthStateMachine` to manage states (`Unauthenticated` -> `Authenticating` -> `Authenticated` -> `Locked` -> `Expired`).`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
