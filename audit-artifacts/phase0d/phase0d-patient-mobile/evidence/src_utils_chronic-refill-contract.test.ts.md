# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/chronic-refill-contract.test.ts`
- **Member SHA-256:** `f0eac86d0d70fc5810ccfc892f482e088b5b4f46091f2d1533ae7141f4ebafd1`
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
- No matching static signal found in this member.
### state_transitions
- `5: expect(refillTrackingParams({ ok: true, order_id: 'order-42', state: 'CREATED' })).toEqual({ orderId: 'order-42' });`
- `8: it('does not fabricate a tracking id from an incomplete or failed refill response', () => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: it('does not fabricate a tracking id from an incomplete or failed refill response', () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
