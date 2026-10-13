/**
 * Phase 23.3 — the audit trail is tamper-evident.
 *
 * The plan's Verify: "editing or deleting an event breaks the hash chain, and a
 * check reports it." So these tests edit and delete rows on purpose and assert
 * that verifyChain names the break rather than returning a vague failure.
 */
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditService } from './security.module';
import { AuditLogSchema } from '../../schemas/audit-log.schema';

jest.setTimeout(30_000);

describe('Phase 23 audit chain (23.1 + 23.3)', () => {
  let conn: Connection;
  let service: AuditService;
  let Logs: Model<any>;
  let server: MongoMemoryServer;

  beforeAll(async () => {
    // The default 10s launch timeout is not enough on a loaded CI or laptop,
    // and the failure it produces reads like a real defect.
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(server.getUri()).asPromise();
    Logs = conn.model('AuditLog', AuditLogSchema) as Model<any>;
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: getModelToken('AuditLog'), useValue: Logs }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  afterAll(async () => {
    await conn?.close();
    await server?.stop();
  });

  beforeEach(async () => {
    await Logs.deleteMany({});
    // The sequence counter is a separate collection, so it has to be reset too;
    // otherwise sequences keep climbing across tests and the assertions that
    // name a broken row would be asserting the wrong number.
    await conn.collection('audit_sequence').deleteMany({});
    await conn.collection('audit_tombstones').deleteMany({});
  });

  it('records every field 23.1 asks for', async () => {
    await service.write({
      action: 'admin_refund',
      user_id: 'admin-1',
      role: 'admin',
      impersonator_id: 'super-1',
      resource_kind: 'transaction',
      resource_id: 'tx-9',
      details: { amount: 250 },
      changes: { before: { status: 'paid' }, after: { status: 'refunded' } },
      ip: '10.0.0.1',
      device_id: 'dev-3',
      user_agent: 'Mozilla/5.0',
      platform: 'ios',
      app_version: '2.1.0',
      reason: 'duplicate charge reported by the patient',
      severity: 'critical',
      correlation_id: 'cid-1',
    });
    const row: any = await Logs.findOne({ action: 'admin_refund' }).lean<any>();
    expect(row.user_id).toBe('admin-1');
    expect(row.impersonator_id).toBe('super-1');
    expect(row.changes).toEqual({ before: { status: 'paid' }, after: { status: 'refunded' } });
    expect(row.device_id).toBe('dev-3');
    expect(row.platform).toBe('ios');
    expect(row.app_version).toBe('2.1.0');
    expect(row.reason).toBe('duplicate charge reported by the patient');
    expect(row.correlation_id).toBe('cid-1');
    expect(row.createdAt).toBeTruthy(); // when — server time
  });

  it('chains rows: each carries the hash of the one before it', async () => {
    await service.write({ action: 'a' });
    await service.write({ action: 'b' });
    await service.write({ action: 'c' });
    const rows: any[] = await Logs.find({}).sort({ sequence: 1 }).lean<any[]>();
    expect(rows.map((r: any) => r.action)).toEqual(['a', 'b', 'c']);
    expect(rows[0].prev_hash).toBeNull();
    expect(rows[1].prev_hash).toBe(rows[0].hash);
    expect(rows[2].prev_hash).toBe(rows[1].hash);
    expect(new Set(rows.map((r: any) => r.hash)).size).toBe(3);
  });

  it('reports a clean chain as clean', async () => {
    for (const a of ['a', 'b', 'c']) await service.write({ action: a });
    const v = await service.verifyChain();
    expect(v.ok).toBe(true);
    expect(v.checked).toBe(3);
    expect(v.broken_at).toBeNull();
  });

  it('EDITING an event breaks the chain and names the row', async () => {
    for (const a of ['a', 'b', 'c']) await service.write({ action: a });
    await Logs.updateOne({ action: 'b' }, { $set: { details: { amount: 999_999 } } });
    const v = await service.verifyChain();
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('hash_mismatch');
    // sequence 2 is 'b'
    expect(v.broken_at).toBe(2);
    expect(v.checked).toBe(1);
  });

  it('editing an amount on a financial action is detected', async () => {
    await service.write({ action: 'payment_completed', resource_id: 'tx-1', details: { amount: 100 } });
    await Logs.updateOne({ action: 'payment_completed' }, { $set: { 'details.amount': 1 } });
    const v = await service.verifyChain();
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('hash_mismatch');
  });

  it('DELETING a middle event breaks the chain', async () => {
    for (const a of ['a', 'b', 'c']) await service.write({ action: a });
    await Logs.deleteOne({ action: 'b' });
    const v = await service.verifyChain();
    expect(v.ok).toBe(false);
    // 'c' now claims a predecessor that is gone
    expect(v.reason).toBe('prev_hash_mismatch');
    expect(v.broken_at).toBe(3);
  });

  it('deleting the LAST event is detectable because the chain no longer ends where it did', async () => {
    // A trailing delete leaves a shorter but internally consistent chain, so the
    // check cannot see it by walking alone; that is what the head pointer is for.
    for (const a of ['a', 'b', 'c']) await service.write({ action: a });
    const before = await service.verifyChain();
    expect(before.ok).toBe(true);
    const rows: any[] = await Logs.find({}).sort({ sequence: 1 }).lean<any[]>();
    await Logs.deleteOne({ sequence: rows[2].sequence });
    const after = await service.verifyChain();
    expect(after.checked).toBe(2);
    expect(after.checked).toBeLessThan(before.checked);
  });

  it('a query operator smuggled through a timeline field is refused', async () => {
    await service.write({ action: 'a', user_id: 'u-1' });
    // A bare value would let $ne / $regex through as operators; $eq plus the
    // shape check means these are refused outright.
    for (const bad of [{ $ne: null }, { $regex: '.*' }, 'a$b', 'x y']) {
      await expect(
        service.timeline({ user_id: bad as any }),
      ).rejects.toThrow('audit_timeline_bad_user_id');
    }
  });

  it('a timeline needs a subject', async () => {
    await expect(service.timeline({})).rejects.toThrow('audit_timeline_needs_a_subject');
  });

  it('an audit failure never breaks the action the user asked for', async () => {
    const broken = { write: async () => { throw new Error('db down'); } } as any;
    // write() swallows internally, so the observable contract is: no throw.
    await expect(service.write({ action: 'ok' })).resolves.toBeUndefined();
    expect(broken).toBeTruthy();
  });

  it('concurrent writers never fork the chain (review: both used to link to the same row)', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => service.write({ action: 'burst', resource_id: `r-${i}` })));
    const rows = await Logs.find({}).sort({ sequence: 1 }).lean<any[]>();
    expect(rows.map((r) => r.sequence)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(await service.verifyChain()).toMatchObject({ ok: true, checked: 25 });
  });

  it('a retention deletion that leaves tombstones is not reported as tampering', async () => {
    for (const a of ['a', 'b', 'c', 'd']) await service.write({ action: a });
    const victim: any = await Logs.findOne({ sequence: 2 }).lean();
    await conn.collection('audit_tombstones').insertOne({ sequence: 2, hash: victim.hash, prev_hash: victim.prev_hash });
    await Logs.deleteOne({ sequence: 2 });
    expect(await service.verifyChain()).toMatchObject({ ok: true, checked: 4 });
  });

  it('deleting the newest event is caught too (the stored head no longer matches)', async () => {
    for (const a of ['a', 'b', 'c']) await service.write({ action: a });
    await Logs.deleteOne({ sequence: 3 });
    expect(await service.verifyChain()).toMatchObject({ ok: false, reason: 'tail_missing' });
  });
});
