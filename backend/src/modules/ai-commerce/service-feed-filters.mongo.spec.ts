// Independent check on 1805fce2: the feed spec passed `facilities: []`, so the
// facility filter and the city-regex escaping were untested. Against a real
// Mongo: only active, public, medically approved facilities and doctors are
// listed, and a city with regex metacharacters matches literally.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AiCommerceService } from './ai-commerce.service';

jest.setTimeout(60_000);

describe('public service feed filters (real Mongo)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: AiCommerceService;
  const ok = { public_eligibility: true, medical_review_status: 'approved' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'feed' }).asPromise();
    svc = Object.assign(Object.create(AiCommerceService.prototype), { connection: conn });
    await conn.collection('facilities').insertMany([
      { id: 'f-ok', name_ar: 'منشأة معتمدة', city: 'الرياض', is_active: true, ...ok },
      { id: 'f-pending', name_ar: 'قيد المراجعة', city: 'الرياض', is_active: true, public_eligibility: true, medical_review_status: 'pending' },
      { id: 'f-private', name_ar: 'غير عامة', city: 'الرياض', is_active: true, public_eligibility: false, medical_review_status: 'approved' },
      { id: 'f-noflag', name_ar: 'بلا حالة تفعيل', city: 'الرياض', ...ok },
      { id: 'f-dot', name_ar: 'مدينة بنقطة', city: 'a.b', is_active: true, ...ok },
      { id: 'f-axb', name_ar: 'مدينة أخرى', city: 'axb', is_active: true, ...ok },
    ]);
    await conn.collection('provider_profiles').insertMany([
      { id: 'd-ok', type: 'doctor', status: 'active', city: 'الرياض', ...ok },
      { id: 'd-pending', type: 'doctor', status: 'active', city: 'الرياض', public_eligibility: true, medical_review_status: 'pending' },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const ids = async (city?: string) => {
    const out: any = await svc.getServiceFeed({ city } as never);
    const rows: Array<{ id: string }> = Array.isArray(out) ? out : out.services || out.data || out.items || [];
    return rows.map((r) => r.id).sort();
  };

  it('lists only active, public, medically approved facilities and doctors', async () => {
    expect(await ids('الرياض')).toEqual(['d-ok', 'f-ok']);
  });

  it('a city with regex metacharacters matches literally', async () => {
    expect(await ids('a.b')).toEqual(['f-dot']);
  });
});
