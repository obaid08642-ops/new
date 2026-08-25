# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-diagnostics-contracts.test.ts`
- **Member SHA-256:** `f2c679ce8c7ad99d214247c7b92fe389ee05c06cfd2345479a808f0fd8f2738f`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `21: const response = await fetch(`${baseUrl}/auth/login`, {`
- `35: describeSandbox("Sandbox diagnostic booking contracts", () => {`
- `39: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `40: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
- `43: const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `48: const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `50: const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`
### backend_consumers_or_contracts
- `21: const response = await fetch(`${baseUrl}/auth/login`, {`
- `43: const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `48: const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `50: const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `3: function findAccessToken(value: unknown): string | undefined {`
- `5: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `7: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `8: return Object.values(record).map(findAccessToken).find(Boolean);`
- `18: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `21: const response = await fetch(`${baseUrl}/auth/login`, {`
- `28: const accessToken = findAccessToken(await response.json());`
- `29: expect(accessToken).toBeTruthy();`
- `30: return accessToken as string;`
- `36: it("allows the owner to read list endpoints and rejects another patient for any available detail", async () => {`
- `39: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `40: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
### state_transitions
- `44: expect(list.status).toBe(200);`
- `49: expect(ownerDetail.status).toBe(200);`
- `51: expect([403, 404]).toContain(otherDetail.status);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `25: signal: AbortSignal.timeout(12_000),`
- `43: const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `45: const resourceId = firstResourceId(await list.json().catch(() => null));`
- `48: const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `50: const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
