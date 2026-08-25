# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-appointments-contracts.test.ts`
- **Member SHA-256:** `ee59f51d32a1dfee46e6e8dd6b60cd5d3469f618f08a79c9d3d60df105727160`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: async function login(identifier: string | undefined, password: string | undefined, baseUrl: string) {`
- `21: const response = await fetch(`${baseUrl}/auth/login`, {`
- `39: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `40: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
### backend_consumers_or_contracts
- `21: const response = await fetch(`${baseUrl}/auth/login`, {`
- `42: const listResponse = await fetch(`${baseUrl}/care/appointments`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `47: const ownerDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `49: const otherDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`
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
- `39: const ownerToken = await login(process.env.NABD_SANDBOX_OWNER_EMAIL, process.env.NABD_SANDBOX_OWNER_PASSWORD, baseUrl as string);`
- `40: const otherToken = await login(process.env.NABD_SANDBOX_OTHER_EMAIL, process.env.NABD_SANDBOX_OTHER_PASSWORD, baseUrl as string);`
- `42: const listResponse = await fetch(`${baseUrl}/care/appointments`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
### state_transitions
- `43: expect(listResponse.status).toBe(200);`
- `48: expect(ownerDetail.status).toBe(200);`
- `50: expect([403, 404]).toContain(otherDetail.status);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `25: signal: AbortSignal.timeout(12_000),`
- `42: const listResponse = await fetch(`${baseUrl}/care/appointments`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `44: const appointmentId = firstAppointmentId(await listResponse.json().catch(() => null));`
- `47: const ownerDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `49: const otherDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
