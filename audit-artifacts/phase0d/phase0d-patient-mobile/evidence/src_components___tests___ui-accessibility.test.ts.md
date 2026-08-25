# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/__tests__/ui-accessibility.test.ts`
- **Member SHA-256:** `d4e7b64c575e7f7a3e6794bb788f9e7cdff6e17de2b234f63cc8d6dfcbbf9af0`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: expect(source).toContain('accessibilityRole="button"');`
### state_transitions
- `11: expect(source).toContain('accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: expect(source).toContain('accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
