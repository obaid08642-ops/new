// Provider reactivation (suspended -> approved) on a real MongoDB with the real
// repositories. R1 (9d331ed): reactivation is an approval path, so the typed
// required-document rule applies with no bypass. 13.R6 (0a3366b): it emits
// provider.reactivated, and the real SeoIndexingListener (bound by
// EventEmitterModule through @OnEvent) propagates it to search/sitemap/cache/MCP.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SeoIndexingListener } from '../../seo-search/seo-indexing.listener';
import { SeoService } from '../../seo-search/seo.service';
import { AutoEntitySeoPipelineService } from '../../events/auto-entity-seo-pipeline.service';
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
  let moduleRef: TestingModule;
  const admin = { id: 'admin-1', role: 'admin' };
  const seo = { pingIndexNow: jest.fn().mockResolvedValue({ ok: true }) };
  const pipeline = { invalidateCaches: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'reactivate' }).asPromise();
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot({ wildcard: true })],
      providers: [
        SeoIndexingListener,
        { provide: SeoService, useValue: seo },
        { provide: AutoEntitySeoPipelineService, useValue: pipeline },
        {
          provide: ProviderAdminService,
          inject: [EventEmitter2],
          useFactory: (events: EventEmitter2) => new ProviderAdminService(
            new ProviderAccountRepository(conn.model(ProviderAccount.name, ProviderAccountSchema)),
            {} as never,
            new ProviderDocumentRepository(conn.model(ProviderDocument.name, ProviderDocumentSchema)),
            {} as never,
            new ProviderAuditLogRepository(conn.model(ProviderAuditLog.name, ProviderAuditLogSchema)),
            { processEntity: jest.fn().mockResolvedValue(undefined) } as never,
            events,
            { verify: jest.fn().mockResolvedValue(false) } as never,
          ),
        },
      ],
    }).compile();
    await moduleRef.init();
    svc = moduleRef.get(ProviderAdminService);
  });
  afterAll(async () => { await moduleRef.close(); await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    seo.pingIndexNow.mockClear();
    pipeline.invalidateCaches.mockClear();
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

  it('emits provider.reactivated and the SEO listener restores discovery for the profile (13.R6)', async () => {
    await seedDocs();
    await svc.reactivate(admin, 'acc-1', { reason: 'appeal accepted' });
    // The listener runs asynchronously after the emit; wait for its fan-out.
    for (let i = 0; i < 50 && pipeline.invalidateCaches.mock.calls.length < 7; i++) await new Promise((r) => setTimeout(r, 10));
    expect(seo.pingIndexNow).toHaveBeenCalledWith('doctor', 'prof-1');
    expect(seo.pingIndexNow).toHaveBeenCalledWith('facility', 'prof-1');
    expect(pipeline.invalidateCaches).toHaveBeenCalledWith('pharmacy', 'prof-1');
  });

  it('does not announce a reactivation that R1 refused', async () => {
    await expect(svc.reactivate(admin, 'acc-1', {})).rejects.toThrow('required_documents_missing');
    await new Promise((r) => setTimeout(r, 50));
    expect(seo.pingIndexNow).not.toHaveBeenCalled();
    expect(pipeline.invalidateCaches).not.toHaveBeenCalled();
  });
});
