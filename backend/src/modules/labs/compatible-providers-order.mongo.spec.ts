// Live gate (j_payments): with more than 50 compatible labs the cart got an
// arbitrary first 50 in natural order, so a lab could vanish from the list.
// Compatible providers are now ordered: rated first (rating, then count), then
// newest, before the 50 cap.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LabsService } from './labs.service';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';

jest.setTimeout(60_000);

describe('lab compatible providers are ordered before the cap', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<any>;
  let svc: LabsService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'compat' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema);
    const services = { find: async () => [{ category: 'blood' }] };
    svc = Object.create(LabsService.prototype);
    Object.assign(svc, { svcModel: services, providerProfiles: profiles });
    const base = { type: 'lab', status: 'active', public_eligibility: true, medical_review_status: 'approved', test_categories: ['t1'] };
    const t0 = Date.now() - 3600_000;
    const rows = Array.from({ length: 60 }, (_, i) => ({ ...base, id: `old-${i}`, account_id: `acc-old-${i}`, name_ar: `معمل ${i}`, createdAt: new Date(t0 + i * 1000) }));
    rows.push({ ...base, id: 'rated', account_id: 'acc-rated', name_ar: 'معمل مقيّم', rating_avg: 4.8, rating_count: 12, createdAt: new Date(t0) } as never);
    rows.push({ ...base, id: 'newest', account_id: 'acc-newest', name_ar: 'معمل جديد', createdAt: new Date() } as never);
    await profiles.collection.insertMany(rows);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('rated labs come first, then the newest; the cap never hides them arbitrarily', async () => {
    const out: any[] = await svc.compatibleProviders(['t1']);
    expect(out).toHaveLength(50);
    expect(out[0].id).toBe('acc-rated');
    expect(out[1].id).toBe('acc-newest');
  });
});
