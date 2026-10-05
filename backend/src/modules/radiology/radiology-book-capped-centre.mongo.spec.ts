// Independent check: book() verified the chosen centre against
// compatibleProviders(), which is capped at 50; with more qualifying centres a
// low-rated or unrated one was refused (provider_cannot_perform_scan) though
// it can perform the scan. The chosen centre is now checked directly.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RadiologyOpsService } from './radiology.service';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';

jest.setTimeout(60_000);

describe('radiology booking checks the chosen centre, not a capped list', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<any>;
  let svc: RadiologyOpsService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'radcap' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema);
    svc = Object.create(RadiologyOpsService.prototype);
    const services = { find: () => ({ lean: async () => [{ modality: 'mri' }] }) };
    Object.assign(svc, { svcModel: services, profileModel: profiles });
    const base = { type: 'radiology', status: 'active', public_eligibility: true, medical_review_status: 'approved', equipment_list: ['mri'] };
    await profiles.collection.insertMany([
      ...Array.from({ length: 60 }, (_, i) => ({ ...base, id: `c-${i}`, account_id: `acc-${i}`, name_ar: `مركز ${i}`, rating_avg: 4, rating_count: 5 })),
      { ...base, id: 'c-new', account_id: 'acc-new', name_ar: 'مركز جديد', createdAt: new Date(Date.now() - 86400000 * 30) },
      { ...base, id: 'c-ct', account_id: 'acc-ct', name_ar: 'أشعة مقطعية', equipment_list: ['ct'] },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('an unrated centre outside the first 50 still qualifies for its own booking', async () => {
    expect((await svc.compatibleProviders(['s1'])).some((p: any) => p.id === 'acc-new')).toBe(false); // the list stays capped
    expect(await svc.compatibleProviders(['s1'], 'acc-new')).toEqual([expect.objectContaining({ id: 'acc-new' })]);
    expect(await svc.compatibleProviders(['s1'], 'acc-ct')).toEqual([]);
  });

  it('book() itself accepts that centre and refuses one without the modality', async () => {
    const booker = Object.assign(Object.create(RadiologyOpsService.prototype), svc, { getById: async () => ({ id: 's1', modality: 'mri' }) });
    const patient = { id: 'pat-1', role: 'patient' };
    // Past the centre check, the next rule (no scheduled_at) is what refuses it.
    await expect(booker.book(patient, { service_id: 's1', provider_account_id: 'acc-new' })).rejects.toThrow('scheduled_at_required');
    await expect(booker.book(patient, { service_id: 's1', provider_account_id: 'acc-ct' })).rejects.toThrow('provider_cannot_perform_scan');
  });
});
