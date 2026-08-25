# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/web-token-scan.txt`
- **Member SHA-256:** `11465e11c70e3bdb790072558ea204828849d120744ac92c88841333e68ae2c3`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: app/api/patient/[...path]/route.test.ts:65:    expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));`
- `18: lib/api/sandbox-home-care-contract.test.ts:36:    const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `19: lib/api/sandbox-home-care-contract.test.ts:40:    const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) })`
- `20: lib/api/sandbox-home-care-contract.test.ts:42:    const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) })`
- `22: lib/api/sandbox-diagnostics-contracts.test.ts:43:      const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `23: lib/api/sandbox-diagnostics-contracts.test.ts:48:      const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_0`
- `24: lib/api/sandbox-diagnostics-contracts.test.ts:50:      const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_0`
### backend_consumers_or_contracts
- `1: app/api/patient/[...path]/route.test.ts:65:    expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));`
- `2: lib/auth/refresh.ts:6:  return JSON.stringify({ refresh_token: refreshToken });`
- `3: lib/auth/refresh.test.ts:5:  it("uses the backend refresh_token key and accepts only a complete rotated token pair", () => {`
- `4: lib/auth/refresh.test.ts:6:    expect(JSON.parse(refreshRequestBody("refresh-value"))).toEqual({ refresh_token: "refresh-value" });`
- `5: lib/api/upstream.ts:6:  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);`
- `6: lib/api/settings.test.ts:10:    expect(parseSessions([{ id: "private-jti", device: "web", expires_in_seconds: 86400, access_token: "private" }])).toEqual([{ device: "web", expiresInSeconds: 86400 }]);`
- `7: lib/api/sandbox-vitals-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `8: lib/api/sandbox-specialty-provider-count.test.ts:39:    const headers = { authorization: `Bearer ${accessToken}` };`
- `9: lib/api/sandbox-reminders-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `10: lib/api/sandbox-profile-contracts.test.ts:26:        fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })`
- `11: lib/api/sandbox-profile-contracts.test.ts:63:      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });`
- `12: lib/api/sandbox-profile-contracts.test.ts:82:    const medicalResponse = await fetch(`${baseUrl}/medical-profile`, { headers: { authorization: `Bearer ${token}` } });`
### auth_ownership
- `1: app/api/patient/[...path]/route.test.ts:65:    expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));`
- `2: lib/auth/refresh.ts:6:  return JSON.stringify({ refresh_token: refreshToken });`
- `3: lib/auth/refresh.test.ts:5:  it("uses the backend refresh_token key and accepts only a complete rotated token pair", () => {`
- `4: lib/auth/refresh.test.ts:6:    expect(JSON.parse(refreshRequestBody("refresh-value"))).toEqual({ refresh_token: "refresh-value" });`
- `5: lib/api/upstream.ts:6:  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);`
- `6: lib/api/settings.test.ts:10:    expect(parseSessions([{ id: "private-jti", device: "web", expires_in_seconds: 86400, access_token: "private" }])).toEqual([{ device: "web", expiresInSeconds: 86400 }]);`
- `7: lib/api/sandbox-vitals-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `8: lib/api/sandbox-specialty-provider-count.test.ts:39:    const headers = { authorization: `Bearer ${accessToken}` };`
- `9: lib/api/sandbox-reminders-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `10: lib/api/sandbox-profile-contracts.test.ts:26:        fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })`
- `11: lib/api/sandbox-profile-contracts.test.ts:63:      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });`
- `12: lib/api/sandbox-profile-contracts.test.ts:82:    const medicalResponse = await fetch(`${baseUrl}/medical-profile`, { headers: { authorization: `Bearer ${token}` } });`
### state_transitions
- `1: app/api/patient/[...path]/route.test.ts:65:    expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: lib/api/sandbox-vitals-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `9: lib/api/sandbox-reminders-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `14: lib/api/sandbox-prescriptions-contract.test.ts:28:    const response = await fetch(`${baseUrl}/prescriptions/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `18: lib/api/sandbox-home-care-contract.test.ts:36:    const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `19: lib/api/sandbox-home-care-contract.test.ts:40:    const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) })`
- `20: lib/api/sandbox-home-care-contract.test.ts:42:    const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) })`
- `21: lib/api/sandbox-family-contract.test.ts:28:    const list = await fetch(`${baseUrl}/family/members`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `22: lib/api/sandbox-diagnostics-contracts.test.ts:43:      const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `23: lib/api/sandbox-diagnostics-contracts.test.ts:48:      const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_0`
- `24: lib/api/sandbox-diagnostics-contracts.test.ts:50:      const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_0`
- `25: lib/api/sandbox-chat-contract.test.ts:28:    const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `26: lib/api/sandbox-appointments-contracts.test.ts:42:    const listResponse = await fetch(`${baseUrl}/care/appointments`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
