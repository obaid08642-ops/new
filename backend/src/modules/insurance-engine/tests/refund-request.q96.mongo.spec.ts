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

  // Independent review follow-up: a lab booking paid through the diagnostics
  // checkout has no paid row of its own; the child carries the parent's
  // transaction_id. It must be refundable for the child's own price only.
  it('refunds a diagnostics-paid lab booking for its own price', async () => {
    const db = conn.db!;
    await db.collection('labbookings').insertOne({ id: 'lab-1', patient_id: 'pat-A', total_price: 120, payment_status: 'paid', transaction_id: 'tx-diag', scheduled_date: inHours(48) });
    await db.collection('transactions').insertOne({ id: 'tx-diag', booking_kind: 'diagnostics', booking_id: 'diag-order-1', status: 'paid', amount: 400, gateway_payment_id: 'pay_diag' });
    const r = await service.request({ id: 'pat-A' }, { booking_kind: 'lab', booking_id: 'lab-1', reason: 'cannot attend' });
    expect(r.amount_paid).toBe(120);
    expect(r.moyasar_payment_id).toBe('pay_diag');
    await db.collection('labbookings').deleteMany({});
  });

  // Second review: LabBooking stores its price in `total`; `total_price` has a
  // schema default of 0, so reading total_price first refused every real lab booking.
  it('refunds a real lab booking shape (total set, total_price defaulted to 0)', async () => {
    const db = conn.db!;
    await db.collection('labbookings').insertOne({ id: 'lab-2', patient_id: 'pat-A', total: 120, total_price: 0, payment_status: 'paid', transaction_id: 'tx-diag2', scheduled_date: inHours(48) });
    await db.collection('transactions').insertOne({ id: 'tx-diag2', booking_kind: 'diagnostics', booking_id: 'diag-order-2', status: 'paid', amount: 400, gateway_payment_id: 'pay_diag2' });
    const r = await service.request({ id: 'pat-A' }, { booking_kind: 'lab', booking_id: 'lab-2', reason: 'cannot attend' });
    expect(r.amount_paid).toBe(120);
    await db.collection('labbookings').deleteMany({});
  });

  // Fourth review: the diagnostics parent charges full child prices whatever
  // the payment method, so an insured child paid that way refunds its price;
  // a copay paid on the insurance request is refundable for that amount.
  it('an insured child paid through the diagnostics parent refunds its own price', async () => {
    const db = conn.db!;
    await db.collection('labbookings').insertOne({ id: 'lab-3', patient_id: 'pat-A', total: 200, total_price: 0, payment_method: 'insurance', insurance_copay: 40, payment_status: 'paid', transaction_id: 'tx-diag3', scheduled_date: inHours(48) });
    await db.collection('transactions').insertOne({ id: 'tx-diag3', booking_kind: 'diagnostics', booking_id: 'diag-order-3', status: 'paid', amount: 200, gateway_payment_id: 'pay_diag3' });
    const r = await service.request({ id: 'pat-A' }, { booking_kind: 'lab', booking_id: 'lab-3', reason: 'cannot attend' });
    expect(r.amount_paid).toBe(200);
    await db.collection('labbookings').deleteMany({});
  });

  it('a copay paid on the insurance request is refundable for the amount paid', async () => {
    const db = conn.db!;
    await db.collection('labbookings').insertOne({ id: 'lab-4', patient_id: 'pat-A', total: 200, payment_method: 'insurance', insurance_status: 'approved', insurance_copay: 40, insurance_request_id: 'ir-4', scheduled_date: inHours(48) });
    await db.collection('transactions').insertOne({ id: 'tx-copay4', booking_kind: 'insurance', booking_id: 'ir-4', status: 'paid', amount: 40, gateway_payment_id: 'pay_copay4' });
    const r = await service.request({ id: 'pat-A' }, { booking_kind: 'lab', booking_id: 'lab-4', reason: 'cannot attend' });
    expect(r.amount_paid).toBe(40);
    expect(r.moyasar_payment_id).toBe('pay_copay4');
    await db.collection('labbookings').deleteMany({});
  });

  // Fifth review: consultations and nursing never store insurance_request_id;
  // their copay is found through the insurance request's booking_id. Real
  // transactions carry gateway_charge_id / gateway_intent_id.
  it('a consultation copay paid on its insurance request is refundable, with the real gateway id', async () => {
    const db = conn.db!;
    await db.collection('appointments').insertOne({ id: 'appt-C', patient_id: 'pat-A', slot_start: inHours(30), total_price: 300, payment_method: 'insurance', status: 'confirmed' });
    await db.collection('insuranceservicerequests').insertOne({ id: 'ir-C', booking_id: 'appt-C', booking_kind: 'consultation', copay_amount: 60 });
    await db.collection('transactions').insertOne({ id: 'tx-copayC', booking_kind: 'insurance', booking_id: 'ir-C', status: 'paid', amount: 60, gateway_charge_id: 'pay_copayC' });
    const r = await service.request({ id: 'pat-A' }, { booking_kind: 'consultation', booking_id: 'appt-C', reason: 'cannot attend' });
    expect(r.amount_paid).toBe(60);
    expect(r.moyasar_payment_id).toBe('pay_copayC');
  });
});
