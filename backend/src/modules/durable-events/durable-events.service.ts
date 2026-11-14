import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ClientSession, Connection, mongo } from 'mongoose';

type Collection<T extends mongo.Document> = mongo.Collection<T>;
import type { Queue } from 'bullmq';

/**
 * R2: transactional outbox for the events that must not be lost with the process (payment, refund, order, booking).
 *
 *   write   enqueue() inserts one row in `durable_events` (unique `key` = idempotency key). With a Mongo `session` it is part of the
 *           same transaction as the state change; without one it is written right after the state change (see the doc for that window,
 *           which the payment reconciler closes).
 *   drain   a BullMQ job (jobId = key) per row; the worker also sweeps due rows every few seconds, so a crash, a Redis outage or a worker
 *           restart loses nothing.
 *   handle  process() CLAIMS the row atomically (pending -> processing, with a lease), emits it to the in-process @OnEvent listeners
 *           (emitAsync, so a listener that throws fails the delivery), then marks it done. A failure goes back to pending with
 *           exponential backoff, and to `dead` after MAX_ATTEMPTS. A crashed handler leaves an expired lease; the sweeper redelivers.
 *
 * Guarantee: at-least-once, never concurrent for one key, never two rows for one key. A redelivery after a crash between "listeners ran"
 * and "marked done" is possible; every delivery carries `__durable = { key, delivery }` so a listener can dedupe on `key`.
 */
export const DURABLE_QUEUE = 'durable-events';
export const MAX_ATTEMPTS = 8;
export const LEASE_MS = 60_000;
export const COLLECTION = 'durable_events';

export interface DurableMeta { key: string; delivery: number }
export type ProcessResult = 'done' | 'retry' | 'dead' | 'skipped';

export const backoffMs = (attempt: number) => Math.min(15 * 60_000, 2_000 * 2 ** Math.max(0, attempt - 1));

