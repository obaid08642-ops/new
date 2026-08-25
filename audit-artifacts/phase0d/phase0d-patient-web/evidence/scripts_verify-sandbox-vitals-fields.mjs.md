# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-sandbox-vitals-fields.mjs`
- **Member SHA-256:** `61c25728417c70ac417399f12d978aa7a06d61442248aa1a75ec44e03879b67f`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `15: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `16: const accessToken = findAccessToken(await login.json());`
- `17: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
### backend_consumers_or_contracts
- `14: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `18: const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `2: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `3: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `7: function findAccessToken(value) {`
- `9: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `10: if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;`
- `11: return Object.values(value).map(findAccessToken).find(Boolean);`
- `14: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `15: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `16: const accessToken = findAccessToken(await login.json());`
- `17: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `18: const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### state_transitions
- `5: if (!baseUrl || !identifier || !password) throw new Error("Vitals verification requires configured Sandbox environment variables");`
- `15: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `17: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `19: if (!response.ok) throw new Error(`Vital summary returned ${response.status}`);`
- `22: console.log(`vital-summary: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`
### payment_insurance_relevance
- `20: const payload = await response.json();`
- `21: const keys = payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload).sort() : [];`
### error_empty_loading_retry_cancel
- `5: if (!baseUrl || !identifier || !password) throw new Error("Vitals verification requires configured Sandbox environment variables");`
- `14: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `15: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `17: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `18: const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `19: if (!response.ok) throw new Error(`Vital summary returned ${response.status}`);`
- `22: console.log(`vital-summary: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
