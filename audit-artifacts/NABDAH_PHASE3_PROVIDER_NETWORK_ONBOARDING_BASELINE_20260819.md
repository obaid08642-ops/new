# Phase 3 Provider — network and onboarding baseline

## Inventory result

The Provider source contains dedicated onboarding/authentication, doctor, pharmacy, laboratory, radiology, nursing, ambulance, facility, and shared-service screens. The Phase 3 audit begins with network and identity behavior because every receiving/fulfilment workflow depends on the selected API endpoint and authenticated provider context.

## Confirmed findings

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Provider API client can downgrade to arbitrary clear-text HTTP | `src/api/client.ts` replaces its configured base URL with `http://${customIp}:8002/api/v1` whenever `CUSTOM_API_IP` exists, without a development-only guard or trusted-host validation. | Remove the override from release builds; enforce HTTPS and an allowlisted configured origin; clear/migrate legacy override values and test that production refuses custom HTTP endpoints. |
| **P1** | Multiple incompatible API/WS origins remain in source | Active `API_BASE` defaults to `https://api.nabd.plus/api/v1`, while `API.BASE` uses `api.nabdahplus.sa` and `HttpClient` uses `api.nabdahplus.com`. The latter client is currently unconsumed, but retained conflicting configuration risks future route drift. | Use one environment-validated API/WS configuration module; remove or migrate dead clients/constants and add a test that all network modules resolve the same permitted origin. |
| **P1** | Production-capable debug alert exposes network implementation details | The biometric-login error handler shows the API URL and instructs a provider to verify port 8002 without a production guard. | Replace with a localized safe retry/offline message; keep diagnostics in protected logs and development-only tooling. |
| **P1** | Provider onboarding and auth UI supports only Arabic and English | The language type and welcome/auth copy are AR/EN only, contrary to the approved six-locale platform requirement. | Plan AR/EN/UR/HI/BN/FIL dictionaries, font/RTL/LTR coverage, backend error translations, and native layout tests before release. |

## Current decision

Provider network and onboarding baseline is **FIX/BLOCKED** for secure release configuration. No service workflow may be declared reliable until a provider account is proven to use the approved production endpoint, secure transport, and correctly scoped authentication.
