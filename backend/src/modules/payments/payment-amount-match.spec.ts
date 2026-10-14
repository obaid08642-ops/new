import { PaymentsService } from './payments.module';

/**
 * D-28/S-5: a gateway "paid" settles only when the gateway's own record
 * carries the amount AND currency the server asked for. A "paid" for less is
 * recorded as failed — it must never confirm the booking.
 */
describe('PaymentsService gateway amount match (S-5)', () => {
  const make = (txn: any, raw: any) => {
    const svc: any = Object.create(PaymentsService.prototype);
    svc.txns = { findOne: jest.fn(async () => txn) };
    svc.adapter = { name: 'moyasar', verify: jest.fn(async () => ({ status: 'paid', raw })) };
    svc.events = { emit: jest.fn() };
    svc.realtime = { emitToUser: jest.fn() };
    svc.fraud = { detectDuplicatePayments: jest.fn(async () => null), checkPaymentVelocity: jest.fn(async () => false) };
    svc.logger = { error: jest.fn() };
    svc.modelFor = jest.fn(() => ({ updateOne: jest.fn() }));
    return svc;
  };
  const txn = (over: any = {}) => ({
    id: 'tx1',
    patient_id: 'patient-1',
    gateway_intent_id: 'pay_1',
    amount: 115,
    currency: 'SAR',
    status: 'pending',
    save: jest.fn(),
    ...over,
  });

  it('does not settle a paid gateway record for less than asked (11500 vs 100 halalas)', async () => {
    const t = txn();
    const svc = make(t, { status: 'paid', amount: 100, currency: 'SAR' });
    const out = await svc.verifyPayment({ id: 'patient-1', role: 'patient' }, 'tx1');
    expect(out.status).toBe('failed');
    expect(t.failure_reason).toBe('gateway_amount_mismatch');
    expect(svc.events.emit).not.toHaveBeenCalledWith('payment.completed', expect.anything());
  });

  it('does not settle on a currency mismatch', async () => {
    const t = txn();
    const svc = make(t, { status: 'paid', amount: 11500, currency: 'USD' });
    const out = await svc.verifyPayment({ id: 'patient-1', role: 'patient' }, 'tx1');
    expect(out.status).toBe('failed');
    expect(t.failure_reason).toBe('gateway_amount_mismatch');
  });

  it('settles when the gateway record matches amount and currency', async () => {
    const t = txn({ booking_kind: 'lab', booking_id: 'lb1' });
    const svc = make(t, { status: 'paid', amount: 11500, currency: 'SAR' });
    const out = await svc.verifyPayment({ id: 'patient-1', role: 'patient' }, 'tx1');
    expect(out.status).toBe('paid');
    expect(t.save).toHaveBeenCalled();
  });
});