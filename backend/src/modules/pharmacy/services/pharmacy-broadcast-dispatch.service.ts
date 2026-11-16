import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection, Model } from 'mongoose';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { ScheduledOnce } from '../../../common/scheduled-once';

const EVENT = 'pharmacy.broadcast.recipient_added';
const BATCH = 50;
const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * `domain_outbox` had NO index for what this service asks every 3 seconds (the only index on it is the unique idempotency key, from a migration script): each tick scanned the whole
 * collection twice (the lease give-back and the claim with `sort created_at`), and the per-minute gauge counted pending rows the same way. Rows in state sent / skipped / failed
 * stay for ever, so the scans only grow (task 96r, 2026-11-16: a 3.2 s update on this collection). Both indexes are tiny next to a scan; built once, in the background.
 */
export const DOMAIN_OUTBOX_INDEXES: Array<{ keys: Record<string, 1 | -1>; name: string }> = [
  { keys: { event_type: 1, state: 1, created_at: 1 }, name: 'domain_outbox_dispatch_v1' },   // the claim (equality, sort created_at) and the lease give-back
  { keys: { state: 1, created_at: 1 }, name: 'domain_outbox_state_age_v1' },                 // the stuck count and list (state pending, created_at before ...)
];

/**
 * Delivers the "new pharmacy request in your area" notice. The broadcast writes one `domain_outbox` row per pharmacy it reaches
 * (pharmacy-broadcast.service / pharmacy-expiry-command.service), inside the transaction that records the recipient; before this
 * worker nothing read those rows, so a pharmacy learned of a request only by its 5-second poll while the app was open.
 *
 * Each tick claims pending rows one at a time (a conditional update, so two replicas never send the same row), sends the bell row,
 * the push and the socket event through PharmacyNotificationService, then marks the row sent. A failure puts the row back with a
 * growing delay and gives up after MAX_ATTEMPTS (state "failed", visible in the event-reliability status). A row whose broadcast has
 * since closed or been won is marked "skipped": telling a pharmacy about a request it can no longer answer is noise.
 */
@Injectable()
export class PharmacyBroadcastDispatchService implements OnModuleInit {
  private readonly logger = new Logger(PharmacyBroadcastDispatchService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    private readonly notifier: PharmacyNotificationService,
  ) {}

  onModuleInit(): void {
    void this.ensureIndexes();
  }

  /** Never blocks the boot and never throws: a failed build is logged and the queries still work, only slowly. */
  async ensureIndexes(): Promise<void> {
    const outbox = this.connection.collection('domain_outbox');
    for (const { keys, name } of DOMAIN_OUTBOX_INDEXES) {
      try { await outbox.createIndex(keys, { name }); } catch (error: any) { this.logger.warn(`domain_outbox index ${name} not built: ${error?.message || error}`); }
    }
  }

  @Interval(3_000)
  @ScheduledOnce({ holdMs: 1000 })
  async tick() {
    try { await this.dispatchDue(new Date()); } catch (error: any) { this.logger.warn(`pharmacy broadcast dispatch failed: ${error?.message || error}`); }
  }

  /** The pharmacy and broadcast of a row: from the payload, else from the idempotency key `pharmacy-broadcast-recipient:<broadcast>:<pharmacy>`. */
  static target(row: any): { broadcastId: string; pharmacyId: string } | null {
    const p = row?.payload || {};
    if (p.broadcast_id && p.pharmacy_account_id) return { broadcastId: String(p.broadcast_id), pharmacyId: String(p.pharmacy_account_id) };
    const m = /^pharmacy-broadcast-recipient:([^:]+):(.+)$/.exec(String(row?.idempotency_key || ''));
    return m ? { broadcastId: m[1], pharmacyId: m[2] } : null;
  }

  async dispatchDue(now: Date): Promise<{ sent: number; skipped: number; failed: number; retried: number }> {
    const outbox = this.connection.collection('domain_outbox');
    // A row claimed by a worker that died is given back after the lease.
    await outbox.updateMany({ event_type: EVENT, state: 'processing', claimed_at: { $lte: new Date(now.getTime() - LEASE_MS) } }, { $set: { state: 'pending' } });
    const out = { sent: 0, skipped: 0, failed: 0, retried: 0 };
    for (let i = 0; i < BATCH; i += 1) {
      const row: any = await outbox.findOneAndUpdate(
        { event_type: EVENT, state: 'pending', $or: [{ next_attempt_at: { $exists: false } }, { next_attempt_at: { $lte: now } }] },
        { $set: { state: 'processing', claimed_at: now }, $inc: { attempts: 1 } },
        { sort: { created_at: 1 }, returnDocument: 'after' },
      );
      const doc = row?.value ?? row;
      if (!doc || !doc._id) break;
      const result = await this.deliver(doc);
      if (result === 'sent') { out.sent += 1; await outbox.updateOne({ _id: doc._id }, { $set: { state: 'sent', sent_at: new Date() } }); }
      else if (result === 'skipped') { out.skipped += 1; await outbox.updateOne({ _id: doc._id }, { $set: { state: 'skipped', sent_at: new Date() } }); }
      else if (Number(doc.attempts) >= MAX_ATTEMPTS) { out.failed += 1; await outbox.updateOne({ _id: doc._id }, { $set: { state: 'failed', failed_at: new Date() } }); }
      else { out.retried += 1; await outbox.updateOne({ _id: doc._id }, { $set: { state: 'pending', next_attempt_at: new Date(now.getTime() + 10_000 * Number(doc.attempts || 1)) } }); }
    }
    return out;
  }

  private async deliver(row: any): Promise<'sent' | 'skipped' | 'retry'> {
    const target = PharmacyBroadcastDispatchService.target(row);
    if (!target) return 'skipped';
    try {
      const broadcast: any = await this.broadcasts.findOne({ id: target.broadcastId }).lean();
      if (!broadcast || broadcast.lock_state !== 'open') return 'skipped';
      const order: any = await this.orders.findOne({ id: broadcast.order_id }).lean();
      if (!order) return 'skipped';
      await this.notifier.notifyPharmacyBroadcast(target.pharmacyId, order, broadcast);
      return 'sent';
    } catch (error: any) {
      this.logger.warn(`broadcast notice for ${target.pharmacyId} failed: ${error?.message || error}`);
      return 'retry';
    }
  }
}
