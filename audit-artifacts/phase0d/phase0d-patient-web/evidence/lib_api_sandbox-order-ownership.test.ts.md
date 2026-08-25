# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-order-ownership.test.ts`
- **Member SHA-256:** `cba04d959851ee0f1a632c349579e4b2722cc1f3137dc6ab9d1038a38554750f`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `16: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `26: it("allows only the owner to read the designated cancelled order", async () => {`
- `29: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `30: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
### backend_consumers_or_contracts
- `16: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `32: const ownerResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${ownerToken}` } });`
- `35: const otherResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${otherToken}` } });`
### auth_ownership
- `5: function findAccessToken(value: unknown): string | undefined {`
- `7: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `9: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `10: return Object.values(record).map(findAccessToken).find(Boolean);`
- `13: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `16: const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });`
- `18: const token = findAccessToken(await response.json());`
- `19: expect(token).toBeTruthy();`
- `20: return token as string;`
- `25: describeSandbox("Sandbox order ownership", () => {`
- `26: it("allows only the owner to read the designated cancelled order", async () => {`
- `29: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
### state_transitions
- `26: it("allows only the owner to read the designated cancelled order", async () => {`
- `33: expect(ownerResponse.status).toBe(200);`
- `36: expect([403, 404]).toContain(otherResponse.status);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: it("allows only the owner to read the designated cancelled order", async () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
