# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/locale-selector.test.tsx`
- **Member SHA-256:** `f4bb760a7e6b79ba750004a310cde82eff919c0b7c486ebc0814db60ea24c96e`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: it("renders all six route-localized choices and marks the active locale", () => {`
- `9: for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) expect(html).toContain(`href="/${locale}"`);`
- `10: expect(html).toContain('aria-current="page"');`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
