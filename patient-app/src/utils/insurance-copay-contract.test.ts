import { insurancePaymentAction, insuranceSelfPayHeaders, parseInsuranceCopayRequest } from './insurance-copay-contract';

const pending = { id: 'request-1', booking_id: 'appointment-1', booking_kind: 'consultation', state: 'COPAY_PENDING', price: 300, copay_amount: 60 };

describe('insurance copay contract', () => {
  it('uses only an owned server request and its server-calculated copay', () => {
    const request = parseInsuranceCopayRequest(pending);
    expect(request.copay_amount).toBe(60);
    expect(insurancePaymentAction(request)).toBe('checkout_copay');
  });

  it('does not infer payment eligibility from caller amounts or a pending provider review', () => {
    expect(insurancePaymentAction(parseInsuranceCopayRequest({ ...pending, state: 'PENDING_PROVIDER_REVIEW', copay_amount: 0 }))).toBe('provider_review');
    expect(() => parseInsuranceCopayRequest({ ...pending, price: 0 })).toThrow('invalid insurance request contract');
    expect(() => parseInsuranceCopayRequest({ ...pending, id: '' })).toThrow('invalid insurance request contract');
  });

  it('requires an explicit server-recorded self-pay acceptance after rejection', () => {
    const rejected = parseInsuranceCopayRequest({ ...pending, state: 'REJECTED', copay_amount: 0 });
    expect(insurancePaymentAction(rejected)).toBe('accept_self_pay');
    expect(insurancePaymentAction(parseInsuranceCopayRequest({ ...rejected, state: 'SELF_PAY_PENDING', self_pay_amount: 300 }))).toBe('checkout_self_pay');
    expect(insuranceSelfPayHeaders(rejected.id)['Idempotency-Key']).toMatch(/^insurance-self-pay-/);
  });
});
