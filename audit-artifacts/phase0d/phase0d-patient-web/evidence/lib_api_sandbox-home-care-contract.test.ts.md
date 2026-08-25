# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-home-care-contract.test.ts`
- **Member SHA-256:** `2cf053e36b88995e473b6835088071d394c76b520b8a1fd9c24bf488ba750996`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `21: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `30: describeSandbox("Sandbox home-care booking contract", () => {`
- `34: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `35: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
- `36: const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `38: const bookingId = firstResourceId(await list.json().catch(() => null));`
- `39: if (!bookingId) return;`
- `40: const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `42: const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`
### backend_consumers_or_contracts
- `21: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `36: const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `40: const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `42: const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `3: function findAccessToken(value: unknown): string | undefined {`
- `5: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `7: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `8: return Object.values(record).map(findAccessToken).find(Boolean);`
- `18: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `21: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `23: const accessToken = findAccessToken(await response.json());`
- `24: expect(accessToken).toBeTruthy();`
- `25: return accessToken as string;`
- `31: it("allows the owner to read their list and rejects another patient for any available detail", async () => {`
- `34: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `35: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
### state_transitions
- `37: expect(list.status).toBe(200);`
- `41: expect(ownerDetail.status).toBe(200);`
- `43: expect([403, 404]).toContain(otherDetail.status);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `21: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `36: const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `38: const bookingId = firstResourceId(await list.json().catch(() => null));`
- `40: const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `42: const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
