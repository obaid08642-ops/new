# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-notifications-contract.test.ts`
- **Member SHA-256:** `ff89791efd818ae95e2dbb502733ba4d597adc2a8dc3b847561d2db11608deb0`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `27: const accessToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
### backend_consumers_or_contracts
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `29: const list = await fetch(`${baseUrl}/notifications`, { headers, signal: AbortSignal.timeout(25_000) });`
- `30: const count = await fetch(`${baseUrl}/notifications/unread-count`, { headers, signal: AbortSignal.timeout(25_000) });`
- `42: fetch(`${baseUrl}/notifications`, { signal: AbortSignal.timeout(12_000) }),`
- `43: fetch(`${baseUrl}/notifications/unread-count`, { signal: AbortSignal.timeout(12_000) })`
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
- `28: const headers = { authorization: `Bearer ${accessToken}` };`
- `37: it("rejects notification reads without a patient session", async () => {`
### state_transitions
- `24: it("reads notifications and unread count without changing their state", async () => {`
- `31: expect(list.status).toBe(200);`
- `32: expect(count.status).toBe(200);`
- `45: expect(list.status).toBe(401);`
- `46: expect(count.status).toBe(401);`
### payment_insurance_relevance
- `33: const payload: unknown = await list.json();`
- `34: expect(payload === null || typeof payload === "object").toBe(true);`
### error_empty_loading_retry_cancel
- `14: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `29: const list = await fetch(`${baseUrl}/notifications`, { headers, signal: AbortSignal.timeout(25_000) });`
- `30: const count = await fetch(`${baseUrl}/notifications/unread-count`, { headers, signal: AbortSignal.timeout(25_000) });`
- `42: fetch(`${baseUrl}/notifications`, { signal: AbortSignal.timeout(12_000) }),`
- `43: fetch(`${baseUrl}/notifications/unread-count`, { signal: AbortSignal.timeout(12_000) })`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
