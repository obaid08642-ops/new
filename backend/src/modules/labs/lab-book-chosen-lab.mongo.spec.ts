// Independent check (WP-K): lab book() never checked that the chosen lab is an
// approved, public lab that runs the requested tests, and loaded the tests by
// id only (an unapproved or inactive test was bookable at its stored price).
// book() now books only approved catalogue tests, all of them, at a lab that
// runs every one; the lab is checked directly, past the list's cap of 50.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LabsService } from './labs.service';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';

jest.setTimeout(60_000);

describe('lab booking checks the tests and the chosen lab', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<any>;
  let svc: LabsService;
  const patient = { id: 'pat-1', role: 'patient' };
  const future = new Date(Date.now() + 2 * 86400000).toISOString();
  const book = (items: string[], provider: string) =>
    svc.book(patient, { items: items.map((service_id) => ({ service_id })), scheduled_at: future, location_type: 'facility', payment_method: 'cash', provider_account_id: provider });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'labbook' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema);
    const tests = conn.collection('lab_services_spec');
    await tests.insertMany([
      { id: 't-cbc', name_ar: 'صورة دم', category: 'blood', price: 50, active: true, public_eligibility: true, medical_review_status: 'approved' },
      { id: 't-pending', name_ar: 'تحليل قيد المراجعة', category: 'blood', price: 1, active: true, public_eligibility: true, medical_review_status: 'pending' },
    ]);
    // The repository is a thin model wrapper; a real collection answers find().
    const svcModel = { find: (q: object) => tests.find(q).toArray() };
    // Past the lab check the next step counts slot collisions; stop there with a recognisable error.
    const bkgModel = { countDocuments: async () => { throw new Error('reached_slot_check'); } };
    svc = Object.assign(Object.create(LabsService.prototype), { svcModel, bkgModel, providerProfiles: profiles });
    const base = { type: 'lab', status: 'active', public_eligibility: true, medical_review_status: 'approved' };
    await profiles.collection.insertMany([
      ...Array.from({ length: 60 }, (_, i) => ({ ...base, id: `l-${i}`, account_id: `acc-${i}`, test_categories: ['t-cbc'], rating_avg: 4, rating_count: 5 })),
      { ...base, id: 'l-new', account_id: 'acc-new', test_categories: ['t-cbc'] },
      { ...base, id: 'l-other', account_id: 'acc-other', test_categories: ['urine'] },
      { ...base, id: 'l-pending', account_id: 'acc-pending', test_categories: ['t-cbc'], medical_review_status: 'pending' },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('a lab that runs the test passes the check, even past the list cap', async () => {
    await expect(book(['t-cbc'], 'acc-new')).rejects.toThrow('reached_slot_check');
  });
  it('a lab that does not run the test is refused', async () => {
    await expect(book(['t-cbc'], 'acc-other')).rejects.toThrow('provider_cannot_perform_tests');
  });
  it('an unapproved lab is refused', async () => {
    await expect(book(['t-cbc'], 'acc-pending')).rejects.toThrow('provider_cannot_perform_tests');
  });
  it('an unapproved test is not bookable, alone or with an approved one', async () => {
    await expect(book(['t-pending'], 'acc-new')).rejects.toThrow('no_valid_services');
    await expect(book(['t-cbc', 't-pending'], 'acc-new')).rejects.toThrow('service_not_available');
  });
});
