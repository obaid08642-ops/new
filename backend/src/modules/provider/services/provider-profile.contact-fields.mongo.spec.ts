// Q45: the ambulance profile sends contact_phone and coverage_cities. The
// patch DTO and the service allow-list accept them and the edit becomes a
// pending delta; once an admin approves it, the provider must read the new
// values back. The ProviderProfile schema did not declare either field, so
// they were not part of the typed profile. Real MongoDB, real repositories,
// the real approve path (ProviderAdminService.approveDelta).
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderProfileService } from './provider-profile.service';
import { ProviderAdminService } from './provider-admin.service';
import { ProviderAccountProfileRepository } from './repositories/provideraccountprofile.repository';
import { ProviderAccountRepository } from './repositories/provideraccount.repository';
import { ProviderAuditLogRepository } from './repositories/providerauditlog.repository';
import {
  ProviderAccount, ProviderAccountSchema, ProviderAuditLog, ProviderAuditLogSchema, ProviderProfile, ProviderProfileSchema,
} from '../schemas';

jest.setTimeout(60_000);

describe('ambulance contact_phone / coverage_cities persist through the approved change (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profileSvc: ProviderProfileService;
  let adminSvc: ProviderAdminService;
  const provider = { id: 'acc-amb', role: 'ambulance' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'q45' }).asPromise();
    const profiles = new ProviderAccountProfileRepository(conn.model('ProviderAccountProfile', ProviderProfileSchema));
    const accounts = new ProviderAccountRepository(conn.model(ProviderAccount.name, ProviderAccountSchema));
    const audit = new ProviderAuditLogRepository(conn.model(ProviderAuditLog.name, ProviderAuditLogSchema));
    const events = new EventEmitter2();
    profileSvc = new ProviderProfileService(accounts, profiles, {} as never, {} as never, audit, conn, {} as never, events);
    adminSvc = new ProviderAdminService(accounts, profiles, {} as never, {} as never, audit, { processEntity: jest.fn().mockResolvedValue(undefined) } as never, events, {} as never);
    await conn.db!.collection('provider_profiles').insertOne({
      id: 'prof-amb', account_id: 'acc-amb', provider_type: 'ambulance', display_name_ar: 'إسعاف', phones: [],
    });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('declares both fields on the ProviderProfile schema', () => {
    expect(ProviderProfileSchema.path('contact_phone')).toBeDefined();
    expect(ProviderProfileSchema.path('coverage_cities')).toBeDefined();
    expect(ProviderProfileSchema.path('coverage_cities').instance).toBe('Array');
  });

  it('save -> admin approves -> reload shows the values, and a later profile save keeps them', async () => {
    const res = await profileSvc.updateProfile(provider, { contact_phone: ' +966500000001 ', coverage_cities: ['الرياض', ' الخرج ', 7] });
    expect(res).toMatchObject({ pending_review: true });
    const delta = await conn.db!.collection('provider_deltas').findOne({ provider_id: 'acc-amb', status: 'pending' });
    expect(delta?.requested_changes).toEqual({ contact_phone: '+966500000001', coverage_cities: ['الرياض', 'الخرج'] });

    await adminSvc.approveDelta({ id: 'admin-1', role: 'admin' }, String(delta?.id));

    const reloaded = (await profileSvc.getProfile(provider)) as unknown as ProviderProfile;
    expect(reloaded.contact_phone).toBe('+966500000001');
    expect(reloaded.coverage_cities).toEqual(['الرياض', 'الخرج']);

    // A later model save (adding a phone) goes through the schema and must keep them.
    await profileSvc.addPhone(provider, { type: 'mobile', number: '500000002' });
    const raw = await conn.db!.collection('provider_profiles').findOne({ account_id: 'acc-amb' });
    expect(raw).toMatchObject({ contact_phone: '+966500000001', coverage_cities: ['الرياض', 'الخرج'] });
  });
});
