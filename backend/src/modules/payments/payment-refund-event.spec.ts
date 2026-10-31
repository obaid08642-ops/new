import { PaymentsService } from './payments.module';

describe('every card refund announces itself so the credit note follows', () => {
  it('emits payment.refund.card with the gateway refund id', async () => {
    const t: any = { id: 'tx1', patient_id: 'p1', booking_kind: 'lab', booking_id: 'b1', status: 'paid', amount: 115, refunded_amount: 0, gateway_charge_id: 'pay_1', save: jest.fn() };
    const emit = jest.fn();
    const svc = Object.create(PaymentsService.prototype) as Record<string, unknown>;
    Object.assign(svc, {
      txns: { findOne: jest.fn(async () => t) },
      adapter: { name: 'moyasar', refund: jest.fn(async () => ({ refunded: true, raw: { id: 'rf_9' } })) },
      events: { emit }, realtime: { emitToUser: jest.fn() },
      modelFor: jest.fn(() => ({ updateOne: jest.fn() })),
    });
    await (svc as unknown as PaymentsService).refundTransactionAsSystem('tx1', 40, 'test');
    expect(emit).toHaveBeenCalledWith('payment.refund.card', { booking_kind: 'lab', booking_id: 'b1', amount: 40, refund_ref: 'rf_9' });
  });
});
