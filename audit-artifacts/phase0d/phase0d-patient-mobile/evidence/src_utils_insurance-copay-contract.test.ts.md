# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/insurance-copay-contract.test.ts`
- **Member SHA-256:** `dd2c89831c31a589242af0beb0b82e473a12dfb63d5ad4e575a5f22f06002962`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: const pending = { id: 'request-1', booking_id: 'appointment-1', booking_kind: 'consultation', state: 'COPAY_PENDING', price: 300, copay_amount: 60 };`
- `9: expect(insurancePaymentAction(request)).toBe('checkout_copay');`
### backend_consumers_or_contracts
- `1: import { insurancePaymentAction, parseInsuranceCopayRequest } from './insurance-copay-contract';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: const pending = { id: 'request-1', booking_id: 'appointment-1', booking_kind: 'consultation', state: 'COPAY_PENDING', price: 300, copay_amount: 60 };`
- `7: const request = parseInsuranceCopayRequest(pending);`
- `12: it('does not infer payment eligibility from caller amounts or a pending provider review', () => {`
- `13: expect(insurancePaymentAction(parseInsuranceCopayRequest({ ...pending, state: 'PENDING_PROVIDER_REVIEW', copay_amount: 0 }))).toBe('provider_review');`
- `14: expect(() => parseInsuranceCopayRequest({ ...pending, price: 0 })).toThrow('invalid insurance request contract');`
- `15: expect(() => parseInsuranceCopayRequest({ ...pending, id: '' })).toThrow('invalid insurance request contract');`
### payment_insurance_relevance
- `1: import { insurancePaymentAction, parseInsuranceCopayRequest } from './insurance-copay-contract';`
- `3: const pending = { id: 'request-1', booking_id: 'appointment-1', booking_kind: 'consultation', state: 'COPAY_PENDING', price: 300, copay_amount: 60 };`
- `5: describe('insurance copay contract', () => {`
- `6: it('uses only an owned server request and its server-calculated copay', () => {`
- `7: const request = parseInsuranceCopayRequest(pending);`
- `8: expect(request.copay_amount).toBe(60);`
- `9: expect(insurancePaymentAction(request)).toBe('checkout_copay');`
- `12: it('does not infer payment eligibility from caller amounts or a pending provider review', () => {`
- `13: expect(insurancePaymentAction(parseInsuranceCopayRequest({ ...pending, state: 'PENDING_PROVIDER_REVIEW', copay_amount: 0 }))).toBe('provider_review');`
- `14: expect(() => parseInsuranceCopayRequest({ ...pending, price: 0 })).toThrow('invalid insurance request contract');`
- `15: expect(() => parseInsuranceCopayRequest({ ...pending, id: '' })).toThrow('invalid insurance request contract');`
### error_empty_loading_retry_cancel
- `3: const pending = { id: 'request-1', booking_id: 'appointment-1', booking_kind: 'consultation', state: 'COPAY_PENDING', price: 300, copay_amount: 60 };`
- `7: const request = parseInsuranceCopayRequest(pending);`
- `12: it('does not infer payment eligibility from caller amounts or a pending provider review', () => {`
- `13: expect(insurancePaymentAction(parseInsuranceCopayRequest({ ...pending, state: 'PENDING_PROVIDER_REVIEW', copay_amount: 0 }))).toBe('provider_review');`
- `14: expect(() => parseInsuranceCopayRequest({ ...pending, price: 0 })).toThrow('invalid insurance request contract');`
- `15: expect(() => parseInsuranceCopayRequest({ ...pending, id: '' })).toThrow('invalid insurance request contract');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
