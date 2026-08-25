# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/verify-sandbox-profile-fields.mjs`
- **Member SHA-256:** `651e48a58543e1036c1545634953aa8ab1e8ca2e6a20d260a28b05a5f3118844`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: const login = await fetch(`${baseUrl}/auth/login`, {`
- `32: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `33: const accessToken = findAccessToken(await login.json());`
- `34: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
### backend_consumers_or_contracts
- `25: const login = await fetch(`${baseUrl}/auth/login`, {`
- `36: const paths = ["/users/me/profile", "/medical-profile", "/users/me/insurance"];`
- `38: const response = await fetch(`${baseUrl}${path}`, {`
### auth_ownership
- `2: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `3: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `9: function findAccessToken(value) {`
- `11: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `12: if (typeof value.accessToken === "string" && value.accessToken.length > 20) return value.accessToken;`
- `13: return Object.values(value).map(findAccessToken).find(Boolean);`
- `25: const login = await fetch(`${baseUrl}/auth/login`, {`
- `32: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `33: const accessToken = findAccessToken(await login.json());`
- `34: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `39: headers: { authorization: `Bearer ${accessToken}` },`
### state_transitions
- `6: throw new Error("Sandbox profile verification requires configured environment variables");`
- `32: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `34: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `43: if (!response.ok) throw new Error(`${path} returned ${response.status}`);`
- `45: console.log(`${path}: ${fields.length} primitive field name(s); ${fields.length ? `keys=${fields.join(",")}` : "empty record"}`);`
### payment_insurance_relevance
- `36: const paths = ["/users/me/profile", "/medical-profile", "/users/me/insurance"];`
- `42: const payload = await response.json().catch(() => null);`
- `44: const fields = primitiveFieldKeys(payload);`
### error_empty_loading_retry_cancel
- `6: throw new Error("Sandbox profile verification requires configured environment variables");`
- `29: signal: AbortSignal.timeout(12_000),`
- `32: if (!login.ok) throw new Error(`Sandbox login returned ${login.status}`);`
- `34: if (!accessToken) throw new Error("Sandbox login response did not contain an access token");`
- `40: signal: AbortSignal.timeout(12_000),`
- `42: const payload = await response.json().catch(() => null);`
- `43: if (!response.ok) throw new Error(`${path} returned ${response.status}`);`
- `45: console.log(`${path}: ${fields.length} primitive field name(s); ${fields.length ? `keys=${fields.join(",")}` : "empty record"}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
