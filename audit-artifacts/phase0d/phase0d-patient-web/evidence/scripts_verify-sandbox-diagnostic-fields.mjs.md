# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-sandbox-diagnostic-fields.mjs`
- **Member SHA-256:** `6c273e9dba6888a36776ce6cc0a31557711af6e79ddc76cf7bcdcb3b90a5b3a8`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `23: const accessToken = findAccessToken(await login.json());`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `27: const response = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### backend_consumers_or_contracts
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `27: const response = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `2: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `3: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `7: function findAccessToken(value) {`
- `9: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `10: if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;`
- `11: return Object.values(value).map(findAccessToken).find(Boolean);`
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `23: const accessToken = findAccessToken(await login.json());`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `27: const response = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### state_transitions
- `5: if (!baseUrl || !identifier || !password) throw new Error("Diagnostic verification requires configured Sandbox environment variables");`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `28: if (!response.ok) throw new Error(`${domain} list returned ${response.status}`);`
- `32: console.log(`${domain}: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}; id_format=${id ? (id.length === 36 ? "uuid_length" : `length_${id.length}`) : "none"}`);`
### payment_insurance_relevance
- `14: function firstRow(payload) {`
- `15: if (Array.isArray(payload)) return payload[0];`
- `16: if (!payload || typeof payload !== "object") return undefined;`
- `17: for (const value of [payload.data, payload.items, payload.results]) if (Array.isArray(value)) return value[0];`
### error_empty_loading_retry_cancel
- `5: if (!baseUrl || !identifier || !password) throw new Error("Diagnostic verification requires configured Sandbox environment variables");`
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `27: const response = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `28: if (!response.ok) throw new Error(`${domain} list returned ${response.status}`);`
- `32: console.log(`${domain}: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}; id_format=${id ? (id.length === 36 ? "uuid_length" : `length_${id.length}`) : "none"}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
