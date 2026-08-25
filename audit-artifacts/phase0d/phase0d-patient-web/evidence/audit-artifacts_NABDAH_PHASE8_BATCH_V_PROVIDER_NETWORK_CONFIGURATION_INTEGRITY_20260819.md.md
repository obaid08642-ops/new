# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_V_PROVIDER_NETWORK_CONFIGURATION_INTEGRITY_20260819.md`
- **Member SHA-256:** `face98b60c128ef6b5548aad1657c612ffd2e2c01db8bf3572eea33fb22ff206`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider audit found several routes that could bypass the intended production API configuration: stale `nabdahplus.sa/.com` hosts, emulator/localhost fallbacks, an environment-controlled socket host, a persistent `CUSTOM_API_IP` overrid`
- `13: | Login and refresh | Provider login and refresh now always use `API_BASE`; a saved custom IP cannot redirect credential-bearing requests. |`
- `14: | Provider UI | The long-press/version-link IP override trigger and override modal were removed from the release login screen. |`
- `16: | Regression guard | Release-contract coverage asserts the canonical host, absence of the override mechanism/local emulator route/legacy domains, and the shared HTTP base. |`
- `27: | Branch upload | **PASS** — source commit `34e424b` (`fix: harden provider API configuration`) is on `manus/on-live-reconciliation`. |`
- `35: No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected c`
### backend_consumers_or_contracts
- `5: The Provider audit found several routes that could bypass the intended production API configuration: stale `nabdahplus.sa/.com` hosts, emulator/localhost fallbacks, an environment-controlled socket host, a persistent `CUSTOM_API_IP` overrid`
- `11: | Canonical API configuration | `API_BASE` now validates the declared runtime value and permits only `https://api.nabd.plus/api/v1`; insecure protocol, legacy host, altered path, query, fragment, or malformed configuration throws instead of`
- `12: | REST clients | Shared axios and the previously stale `HttpClient` use the validated `API_BASE`. The interceptor no longer reads or honors `CUSTOM_API_IP`. |`
- `15: | WebSocket | Pharmacy chat derives its Socket.IO origin from the same validated API base; it no longer prefers a separate `EXPO_PUBLIC_BACKEND_URL`. |`
- `35: No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected c`
### auth_ownership
- `5: The Provider audit found several routes that could bypass the intended production API configuration: stale `nabdahplus.sa/.com` hosts, emulator/localhost fallbacks, an environment-controlled socket host, a persistent `CUSTOM_API_IP` overrid`
- `13: | Login and refresh | Provider login and refresh now always use `API_BASE`; a saved custom IP cannot redirect credential-bearing requests. |`
- `14: | Provider UI | The long-press/version-link IP override trigger and override modal were removed from the release login screen. |`
- `35: No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected c`
### state_transitions
- `31: The initial provider dependency installation encountered a peer-resolution conflict, then inode exhaustion from stale local worktrees. The cleanup removed only reinstallable `node_modules`, `.expo`, `dist`, coverage, partial installation an`
- `35: No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected c`
### payment_insurance_relevance
- `16: | Regression guard | Release-contract coverage asserts the canonical host, absence of the override mechanism/local emulator route/legacy domains, and the shared HTTP base. |`
- `31: The initial provider dependency installation encountered a peer-resolution conflict, then inode exhaustion from stale local worktrees. The cleanup removed only reinstallable `node_modules`, `.expo`, `dist`, coverage, partial installation an`
- `35: No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected c`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
