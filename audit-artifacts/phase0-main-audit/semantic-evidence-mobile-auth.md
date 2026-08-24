# Semantic evidence — Patient Mobile authentication and API client

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## API client

Source: `nabd_plus_patient_app/src/utils/api.ts`.

The client reads and writes the access token through Expo SecureStore and deletes the legacy AsyncStorage mirror at lines 20–49. This is a positive observation for token-at-rest handling, but it does not prove that every auth provider follows the same contract.

`apiFetch` injects `Authorization: Bearer <token>` at lines 52–62, applies a 20-second timeout at lines 64–73, and retries exactly once only for GET-like requests at lines 76–90. This is directionally safe for mutation replay, but every mutation contract still needs server idempotency and the client needs consistent request correlation/error mapping.

Non-2xx responses are normalized and clear SecureStore for 401/403 at lines 93–110. JSON parse failures become `invalid_response` at lines 113–117. The source still requires audit of PII in logs, endpoint validation and callers that bypass `apiFetch`.

## EmailAuthProvider

Source: `nabd_plus_patient_app/src/services/auth/providers/EmailAuthProvider.ts`.

`login` sends `POST /auth/login` at lines 8–14, expects `access_token` and returns both access and refresh tokens in the `AuthResult.session` object at lines 16–34. This is a confirmed contract mismatch candidate against a strict httpOnly-cookie-only web policy; for Mobile it may be an intended native-app session model, but storage and propagation must be traced from the caller.

The provider falls back to `data.user.full_name || 'Validated User'` at line 26 and defaults role to `patient` at line 27. These are potentially misleading identity fallbacks and must be removed or classified against the actual auth DTO.

`logout` calls `POST /auth/logout` and silently ignores network errors at lines 37–45. Logout/session revocation semantics and offline behavior remain unverified.

## Phase 0 classification

The SecureStore handling is a source-positive observation. Token-returning login, identity fallbacks, silent logout failure, and any callers that store or expose the returned session are security/truthfulness review candidates. No remediation is performed in Phase 0.
