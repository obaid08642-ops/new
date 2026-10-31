import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection, Model } from 'mongoose';
import { PharmacyNotificationService } from './pharmacy-notification.service';

const EVENT = 'pharmacy.broadcast.recipient_added';
const BATCH = 50;
const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 5;

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
export class PharmacyBroadcastDispatchService {
  private readonly logger = new Logger(PharmacyBroadcastDispatchService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    private readonly notifier: PharmacyNotificationService,
  ) {}

  @Interval(3_000)
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
