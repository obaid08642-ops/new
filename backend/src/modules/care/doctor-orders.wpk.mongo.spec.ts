// WP-K: the doctor's "request medical services" screen posted the doctor's own
// account to the patient booking routes (/labs/bookings, /radiology/bookings,
// /home-care/bookings), and the referral engine meant for it keyed every id by
// Mongo _id (clients only know uuids) and let any doctor attach results to any
// referral. Doctor orders: a doctor orders tests or nursing for the patient of
// their own appointment; the patient is notified and sees the order to book it.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DoctorOrdersService } from './doctor-orders.service';

jest.setTimeout(60_000);

describe('doctor orders (WP-K)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: DoctorOrdersService;
  const notifications = { create: jest.fn(async () => ({})) };
  const doctor = { id: 'doc-1', role: 'doctor' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'orders' }).asPromise();
    const db = conn.db!;
    await db.collection('appointments').insertMany([
      { id: 'appt-1', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'COMPLETED' },
      { id: 'appt-2', patient_id: 'pat-2', doctor_user_id: 'doc-other', status: 'CONFIRMED' },
      { id: 'appt-3', patient_id: 'pat-1', doctor_user_id: 'doc-1', status: 'CANCELLED' },
    ]);
    await db.collection('lab_services').insertMany([{ id: 'cbc', name_ar: 'تعداد دم', name_en: 'CBC', active: true }, { id: 'lipid', name_ar: 'دهون', name_en: 'Lipid panel', active: true }]);
    await db.collection('radiology_services').insertOne({ id: 'xray-chest', name_ar: 'أشعة صدر', name_en: 'Chest X-ray' });
    svc = new DoctorOrdersService(conn, notifications as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { notifications.create.mockClear(); await conn.db!.collection('doctor_orders').deleteMany({}); });

  it('a doctor orders tests for the patient of their own appointment; the patient is notified', async () => {
    const order = await svc.create(doctor, { appointment_id: 'appt-1', kind: 'lab', service_ids: ['cbc', 'lipid'], notes: 'fasting' });
    expect(order).toEqual(expect.objectContaining({ patient_id: 'pat-1', doctor_user_id: 'doc-1', kind: 'lab', status: 'open' }));
    expect(order.items.map((i: any) => i.name_en)).toEqual(['CBC', 'Lipid panel']);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat-1', action: expect.objectContaining({ route: '/health/actionable-order' }) }));
    const mine = await svc.forPatient({ id: 'pat-1', role: 'patient' });
    expect(mine.map((o: any) => o.id)).toEqual([order.id]);
    expect(await svc.forPatient({ id: 'pat-2', role: 'patient' })).toEqual([]);
  });

  it("another doctor's appointment is not found, and a cancelled one is refused", async () => {
    await expect(svc.create(doctor, { appointment_id: 'appt-2', kind: 'lab', service_ids: ['cbc'] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.create(doctor, { appointment_id: 'appt-3', kind: 'lab', service_ids: ['cbc'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only real catalog services can be ordered', async () => {
    await expect(svc.create(doctor, { appointment_id: 'appt-1', kind: 'radiology', service_ids: ['cbc'] })).rejects.toBeInstanceOf(BadRequestException);
    const ok = await svc.create(doctor, { appointment_id: 'appt-1', kind: 'radiology', service_ids: ['xray-chest'] });
    expect(ok.items[0].name_ar).toBe('أشعة صدر');
  });
});
