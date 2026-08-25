# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/public-medicines-server.test.ts`
- **Member SHA-256:** `18ab578e98ccc03fb0866848e3b9ca7ad0c0a688b79cc4cd6718561b600ea339`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: await expect(getPublicMedicines({ page: 1 })).resolves.toBeNull();`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect timeout")));`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect timeout")));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
