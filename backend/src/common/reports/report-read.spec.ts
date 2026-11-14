/** R17: report read preference, precomputed snapshots (fresh / stale-on-error / coalescing) and the analytics service wiring, against a real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { cachedReport, reportAggregate, reportMaxTimeMs, reportReadPreference, reportStats, resetReportConnectionForTests, snapshotId } from './report-read';
import { AnalyticsSuiteService } from '../../modules/admin/enterprise/analytics-suite.service';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer; let conn: Connection;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri(), { dbName: 'rpt' }).asPromise(); });
afterAll(async () => { await conn.close(); await mongod.stop(); });
beforeEach(async () => { await conn.collection('report_snapshots').deleteMany({}); delete process.env.MONGO_ANALYTICS_URI; resetReportConnectionForTests(); });

describe('options', () => {
  it('defaults to secondaryPreferred and 20 s, ignores bad values', () => {
    expect(reportReadPreference({})).toBe('secondaryPreferred');
    expect(reportReadPreference({ REPORT_READ_PREFERENCE: 'secondary' } as any)).toBe('secondary');
    expect(reportReadPreference({ REPORT_READ_PREFERENCE: 'whatever' } as any)).toBe('secondaryPreferred');
    expect(reportMaxTimeMs({})).toBe(20_000);
    expect(reportMaxTimeMs({ REPORT_MAX_TIME_MS: '50' } as any)).toBe(20_000);
    expect(reportMaxTimeMs({ REPORT_MAX_TIME_MS: '3000' } as any)).toBe(3000);
  });
  it('snapshot id depends on the key and the parameters', () => {
    expect(snapshotId('a', { x: 1 })).toBe(snapshotId('a', { x: 1 }));
    expect(snapshotId('a', { x: 1 })).not.toBe(snapshotId('a', { x: 2 }));
    expect(snapshotId('a', { x: 1 })).not.toBe(snapshotId('b', { x: 1 }));
  });
});

const isReady = async () => { const { reportConnectionReady } = await import('./report-read'); return reportConnectionReady(); };
describe('reportAggregate', () => {
  it('returns a cursor with the right result on a single node (secondaryPreferred falls back to the primary)', async () => {
    await conn.collection('things').insertMany([{ k: 'a', n: 1 }, { k: 'a', n: 2 }, { k: 'b', n: 5 }]);
    const before = reportStats.aggregates;
    const rows = await reportAggregate(conn, 'things', [{ $group: { _id: '$k', total: { $sum: '$n' } } }, { $sort: { _id: 1 } }]).toArray();
    expect(rows).toEqual([{ _id: 'a', total: 3 }, { _id: 'b', total: 5 }]);
    expect(reportStats.aggregates).toBe(before + 1);
  });
  it('sends the read preference and maxTimeMS to the driver', async () => {
    const spy = jest.spyOn(conn.collection('things') as any, 'aggregate');
    const col = conn.collection('things'); const orig = conn.collection.bind(conn);
    const agg = jest.fn().mockReturnValue({ toArray: async () => [] });
    jest.spyOn(conn, 'collection').mockReturnValue({ aggregate: agg } as any);
    process.env.REPORT_READ_PREFERENCE = 'secondary'; process.env.REPORT_MAX_TIME_MS = '7000';
    await reportAggregate(conn, 'things', [{ $match: {} }]).toArray();
    expect(agg).toHaveBeenCalledWith([{ $match: {} }], { readPreference: 'secondary', maxTimeMS: 7000, allowDiskUse: true });
    delete process.env.REPORT_READ_PREFERENCE; delete process.env.REPORT_MAX_TIME_MS;
    (conn.collection as any).mockRestore?.(); spy.mockRestore(); void col; void orig;
  });
  it('uses the dedicated analytics connection when MONGO_ANALYTICS_URI is set', async () => {
    process.env.MONGO_ANALYTICS_URI = mongod.getUri(); process.env.DB_NAME = 'rpt'; await resetReportConnectionForTests();
    await conn.collection('things').insertOne({ k: 'z' });
    reportAggregate(conn, 'things', []);                                                // first call starts the connection and is answered by the application connection
    for (let i = 0; i < 100 && !(await isReady()); i++) await new Promise((r) => setTimeout(r, 50));
    const before = reportStats.onAnalyticsConn;
    const rows = await reportAggregate(conn, 'things', [{ $match: { k: 'z' } }, { $project: { _id: 0, k: 1 } }]).toArray();
    expect(rows).toEqual([{ k: 'z' }]);
    expect(reportStats.onAnalyticsConn).toBe(before + 1);
    delete process.env.DB_NAME; await resetReportConnectionForTests();
  });
});

describe('cachedReport', () => {
  it('computes once inside the TTL and serves the stored snapshot after', async () => {
    let t = 1_000_000; const compute = jest.fn<Promise<{ total: number }>, []>().mockResolvedValue({ total: 42 });
    const a = await cachedReport(conn, 'k1', { d: 1 }, 60, compute, () => t);
    t += 30_000;
    const b = await cachedReport(conn, 'k1', { d: 1 }, 60, compute, () => t);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(a.total).toBe(42); expect(b.total).toBe(42);
    expect(b._snapshot?.stale).toBe(false);
    t += 40_000;
    await cachedReport(conn, 'k1', { d: 1 }, 60, compute, () => t);
    expect(compute).toHaveBeenCalledTimes(2);
  });
  it('different parameters get different snapshots', async () => {
    const compute = jest.fn<Promise<{ at: number }>, []>().mockImplementation(async () => ({ at: Math.random() }));
    const a = await cachedReport(conn, 'k2', { d: 1 }, 60, compute); const b = await cachedReport(conn, 'k2', { d: 2 }, 60, compute);
    expect(compute).toHaveBeenCalledTimes(2); expect(a.at).not.toBe(b.at);
  });
  it('concurrent callers in one process share one computation', async () => {
    const compute = jest.fn<Promise<{ v: number }>, []>().mockImplementation(() => new Promise((r) => setTimeout(() => r({ v: 1 }), 100)));
    const rs = await Promise.all(Array.from({ length: 20 }, () => cachedReport(conn, 'k3', {}, 60, compute)));
    expect(compute).toHaveBeenCalledTimes(1);
    expect(rs.every((r) => r.v === 1)).toBe(true);
  });
  it('serves the last good snapshot, flagged stale, when the recompute fails; throws when there is none or it is too old', async () => {
    let t = 5_000_000;
    await cachedReport<{ v: string }>(conn, 'k4', {}, 10, async () => ({ v: 'good' }), () => t);
    t += 20_000;
    const stale = await cachedReport<{ v: string }>(conn, 'k4', {}, 10, async () => { throw new Error('db down'); }, () => t);
    expect(stale.v).toBe('good'); expect(stale._snapshot?.stale).toBe(true);
    await expect(cachedReport(conn, 'k5', {}, 10, async () => { throw new Error('db down'); }, () => t)).rejects.toThrow('db down');
    t += 90_000_000;                                                                     // past REPORT_STALE_MAX_SEC (24 h)
    await expect(cachedReport(conn, 'k4', {}, 10, async () => { throw new Error('db down'); }, () => t)).rejects.toThrow('db down');
  });
  it('does not store a result above the size limit but still returns it', async () => {
    process.env.REPORT_SNAPSHOT_MAX_BYTES = '100';
    const r = await cachedReport<{ big: string }>(conn, 'k6', {}, 60, async () => ({ big: 'x'.repeat(500) }));
    delete process.env.REPORT_SNAPSHOT_MAX_BYTES;
    expect(r.big.length).toBe(500);
    expect(await conn.collection('report_snapshots').countDocuments({ key: 'k6' })).toBe(0);
  });
});

describe('AnalyticsSuiteService is wired to the snapshot', () => {
  it('a second NPS call inside the TTL does not run the aggregation again', async () => {
    const svc = new AnalyticsSuiteService(conn as any);
    await conn.collection('ratings').insertMany([{ rating: 5, createdAt: new Date() }, { rating: 2, createdAt: new Date() }]);
    const from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10); const to = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const before = reportStats.aggregates;
    const a = await svc.nps(from, to); const mid = reportStats.aggregates;
    const b = await svc.nps(from, to);
    expect(mid).toBeGreaterThan(before);
    expect(reportStats.aggregates).toBe(mid);
    expect(b).toMatchObject({ ...a, _snapshot: expect.any(Object) });
  });
});
