import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { MedicalOrdersService } from './medical-orders.service';

// Starting the in-memory MongoDB can take longer than the 5 s default hook timeout on a busy machine.
jest.setTimeout(120_000);

// M2 — indexes exist, and ten simultaneous renew requests from one patient on one order leave one row.
describe('medical orders: indexes and concurrent renew requests', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let svc: MedicalOrdersService;
  const PATIENT = 'pat-conc';

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(server.getUri(), { dbName: 'medical_orders_conc' }).asPromise();
    await conn.collection('medical_orders').insertOne({
      id: 'mo-conc', patient_id: PATIENT, doctor_id: 'doc-conc', appointment_id: 'appt-conc', status: 'active',
      valid_until: new Date(Date.now() - 86_400_000), createdAt: new Date(), items: [],
    });
    svc = new MedicalOrdersService(conn);
  });
  afterAll(async () => {
    await conn?.close();
    await server?.stop();
  });

  it('creates the indexes and is safe to run twice', async () => {
    await svc.onModuleInit();
    await svc.onModuleInit();
    const idx = await conn.collection('medical_order_renew_requests').indexes();
    expect(idx.find((i) => i.name === 'renew_order_patient_unique')?.unique).toBe(true);
    const orders = await conn.collection('medical_orders').indexes();
    expect(orders.find((i) => i.name === 'medical_order_id_unique')?.unique).toBe(true);
  });

  it('ten simultaneous renew requests leave one row', async () => {
    await Promise.all(Array.from({ length: 10 }, () => svc.renewRequest({ id: PATIENT }, 'mo-conc')));
    const n = await conn.collection('medical_order_renew_requests').countDocuments({ order_id: 'mo-conc', patient_id: PATIENT });
    expect(n).toBe(1);
  });
});
