# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-sandbox-reminder-fields.mjs`
- **Member SHA-256:** `43f1f81fab6a3ca41ab7f9c3d22ffd0381362a7dff0e7e619da3298222d19ce7`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `23: const accessToken = findAccessToken(await login.json());`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
### backend_consumers_or_contracts
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `25: const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
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
- `25: const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
### state_transitions
- `5: if (!baseUrl || !identifier || !password) throw new Error("Reminder verification requires configured Sandbox environment variables");`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `26: if (!response.ok) throw new Error(`Medication reminders returned ${response.status}`);`
- `29: console.log(`reminders: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`
### payment_insurance_relevance
- `14: function firstRow(payload) {`
- `15: if (Array.isArray(payload)) return payload[0];`
- `16: if (!payload || typeof payload !== "object") return undefined;`
- `17: for (const value of [payload.data, payload.items, payload.results, payload.reminders]) if (Array.isArray(value)) return value[0];`
### error_empty_loading_retry_cancel
- `5: if (!baseUrl || !identifier || !password) throw new Error("Reminder verification requires configured Sandbox environment variables");`
- `21: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `22: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `24: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `25: const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `26: if (!response.ok) throw new Error(`Medication reminders returned ${response.status}`);`
- `29: console.log(`reminders: ${keys.length ? `keys=${keys.join(",")}` : "empty result"}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