@Injectable()
export class DurableEventsService implements OnModuleInit {
  private readonly logger = new Logger('DurableEvents');
  private readonly coll: Collection<any>;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly emitter: EventEmitter2,
    @Optional() @InjectQueue(DURABLE_QUEUE) private readonly queue?: Queue,
  ) {
    this.coll = this.connection.collection(COLLECTION) as unknown as Collection<any>;
  }

  async onModuleInit() {
    try {
      await this.coll.createIndex({ key: 1 }, { unique: true });
      await this.coll.createIndex({ state: 1, next_at: 1 });
      await this.coll.createIndex({ state: 1, lease_until: 1 });
    } catch (e: any) {
      this.logger.warn(`index_failed err=${e?.message}`);
    }
  }

  /**
   * Record an event. `key` is the idempotency key: the same key never creates a second row (a retried request, a webhook redelivery).
   * Pass the transaction's `session` to commit it with the state change; then call `kick(key)` after the commit.
   */
  async enqueue(type: string, payload: Record<string, any>, opts: { key: string; session?: ClientSession }): Promise<{ duplicate: boolean }> {
    const now = new Date();
    let duplicate: boolean;
    try {
      const res = await this.coll.updateOne(
        { key: opts.key },
        { $setOnInsert: { key: opts.key, type, payload, state: 'pending', attempts: 0, next_at: now, created_at: now } },
        { upsert: true, session: opts.session },
      );
      duplicate = res.upsertedCount === 0;
    } catch (e: any) {
      if (e?.code !== 11000) throw e;     // two concurrent upserts of one key: the unique index lets one win
      duplicate = true;
    }
    if (!duplicate && !opts.session) await this.deliverNow(opts.key);
    return { duplicate };
  }

  /**
   * First delivery runs HERE, in the process that wrote the row, before the request continues (the old `emit` was synchronous too). This matters:
   * the API process owns the websocket gateway listeners, the worker does not. If it fails or this process dies first, the row stays pending and
   * the BullMQ consumer / sweeper in the worker redelivers it (the listeners that matter for money and bookings are registered in both roles).
   */
  async deliverNow(key: string): Promise<ProcessResult> {
    let r: ProcessResult = 'skipped';
    try { r = await this.process(key); } catch (e: any) { this.logger.warn(`inline_failed key=${key} err=${e?.message}`); }
    if (r === 'retry') await this.kick(key, backoffMs(1));
    return r;
  }

  /** Hand the row to the BullMQ consumer (jobId = key: a second job for the same key is dropped). Never throws: the sweeper finds the row anyway. */
  async kick(key: string, delay = 0): Promise<void> {
    try {
      if (!this.queue) return;
      await this.queue.add('deliver', { key }, { jobId: key, delay, removeOnComplete: true, removeOnFail: true, attempts: 1 });
    } catch (e: any) {
      this.logger.warn(`kick_failed key=${key} err=${e?.message}`);
    }
  }

  async process(key: string): Promise<ProcessResult> {
    const now = new Date();
    const row: any = await this.coll.findOneAndUpdate(
      { key, $or: [{ state: 'pending', next_at: { $lte: now } }, { state: 'processing', lease_until: { $lt: now } }] },
      { $set: { state: 'processing', lease_until: new Date(now.getTime() + LEASE_MS), started_at: now }, $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!row) return 'skipped';
    const meta: DurableMeta = { key, delivery: row.attempts };
    try {
      await this.emitter.emitAsync(row.type, { ...row.payload, __durable: meta });
    } catch (e: any) {
      const dead = row.attempts >= MAX_ATTEMPTS;
      await this.coll.updateOne(
        { key, state: 'processing', attempts: row.attempts },
        { $set: { state: dead ? 'dead' : 'pending', next_at: new Date(Date.now() + backoffMs(row.attempts)), last_error: String(e?.message || e).slice(0, 500) }, $unset: { lease_until: '' } },
      );
      if (dead) this.logger.error(`dead type=${row.type} key=${key} attempts=${row.attempts} err=${e?.message}`);
      else this.logger.warn(`retry type=${row.type} key=${key} attempt=${row.attempts} err=${e?.message}`);
      return dead ? 'dead' : 'retry';
    }
    await this.coll.updateOne({ key, state: 'processing', attempts: row.attempts }, { $set: { state: 'done', done_at: new Date() }, $unset: { lease_until: '' } });
    return 'done';
  }

  /** Rows that are due: pending and past their retry time, or processing with an expired lease (the handler's process died). */
  async due(limit = 100): Promise<string[]> {
    const now = new Date();
    const rows = await this.coll
      .find({ $or: [{ state: 'pending', next_at: { $lte: now } }, { state: 'processing', lease_until: { $lt: now } }] }, { projection: { key: 1 } })
      .sort({ created_at: 1 }).limit(limit).toArray();
    return rows.map((r: any) => r.key);
  }

  async drain(limit = 100): Promise<number> {
    const keys = await this.due(limit);
    for (const k of keys) await (this.queue ? this.kick(k) : this.deliverNow(k));
    return keys.length;
  }

  /** Counts for the health page and the alert: anything dead, or pending for more than 5 minutes, needs a person. */
  async stats() {
    const [pending, processing, dead, stuck] = await Promise.all([
      this.coll.countDocuments({ state: 'pending' }),
      this.coll.countDocuments({ state: 'processing' }),
      this.coll.countDocuments({ state: 'dead' }),
      this.coll.countDocuments({ state: { $in: ['pending', 'processing'] }, created_at: { $lt: new Date(Date.now() - 5 * 60_000) } }),
    ]);
    return { pending, processing, dead, stuck_over_5min: stuck };
  }

  /** Dead rows go back to pending (admin/ops replay). */
  async replayDead(key?: string): Promise<number> {
    const r = await this.coll.updateMany(key ? { key, state: 'dead' } : { state: 'dead' }, { $set: { state: 'pending', attempts: 0, next_at: new Date() }, $unset: { last_error: '' } });
    return r.modifiedCount;
  }
}

/**
 * Drop-in for `events.emit(type, payload)` on the money paths. With the durable service it records the event first (idempotent on `key`);
 * without it (a unit test that builds the service by hand) it falls back to the old in-process emit.
 */
export async function emitDurable(durable: DurableEventsService | undefined, emitter: EventEmitter2, type: string, payload: Record<string, any>, key: string): Promise<void> {
  if (!durable) { emitter.emit(type, payload); return; }
  await durable.enqueue(type, payload, { key });
}
