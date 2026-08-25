# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-secrets.test.ts`
- **Member SHA-256:** `195cbc31eaa16f3e8d11a0bc13cd379e4e59479e40e97ed4e4fd839ee6929138`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: const response = await fetch(`${baseUrl}/auth/login`, {`
### backend_consumers_or_contracts
- `22: const response = await fetch(`${baseUrl}/auth/login`, {`
### auth_ownership
- `3: function findAccessToken(value: unknown): string | undefined {`
- `5: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `7: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `8: return Object.values(record).map(findAccessToken).find(Boolean);`
- `14: it("authenticates the owner account without exposing any credential or token", async () => {`
- `16: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `17: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `22: const response = await fetch(`${baseUrl}/auth/login`, {`
- `29: expect(findAccessToken(payload)).toBeTruthy();`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `28: const payload: unknown = await response.json();`
- `29: expect(findAccessToken(payload)).toBeTruthy();`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
