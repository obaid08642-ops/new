// R11 §5 lead 6: a card payment made through the current flow (a paid
// `transactions` row, no legacy moyasar_payments row) was "refunded" as cash:
// no gateway call, so the patient never got the money back, and the
// cumulative refunded amount was never recorded, so the cap could be passed
// again and again. A card refund now goes to Moyasar against the original
// payment, the refunded amount is reserved atomically on the transaction
// (concurrent refunds cannot pass the paid amount), and a failed gateway call
// releases the reservation.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException } from '@nestjs/common';
import { RefundExecutor } from './finance-engine.module';

jest.setTimeout(60_000);

describe('RefundExecutor card refunds (R11 §5 lead 6)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let executor: RefundExecutor;
  const ledger = { exists: jest.fn(async () => false), append: jest.fn(async () => ({})) };
  const env = { ...process.env };
  let fetchMock: jest.SpyInstance;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'refund' }).asPromise();
    executor = new RefundExecutor(conn, ledger as never, {} as never, { emit: jest.fn() } as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    process.env.MOYASAR_API_KEY = 'sk_test_synthetic';
    await conn.db!.collection('transactions').deleteMany({});
    await conn.db!.collection('appointments').deleteMany({});
    await conn.db!.collection('appointments').insertOne({ id: 'appt-1', patient_id: 'pat-1', payment_method: 'card', payment_status: 'paid', total_price: 300 });
    await conn.db!.collection('transactions').insertOne({ id: 'tx-1', booking_kind: 'consultation', booking_id: 'appt-1', patient_id: 'pat-1', status: 'paid', method: 'card', amount: 300, gateway: 'moyasar', gateway_intent_id: 'pay_real_1', gateway_charge_id: 'pay_real_1' });
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'pay_real_1', status: 'refunded' }), { status: 200 }));
    ledger.append.mockClear();
  });
  afterEach(() => { process.env = { ...env }; fetchMock.mockRestore(); });

  const run = (refund_id: string, amount: number) => executor.execute({ refund_id, booking_kind: 'consultation', booking_id: 'appt-1', patient_id: 'pat-1', amount, reason: 'cannot attend', actor_id: 'adm' });

  it('a card refund calls Moyasar on the original payment and records the amount', async () => {
    const out = await run('r1', 100);
    expect(out.method).toBe('gateway');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/payments/pay_real_1/refund');
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)).amount).toBe(10000);
    const tx: any = await conn.db!.collection('transactions').findOne({ id: 'tx-1' });
    expect(tx.refunded_amount).toBe(100);
    expect(tx.status).toBe('partially_refunded');
  });

  it('the cumulative cap holds across refunds', async () => {
    await run('r1', 200);
    await expect(run('r2', 150)).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('two concurrent refunds cannot pass the paid amount', async () => {
    const results = await Promise.allSettled([run('r1', 200), run('r2', 200)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const tx: any = await conn.db!.collection('transactions').findOne({ id: 'tx-1' });
    expect(tx.refunded_amount).toBe(200);
  });

  it('a failed gateway refund releases the reservation and records nothing', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'declined' }), { status: 400 }));
    await expect(run('r1', 100)).rejects.toBeInstanceOf(BadRequestException);
    const tx: any = await conn.db!.collection('transactions').findOne({ id: 'tx-1' });
    expect(Number(tx.refunded_amount || 0)).toBe(0);
    expect(tx.status).toBe('paid');
    expect(ledger.append).not.toHaveBeenCalled();
  });

  // Fifth review: an approved copay refund could never be executed: the copay
  // is paid on the insurance request (booking_kind 'insurance'), not on the
  // booking, so the executor found no payment (original_payment_not_found).
  it('a copay paid on the insurance request is refunded to that card payment, capped at the copay', async () => {
    const db = conn.db!;
    await db.collection('appointments').insertOne({ id: 'appt-ins', patient_id: 'pat-1', payment_method: 'insurance', payment_status: 'insurance_approved', total_price: 300 });
    await db.collection('insuranceservicerequests').insertOne({ id: 'ir-9', booking_id: 'appt-ins', booking_kind: 'consultation', patient_id: 'pat-1' });
    await db.collection('transactions').insertOne({ id: 'tx-copay', booking_kind: 'insurance', booking_id: 'ir-9', patient_id: 'pat-1', status: 'paid', method: 'card', amount: 60, gateway: 'moyasar', gateway_intent_id: 'pay_copay', gateway_charge_id: 'pay_copay' });
    const exec = (id: string, amount: number) => executor.execute({ refund_id: id, booking_kind: 'consultation', booking_id: 'appt-ins', patient_id: 'pat-1', amount, reason: 'cannot attend', actor_id: 'adm' });
    await expect(exec('rc0', 61)).rejects.toThrow('refund_exceeds_paid');
    const out = await exec('rc1', 60);
    expect(out.method).toBe('gateway');
    expect(String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0])).toContain('/payments/pay_copay/refund');
    // Only the copay went back: the insured booking is not marked refunded.
    const appt: any = await db.collection('appointments').findOne({ id: 'appt-ins' });
    expect(appt.payment_status).toBe('insurance_approved');
    expect(appt.refund_status).toBe('REFUNDED');
    await db.collection('insuranceservicerequests').deleteMany({});
  });
});
