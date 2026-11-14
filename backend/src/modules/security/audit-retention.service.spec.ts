/**
 * Phase 23.5 — retention and legal hold.
 *
 * The plan's Verify, as tests: the job deletes what has aged out, and a legal
 * hold blocks deletion.
 */
import { InjectConnection } from '@nestjs/mongoose';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditRetentionService, DEFAULT_RETENTION } from './audit-retention.service';

jest.setTimeout(30_000);

describe('Phase 23.5 retention by type', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let svc: AuditRetentionService;
  const DAY = 24 * 60 * 60;

  beforeAll(async () => {
    // The default 10s launch timeout is not enough on a loaded CI or laptop,
    // and the failure it produces reads like a real defect.
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(server.getUri()).asPromise();
    await conn.collection('auditlogs').createIndex({ resource_kind: 1, createdAt: 1 }).catch(() => {});
    svc = new AuditRetentionService(conn);
  });
  afterAll(async () => { await conn?.close(); await server?.stop(); });

  beforeEach(async () => {
    await conn.collection('auditlogs').deleteMany({});
    await conn.collection('audit_legal_holds').deleteMany({});
    delete process.env.RETENTION_DAYS;
    delete process.env.RETENTION_DAYS_SECURITY_LOG;
    // The seeded ids must be predictable per test, so the legal-hold tests can
    // name the row they are protecting.
    seedCounter = 0;
  });

  let seedCounter = 0;
  const seed = (kind: string, daysOld: number) =>
    conn.collection('auditlogs').insertOne({
      action: 'x', resource_kind: kind, user_id: `u-${kind}-${(seedCounter += 1)}`,
      createdAt: new Date(Date.now() - daysOld * DAY),
    } as any);

  it('deletes a record that has aged out of its period', async () => {
    await seed('security_log', 400);   // policy 365 days
    await seed('tax_record', 100);     // policy 2190 days — too young
    const out = await svc.apply();
    expect(out.summary.security_log.deleted).toBe(1);
    expect(out.summary.tax_record.deleted).toBe(0);
    expect(await conn.collection('auditlogs').countDocuments({ resource_kind: 'tax_record' })).toBe(1);
  });

  it('keeps a record that is still inside its period', async () => {
    await seed('security_log', 10);
    await svc.apply();
    expect(await conn.collection('auditlogs').countDocuments()).toBe(1);
  });

  it('applies a different period per type', async () => {
    await seed('medical_record', 1000); // 1825 days — inside
    await seed('security_log', 1000);   // 365 days — outside
    const out = await svc.apply();
    expect(out.summary.medical_record.deleted).toBe(0);
    expect(out.summary.security_log.deleted).toBe(1);
  });

  it('a LEGAL HOLD blocks deletion', async () => {
    await seed('security_log', 400);
    await seed('security_log', 400);
    await svc.placeHold({ user_id: 'u-security_log-2', reason: 'active dispute', until: '2099-01-01' });
    const out = await svc.apply();
    expect(out.summary.security_log.deleted).toBe(1);   // the other one goes
    expect(out.summary.security_log.held).toBe(1);      // the held one stays
    expect(await conn.collection('auditlogs').countDocuments()).toBe(1);
  });

  it('an expired hold no longer blocks deletion', async () => {
    await seed('security_log', 400);
    await svc.placeHold({ user_id: 'u-security_log-1', reason: 'old case', until: '2020-01-01' });
    const out = await svc.apply();
    expect(out.summary.security_log.held).toBe(0);
    expect(out.summary.security_log.deleted).toBe(1);
  });

  it('a hold can be released', async () => {
    await seed('security_log', 400);
    const h = await svc.placeHold({ user_id: 'u-security_log-1', reason: 'case' });
    expect(h.held).toBe(true);
    expect((await svc.listHolds()).length).toBe(1);
    const row: any = await conn.collection('audit_legal_holds').findOne({});
    await svc.releaseHold(String(row._id));
    expect((await svc.listHolds()).length).toBe(0);
    await svc.apply();
    expect(await conn.collection('auditlogs').countDocuments()).toBe(0);
  });

  it('the period can be shortened for a test without touching the code', async () => {
    process.env.RETENTION_DAYS_SECURITY_LOG = '1';
    await seed('security_log', 2);
    await svc.apply();
    expect(await conn.collection('auditlogs').countDocuments()).toBe(0);
  });

  it('rejects a nonsense period rather than deleting everything', async () => {
    process.env.RETENTION_DAYS_SECURITY_LOG = '0';
    // Inside the 365-day default, so a bad override must leave it alone
    // instead of being read as "delete now".
    await seed('security_log', 100);
    await svc.apply();
    expect(await conn.collection('auditlogs').countDocuments()).toBe(1);
    expect(svc.policyFor('security_log').days).toBe(365);
  });

  it('the tax period is six years, as ZATCA requires', () => {
    expect(DEFAULT_RETENTION.tax_record.days).toBe(2190);
    expect(DEFAULT_RETENTION.invoice.days).toBe(2190);
  });
});