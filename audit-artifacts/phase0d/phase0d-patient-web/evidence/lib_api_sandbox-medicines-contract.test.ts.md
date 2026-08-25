# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/sandbox-medicines-contract.test.ts`
- **Member SHA-256:** `2a0911d8fd9e57cea3cac42597dc78b36385eac01601e4170ad2bcecdcc9ba7a`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: const search = await fetch(`${baseUrl}/medicines?limit=1&page=1&q=${encodeURIComponent(searchTerm)}`, { signal: AbortSignal.timeout(12_000) });`
### backend_consumers_or_contracts
- `9: const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });`
- `20: const detail = await fetch(`${baseUrl}/medicines/${encodeURIComponent(id)}/details`, { signal: AbortSignal.timeout(12_000) });`
- `24: const search = await fetch(`${baseUrl}/medicines?limit=1&page=1&q=${encodeURIComponent(searchTerm)}`, { signal: AbortSignal.timeout(12_000) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: expect(response.status).toBe(200);`
- `21: expect(detail.status).toBe(200);`
- `25: expect(search.status).toBe(200);`
### payment_insurance_relevance
- `11: const payload: unknown = await response.json();`
- `12: expect(payload === null || typeof payload === "object").toBe(true);`
- `13: const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;`
- `14: const items = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.items) ? root.items : Array.isArray(root?.results) ? root.results : [];`
### error_empty_loading_retry_cancel
- `9: const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });`
- `20: const detail = await fetch(`${baseUrl}/medicines/${encodeURIComponent(id)}/details`, { signal: AbortSignal.timeout(12_000) });`
- `24: const search = await fetch(`${baseUrl}/medicines?limit=1&page=1&q=${encodeURIComponent(searchTerm)}`, { signal: AbortSignal.timeout(12_000) });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
