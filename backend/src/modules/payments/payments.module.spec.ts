import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.module';

const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

function createPaymentsService(booking: any) {
  process.env.MOYASAR_API_KEY = 'test-payment-key';
  const txns: any = {
    findOne: jest.fn().mockReturnValue(lean(null)),
    create: jest.fn().mockResolvedValue({ id: 'txn-1' }),
    findOneAndUpdate: jest.fn().mockResolvedValue({ id: 'txn-1', status: 'pending', toObject: () => ({ id: 'txn-1', status: 'pending' }) }),
    updateOne: jest.fn(),
  };
  const pharmacyOrders: any = { findOne: jest.fn().mockReturnValue(lean(booking)) };
  const service = new PaymentsService(
    txns, {} as any, pharmacyOrders, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, { emit: jest.fn() } as any, { emitToUser: jest.fn() } as any, { detectDuplicatePayments: jest.fn(), checkPaymentVelocity: jest.fn() } as any,
  );
  const adapter = { name: 'moyasar' as const, createIntent: jest.fn().mockResolvedValue({ intent_id: 'gateway-intent' }), verify: jest.fn(), refund: jest.fn() };
  (service as any).adapter = adapter;
  return { service, txns, pharmacyOrders, adapter };
}

describe('PaymentsService pharmacy quote guard', () => {
  const acceptedBooking = {
    id: 'order-1', patient_account_id: 'patient-1', governed_state: 'FINAL_QUOTE_ACCEPTED',
    accepted_quote_snapshot: { totals: { total: 84.5, currency: 'SAR' } },
    accepted_quote_hash: 'quote-hash', accepted_quote_revision: 4, payment_method: 'visa', payment_status: 'unpaid',
  };

  it('refuses a payment intent before the pharmacy quote is accepted', async () => {
    const { service, txns } = createPaymentsService({ ...acceptedBooking, governed_state: 'OFFER_SELECTED' });
    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1')).rejects.toThrow('pharmacy_quote_not_accepted');
    expect(txns.create).not.toHaveBeenCalled();
  });

  it('uses only the immutable accepted quote amount, currency, hash, and revision', async () => {
    const { service, txns, adapter } = createPaymentsService(acceptedBooking);
    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1')).resolves.toEqual({ id: 'txn-1', status: 'pending' });
    expect(txns.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1', amount: 84.5, currency: 'SAR', quote_hash: 'quote-hash', quote_revision: 4, method: 'card',
    }));
    expect(adapter.createIntent).toHaveBeenCalledWith(expect.objectContaining({
      amount: 84.5, currency: 'SAR', metadata: expect.objectContaining({ quote_hash: 'quote-hash', quote_revision: 4 }),
    }));
  });

  it('rejects any customer wallet method even if a quote was accepted', async () => {
    const { service, txns } = createPaymentsService({ ...acceptedBooking, payment_method: 'wallet' });
    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1')).rejects.toThrow(BadRequestException);
    expect(txns.create).not.toHaveBeenCalled();
  });

  it('charges only the server-recorded insurance co-pay in the co-pay state', async () => {
    const { service, txns } = createPaymentsService({
      ...acceptedBooking, governed_state: 'CO_PAY_PENDING', insurance_decision_summary: { co_pay_amount: 12.25 }, payment_method: 'apple-pay',
    });
    await service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1');
    expect(txns.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 12.25, method: 'apple_pay' }));
  });
});
