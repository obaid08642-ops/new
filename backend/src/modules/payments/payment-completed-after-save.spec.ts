import { PaymentsService } from './payments.module';

// payment.completed listeners (the insurance copay settlement) re-read the transaction as status 'paid'. Announced
// before the save, the read misses it and the copay waits for the 15 s reconcile sweep: money taken, service held.
describe('PaymentsService announces a payment only once it is stored', () => {
  it('saves the paid transaction before emitting payment.completed', async () => {
    const order: string[] = [];
    const t: { [k: string]: unknown } = {
      id: 'tx1', patient_id: 'patient-1', gateway_intent_id: 'pay_1', amount: 115, currency: 'SAR', status: 'pending',
      booking_kind: 'insurance', booking_id: 'ins-1',
      save: jest.fn(async () => { order.push(`save:${String(t.status)}`); }),
    };
    const svc = Object.create(PaymentsService.prototype) as Record<string, unknown>;
    Object.assign(svc, {
      txns: { findOne: jest.fn(async () => t) },
      adapter: { name: 'moyasar', verify: jest.fn(async () => ({ status: 'paid', raw: { status: 'paid', amount: 11500, currency: 'SAR' } })) },
      events: { emit: jest.fn((name: string) => { order.push(`emit:${name}`); }) },
      realtime: { emitToUser: jest.fn() },
      fraud: { detectDuplicatePayments: jest.fn(async () => null), checkPaymentVelocity: jest.fn(async () => false) },
      logger: { error: jest.fn() },
      modelFor: jest.fn(() => ({ updateOne: jest.fn() })),
    });
    const verify = (svc as unknown as PaymentsService).verifyPayment.bind(svc);
    await verify({ id: 'patient-1', role: 'patient' }, 'tx1');
    expect(order.indexOf('save:paid')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('save:paid')).toBeLessThan(order.indexOf('emit:payment.completed'));
  });
});
