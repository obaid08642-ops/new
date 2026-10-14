import { RefundExecutor } from './finance-engine.module';

/**
 * A card payment kept in `transactions` (the current checkout) is refunded at the gateway through
 * PaymentsService, not only written to the ledger; a copay paid on the insurance request is found,
 * and a refund of the booking's price is capped at what is left of that copay.
 */
function stack(opts: { tx: any; booking: any; copayTx?: any; requests?: any[] }) {
  const append = jest.fn().mockResolvedValue({});
  const refundTransactionAsSystem = jest.fn().mockResolvedValue({ gateway_refund_id: 'rf_1' });
  const moduleRef = { get: jest.fn(() => ({ refundTransactionAsSystem })) };
  const conn = {
    collection: jest.fn((name: string) => {
      if (name === 'moyasar_payments') return { findOne: jest.fn().mockResolvedValue(null) };
      if (name === 'transactions') {
        return { findOne: jest.fn(async (q: any) => (q.booking_kind === 'insurance' ? opts.copayTx ?? null : opts.tx)) };
      }
      if (name === 'appointments') return { findOne: jest.fn().mockResolvedValue(opts.booking), updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
      if (name === 'insuranceservicerequests') return { find: jest.fn(() => ({ limit: () => ({ toArray: async () => opts.requests ?? [] }) })) };
      if (name === 'platformledgerentries') return { findOne: jest.fn().mockResolvedValue(null) };
      if (name === 'notifications') return { insertOne: jest.fn().mockResolvedValue({}) };
      return { findOne: jest.fn().mockResolvedValue(null), updateOne: jest.fn().mockResolvedValue({}), insertOne: jest.fn().mockResolvedValue({}) };
    }),
  };
  const executor = new RefundExecutor(conn as any, { exists: jest.fn().mockResolvedValue(null), append } as any, {} as any, { emit: jest.fn() } as any, moduleRef as any);
  return { executor, append, refundTransactionAsSystem };
}

describe('RefundExecutor: card payments in transactions go back to the card', () => {
  it('refunds a paid card transaction at the gateway and records method "gateway"', async () => {
    const s = stack({
      tx: { id: 'tx-1', status: 'paid', method: 'card', amount: 200 },
      booking: { id: 'ap-1', patient_id: 'p-1', payment_method: 'card', payment_status: 'paid', total_price: 200 },
    });
    await expect(s.executor.execute({ refund_id: 'r-1', booking_kind: 'consultation', booking_id: 'ap-1', patient_id: 'p-1', amount: 100, reason: 'late cancel', actor_id: 'system' }))
      .resolves.toEqual(expect.objectContaining({ ok: true, method: 'gateway', gateway_refund_id: 'rf_1' }));
    expect(s.refundTransactionAsSystem).toHaveBeenCalledWith('tx-1', 100, 'late cancel');
    expect(s.append).toHaveBeenCalledWith(expect.objectContaining({ type: 'refund', amount: 100, meta: expect.objectContaining({ method: 'gateway' }) }));
  });

  it('finds the copay paid on the insurance request and caps the refund at what is left of it', async () => {
    const s = stack({
      tx: null,
      booking: { id: 'ap-2', patient_id: 'p-1', payment_method: 'insurance', total_price: 300 },
      requests: [{ id: 'ins-1' }],
      copayTx: { id: 'tx-copay', status: 'paid', method: 'card', amount: 60, refunded_amount: 10 },
    });
    await expect(s.executor.execute({ refund_id: 'r-2', booking_kind: 'consultation', booking_id: 'ap-2', patient_id: 'p-1', amount: 300, reason: 'cancel', actor_id: 'system' }))
      .resolves.toEqual(expect.objectContaining({ ok: true, method: 'gateway' }));
    expect(s.refundTransactionAsSystem).toHaveBeenCalledWith('tx-copay', 50, 'cancel');
  });
});
