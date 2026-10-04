// Q96 (Round 11): POST /refunds/request trusted the body. Any patient could
// file a refund on another patient's booking or on a booking that does not
// exist, with any amount, and the duplicate check handed back another
// patient's refund document. The booking, its owner, the paid amount, the
// payment id and the schedule must come from the stored records.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RefundService } from '../insurance-engine.module';

jest.setTimeout(60_000);

describe('RefundService.request is bound to a real, owned, paid booking (Q96)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let refunds: Model<any>;
  let service: RefundService;
  const events = { emit: jest.fn() };
  const fraud = { checkRefundAbuse: jest.fn().mockResolvedValue(false) };
  const inHours = (h: number) => new Date(Date.now() + h * 3600_000);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q96' }).asPromise();
    const schema = new mongoose.Schema({
      id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      patient_id: String, booking_id: String, booking_kind: String, amount_paid: Number,
      refund_percent: Number, refund_amount: Number, policy_note_ar: String, reason: String,
      moyasar_payment_id: String, state: { type: String, default: 'REQUESTED' }, history: [Object],
    }, { timestamps: true });
    refunds = conn.model('RefundRequest', schema);
    service = new RefundService(refunds as never, events as never, fraud as never, conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await conn.db!.collection('appointments').deleteMany({});
    await conn.db!.collection('transactions').deleteMany({});
    await refunds.deleteMany({});
    await conn.db!.collection('appointments').insertOne({ id: 'appt-A', patient_id: 'pat-A', slot_start: inHours(10), total_price: 300, status: 'confirmed' });
    await conn.db!.collection('transactions').insertOne({ booking_kind: 'consultation', booking_id: 'appt-A', status: 'paid', amount: 300, gateway_payment_id: 'pay_real_A' });
  });

  it('refuses another patient\'s booking (403)', async () => {
    await expect(service.request({ id: 'pat-B' }, { booking_kind: 'consultation', booking_id: 'appt-A', reason: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a booking that does not exist (404)', async () => {
    await expect(service.request({ id: 'pat-B' }, { booking_kind: 'consultation', booking_id: 'nope', amount_paid: 9999, reason: 'x' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an unpaid booking (400)', async () => {
    await conn.db!.collection('transactions').deleteMany({});
    await expect(service.request({ id: 'pat-A' }, { booking_kind: 'consultation', booking_id: 'appt-A', reason: 'x' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('takes amount, payment id and schedule from the records, not the body', async () => {
    const r = await service.request({ id: 'pat-A' }, {
      booking_kind: 'consultation', booking_id: 'appt-A', reason: 'cannot attend',
      amount_paid: 99999, payment_id: 'pay_forged', scheduled_at: inHours(100).toISOString(),
    });
    expect(r.amount_paid).toBe(300);
    expect(r.moyasar_payment_id).toBe('pay_real_A');
    expect(r.refund_percent).toBe(50); // 10 h before the stored slot, not 100 h
    expect(r.refund_amount).toBe(150);
  });

  it('never returns another patient\'s refund as a "duplicate"', async () => {
    await refunds.create({ patient_id: 'pat-A', booking_id: 'appt-A', booking_kind: 'consultation', amount_paid: 300, reason: 'mine', state: 'REQUESTED', history: [] });
    await expect(service.request({ id: 'pat-B' }, { booking_kind: 'consultation', booking_id: 'appt-A', reason: 'x' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    const again = await service.request({ id: 'pat-A' }, { booking_kind: 'consultation', booking_id: 'appt-A', reason: 'again' });
    expect(again.reason).toBe('mine');
  });
});
