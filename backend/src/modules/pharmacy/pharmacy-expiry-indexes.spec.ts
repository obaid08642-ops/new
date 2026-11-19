import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyPharmacyIndexes, planPharmacyIndexes } from './pharmacy-expiry-indexes';

jest.setTimeout(120_000);
describe('migration 20260827 indexes: pre-flight, safe creation, refusal on duplicates', () => {
  let mongod: MongoMemoryServer; let conn: Connection; let db: any;
  const COLS = ['domain_outbox', 'pharmacy_broadcast_recipients', 'pharmacy_offers', 'pharmacy_broadcasts'];
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); db = conn.getClient().db(conn.name); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  // a fresh collection for every test: dropping the collection clears its rows and its indexes
  beforeEach(async () => { for (const c of COLS) await db.collection(c).drop().catch(() => null); });

  const key = (n: number) => ({ aggregate_type: 'broadcast', aggregate_id: 'b1', event_type: 'expire', idempotency_key: `k${n}` });

  it('dry run counts present / missing / rows / duplicate groups and creates nothing', async () => {
    await db.collection('domain_outbox').insertMany([key(1), key(1), key(2)]);                  // one duplicate group
    await db.collection('pharmacy_broadcast_recipients').insertMany([{ broadcast_id: 'b', pharmacy_account_id: 'p1' }, { broadcast_id: 'b', pharmacy_account_id: 'p2' }]);
    const plan = await planPharmacyIndexes(db);
    expect(plan.find((p) => p.name === 'domain_outbox_pharmacy_idempotency_unique')).toMatchObject({ present: false, unique: true, rows: 3, duplicate_groups: 1 });
    expect(plan.find((p) => p.name === 'pharmacy_broadcast_recipient_unique')).toMatchObject({ present: false, rows: 2, duplicate_groups: 0 });
    expect(plan.find((p) => p.name === 'pharmacy_offers_due_expiry_scan')).toMatchObject({ unique: false, duplicate_groups: null });
    expect((await db.collection('domain_outbox').indexes()).map((i: any) => i.name)).toEqual(['_id_']);
  });

  it('apply creates the clean ones, REFUSES the unique index that has duplicates, changes no row', async () => {
    await db.collection('domain_outbox').insertMany([key(1), key(1)]);
    await db.collection('pharmacy_broadcast_recipients').insertMany([{ broadcast_id: 'b', pharmacy_account_id: 'p1' }]);
    const out = await applyPharmacyIndexes(db);
    expect(Object.fromEntries(out.map((o) => [o.name, o.outcome]))).toEqual({
      domain_outbox_pharmacy_idempotency_unique: 'refused_duplicates', pharmacy_broadcast_recipient_unique: 'created',
      pharmacy_offers_due_expiry_scan: 'created', pharmacy_broadcasts_due_expiry_scan: 'created',
    });
    expect(await db.collection('domain_outbox').countDocuments()).toBe(2);
    expect((await db.collection('pharmacy_offers').indexes()).map((i: any) => i.name)).toContain('pharmacy_offers_due_expiry_scan');
  });

  it('is idempotent, and once the duplicate is resolved the refused index is created and enforces uniqueness', async () => {
    await db.collection('domain_outbox').insertMany([key(1), key(1)]);
    await applyPharmacyIndexes(db);
    await db.collection('domain_outbox').deleteOne({ idempotency_key: 'k1' });                   // resolved by hand
    const second = await applyPharmacyIndexes(db);
    expect(second.find((o) => o.name === 'domain_outbox_pharmacy_idempotency_unique')?.outcome).toBe('created');
    expect(second.filter((o) => o.outcome === 'already_present')).toHaveLength(3);
    const unique = (await db.collection('domain_outbox').indexes()).find((i: any) => i.name === 'domain_outbox_pharmacy_idempotency_unique');
    expect(unique?.unique).toBe(true);
    await db.collection('domain_outbox').insertOne(key(2));
    await expect(db.collection('domain_outbox').insertOne(key(2))).rejects.toMatchObject({ code: 11000 });
  });
});
