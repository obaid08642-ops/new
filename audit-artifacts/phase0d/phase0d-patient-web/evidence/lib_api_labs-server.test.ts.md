# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/labs-server.test.ts`
- **Member SHA-256:** `a67559c93be7782371c7b18723efe0414dde43528bcdf0f12da9c26a8d027e81`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: vi.mock("@/lib/api/upstream", () => ({ patientApiUrl: (path: string) => `https://api.test${path}` }));`
- `7: import { getPublicLabServices } from "./labs-server";`
- `15: expect(url).toBe("https://api.test/labs/services?category=blood&search=cbc&home_visit=true&lowest_price=true");`
### auth_ownership
- `17: expect(init.headers).not.toHaveProperty("Authorization");`
### state_transitions
- `12: fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));`
### payment_insurance_relevance
- `13: await getPublicLabServices({ search: "cbc", category: "blood", homeOnly: true, lowestPrice: true });`
- `15: expect(url).toBe("https://api.test/labs/services?category=blood&search=cbc&home_visit=true&lowest_price=true");`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
