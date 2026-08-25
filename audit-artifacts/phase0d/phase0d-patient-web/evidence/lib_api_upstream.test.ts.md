# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/upstream.test.ts`
- **Member SHA-256:** `ca39563a2bbc3075af1462b470b4f6bcd72ba9ce494113492d4042e3d75c3467`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: const response = await callPatientApi("/health/vitals/summary", {}, "server-only-token");`
### state_transitions
- `8: vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network timeout")));`
- `12: expect(response.status).toBe(503);`
- `13: expect(response.statusText).toBe("upstream_unavailable");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network timeout")));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
