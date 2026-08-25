# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-chat-contract.test.ts`
- **Member SHA-256:** `01f2cd0b9fabea828b1416f1b15d0918f20c59c442ca3cbeba3c02dfe11f7144`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `27: const accessToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
### backend_consumers_or_contracts
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `28: const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `38: const response = await fetch(`${baseUrl}/chat/threads`, { signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `3: function findAccessToken(value: unknown): string | undefined {`
- `5: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `7: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `8: return Object.values(record).map(findAccessToken).find(Boolean);`
- `11: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `16: const accessToken = findAccessToken(await response.json());`
- `17: expect(accessToken).toBeTruthy();`
- `18: return accessToken as string;`
- `27: const accessToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `28: const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `34: it("rejects the self-scoped thread list without a patient session", async () => {`
### state_transitions
- `24: it("reads the current patient's thread list without reading messages or changing thread state", async () => {`
- `29: expect(response.status).toBe(200);`
- `39: expect(response.status).toBe(401);`
### payment_insurance_relevance
- `30: const payload: unknown = await response.json();`
- `31: expect(payload === null || typeof payload === "object").toBe(true);`
### error_empty_loading_retry_cancel
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `28: const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `38: const response = await fetch(`${baseUrl}/chat/threads`, { signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
