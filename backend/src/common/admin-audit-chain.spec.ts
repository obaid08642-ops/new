/** R13: the admin audit log is tamper-evident. Real MongoDB (a replica set, so the chained write's transaction runs). */
import mongoose, { Connection } from 'mongoose';
import { Types } from 'mongoose';
const ObjectId = Types.ObjectId;
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import { ADMIN_HEAD, ADMIN_LOG, GENESIS, appendAdminAudit, canonical, entryHash, verifyAdminAuditChain } from './admin-audit-chain';

jest.setTimeout(180_000);
let rs: MongoMemoryReplSet; let conn: Connection;
beforeAll(async () => { rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); conn = await mongoose.createConnection(rs.getUri(), { dbName: 'audit' }).asPromise(); });
afterAll(async () => { await conn?.close(); await rs?.stop(); });
beforeEach(async () => { await conn.collection(ADMIN_LOG).deleteMany({}); await conn.collection(ADMIN_HEAD).deleteMany({}); });

const row = (n: number, extra: Record<string, unknown> = {}) => ({ id: `id-${n}`, action: `act.${n}`, admin_id: 'a1', target_type: 'x', target_id: String(n), reason: `why ${n}`, before: { a: n }, after: { a: n + 1 }, ...extra });
const seed = async (n: number) => { for (let i = 1; i <= n; i++) await appendAdminAudit(conn, row(i)); };
const rows = () => conn.collection(ADMIN_LOG).find({}).sort({ seq: 1 }).toArray() as Promise<any[]>;
const codes = async () => (await verifyAdminAuditChain(conn)).findings.map((f) => f.code).sort();

describe('canonical + hash', () => {
  it('is stable under key order, drops undefined, prints dates and ObjectIds the same way every time', () => {
    expect(canonical({ b: 1, a: [2, { d: undefined, c: 3 }] })).toBe(canonical({ a: [2, { c: 3 }], b: 1 }));
    const id = new ObjectId();
    expect(canonical({ id })).toBe(`{"id":"${id.toHexString()}"}`);
    expect(canonical(new Date('2026-01-01T00:00:00Z'))).toBe('"2026-01-01T00:00:00.000Z"');
    expect(entryHash(GENESIS, { a: 1 })).toBe(entryHash(GENESIS, { a: 1, hash: 'ignored', seq: 5 }));
    expect(entryHash(GENESIS, { a: 1 })).not.toBe(entryHash('1'.repeat(64), { a: 1 }));
  });
});

describe('the chain', () => {
  it('rows get seq 1..n, link to each other, and verify', async () => {
    await seed(5);
    const r = await rows();
    expect(r.map((x) => x.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(r[0].prev_hash).toBe(GENESIS);
    r.slice(1).forEach((x, i) => expect(x.prev_hash).toBe(r[i].hash));
    expect(await verifyAdminAuditChain(conn)).toMatchObject({ ok: true, checked: 5, head_seq: 5, findings: [] });
  });

  it('30 admins writing at the same moment: no gap, no duplicate, chain intact', async () => {
    await Promise.all(Array.from({ length: 30 }, (_, i) => appendAdminAudit(conn, row(i + 1))));
    expect((await rows()).map((x) => x.seq)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(await verifyAdminAuditChain(conn)).toMatchObject({ ok: true, checked: 30 });
  });

  it('a row with an ObjectId and nested data in before/after still verifies after a round trip through MongoDB', async () => {
    await appendAdminAudit(conn, row(1, { before: { ref: new ObjectId(), when: new Date(), list: [1, 2, { z: null }] }, meta: null }));
    expect((await verifyAdminAuditChain(conn)).ok).toBe(true);
  });
});

describe('tampering is found', () => {
  it('an edited row', async () => {
    await seed(4);
    await conn.collection(ADMIN_LOG).updateOne({ seq: 2 }, { $set: { reason: 'changed afterwards' } });
    const r = await verifyAdminAuditChain(conn);
    expect(r.ok).toBe(false);
    expect(r.findings).toEqual([{ code: 'hash_mismatch', seq: 2 }]);
  });
  it('a deleted row in the middle', async () => {
    await seed(5);
    await conn.collection(ADMIN_LOG).deleteOne({ seq: 3 });
    expect(await codes()).toEqual(['chain_break', 'seq_gap']);
  });
  it('the newest rows cut off', async () => {
    await seed(5);
    await conn.collection(ADMIN_LOG).deleteMany({ seq: { $gte: 4 } });
    expect(await codes()).toEqual(['head_mismatch']);
  });
  it('a forged row inserted with an existing seq or a made-up hash', async () => {
    await seed(3);
    await conn.collection(ADMIN_LOG).insertOne({ ...row(99), seq: 2, prev_hash: 'f'.repeat(64), hash: 'e'.repeat(64) } as any);
    expect((await codes()).length).toBeGreaterThan(0);
  });
  it('LIMIT, stated on purpose: someone with database root who recomputes the whole chain and the head is NOT detected by the chain alone', async () => {
    await seed(3);
    const r = await rows();
    let prev = GENESIS;
    for (const x of r) {
      const edited = x.seq === 2 ? { ...x, reason: 'rewritten' } : x;
      const hash = entryHash(prev, edited);
      await conn.collection(ADMIN_LOG).updateOne({ seq: x.seq }, { $set: { reason: edited.reason, prev_hash: prev, hash } });
      prev = hash;
    }
    await conn.collection(ADMIN_HEAD).updateOne({ _id: 'head' as any }, { $set: { hash: prev } });
    expect((await verifyAdminAuditChain(conn)).ok).toBe(true);   // the defence is a copy of the head outside the database (an older off-site dump)
  });
});

describe('when the chained write cannot run', () => {
  it('the row is still written, flagged unchained, and the verifier says so (standalone mongod has no transactions)', async () => {
    const standalone = await MongoMemoryServer.create();
    const c = await mongoose.createConnection(standalone.getUri(), { dbName: 'plain' }).asPromise();
    try {
      const out = await appendAdminAudit(c, row(1));
      expect(out.chained).toBe(false);
      expect(await c.collection(ADMIN_LOG).countDocuments({ chained: false })).toBe(1);
      expect((await verifyAdminAuditChain(c)).findings.map((f) => f.code)).toEqual(['unchained_entry']);
    } finally { await c.close(); await standalone.stop(); }
  });
});
