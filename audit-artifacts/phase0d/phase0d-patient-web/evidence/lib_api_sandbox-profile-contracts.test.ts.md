# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-profile-contracts.test.ts`
- **Member SHA-256:** `c469825873dfb495438883b3bf44c0b0574e994065b6c65af9262f4ffdb3376c`
- **Line count:** 95
- **Read range:** `1-95`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `21: expect(loginResponse.ok).toBe(true);`
- `22: const token = findAccessToken(await loginResponse.json());`
- `51: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `52: expect(loginResponse.ok).toBe(true);`
- `53: const token = findAccessToken(await loginResponse.json());`
- `77: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `78: expect(loginResponse.ok).toBe(true);`
- `79: const token = findAccessToken(await loginResponse.json());`
### backend_consumers_or_contracts
- `20: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `25: ["/users/me/profile", "/medical-profile", "/users/me/insurance"].map((path) =>`
- `26: fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })`
- `39: for (const path of ["/users/me/profile", "/medical-profile", "/users/me/insurance"]) {`
- `40: const response = await fetch(`${baseUrl}${path}`);`
- `51: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `59: ["/users/me/insurance", ["providerName", "companyName", "status"]]`
- `63: const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });`
- `77: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `82: const medicalResponse = await fetch(`${baseUrl}/medical-profile`, { headers: { authorization: `Bearer ${token}` } });`
- `88: for (const [path, acceptedKeys] of [["/users/me/profile", ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]], ["/users/me/insurance", ["providerName", "companyName", "status"]]] as const) {`
- `89: const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });`
### auth_ownership
- `4: function findAccessToken(value: unknown): string | undefined {`
- `6: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `8: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `9: return Object.values(record).map(findAccessToken).find(Boolean);`
- `15: it("permits the owner to read profile domains without returning an authorization error", async () => {`
- `17: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `18: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `20: const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `21: expect(loginResponse.ok).toBe(true);`
- `22: const token = findAccessToken(await loginResponse.json());`
- `23: expect(token).toBeTruthy();`
- `26: fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })`
### state_transitions
- `2: import { extractRecord, profileDomainState, readProfileFields } from "./profile";`
- `15: it("permits the owner to read profile domains without returning an authorization error", async () => {`
- `30: expect(response.status).not.toBe(401);`
- `31: expect(response.status).not.toBe(403);`
- `41: expect(response.status).toBe(401);`
- `45: it("enforces the web display allowlist for every successful live profile response", async () => {`
- `59: ["/users/me/insurance", ["providerName", "companyName", "status"]]`
- `71: it("proves that allowed medical fields can be displayed while successful empty domains remain empty", async () => {`
- `86: expect(profileDomainState(medicalResponse.status, medicalFields.length)).toBe("available");`
- `88: for (const [path, acceptedKeys] of [["/users/me/profile", ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]], ["/users/me/insurance", ["providerName", "companyName", "status"]]] as const) {`
- `92: expect(["available", "empty"]).toContain(profileDomainState(response.status, fields.length));`
### payment_insurance_relevance
- `25: ["/users/me/profile", "/medical-profile", "/users/me/insurance"].map((path) =>`
- `39: for (const path of ["/users/me/profile", "/medical-profile", "/users/me/insurance"]) {`
- `59: ["/users/me/insurance", ["providerName", "companyName", "status"]]`
- `88: for (const [path, acceptedKeys] of [["/users/me/profile", ["fullName", "name", "email", "phone", "mobile", "dateOfBirth"]], ["/users/me/insurance", ["providerName", "companyName", "status"]]] as const) {`
### error_empty_loading_retry_cancel
- `15: it("permits the owner to read profile domains without returning an authorization error", async () => {`
- `65: const record = extractRecord(await response.json().catch(() => null));`
- `71: it("proves that allowed medical fields can be displayed while successful empty domains remain empty", async () => {`
- `84: const medicalFields = readProfileFields(extractRecord(await medicalResponse.json().catch(() => null)), ["bloodType", "height", "weight", "gender", "is_smoker", "drinks_alcohol", "is_pregnant", "is_breastfeeding"]);`
- `91: const fields = readProfileFields(extractRecord(await response.json().catch(() => null)), [...acceptedKeys]);`
- `92: expect(["available", "empty"]).toContain(profileDomainState(response.status, fields.length));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
