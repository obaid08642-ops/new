# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/medicines-server.test.ts`
- **Member SHA-256:** `4a497a7552c6d190b1542a08050dab0d6c9048730c9a056d6c46ea4f871b222a`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: await getPatientMedicines("server-token", { q: "query", page: 1 });`
- `18: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/medicines?limit=24&page=1&q=query", {}, "server-token");`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));`
### auth_ownership
- `11: it("forwards only bounded read paths with the server access token", async () => {`
- `15: await getPatientMedicines("server-token", { q: "query", page: 1 });`
- `16: await getPatientMedicine("server-token", "91047ef2-ad36-422a-a184-629693e7c729");`
- `18: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/medicines?limit=24&page=1&q=query", {}, "server-token");`
- `19: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/medicines/91047ef2-ad36-422a-a184-629693e7c729/details", {}, "server-token");`
### state_transitions
- `12: const response = new Response(null, { status: 200 });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
