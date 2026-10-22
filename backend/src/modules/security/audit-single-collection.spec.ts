/**
 * One audit collection: the PDPL export and the retention job act on the chain itself, and the migration of the old
 * `audit_logs` collection keeps `verifyChain` green. Real AuditService on an in-memory Mongo.
 */
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditService } from './security.module';
import { AuditRetentionService } from './audit-retention.service';
import { exportAuditEvents } from './user-history.service';
import { AUDIT_COLLECTION, AuditLogSchema } from '../../schemas/audit-log.schema';
import { LEGACY_AUDIT_COLLECTION, migrateLegacyAuditCollection } from './audit-collection-migration';
import { recordAudit, registerAuditSink } from '../../common/audit-record';

jest.setTimeout(60_000);

describe('one audit collection', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let Logs: Model<any>;
  let audit: AuditService;
  let retention: AuditRetentionService;

  beforeAll(async () => {
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(server.getUri()).asPromise();
    Logs = conn.model('AuditLog', AuditLogSchema) as Model<any>;
    await Logs.init();
    const mod = await Test.createTestingModule({ providers: [AuditService, { provide: getModelToken('AuditLog'), useValue: Logs }] }).compile();
    audit = mod.get(AuditService);
    retention = new AuditRetentionService(conn);
  });
  afterAll(async () => { registerAuditSink(null); await conn?.close(); await server?.stop(); });
  beforeEach(async () => {
    for (const c of [AUDIT_COLLECTION, 'audit_sequence', 'audit_tombstones', 'audit_legal_holds', 'schema_migrations']) await conn.collection(c).deleteMany({});
    await conn.db!.collection(LEGACY_AUDIT_COLLECTION).drop().catch(() => undefined);
    for (const c of await conn.db!.listCollections({ name: /^audit_logs_migrated_/ }).toArray()) await conn.db!.collection(c.name).drop();
  });

  it('the model writes to the named collection', () => {
    expect(AUDIT_COLLECTION).toBe('auditlogs');
    expect(Logs.collection.collectionName).toBe(AUDIT_COLLECTION);
  });

  it('the PDPL export returns the chained events of the user, in order, and nobody else\'s', async () => {
    await audit.write({ action: 'login_success', user_id: 'u1', role: 'patient', ip: '203.0.113.9' });
    await audit.write({ action: 'login_success', user_id: 'u2', role: 'patient' });
    await audit.write({ action: 'password_changed', user_id: 'u1', role: 'patient', severity: 'warn' });
    const out = await exportAuditEvents(conn, 'u1');
    expect(out.map((e: any) => e.action)).toEqual(['login_success', 'password_changed']);
    expect(out[0]).toMatchObject({ ip: '203.0.113.9', role: 'patient' });
    expect((await audit.verifyChain()).ok).toBe(true);
  });

  it('retention deletes old chained rows, leaves tombstones, and verifyChain stays green', async () => {
    await audit.write({ action: 'a', user_id: 'u1', resource_kind: 'login_failed', resource_id: 'r1' });
    await audit.write({ action: 'b', user_id: 'u1', resource_kind: 'login_failed', resource_id: 'r2' });
    await audit.write({ action: 'c', user_id: 'u1', resource_kind: 'other', resource_id: 'r3' });
    expect((await audit.verifyChain()).ok).toBe(true);
    const future = new Date(Date.now() + 400 * 24 * 3600 * 1000); // past the 365-day login_failed period
    const out = await retention.apply({ now: future });
    expect(out.summary.login_failed.deleted).toBe(2);
    expect(await conn.collection(AUDIT_COLLECTION).countDocuments({ resource_kind: 'login_failed' })).toBe(0);
    expect(await conn.collection('audit_tombstones').countDocuments()).toBe(2);
    const v = await audit.verifyChain();
    expect(v.ok).toBe(true);
  });

  it('retention leaves a row under legal hold', async () => {
    await audit.write({ action: 'a', user_id: 'u9', resource_kind: 'login_failed', resource_id: 'r1' });
    await retention.placeHold({ user_id: 'u9', reason: 'case 12' });
    const out = await retention.apply({ now: new Date(Date.now() + 400 * 24 * 3600 * 1000) });
    expect(out.summary.login_failed).toMatchObject({ deleted: 0, held: 1 });
    expect(await conn.collection(AUDIT_COLLECTION).countDocuments({ resource_kind: 'login_failed' })).toBe(1);
  });

  it('the raw fallback writer lands in the same collection, outside the chain, and does not disturb it', async () => {
    registerAuditSink(null);
    await audit.write({ action: 'chained', user_id: 'u1' });
    await recordAudit(conn, { action: 'raw_probe', user_id: 'u1' } as any);
    await recordAudit(conn, { action: 'raw_probe_2', user_id: 'u1' } as any); // a second raw row: the unique id must not clash
    expect(await conn.collection(AUDIT_COLLECTION).countDocuments({ action: /^raw_probe/ })).toBe(2);
    expect((await audit.verifyChain()).ok).toBe(true);
    expect((await exportAuditEvents(conn, 'u1')).length).toBe(3);
  });

  describe('migration of the old collection', () => {
    const legacy = () => conn.db!.collection(LEGACY_AUDIT_COLLECTION);
    const seedLegacy = async () => {
      await legacy().insertMany([
        { id: 'audit_1', action: 'old_a', user_id: 'u1', created_at: new Date('2026-01-01') },
        { action: 'old_b_without_id', user_id: 'u1', created_at: new Date('2026-01-02') },
        { id: 'g1', action: 'account.guest_merged', user_id: 'u3', createdAt: new Date('2026-01-03') },
      ]);
    };

    it('copies every row, keeps verifyChain green before and after, sets the old collection aside, and is idempotent', async () => {
      await audit.write({ action: 'x', user_id: 'u1' });
      await audit.write({ action: 'y', user_id: 'u1' });
      await seedLegacy();
      const before = await audit.verifyChain();
      expect(before).toMatchObject({ ok: true, checked: 2 });
      const chainBefore = await conn.collection(AUDIT_COLLECTION).find({ sequence: { $exists: true } }).sort({ sequence: 1 }).toArray();

      const r = await migrateLegacyAuditCollection(conn);
      expect(r).toMatchObject({ found: 3, copied: 3, already_there: 0 });
      expect(r.renamed_to).toMatch(/^audit_logs_migrated_/);

      const after = await audit.verifyChain();
      expect(after).toMatchObject({ ok: true, checked: 2 });
      const chainAfter = await conn.collection(AUDIT_COLLECTION).find({ sequence: { $exists: true } }).sort({ sequence: 1 }).toArray();
      expect(chainAfter).toEqual(chainBefore); // the chain rows are byte for byte the same
      expect(await conn.collection(AUDIT_COLLECTION).countDocuments({ legacy_unchained: true })).toBe(3);
      const noId = await conn.collection(AUDIT_COLLECTION).findOne({ action: 'old_b_without_id' });
      expect(String(noId!.id)).toMatch(/^legacy_/);
      expect(noId!.createdAt).toEqual(new Date('2026-01-02'));
      expect((await conn.db!.listCollections({ name: LEGACY_AUDIT_COLLECTION }).toArray()).length).toBe(0);

      // a second start finds nothing to do; a straggler row written by an old instance is copied once
      expect(await migrateLegacyAuditCollection(conn)).toMatchObject({ found: 0, copied: 0 });
      await legacy().insertOne({ id: 'late', action: 'late', user_id: 'u1', created_at: new Date() });
      expect(await migrateLegacyAuditCollection(conn)).toMatchObject({ found: 1, copied: 1 });
      expect(await conn.collection(AUDIT_COLLECTION).countDocuments({ action: 'late' })).toBe(1);
      expect((await audit.verifyChain()).ok).toBe(true);
    });

    it('migrated rows are in the export, and an interrupted run does not duplicate them', async () => {
      await seedLegacy();
      // a previous run copied one row and stopped before renaming
      const first = await legacy().findOne({ action: 'old_a' });
      const { _id, ...rest } = first!;
      await conn.collection(AUDIT_COLLECTION).insertOne({ _id, ...rest, id: 'audit_1', createdAt: new Date('2026-01-01'), legacy_unchained: true } as any);
      const r = await migrateLegacyAuditCollection(conn);
      expect(r).toMatchObject({ found: 3, copied: 2, already_there: 1 });
      expect(await conn.collection(AUDIT_COLLECTION).countDocuments({})).toBe(3);
      expect((await exportAuditEvents(conn, 'u1')).map((e: any) => e.action)).toEqual(expect.arrayContaining(['old_a', 'old_b_without_id']));
    });

    it('does nothing when the old collection is absent', async () => {
      expect(await migrateLegacyAuditCollection(conn)).toMatchObject({ found: 0, copied: 0, renamed_to: null });
    });
  });
});
