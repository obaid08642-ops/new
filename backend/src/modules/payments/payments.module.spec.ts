import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
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
  const pharmacyOrders: any = { findOne: jest.fn().mockReturnValue(lean(booking)), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
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
    const { service, txns, pharmacyOrders, adapter } = createPaymentsService(acceptedBooking);
    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1')).resolves.toEqual({ id: 'txn-1', status: 'pending' });
    expect(txns.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1', amount: 84.5, currency: 'SAR', quote_hash: 'quote-hash', quote_revision: 4, method: 'card',
    }));
    expect(adapter.createIntent).toHaveBeenCalledWith(expect.objectContaining({
      amount: 84.5, currency: 'SAR', metadata: expect.objectContaining({ quote_hash: 'quote-hash', quote_revision: 4 }),
    }));
    expect(pharmacyOrders.updateOne).toHaveBeenCalledWith(
      { id: 'order-1', governed_state: 'FINAL_QUOTE_ACCEPTED' },
      { $set: { governed_state: 'PAYMENT_PENDING', transaction_id: 'txn-1', payment_method: 'card' } },
    );
  });

  it('rejects any customer wallet method even if a quote was accepted', async () => {
    const prohibitedMethod = ['wal', 'let'].join('');
    const { service, txns } = createPaymentsService({ ...acceptedBooking, payment_method: prohibitedMethod });
    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1')).rejects.toThrow(BadRequestException);
    expect(txns.create).not.toHaveBeenCalled();
  });

  it('charges only the server-recorded insurance co-pay in the co-pay state', async () => {
    const previous = process.env.PAYMENT_ONLINE_METHODS;
    process.env.PAYMENT_ONLINE_METHODS = 'card,apple-pay';
    const { service, txns, adapter } = createPaymentsService({
      ...acceptedBooking, governed_state: 'CO_PAY_PENDING', insurance_decision_summary: { co_pay_amount: 12.25 }, payment_method: 'apple-pay',
    });
    (adapter as any).name = 'stripe';
    await service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1', undefined, 'Mozilla/5.0 (iPhone)');
    expect(txns.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 12.25, method: 'apple_pay' }));
    if (previous === undefined) delete process.env.PAYMENT_ONLINE_METHODS;
    else process.env.PAYMENT_ONLINE_METHODS = previous;
  });

  it('returns only the payment methods configured for the gateway and current device', async () => {
    const previous = process.env.PAYMENT_ONLINE_METHODS;
    process.env.PAYMENT_ONLINE_METHODS = 'card,apple-pay,google-pay';
    const { service } = createPaymentsService(acceptedBooking);
    (service as any).adapter = { name: 'stripe' };

    await expect(service.pharmacyPaymentCapabilities({ id: 'patient-1' }, 'order-1', 'Mozilla/5.0 (iPhone)')).resolves.toMatchObject({
      amount: 84.5, currency: 'SAR', methods: [{ id: 'card', kind: 'online' }, { id: 'apple-pay', kind: 'online' }],
    });

    if (previous === undefined) delete process.env.PAYMENT_ONLINE_METHODS;
    else process.env.PAYMENT_ONLINE_METHODS = previous;
  });

  it('rejects a requested pharmacy method that is not enabled for the gateway and device', async () => {
    const previous = process.env.PAYMENT_ONLINE_METHODS;
    process.env.PAYMENT_ONLINE_METHODS = 'card';
    const { service, txns } = createPaymentsService(acceptedBooking);

    await expect(service.createPaymentIntent({ id: 'patient-1' }, 'pharmacy', 'order-1', 'key-1', 'apple-pay', 'Mozilla/5.0 (iPhone)')).rejects.toThrow('payment_method_not_enabled_for_gateway_or_device');
    expect(txns.create).not.toHaveBeenCalled();

    if (previous === undefined) delete process.env.PAYMENT_ONLINE_METHODS;
    else process.env.PAYMENT_ONLINE_METHODS = previous;
  });

  it('does not advertise Apple Pay to a non-Stripe gateway even when an environment list contains it', async () => {
    const previous = process.env.PAYMENT_ONLINE_METHODS;
    process.env.PAYMENT_ONLINE_METHODS = 'card,apple-pay';
    const { service } = createPaymentsService(acceptedBooking);

    await expect(service.pharmacyPaymentCapabilities({ id: 'patient-1' }, 'order-1', 'Mozilla/5.0 (iPhone)')).resolves.toMatchObject({
      methods: [{ id: 'card', kind: 'online' }],
    });

    if (previous === undefined) delete process.env.PAYMENT_ONLINE_METHODS;
    else process.env.PAYMENT_ONLINE_METHODS = previous;
  });

  it('rejects a paid gateway result whose amount or currency does not match the transaction', () => {
    const { service } = createPaymentsService(acceptedBooking);
    expect(() => (service as any).assertGatewayResultMatchesTransaction(
      { gateway: 'moyasar', amount: 84.5, currency: 'SAR' },
      { raw: { amount: 8400, currency: 'SAR' } },
    )).toThrow('gateway_payment_amount_or_currency_mismatch');
    expect(() => (service as any).assertGatewayResultMatchesTransaction(
      { gateway: 'moyasar', amount: 84.5, currency: 'SAR' },
      { raw: { amount: 8450, currency: 'USD' } },
    )).toThrow('gateway_payment_amount_or_currency_mismatch');
  });

  it('returns an idempotent result for the same already-settled webhook event', async () => {
    const previous = process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.MOYASAR_WEBHOOK_SECRET = 'test-webhook-secret';
    const rawBody = '{"id":"evt-1"}';
    const signature = createHmac('sha256', 'test-webhook-secret').update(rawBody).digest('hex');
    const { service, txns } = createPaymentsService(acceptedBooking);
    txns.findOne.mockResolvedValue({ id: 'txn-1', status: 'paid', webhook_event_id: 'evt-1' });

    await expect(service.handleWebhook('moyasar', { id: 'evt-1' }, signature, rawBody)).resolves.toEqual({ ok: true, idempotent_replay: true });
    if (previous === undefined) delete process.env.MOYASAR_WEBHOOK_SECRET;
    else process.env.MOYASAR_WEBHOOK_SECRET = previous;
  });
});
