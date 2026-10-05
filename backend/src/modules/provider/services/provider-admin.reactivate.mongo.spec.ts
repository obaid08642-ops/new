// Provider reactivation (suspended -> approved) on a real MongoDB with the real
// repositories. R1 (9d331ed): reactivation is an approval path, so the typed
// required-document rule applies with no bypass.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderAdminService } from './provider-admin.service';
import {
  ProviderAccount, ProviderAccountSchema, ProviderAuditLog, ProviderAuditLogSchema,
  ProviderDocument, ProviderDocumentSchema,
} from '../schemas';
import { ProviderAccountRepository } from './repositories/provideraccount.repository';
import { ProviderDocumentRepository } from './repositories/providerdocument.repository';
import { ProviderAuditLogRepository } from './repositories/providerauditlog.repository';
import { ProviderAccountStatus } from '../provider.enums';

jest.setTimeout(60_000);

describe('ProviderAdminService.reactivate (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: ProviderAdminService;
  let events: EventEmitter2;
  const admin = { id: 'admin-1', role: 'admin' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'reactivate' }).asPromise();
    events = new EventEmitter2();
    svc = new ProviderAdminService(
      new ProviderAccountRepository(conn.model(ProviderAccount.name, ProviderAccountSchema)),
      {} as never,
      new ProviderDocumentRepository(conn.model(ProviderDocument.name, ProviderDocumentSchema)),
      {} as never,
      new ProviderAuditLogRepository(conn.model(ProviderAuditLog.name, ProviderAuditLogSchema)),
      { processEntity: jest.fn().mockResolvedValue(undefined) } as never,
      events,
      { verify: jest.fn().mockResolvedValue(false) } as never,
    );
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    const db = conn.db!;
    for (const c of ['provider_accounts', 'provider_documents', 'provider_audit_logs', 'provider_profiles', 'users']) await db.collection(c).deleteMany({});
    await db.collection('provider_accounts').insertOne({
      id: 'acc-1', email: 'pharmacy@example.test', provider_type: 'pharmacy', status: ProviderAccountStatus.SUSPENDED,
      status_history: [], token_version: 3, user_id: 'user-1',
    });
    await db.collection('users').insertOne({ id: 'user-1', active: false, suspended: true, token_version: 3 });
    await db.collection('provider_profiles').insertOne({ id: 'prof-1', account_id: 'acc-1', user_id: 'user-1', type: 'pharmacy', status: 'suspended', public_eligibility: false });
  });

  const seedDocs = async (overrides: Record<string, string> = {}) => {
    for (const doc_type of ['commercial_registration', 'facility_license', 'iban_letter']) {
      await conn.db!.collection('provider_documents').insertOne({
        id: `doc-${doc_type}`, account_id: 'acc-1', doc_type, storage_object_id: `obj-${doc_type}`, review_status: overrides[doc_type] || 'approved',
      });
    }
  };

  it('refuses to reactivate when a required document is missing (R1)', async () => {
    await expect(svc.reactivate(admin, 'acc-1', { reason: 'appeal accepted' })).rejects.toThrow('required_documents_missing');
    const acc = await conn.db!.collection('provider_accounts').findOne({ id: 'acc-1' });
    expect(acc?.status).toBe(ProviderAccountStatus.SUSPENDED);
  });

  it('refuses to reactivate when a required document was rejected while suspended (R1)', async () => {
    await seedDocs({ facility_license: 'rejected' });
    await expect(svc.reactivate(admin, 'acc-1', { reason: 'appeal accepted' })).rejects.toThrow('required_documents_missing: facility_license');
  });

  it('reactivates with every required document in place', async () => {
    await seedDocs();
    await svc.reactivate(admin, 'acc-1', { reason: 'appeal accepted' });
    const acc = await conn.db!.collection('provider_accounts').findOne({ id: 'acc-1' });
    expect(acc?.status).toBe(ProviderAccountStatus.APPROVED);
    const prof = await conn.db!.collection('provider_profiles').findOne({ id: 'prof-1' });
    expect(prof).toMatchObject({ status: 'active', public_eligibility: true });
  });
});
