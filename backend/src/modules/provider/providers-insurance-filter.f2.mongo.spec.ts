// F2: the patient's "network providers" screen lists providers that accept
// the patient's insurance company. The filter matched provider
// insurance_contracts, which nothing real writes, so the list was always
// empty. It now matches what providers save (accepted_insurance codes).
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProvidersService } from './providers.service';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ProviderType } from '../../common/enums';

jest.setTimeout(60_000);

describe('public provider list filtered by the patient\'s insurer (F2)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let providers: Model<any>;
  let service: ProvidersService;
  const pub = { status: 'active', public_eligibility: true, medical_review_status: 'approved', type: 'doctor' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'f2list' }).asPromise();
    providers = conn.model('ProviderProfile', ProviderProfileSchema);
    service = new ProvidersService({} as never, providers as never, {} as never, {} as never, {} as never);
    await providers.collection.insertMany([
      { id: 'd-bupa', name_ar: 'أ', ...pub, accepted_insurance: ['bupa', 'tawuniya'] },
      { id: 'd-taw', name_ar: 'ب', ...pub, accepted_insurance: ['tawuniya'] },
      { id: 'd-none', name_ar: 'ج', ...pub, accepted_insurance: [] },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('lists only providers that accept the company code the policy stores', async () => {
    const rows: any[] = await service.listPublic(undefined as never, undefined as never, 'bupa');
    expect(rows.map((r) => r.id)).toEqual(['d-bupa']);
  });

  it('matches the code case-insensitively and still filters by type', async () => {
    expect((await service.listPublic(ProviderType.DOCTOR, undefined as never, 'Tawuniya') as any[]).map((r) => r.id).sort()).toEqual(['d-bupa', 'd-taw']);
    expect(await service.listPublic(ProviderType.LAB, undefined as never, 'bupa')).toEqual([]);
  });
});
