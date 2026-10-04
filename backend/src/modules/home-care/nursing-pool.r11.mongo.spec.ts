// R11 §5 lead 9: any nurse could cancel an unassigned request for everyone by
// "declining" it, and two nurses claiming the same request both succeeded
// (the last save won). Declining now only hides the request from that nurse,
// and a claim is atomic: the second nurse gets 409.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConflictException } from '@nestjs/common';
import { HomeCareCompatController } from './home-care-compat.module';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';

jest.setTimeout(60_000);

describe('nursing pool claim and decline (R11 §5 lead 9)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let bookings: Model<any>;
  let controller: HomeCareCompatController;
  const nurseA = { id: 'nurse-A', role: 'nurse' };
  const nurseB = { id: 'nurse-B', role: 'nurse' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'pool' }).asPromise();
    bookings = conn.model('HomeCareBooking', HomeCareBookingSchema);
    controller = new HomeCareCompatController(bookings as never, {} as never, {} as never, {} as never, undefined, conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    await bookings.deleteMany({});
    await bookings.collection.insertOne({ id: 'req-1', patient_id: 'pat-1', state: 'NEW_REQUEST', provider_id: null, state_history: [], scheduled_at: new Date(), total: 200, payment_method: 'card', payment_status: 'paid', duration: 'hour', service_name_ar: 'تمريض' });
  });

  it('a nurse declining an open request does not cancel it, and no longer sees it', async () => {
    await controller.respond(nurseA, 'req-1', { accept: false } as never);
    const row: any = await bookings.findOne({ id: 'req-1' }).lean();
    expect(row.state).toBe('NEW_REQUEST');
    const poolA = await controller.nursingQueue(nurseA, { status: 'incoming' });
    const poolB = await controller.nursingQueue(nurseB, { status: 'incoming' });
    expect(poolA.map((b: any) => b.id)).not.toContain('req-1');
    expect(poolB.map((b: any) => b.id)).toContain('req-1');
  });

  it('only one nurse can claim an open request', async () => {
    const results = await Promise.allSettled([
      controller.respond(nurseA, 'req-1', { accept: true } as never),
      controller.respond(nurseB, 'req-1', { accept: true } as never),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    const row: any = await bookings.findOne({ id: 'req-1' }).lean();
    expect(row.state).toBe('CONFIRMED');
  });

  it('a nurse cannot cancel a request another nurse claimed', async () => {
    await controller.respond(nurseA, 'req-1', { accept: true } as never);
    await expect(controller.respond(nurseB, 'req-1', { accept: false } as never)).rejects.toThrow();
    const row: any = await bookings.findOne({ id: 'req-1' }).lean();
    expect(row.provider_id).toBe('nurse-A');
    expect(row.state).toBe('CONFIRMED');
  });

  // Second review: accepting moved the booking to PROVIDER_ASSIGNED, which is a
  // pre-acceptance state (the nurse never got the address), and a booking the
  // patient addressed to a nurse (already PROVIDER_ASSIGNED) could not be accepted.
  // Accepting now confirms, with the same payment rule as provider-jobs.
  it('the nurse the patient picked accepts and the booking is confirmed', async () => {
    await bookings.updateOne({ id: 'req-1' }, { $set: { provider_id: 'nurse-A', state: 'PROVIDER_ASSIGNED' } });
    await expect(controller.respond(nurseB, 'req-1', { accept: true } as never)).rejects.toBeInstanceOf(ConflictException);
    await controller.respond(nurseA, 'req-1', { accept: true } as never);
    expect(((await bookings.findOne({ id: 'req-1' }).lean()) as any).state).toBe('CONFIRMED');
  });

  it('an unpaid card booking or an insurance booking cannot be accepted here, and stays unclaimed', async () => {
    await bookings.updateOne({ id: 'req-1' }, { $set: { payment_status: 'pending' } });
    await expect(controller.respond(nurseA, 'req-1', { accept: true } as never)).rejects.toThrow('card_payment_not_completed');
    await bookings.updateOne({ id: 'req-1' }, { $set: { payment_method: 'insurance' } });
    await expect(controller.respond(nurseA, 'req-1', { accept: true } as never)).rejects.toThrow('insurance_booking_requires_coverage_decision');
    const row: any = await bookings.findOne({ id: 'req-1' }).lean();
    expect(row.provider_id).toBeNull();
    expect(row.state).toBe('NEW_REQUEST');
  });
});
