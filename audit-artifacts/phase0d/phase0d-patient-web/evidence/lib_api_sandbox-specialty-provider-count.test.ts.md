# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-specialty-provider-count.test.ts`
- **Member SHA-256:** `a9115c0d68b5e10f0eac2545388cabf46f04fd30bd38bb03e17ef40808e60241`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `35: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `36: expect(login.ok).toBe(true);`
- `37: const accessToken = findAccessToken(await login.json());`
### backend_consumers_or_contracts
- `35: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `41: const specialtiesResponse = await fetch(`${baseUrl}/care/specialties`, { headers, signal: AbortSignal.timeout(12_000) });`
- `42: const doctorsResponse = await fetch(`${baseUrl}/care/doctors`, { headers, signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- `3: function findAccessToken(value: unknown): string | undefined {`
- `5: if (Array.isArray(value)) return value.map(findAccessToken).find(Boolean);`
- `7: if (typeof record.accessToken === "string" && record.accessToken.length > 20) return record.accessToken;`
- `8: return Object.values(record).map(findAccessToken).find(Boolean);`
- `31: const identifier = process.env.NABD_SANDBOX_OWNER_EMAIL;`
- `32: const password = process.env.NABD_SANDBOX_OWNER_PASSWORD;`
- `35: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `36: expect(login.ok).toBe(true);`
- `37: const accessToken = findAccessToken(await login.json());`
- `38: expect(accessToken).toBeTruthy();`
- `39: const headers = { authorization: `Bearer ${accessToken}` };`
### state_transitions
- `29: it("returns non-empty specialty and doctor discovery records without exposing their contents", async () => {`
- `43: expect(specialtiesResponse.status).toBe(200);`
- `44: expect(doctorsResponse.status).toBe(200);`
- `48: expect(specialties, "Sandbox specialty discovery must not be empty").toBeGreaterThan(0);`
- `49: expect(doctors, "Sandbox doctor discovery must not be empty").toBeGreaterThan(0);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `29: it("returns non-empty specialty and doctor discovery records without exposing their contents", async () => {`
- `35: const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });`
- `41: const specialtiesResponse = await fetch(`${baseUrl}/care/specialties`, { headers, signal: AbortSignal.timeout(12_000) });`
- `42: const doctorsResponse = await fetch(`${baseUrl}/care/doctors`, { headers, signal: AbortSignal.timeout(12_000) });`
- `46: const specialties = countRecords(await specialtiesResponse.json().catch(() => null));`
- `47: const doctors = countRecords(await doctorsResponse.json().catch(() => null));`
- `48: expect(specialties, "Sandbox specialty discovery must not be empty").toBeGreaterThan(0);`
- `49: expect(doctors, "Sandbox doctor discovery must not be empty").toBeGreaterThan(0);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
