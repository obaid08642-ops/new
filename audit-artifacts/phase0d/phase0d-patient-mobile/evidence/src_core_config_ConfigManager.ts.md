# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/config/ConfigManager.ts`
- **Member SHA-256:** `93c0d6529b2e8a890d9f8ff1ab80ae6277888f48bc16ceb2963512c681d70ac7`
- **Line count:** 247
- **Read range:** `1-247`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `116: maxLoginAttempts:   number;`
- `128: maxFileUploadMb:    number;`
- `134: defaultPageSize:    number;`
- `135: maxPageSize:        number;`
- `181: maxLoginAttempts:   5,`
- `193: maxFileUploadMb:    20,`
- `199: defaultPageSize:    20,`
- `200: maxPageSize:        100,`
- `232: | 'maxFileUploadMb' | 'defaultPageSize' | 'maxLoginAttempts' | 'lockoutDuration'`
### backend_consumers_or_contracts
- `39: socketUrl: string;`
- `49: apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'http://localhost:8002/api/v1',`
- `51: socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'ws://localhost:8002',`
- `59: apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://staging-api.nabdahplus.com/api/v1',`
- `61: socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'wss://staging-socket.nabdahplus.com',`
- `69: apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://api.nabd.plus/api/v1',`
- `70: fastapiBaseUrl:     process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'https://api.nabd.plus/api/v1',`
- `71: socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'https://api.nabd.plus',`
- `163: socketUrl:    resolveUrl(baseEnv.socketUrl),`
### auth_ownership
- `3: * Environment-aware, Admin-overridable, no hardcoded values.`
- `115: tokenExpiryBuffer:  number;           // ms before expiry to refresh`
- `116: maxLoginAttempts:   number;`
- `152: // Roles`
- `153: roles:              Record<string, string>;`
- `180: tokenExpiryBuffer:  60 * 1000,             // 1 minute`
- `181: maxLoginAttempts:   5,`
- `217: // ── Roles ────────────────────────────────────────────────────────────────`
- `218: roles: {`
- `222: ADMIN:     'admin',`
- `223: SUPERADMIN:'superadmin',`
- `228: // Remote Config Patch — Admin Dashboard can push runtime overrides`
### state_transitions
- `42: logLevel: 'debug' | 'info' | 'warn' | 'error';`
- `74: logLevel:           'error',`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: *   config.timeout        → request timeout in ms`
- `42: logLevel: 'debug' | 'info' | 'warn' | 'error';`
- `74: logLevel:           'error',`
- `110: apiTimeout:         number;           // ms`
- `131: offlineQueueMax:    number;`
- `175: apiTimeout:         Number(process.env.EXPO_PUBLIC_API_TIMEOUT ?? 10_000),`
- `196: offlineQueueMax:    100,`
- `231: | 'apiTimeout' | 'apiRetries' | 'tourCooldownMs' | 'tourMaxCrashCount'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
