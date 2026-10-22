import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { InstantConsultationService } from './instant-consultation.service';

// M8 — one open broadcast per patient, however many requests arrive at once.
describe('instant consultation: one open request per patient under concurrency', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let svc: InstantConsultationService;
  const PATIENT = 'pat-conc-m8';
  const DOCTOR = 'doc-conc-m8';

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(server.getUri(), { dbName: 'instant_conc' }).asPromise();
    await conn.collection('provider_profiles').insertOne({ id: DOCTOR, specialty: 'cardiology', status: 'active', price_video: 150 });
    await conn.collection('doctor_instant_availability').insertOne({ doctor_id: DOCTOR, online: true });
    svc = new InstantConsultationService(conn);
    await svc.onModuleInit();
  });
  afterAll(async () => {
    await conn?.close();
    await server?.stop();
  });

  it('the indexes exist and are unique where they must be', async () => {
    const idx = await conn.collection('instant_consultations').indexes();
    const one = idx.find((i) => i.name === 'instant_one_open_per_patient');
    expect(one?.unique).toBe(true);
    expect(one?.partialFilterExpression).toEqual({ status: 'broadcasting' });
  });

  it('five simultaneous requests from one patient: one is created, four are refused', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => svc.create({ id: PATIENT }, { specialty: 'cardiology', mode: 'video' })),
    );
    const created = results.filter((r) => r.status === 'fulfilled');
    const refused = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(4);
    for (const r of refused) expect(JSON.stringify(r.reason.getResponse?.() ?? r.reason)).toContain('instant_request_open');
    const open = await conn.collection('instant_consultations').countDocuments({ patient_id: PATIENT, status: 'broadcasting' });
    expect(open).toBe(1);
  });
});
