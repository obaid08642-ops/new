/** Q-21 (RED first): a paid pharmacy order must leave its pending status for confirmed. */
import { PaymentsService } from './payments.module';

const paidTxn = (bookingId: string) => ({
  id: 'txn-1', booking_id: bookingId, booking_kind: 'pharmacy',
  amount: 25, paid_at: new Date(), gateway_charge_id: 'ch-1',
});

const svcWith = (order: any) => {
  const writes: any = {};
  const coll = {
    findOne: async () => order,
    updateOne: async (_f: any, u: any) => { Object.assign(writes, u.$set); return { modifiedCount: 1 }; },
  };
  const txns: any = { db: { collection: () => coll } };
  const svc = new (PaymentsService as any)(
    txns, {}, {}, {}, {}, {}, {}, {}, {}, { emit: () => undefined }, { emitToUser: () => undefined }, {}, undefined,
  );
  return { svc, writes };
};

describe('Q-21 paid pharmacy order reaches confirmed', () => {
  it('card: cash_card_payment_pending -> confirmed', async () => {
    const { svc, writes } = svcWith({ id: 'o1', status: 'cash_card_payment_pending', pricing_snapshot: { totals: { currency: 'SAR' } } });
    await (svc as any).finalizeGovernedPharmacyPaid(paidTxn('o1'));
    expect(writes.payment_status).toBe('paid');
    expect(writes.status).toBe('confirmed');
  });

  it('co-pay: waiting_copay -> confirmed', async () => {
    const { svc, writes } = svcWith({ id: 'o2', status: 'waiting_copay', pricing_snapshot: { totals: {} } });
    await (svc as any).finalizeGovernedPharmacyPaid(paidTxn('o2'));
    expect(writes.status).toBe('confirmed');
  });
});
