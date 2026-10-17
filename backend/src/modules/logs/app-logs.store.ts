/**
 * 20.3 — the `app_logs` collection: the warn and error lines of every backend and worker process, searchable from the
 * admin dashboard. info and debug stay on stdout only (the container's json-file log, capped at 20m x 3).
 *
 * Why this cannot repeat the 2026-10-16 disk outage (a cache with no cap filled the root disk):
 *   - a TTL index expires every line after 30 days;
 *   - a size cap: every 10 minutes the oldest lines are deleted while the collection is over LOG_STORE_MAX_MB (256) or
 *     over LOG_STORE_MAX_DOCS (200,000). (A Mongo "capped collection" would be simpler but cannot have a TTL index.)
 *   - each line is bounded (details 4 KB), and each process stores at most LOG_STORE_RATE_PER_MIN (600) lines a minute,
 *     so an error storm (the 07:00 outage logged ~1,000 errors in 5 minutes) cannot flood the database;
 *   - writes are batched (one insertMany every 2 s) and fail open: a database that is down loses log lines, never a request.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { LogLevel, LogRecord, addLogSink } from '../../common/structured-logger';
import { runsBackgroundWork } from '../../common/process-role';

export const APP_LOGS_COLLECTION = 'app_logs';
export const APP_LOGS_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Only these levels are stored; the rest is stdout. */
export const STORED_LEVELS: readonly LogLevel[] = ['warn', 'error'];

export const APP_LOGS_INDEXES = [
  // the TTL index doubles as the index on `ts`
  { key: { ts: 1 }, name: 'ts_ttl', expireAfterSeconds: APP_LOGS_TTL_SECONDS },
  { key: { level: 1, ts: -1 }, name: 'level_ts' },
  { key: { module: 1, ts: -1 }, name: 'module_ts' },
  { key: { request_id: 1, ts: 1 }, name: 'request_id_ts', partialFilterExpression: { request_id: { $type: 'string' } } },
] as const;

const DETAILS_MAX_CHARS = 4000;
const FLUSH_MS = 2000;
const QUEUE_MAX = 1000;
const TRIM_EVERY_MS = 10 * 60 * 1000;

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

/** The minimal collection surface used here (the real driver collection or a test double). */
export interface LogCollection {
  createIndex(spec: Record<string, 1 | -1>, options?: Record<string, unknown>): Promise<unknown>;
  insertMany(docs: unknown[], options?: Record<string, unknown>): Promise<unknown>;
}

/** Create the indexes; an index that already exists with other options is left alone and reported, never fatal. */
export async function ensureAppLogsIndexes(col: Pick<LogCollection, 'createIndex'>): Promise<string[]> {
  const problems: string[] = [];
  for (const { key, name, ...options } of APP_LOGS_INDEXES) {
    try { await col.createIndex(key as Record<string, 1 | -1>, { name, background: true, ...options }); }
    catch (e) { problems.push(`${name}: ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
  }
  return problems;
}

/** The document stored for one line: `ts` is a Date (the TTL index needs one) and `details` is bounded. */
export function toStoredDoc(rec: LogRecord): Record<string, unknown> {
  let details = rec.details;
  if (details) {
    const text = JSON.stringify(details);
    if (text.length > DETAILS_MAX_CHARS) details = { truncated: true, preview: text.slice(0, DETAILS_MAX_CHARS) };
  }
  return { ...rec, ts: new Date(rec.ts), details };
}

@Injectable()
export class LogsStoreService implements OnModuleInit, OnModuleDestroy {
  private queue: Record<string, unknown>[] = [];
  private timers: NodeJS.Timeout[] = [];
  private removeSink: (() => void) | null = null;
  private flushing = false;
  private windowStart = Date.now();
  private windowCount = 0;
  /** Lines not stored because of the rate limit, a full queue or a failed write (shown by /admin/logs `stats`). */
  dropped = 0;

  constructor(@InjectConnection() private readonly conn: Connection) {}

  collection() { return this.conn.collection(APP_LOGS_COLLECTION); }

  async onModuleInit() {
    if (process.env.LOG_STORE === 'off') return;
    this.removeSink = addLogSink((rec) => this.accept(rec));
    // Never block the start-up on the indexes (a slow or absent database must not stop the API from booting).
    void this.ensureIndexes();
    this.timers.push(setInterval(() => void this.flush(), FLUSH_MS).unref());
    // The size cap runs where background work runs (the worker, or the single process in dev): once per cluster of API workers.
    if (runsBackgroundWork()) this.timers.push(setInterval(() => void this.trim(), TRIM_EVERY_MS).unref());
  }

  async onModuleDestroy() {
    this.removeSink?.();
    this.timers.forEach(clearInterval);
    await this.flush();
  }

  async ensureIndexes(): Promise<string[]> {
    try { return await ensureAppLogsIndexes(this.collection() as unknown as LogCollection); } catch { return ['connection']; }
  }

  /** Sink: keep warn and error, within the per-minute budget. Synchronous and exception-free (it runs inside logging). */
  accept(rec: LogRecord): boolean {
    if (!STORED_LEVELS.includes(rec.level)) return false;
    const now = Date.now();
    if (now - this.windowStart >= 60_000) { this.windowStart = now; this.windowCount = 0; }
    if (this.windowCount >= num(process.env.LOG_STORE_RATE_PER_MIN, 600) || this.queue.length >= QUEUE_MAX) { this.dropped += 1; return false; }
    this.windowCount += 1;
    this.queue.push(toStoredDoc(rec));
    return true;
  }

  async flush(): Promise<number> {
    if (this.flushing || !this.queue.length) return 0;
    this.flushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await (this.collection() as unknown as LogCollection).insertMany(batch, { ordered: false });
      return batch.length;
    } catch {
      this.dropped += batch.length;   // fail open; no log line from here (it would come straight back into the queue)
      return 0;
    } finally {
      this.flushing = false;
    }
  }

  /** Delete the oldest lines while the collection is over its size or count cap. Returns how many were deleted. */
  async trim(): Promise<number> {
    const col = this.conn.collection(APP_LOGS_COLLECTION);
    const maxBytes = num(process.env.LOG_STORE_MAX_MB, 256) * 1024 * 1024;
    const maxDocs = num(process.env.LOG_STORE_MAX_DOCS, 200_000);
    let deleted = 0;
    try {
      for (let round = 0; round < 20; round += 1) {
        const stats: { size?: number; count?: number } = await this.conn.db!.command({ collStats: APP_LOGS_COLLECTION }).catch(() => ({}));
        const count = stats.count ?? (await col.estimatedDocumentCount());
        const size = stats.size ?? 0;
        if (size <= maxBytes && count <= maxDocs) break;
        const ids = await col.find({}, { projection: { _id: 1 } }).sort({ ts: 1 }).limit(Math.max(1000, Math.ceil(count * 0.1))).toArray();
        if (!ids.length) break;
        const res = await col.deleteMany({ _id: { $in: ids.map((d) => d._id) } });
        deleted += res.deletedCount ?? 0;
      }
    } catch { /* the next run tries again */ }
    return deleted;
  }
}
