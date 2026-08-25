# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_NETWORK_ONBOARDING_BASELINE_20260819.md`
- **Member SHA-256:** `db3a9c40181edf3822e97866c27e62a48148f0b42b2a16c27d6b49480a4b2fea`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider source contains dedicated onboarding/authentication, doctor, pharmacy, laboratory, radiology, nursing, ambulance, facility, and shared-service screens. The Phase 3 audit begins with network and identity behavior because every r`
- `12: | **P1** | Multiple incompatible API/WS origins remain in source | Active `API_BASE` defaults to `https://api.nabd.plus/api/v1`, while `API.BASE` uses `api.nabdahplus.sa` and `HttpClient` uses `api.nabdahplus.com`. The latter client is curr`
- `13: | **P1** | Production-capable debug alert exposes network implementation details | The biometric-login error handler shows the API URL and instructs a provider to verify port 8002 without a production guard. | Replace with a localized safe `
- `15: | **P0** | Welcome screen makes unsupported certification/trust assertions | It displays “MOH Certified,” “Secure Encryption,” and “100% Saudi” without a linked approved certification, policy version, scope or evidence. | Remove every unsub`
- `16: | **P1** | Unauthenticated guest routes expose operational modules without a defined policy | Welcome exposes guest “Medical Jobs” and “Drug Index” entry points before provider authentication, but scope/rate limiting/data classification and`
- `17: | **P0** | Custom API host override remains reachable from release login UI | A long press on the login logo opens the custom-IP configuration path, retaining an arbitrary-host pathway in addition to the HTTP override. | Remove the UI and s`
### backend_consumers_or_contracts
- `5: The Provider source contains dedicated onboarding/authentication, doctor, pharmacy, laboratory, radiology, nursing, ambulance, facility, and shared-service screens. The Phase 3 audit begins with network and identity behavior because every r`
- `11: | **P0** | Provider API client can downgrade to arbitrary clear-text HTTP | `src/api/client.ts` replaces its configured base URL with `http://${customIp}:8002/api/v1` whenever `CUSTOM_API_IP` exists, without a development-only guard or trus`
- `12: | **P1** | Multiple incompatible API/WS origins remain in source | Active `API_BASE` defaults to `https://api.nabd.plus/api/v1`, while `API.BASE` uses `api.nabdahplus.sa` and `HttpClient` uses `api.nabdahplus.com`. The latter client is curr`
- `14: | **P1** | Provider onboarding and auth UI supports only Arabic and English | The language type and welcome/auth copy are AR/EN only, contrary to the approved six-locale platform requirement. | Plan AR/EN/UR/HI/BN/FIL dictionaries, font/RTL`
### auth_ownership
- `13: | **P1** | Production-capable debug alert exposes network implementation details | The biometric-login error handler shows the API URL and instructs a provider to verify port 8002 without a production guard. | Replace with a localized safe `
- `17: | **P0** | Custom API host override remains reachable from release login UI | A long press on the login logo opens the custom-IP configuration path, retaining an arbitrary-host pathway in addition to the HTTP override. | Remove the UI and s`
### state_transitions
- `7: ## Confirmed findings`
- `13: | **P1** | Production-capable debug alert exposes network implementation details | The biometric-login error handler shows the API URL and instructs a provider to verify port 8002 without a production guard. | Replace with a localized safe `
- `14: | **P1** | Provider onboarding and auth UI supports only Arabic and English | The language type and welcome/auth copy are AR/EN only, contrary to the approved six-locale platform requirement. | Plan AR/EN/UR/HI/BN/FIL dictionaries, font/RTL`
- `15: | **P0** | Welcome screen makes unsupported certification/trust assertions | It displays “MOH Certified,” “Secure Encryption,” and “100% Saudi” without a linked approved certification, policy version, scope or evidence. | Remove every unsub`
- `16: | **P1** | Unauthenticated guest routes expose operational modules without a defined policy | Welcome exposes guest “Medical Jobs” and “Drug Index” entry points before provider authentication, but scope/rate limiting/data classification and`
- `21: Provider network and onboarding baseline is **FIX/BLOCKED** for secure release configuration. No service workflow may be declared reliable until a provider account is proven to use the approved production endpoint, secure transport, and cor`
### payment_insurance_relevance
- `14: | **P1** | Provider onboarding and auth UI supports only Arabic and English | The language type and welcome/auth copy are AR/EN only, contrary to the approved six-locale platform requirement. | Plan AR/EN/UR/HI/BN/FIL dictionaries, font/RTL`
### error_empty_loading_retry_cancel
- `13: | **P1** | Production-capable debug alert exposes network implementation details | The biometric-login error handler shows the API URL and instructs a provider to verify port 8002 without a production guard. | Replace with a localized safe `
- `14: | **P1** | Provider onboarding and auth UI supports only Arabic and English | The language type and welcome/auth copy are AR/EN only, contrary to the approved six-locale platform requirement. | Plan AR/EN/UR/HI/BN/FIL dictionaries, font/RTL`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
