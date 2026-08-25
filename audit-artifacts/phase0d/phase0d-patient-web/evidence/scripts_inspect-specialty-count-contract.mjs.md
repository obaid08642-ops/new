# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/inspect-specialty-count-contract.mjs`
- **Member SHA-256:** `b2e189027a18aa06678702a2ede28ef6a881779c537b01d37c76561dee1b5b7b`
- **Line count:** 66
- **Read range:** `1-66`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `26: const login = await fetch(`${baseUrl}/auth/login`, {`
- `33: if (!login.ok) throw new Error(`Sandbox login failed with ${login.status}`);`
- `35: const accessToken = findAccessToken(await login.json());`
- `36: if (!accessToken) throw new Error("Sandbox login returned no usable access token");`
### backend_consumers_or_contracts
- `26: const login = await fetch(`${baseUrl}/auth/login`, {`
- `38: const response = await fetch(`${baseUrl}/care/specialties`, {`
### auth_ownership
- `1: function findAccessToken(value) {`
- `3: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `4: if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;`
- `5: return Object.values(value).map(findAccessToken).find(Boolean);`
- `19: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `20: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `26: const login = await fetch(`${baseUrl}/auth/login`, {`
- `33: if (!login.ok) throw new Error(`Sandbox login failed with ${login.status}`);`
- `35: const accessToken = findAccessToken(await login.json());`
- `36: if (!accessToken) throw new Error("Sandbox login returned no usable access token");`
- `39: headers: { authorization: `Bearer ${accessToken}` },`
### state_transitions
- `23: throw new Error("Sandbox configuration is unavailable");`
- `33: if (!login.ok) throw new Error(`Sandbox login failed with ${login.status}`);`
- `36: if (!accessToken) throw new Error("Sandbox login returned no usable access token");`
- `43: if (!response.ok) throw new Error(`Specialty discovery failed with ${response.status}`);`
### payment_insurance_relevance
- `53: total: values.length,`
### error_empty_loading_retry_cancel
- `23: throw new Error("Sandbox configuration is unavailable");`
- `30: signal: AbortSignal.timeout(12_000),`
- `33: if (!login.ok) throw new Error(`Sandbox login failed with ${login.status}`);`
- `36: if (!accessToken) throw new Error("Sandbox login returned no usable access token");`
- `40: signal: AbortSignal.timeout(12_000),`
- `43: if (!response.ok) throw new Error(`Specialty discovery failed with ${response.status}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
