import { BadRequestException } from '@nestjs/common';
import { RefundExecutor } from './finance-engine.module';

describe('RefundExecutor original payment behavior (LJ-05, 7A-A2)', () => {
  it('records a cash refund in the ledger and never writes patient wallet value', async () => {
    const append = jest.fn().mockResolvedValue({});
    const ledger = { exists: jest.fn().mockResolvedValue(null), append };
    const cashTransaction = { status: 'paid', method: 'cash', amount: 80 };
    const booking = { payment_method: 'cash', payment_status: 'paid', total_price: 80 };
    const conn = {
      collection: jest.fn((name: string) => {
        if (name === 'moyasar_payments') return { findOne: jest.fn().mockResolvedValue(null) };
        if (name === 'transactions') return { findOne: jest.fn().mockResolvedValue(cashTransaction) };
        if (name === 'orders') return { findOne: jest.fn().mockResolvedValue(booking), updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }), updateMany: jest.fn().mockResolvedValue({}) };
        if (name === 'pharmacy_orders') return { updateOne: jest.fn().mockResolvedValue({}) };
        if (name === 'platformledgerentries') return { findOne: jest.fn().mockResolvedValue(null) };
        if (name === 'notifications') return { insertOne: jest.fn().mockResolvedValue({}) };
        if (name === 'wallets' || name === 'wallet_transactions') throw new Error('patient wallet must not be accessed');
        return {};
      }),
    };
    const executor = new RefundExecutor(conn as any, ledger as any, {} as any, { emit: jest.fn() } as any);

    await expect(executor.execute({
      refund_id: 'return-1', booking_kind: 'pharmacy', booking_id: 'order-1', patient_id: 'patient-1',
      amount: 80, reason: 'damaged item', actor_id: 'admin-1',
    })).resolves.toEqual(expect.objectContaining({ ok: true, method: 'cash' }));

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      type: 'refund', amount: 80, ref_id: 'return-1', meta: expect.objectContaining({ method: 'cash', patient_id: 'patient-1' }),
    }));
    expect(conn.collection).not.toHaveBeenCalledWith('wallets');
  });

  it('refuses a refund when no original payment evidence exists', async () => {
    const conn = {
      collection: jest.fn((name: string) => name === 'moyasar_payments'
        ? { findOne: jest.fn().mockResolvedValue(null) }
        : name === 'transactions'
          ? { findOne: jest.fn().mockResolvedValue(null) }
          : name === 'orders'
            ? { findOne: jest.fn().mockResolvedValue({ payment_method: 'card', payment_status: 'paid' }) }
            : {}),
    };
    const executor = new RefundExecutor(conn as any, { exists: jest.fn().mockResolvedValue(null) } as any, {} as any, { emit: jest.fn() } as any);

    await expect(executor.execute({
      refund_id: 'return-2', booking_kind: 'pharmacy', booking_id: 'order-2', patient_id: 'patient-1',
      amount: 25, reason: 'duplicate', actor_id: 'admin-1',
    })).rejects.toThrow(BadRequestException);
  });
});
