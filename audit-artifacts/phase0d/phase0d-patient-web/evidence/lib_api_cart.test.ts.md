# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/cart.test.ts`
- **Member SHA-256:** `aaffe29fa4c83f522b4202e7dae2dff32e233508e9be04997ef133e4c4941a2b`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: expect(parseCartLineId("line-1").success).toBe(true);`
- `7: expect(parseCartLineId("").success).toBe(false);`
- `14: it("returns a truthful empty summary when groups are absent", () => {`
### payment_insurance_relevance
- `11: expect(extractCartSummary({ patient_id: "private", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", qty: 2, price: 6, payment_method: "cash", notes: "private", meta:`
- `15: expect(extractCartSummary({ patient_id: "private", subtotal: 0, total: 0 })).toEqual({ groups: [], subtotal: 0, total: 0, homeVisitFee: undefined, currency: undefined });`
### error_empty_loading_retry_cancel
- `14: it("returns a truthful empty summary when groups are absent", () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
