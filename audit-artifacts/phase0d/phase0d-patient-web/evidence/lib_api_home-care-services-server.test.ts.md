# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-services-server.test.ts`
- **Member SHA-256:** `028479dc09f0d31f3e4f2b16814f6516b9e8a14480b644decbe5ac56daef33dd`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { getPublicHomeCareService, getPublicHomeCareServices } from "./home-care-services-server";`
- `9: it("allows only a safe detail identifier", async () => { await getPublicHomeCareService("svc-1"); expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/home-care/services/svc-1"), expect.any(Object)); await expect(getPubli`
### auth_ownership
- `8: it("does not send Authorization for list", async () => { await getPublicHomeCareServices(); const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]; expect(options.headers).toEqual({ Accept: "application/json" }); }`
### state_transitions
- `6: beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
