# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `audit-artifacts/verification/MOBILE_P1_TARGETED_REGRESSION_GATE_20260822.txt`
- **Member SHA-256:** `90cd51582d93971fb2a951606d1ecbf4c0716f4db1379c6ecea0d6339e295ab4`
- **Line count:** 185
- **Read range:** `1-185`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: ✓ does not create or retry as a guest session after an authentication error (26 ms)`
- `88: ✓ rejects a network-failed mutation without retry, queue, or synthetic success (2 ms)`
### backend_consumers_or_contracts
- `66: === src/services/auth/RegistrationTransaction.test.ts ===`
- `69: > jest --runInBand src/services/auth/RegistrationTransaction.test.ts`
- `71: PASS src/services/auth/RegistrationTransaction.test.ts`
- `79: Ran all test suites matching /src\/services\/auth\/RegistrationTransaction.test.ts/i.`
- `172: === app/authGuestPolicy.test.ts ===`
- `175: > jest --runInBand app/authGuestPolicy.test.ts`
- `177: PASS app/authGuestPolicy.test.ts`
- `185: Ran all test suites matching /app\/authGuestPolicy.test.ts/i.`
### auth_ownership
- `11: 103 |     // Handle missing/invalid token or auth error`
- `12: 104 |     if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {`
- `15: 106 |       try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}`
- `16: 107 |       await clearLegacyTokenMirror();`
- `25: ✓ never reads an authorization token from the legacy AsyncStorage mirror (5 ms)`
- `27: ✓ does not create or retry as a guest session after an authentication error (26 ms)`
- `137: 103 |     // Handle missing/invalid token or auth error`
- `138: 104 |     if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {`
- `141: 106 |       try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}`
- `142: 107 |       await clearLegacyTokenMirror();`
- `179: ✓ does not invoke the legacy guest endpoint or restore guest sessions from app entry points (7 ms)`
### state_transitions
- `9: [apiFetch] Auth error for endpoint: /patient-only`
- `11: 103 |     // Handle missing/invalid token or auth error`
- `12: 104 |     if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {`
- `13: > 105 |       console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);`
- `17: 108 |       throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);`
- `26: ✓ raises a typed contract error when a successful HTTP response is not JSON (2 ms)`
- `27: ✓ does not create or retry as a guest session after an authentication error (26 ms)`
- `41: An error occurred while requiring the 'ExpoModulesCoreJSLogger' module: Cannot read properties of undefined (reading 'get')`
- `73: ✓ keeps credentials outside navigation state and consumes them exactly once (3 ms)`
- `88: ✓ rejects a network-failed mutation without retry, queue, or synthetic success (2 ms)`
- `135: [apiFetch] Auth error for endpoint: /patient-only`
- `137: 103 |     // Handle missing/invalid token or auth error`
### payment_insurance_relevance
- `29: Test Suites: 1 passed, 1 total`
- `30: Tests:       3 passed, 3 total`
- `31: Snapshots:   0 total`
- `60: Test Suites: 1 passed, 1 total`
- `61: Tests:       2 passed, 2 total`
- `62: Snapshots:   0 total`
- `75: Test Suites: 1 passed, 1 total`
- `76: Tests:       1 passed, 1 total`
- `77: Snapshots:   0 total`
- `90: Test Suites: 1 passed, 1 total`
- `91: Tests:       1 passed, 1 total`
- `92: Snapshots:   0 total`
### error_empty_loading_retry_cancel
- `9: [apiFetch] Auth error for endpoint: /patient-only`
- `11: 103 |     // Handle missing/invalid token or auth error`
- `12: 104 |     if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {`
- `13: > 105 |       console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);`
- `15: 106 |       try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}`
- `17: 108 |       throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);`
- `26: ✓ raises a typed contract error when a successful HTTP response is not JSON (2 ms)`
- `27: ✓ does not create or retry as a guest session after an authentication error (26 ms)`
- `41: An error occurred while requiring the 'ExpoModulesCoreJSLogger' module: Cannot read properties of undefined (reading 'get')`
- `81: === src/services/HttpClient.offline.test.ts ===`
- `84: > jest --runInBand src/services/HttpClient.offline.test.ts`
- `86: PASS src/services/HttpClient.offline.test.ts`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
