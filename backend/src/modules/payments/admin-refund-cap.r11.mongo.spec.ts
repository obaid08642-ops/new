// R11 §5 lead 7: POST /payments/refund/:txn (admin) checked neither the
// cumulative refunded amount nor concurrent refunds: a partially refunded
// transaction could be refunded again past what was paid, and two parallel
// clicks both reached the gateway. The amount is now reserved atomically on
// the transaction before the gateway call and released if the gateway refuses.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.module';
import { TransactionSchema } from '../../schemas/transaction.schema';

jest.setTimeout(60_000);

describe('admin refund cap and lock (R11 §5 lead 7)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let txns: Model<any>;
  let svc: any;
  const admin = { id: 'adm', role: 'admin' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'refcap' }).asPromise();
    txns = conn.model('Transaction', TransactionSchema);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await txns.deleteMany({});
    await txns.create({ id: 'tx-1', booking_kind: 'consultation', booking_id: 'b1', patient_id: 'p1', amount: 300, gateway: 'moyasar', status: 'paid', gateway_charge_id: 'pay_1', gateway_intent_id: 'pay_1' });
    svc = Object.create(PaymentsService.prototype);
    svc.txns = txns;
    svc.adapter = { refund: jest.fn(async () => ({ refunded: true })) };
    svc.modelFor = () => ({ updateOne: jest.fn(async () => ({})) });
    svc.realtime = { emitToUser: jest.fn() };
  });

  it('partial refunds add up and stop at the paid amount', async () => {
    await svc.refundPayment(admin, 'tx-1', 200);
    await expect(svc.refundPayment(admin, 'tx-1', 150)).rejects.toBeInstanceOf(BadRequestException);
    const t: any = await txns.findOne({ id: 'tx-1' }).lean();
    expect(t.refunded_amount).toBe(200);
    expect(t.status).toBe('partially_refunded');
    expect(svc.adapter.refund).toHaveBeenCalledTimes(1);
  });

  it('two parallel refunds of the full amount reach the gateway once', async () => {
    const results = await Promise.allSettled([svc.refundPayment(admin, 'tx-1'), svc.refundPayment(admin, 'tx-1')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(svc.adapter.refund).toHaveBeenCalledTimes(1);
    const t: any = await txns.findOne({ id: 'tx-1' }).lean();
    expect(t.refunded_amount).toBe(300);
    expect(t.status).toBe('refunded');
  });

  it('a gateway refusal releases the reservation', async () => {
    svc.adapter.refund.mockResolvedValueOnce({ refunded: false });
    await expect(svc.refundPayment(admin, 'tx-1', 100)).rejects.toBeInstanceOf(BadRequestException);
    const t: any = await txns.findOne({ id: 'tx-1' }).lean();
    expect(Number(t.refunded_amount || 0)).toBe(0);
    expect(t.status).toBe('paid');
  });
});
