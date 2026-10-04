// F2 (PRODUCT.md): Nabd+ does not approve claims or hold annual limits, so the
// old summary (coverage rules from a collection that does not exist, always
// []) is replaced by what Nabd+ really records: the patient's insurance
// requests, decided by the providers, per service.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { InsuranceFlowService, InsuranceServiceRequestSchema } from './insurance-engine.module';

jest.setTimeout(60_000);

describe('InsuranceFlowService.benefitsSummary (F2: decided insurance requests per service)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let requests: Model<any>;
  let patients: Model<any>;
  let service: InsuranceFlowService;
  const policy = { company_id: 'bupa', provider: 'بوبا العربية', policy_number: 'P-1' };
  const req = (over: Record<string, unknown>) => ({ id: new mongoose.Types.ObjectId().toString(), patient_id: 'pat-1', provider_id: 'prov-1', price: 300, policy: { company_id: 'bupa' }, history: [], documents: [], ...over });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'f2ben' }).asPromise();
    requests = conn.model('InsuranceServiceRequest', InsuranceServiceRequestSchema);
    patients = conn.model('PatientProfile', new mongoose.Schema({ user_id: String, insurance: Object }, { strict: false }));
    service = new InsuranceFlowService(requests as never, {} as never, patients as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await requests.deleteMany({}); await patients.deleteMany({}); });

  it('no policy -> []', async () => {
    await patients.collection.insertOne({ user_id: 'pat-1' });
    expect(await service.benefitsSummary({ id: 'pat-1' })).toEqual([]);
  });

  it('summarises the patient\'s own requests per service, as the providers decided them', async () => {
    await patients.collection.insertOne({ user_id: 'pat-1', insurance: policy });
    await requests.collection.insertMany([
      req({ booking_kind: 'consultation', state: 'APPROVED_FULL' }),
      req({ booking_kind: 'consultation', state: 'COPAY_PAID', copay_amount: 60, copay_percent: 20 }),
      req({ booking_kind: 'consultation', state: 'REJECTED', rejection_reason: 'not covered' }),
      req({ booking_kind: 'consultation', state: 'PENDING_PROVIDER_REVIEW' }),
      req({ booking_kind: 'home_care', state: 'COPAY_PENDING', copay_amount: 40, copay_percent: 10 }),
      req({ booking_kind: 'consultation', state: 'APPROVED_FULL', patient_id: 'someone-else' }),
    ]);
    const out: any[] = await service.benefitsSummary({ id: 'pat-1' });
    const byService = Object.fromEntries(out.map((r) => [r.service, r]));
    expect(byService.consultation).toMatchObject({ requests: 4, approved: 2, partially_approved: 1, rejected: 1, pending: 1, copay_paid: 60, icon: 'stethoscope' });
    expect(byService.nursing).toMatchObject({ requests: 1, approved: 1, partially_approved: 1, copay_paid: 0, copay_due: 40, icon: 'heart' });
    expect(out).toHaveLength(2);
  });

  it('a rejection the patient then chose to self-pay still counts as rejected (the provider\'s decision)', async () => {
    await patients.collection.insertOne({ user_id: 'pat-1', insurance: policy });
    const at = new Date();
    await requests.collection.insertMany([
      req({ booking_kind: 'consultation', state: 'COPAY_PENDING', copay_percent: 100, copay_amount: 300,
        history: [{ state: 'PENDING_PROVIDER_REVIEW', at, by: 'pat-1' }, { state: 'REJECTED', at, by: 'doc', note: 'not covered' }, { state: 'COPAY_PENDING', at, by: 'pat-1', note: 'patient accepted full self-pay' }] }),
      req({ booking_kind: 'consultation', state: 'COPAY_PAID', copay_percent: 20, copay_amount: 60,
        history: [{ state: 'PENDING_PROVIDER_REVIEW', at, by: 'pat-1' }, { state: 'COPAY_PENDING', at, by: 'doc', note: 'patient copay 20%' }, { state: 'COPAY_PAID', at, by: 'system', note: 'verified payment p1' }] }),
    ]);
    const [row]: any[] = await service.benefitsSummary({ id: 'pat-1' });
    expect(row).toMatchObject({ service: 'consultation', requests: 2, approved: 1, partially_approved: 1, rejected: 1, pending: 0, copay_paid: 60, copay_due: 300 });
  });
});
