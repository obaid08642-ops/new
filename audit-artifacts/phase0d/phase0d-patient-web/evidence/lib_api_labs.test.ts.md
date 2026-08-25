# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/labs.test.ts`
- **Member SHA-256:** `2e5a39df03818eaa4dbc30d28b80ec71adfba9937134f3555a34387596a5110f`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { extractLabService, extractLabServices, parseLabServiceId } from "./labs";`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: expect(parseLabServiceId("bad/id").success).toBe(false);`
### payment_insurance_relevance
- `6: const item = extractLabService({ id: "cbc", name_en: "CBC", price: 20, patient_id: "secret", provider_account_id: "internal", __v: 4 });`
- `7: expect(item).toEqual(expect.objectContaining({ id: "cbc", nameEn: "CBC", price: 20 }));`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
