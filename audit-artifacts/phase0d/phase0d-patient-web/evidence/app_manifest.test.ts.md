# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/manifest.test.ts`
- **Member SHA-256:** `d3d54b1cc40e453d9dc12c9f25b7c470febe421893b195a9a7ff35f4a5771f1e`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: it("contains only public identity and a locale start route", () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: expect(JSON.stringify(data)).not.toMatch(/accessToken|refreshToken|appointmentId|prescriptionId/i);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
