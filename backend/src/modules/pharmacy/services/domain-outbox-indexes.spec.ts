import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { DOMAIN_OUTBOX_INDEXES, PharmacyBroadcastDispatchService } from './pharmacy-broadcast-dispatch.service';

/**
 * Run 131 (96r) listed a 3.2 s update on `domain_outbox`. The dispatch service asks it something every 3 seconds and the gauge cron every minute; with no index each ask scanned the
 * whole collection, which only grows (sent / skipped rows are never removed). With the indexes, each ask examines only the rows it can act on.
 */
describe('domain_outbox is asked through indexes', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  const EVENT = 'pharmacy.broadcast.recipient_added';
  const OLD = new Date(Date.now() - 60 * 60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'outbox' });
    col = mongoose.connection.collection('domain_outbox');
    const rows: any[] = [];
    for (let i = 0; i < 6000; i++) rows.push({ event_type: EVENT, state: i < 5 ? 'pending' : 'sent', created_at: new Date(Date.now() - i * 1000), idempotency_key: `k${i}`, aggregate_type: 'pharmacy', aggregate_id: `o${i}`, payload: { n: i } });
    rows.push({ event_type: EVENT, state: 'pending', created_at: OLD, idempotency_key: 'stuck', aggregate_type: 'pharmacy', aggregate_id: 'stuck' });
    await col.insertMany(rows);
    const svc = new PharmacyBroadcastDispatchService(mongoose.connection as any, {} as any, {} as any, {} as any);
    await svc.ensureIndexes();
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  it('builds the two indexes and a second call changes nothing', async () => {
    const svc = new PharmacyBroadcastDispatchService(mongoose.connection as any, {} as any, {} as any, {} as any);
    await svc.ensureIndexes();
    const names = (await col.indexes()).map((i: any) => i.name);
    for (const { name } of DOMAIN_OUTBOX_INDEXES) expect(names).toContain(name);
  });

  it('the claim of the next due row (equality on event and state, oldest first) examines only about the rows it takes', async () => {
    const now = new Date();
    const plan: any = await col.find({ event_type: EVENT, state: 'pending', $or: [{ next_attempt_at: { $exists: false } }, { next_attempt_at: { $lte: now } }] }).sort({ created_at: 1 }).limit(1).explain('executionStats');
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(10);
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('domain_outbox_dispatch_v1');
  });

  it('the lease give-back examines only the processing rows', async () => {
    const plan: any = await col.find({ event_type: EVENT, state: 'processing', claimed_at: { $lte: new Date() } }).explain('executionStats');
    expect(plan.executionStats.totalDocsExamined).toBe(0);
  });

  it('the stuck count and list (pending for more than 30 minutes) examine only the pending rows', async () => {
    const stuckSince = new Date(Date.now() - 30 * 60_000);
    const count: any = await col.aggregate([{ $match: { state: 'pending', created_at: { $lt: stuckSince } } }, { $count: 'n' }]).explain('executionStats');
    const stats = count.stages?.[0]?.$cursor?.executionStats ?? count.executionStats;
    expect(stats.totalDocsExamined).toBeLessThanOrEqual(5);
    expect(await col.countDocuments({ state: 'pending', created_at: { $lt: stuckSince } })).toBe(1);
  });

  it('an index that cannot be built is logged, never thrown (the boot goes on)', async () => {
    const failing: any = { collection: () => ({ createIndex: jest.fn().mockRejectedValue(new Error('boom')) }) };
    const svc = new PharmacyBroadcastDispatchService(failing, {} as any, {} as any, {} as any);
    (svc as any).logger = { warn: jest.fn() };
    await expect(svc.ensureIndexes()).resolves.toBeUndefined();
    expect((svc as any).logger.warn).toHaveBeenCalledTimes(DOMAIN_OUTBOX_INDEXES.length);
  });
});
