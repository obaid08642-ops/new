import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import mongoose, { Connection } from 'mongoose';
import { registerGauge } from '../metrics.service';

/**
 * R17: heavy reads (admin analytics, finance and orders reports) stay off the primary's critical path.
 *
 * 1. `reportAggregate(conn, collection, pipeline)` runs an aggregation with `readPreference` (REPORT_READ_PREFERENCE, default `secondaryPreferred`),
 *    `maxTimeMS` (REPORT_MAX_TIME_MS, default 20 s) and `allowDiskUse`. With ONE node the preference falls back to the primary, so nothing changes today;
 *    the day a secondary exists it takes the reports with no code change. If MONGO_ANALYTICS_URI is set (the hidden/analytics member of R7, which normal clients
 *    cannot see), a dedicated connection to it is used instead. If that connection cannot be created the report falls back to the application connection.
 * 2. `cachedReport(conn, key, params, ttlSec, compute)` precomputes: the result is stored in `report_snapshots`; inside the TTL it is read from there (no aggregation);
 *    after the TTL the first caller recomputes while the others in the same process wait for the same promise; if the recompute fails the last good snapshot is served
 *    (flagged `stale`) rather than an error. A report is never served from a snapshot older than REPORT_STALE_MAX_SEC (default 24 h).
 * Snapshots hold aggregate numbers only (the same data the report returns); they are never written for a result above REPORT_SNAPSHOT_MAX_BYTES (8 MB).
 */
const logger = new Logger('ReportRead');
export const reportStats = { aggregates: 0, onAnalyticsConn: 0, snapshotHit: 0, snapshotMiss: 0, snapshotStale: 0, snapshotFail: 0, coalesced: 0 };
registerGauge('nabd_report_aggregates_total', 'Heavy report aggregations run.', () => reportStats.aggregates, 'counter');
registerGauge('nabd_report_snapshot_hit_total', 'Reports answered from a precomputed snapshot.', () => reportStats.snapshotHit, 'counter');
registerGauge('nabd_report_snapshot_miss_total', 'Reports that had to be computed.', () => reportStats.snapshotMiss, 'counter');
registerGauge('nabd_report_snapshot_stale_total', 'Reports served from an old snapshot because the recompute failed.', () => reportStats.snapshotStale, 'counter');

const READ_PREFS = ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest'];
export function reportReadPreference(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.REPORT_READ_PREFERENCE;
  return v && READ_PREFS.includes(v) ? v : 'secondaryPreferred';
}
export function reportMaxTimeMs(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.REPORT_MAX_TIME_MS);
  return Number.isFinite(n) && n >= 1000 ? n : 20_000;
}

let analytics: Connection | null | undefined;
function analyticsConnection(): Connection | null {
  const uri = process.env.MONGO_ANALYTICS_URI;
  if (!uri) return null;
  if (analytics !== undefined) return analytics;
  try {
    analytics = mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', maxPoolSize: 6, appName: 'nabd-analytics', readPreference: 'secondary' as any, serverSelectionTimeoutMS: 5_000 });
    analytics.on('error', (e) => logger.warn(`analytics connection error: ${e?.message}`));
  } catch (e: any) { logger.warn(`analytics connection not created, using the application connection: ${e?.message}`); analytics = null; }
  return analytics;
}
export function resetReportConnectionForTests() { analytics = undefined; }

/** Same call shape as `conn.collection(name).aggregate(pipeline)`; returns the cursor, so `.toArray()` keeps working. */
export function reportAggregate(conn: Connection, collection: string, pipeline: Record<string, unknown>[]) {
  reportStats.aggregates++;
  const maybe = analyticsConnection();
  const ac = maybe && maybe.readyState === 1 ? maybe : null;                          // still connecting (or down): the application connection answers
  if (ac) reportStats.onAnalyticsConn++;
  return (ac || conn).collection(collection).aggregate(pipeline, { readPreference: reportReadPreference() as any, maxTimeMS: reportMaxTimeMs(), allowDiskUse: true });
}

// ── snapshots ──
const inflight = new Map<string, Promise<unknown>>();
let indexReady = false;
const SNAP = 'report_snapshots';
export const snapshotId = (key: string, params: unknown) => `${key}:${createHash('sha256').update(JSON.stringify(params ?? null)).digest('hex').slice(0, 16)}`;

export type Snapshot<T> = { data: T; computedAt: string; stale: boolean };

export async function cachedReport<T>(conn: Connection, key: string, params: unknown, ttlSec: number, compute: () => Promise<T>, now: () => number = Date.now): Promise<T & { _snapshot?: { computed_at: string; stale: boolean } }> {
  const id = snapshotId(key, params);
  const col = conn.collection(SNAP);
  if (!indexReady) { indexReady = true; col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => { indexReady = false; }); }
  const staleMax = (Number(process.env.REPORT_STALE_MAX_SEC) || 86_400) * 1000;
  const prev: any = await col.findOne({ _id: id } as any).catch(() => null);
  const age = prev ? now() - new Date(prev.computedAt).getTime() : Infinity;
  const meta = (p: any, stale: boolean) => ({ ...(p.data as object), _snapshot: { computed_at: new Date(p.computedAt).toISOString(), stale } }) as any;
  if (prev && age < ttlSec * 1000) { reportStats.snapshotHit++; return meta(prev, false); }
  const running = inflight.get(id);
  if (running) { reportStats.coalesced++; return (await running) as any; }
  const job = (async () => {
    reportStats.snapshotMiss++;
    try {
      const data = await compute();
      const size = Buffer.byteLength(JSON.stringify(data ?? null));
      const computedAt = new Date(now());
      if (size <= (Number(process.env.REPORT_SNAPSHOT_MAX_BYTES) || 8 * 1024 * 1024)) {
        await col.replaceOne({ _id: id } as any, { _id: id, key, data, computedAt, expiresAt: new Date(now() + staleMax) } as any, { upsert: true }).catch((e: any) => logger.warn(`snapshot write failed (${key}): ${e?.message}`));
      }
      return meta({ data, computedAt }, false);
    } catch (e: any) {
      reportStats.snapshotFail++;
      if (prev && age < staleMax) { reportStats.snapshotStale++; logger.warn(`report ${key} failed (${e?.message}); serving the snapshot from ${new Date(prev.computedAt).toISOString()}`); return meta(prev, true); }
      throw e;
    } finally { inflight.delete(id); }
  })();
  inflight.set(id, job);
  return (await job) as any;
}

export function reportConnectionReady(): boolean { return !!analytics && analytics.readyState === 1; }
