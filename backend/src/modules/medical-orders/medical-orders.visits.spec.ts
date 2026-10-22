import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { MedicalOrdersService } from './medical-orders.service';

const DAY = 86_400_000;
const DOC = 'doc-visits';
const OTHER = 'doc-visits-other';

// M2 — a doctor may write the order after the visit, for a limited time; the list of those visits carries no personal data.
describe('medical orders: visits after the consultation', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let svc: MedicalOrdersService;
  const ago = (days: number) => new Date(Date.now() - days * DAY);
  const labOrder = { labs: [{ catalog_id: 'cbc' }] };

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(server.getUri(), { dbName: 'medical_orders_visits' }).asPromise();
    await conn.collection('lab_services').insertOne({ id: 'cbc', code: 'CBC', name_ar: 'صورة دم', active: true });
    const visit = (id: string, doctor: string, status: string, updatedAt: Date) => ({
      id, patient_id: `pat-${id}`, doctor_user_id: doctor, provider_id: doctor, status, updatedAt, createdAt: updatedAt,
      patient_name: 'Secret Name', patient_phone: '+966500000000', summary: { diagnosis: 'secret' },
    });
    await conn.collection('appointments').insertMany([
      visit('v-recent', DOC, 'completed', ago(3)),
      visit('v-old', DOC, 'completed', ago(90)),
      visit('v-live', DOC, 'in_progress', ago(2)),
      visit('v-scheduled', DOC, 'scheduled', ago(1)),
      visit('v-other', OTHER, 'completed', ago(1)),
    ]);
    svc = new MedicalOrdersService(conn);
  });
  afterAll(async () => {
    await conn?.close();
    await server?.stop();
  });

  it('writes an order for a visit that ended inside the window and for one in progress', async () => {
    expect(await svc.create({ id: DOC }, 'v-recent', labOrder)).toMatchObject({ status: 'active' });
    expect(await svc.create({ id: DOC }, 'v-live', labOrder)).toMatchObject({ status: 'active' });
  });

  it('refuses a completed visit past the window, a visit not yet held, and another doctor\'s visit', async () => {
    await expect(svc.create({ id: DOC }, 'v-old', labOrder)).rejects.toMatchObject({ response: { message: 'visit_window_closed' } });
    await expect(svc.create({ id: DOC }, 'v-scheduled', labOrder)).rejects.toMatchObject({ response: { message: 'appointment_not_visited' } });
    await expect(svc.create({ id: DOC }, 'v-other', labOrder)).rejects.toMatchObject({ response: { message: 'not_your_appointment' } });
  });

  it('lists only the doctor\'s own open visits, with id, status, patient id and date and nothing else', async () => {
    const rows = await svc.recentVisits({ id: DOC });
    expect(rows.map((r) => r.id).sort()).toEqual(['v-live', 'v-recent']);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(['date', 'id', 'patient_id', 'status']);
      expect(r.date).toBeInstanceOf(Date);
    }
    expect(JSON.stringify(rows)).not.toMatch(/Secret|966500|diagnosis/);
    expect((await svc.recentVisits({ id: 'doc-nobody' }))).toEqual([]);
  });

  it('the window is read from SystemConfig `medical_order_after_visit_days`', async () => {
    await conn.collection('system_configs').updateOne({ key: 'medical_order_after_visit_days' }, { $set: { key: 'medical_order_after_visit_days', value: 120 } }, { upsert: true });
    expect(await svc.create({ id: DOC }, 'v-old', labOrder)).toMatchObject({ status: 'active' });
    expect((await svc.recentVisits({ id: DOC })).map((r) => r.id)).toContain('v-old');

    await conn.collection('system_configs').updateOne({ key: 'medical_order_after_visit_days' }, { $set: { value: 1 } });
    await expect(svc.create({ id: DOC }, 'v-recent', labOrder)).rejects.toMatchObject({ response: { message: 'visit_window_closed' } });
    // a value that is not a whole number of days falls back to the default (30)
    await conn.collection('system_configs').updateOne({ key: 'medical_order_after_visit_days' }, { $set: { value: 'abc' } });
    expect(await svc.create({ id: DOC }, 'v-recent', labOrder)).toMatchObject({ status: 'active' });
  });
});
