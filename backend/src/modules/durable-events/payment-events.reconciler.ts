import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { COLLECTION, DurableEventsService } from './durable-events.service';

export const paymentCompletedKey = (transactionId: string) => `payment.completed:${transactionId}`;
const META = 'durable_meta';
const GRACE_MS = 2 * 60_000;

/**
 * The one window the outbox cannot close by itself: `transaction.save()` (status paid) and `enqueue()` are two writes. If the process dies between
 * them, nobody announces the payment (booking stays unconfirmed). This finds paid transactions with no `payment.completed:<id>` row after a grace period
 * and enqueues the same event. It only looks at payments made after it first ran, so deploying it never re-announces history.
 */
@Injectable()
export class PaymentEventsReconciler {
  private readonly logger = new Logger('PaymentEventsReconciler');
  constructor(@InjectConnection() private readonly connection: Connection, private readonly durable: DurableEventsService) {}

  async reconcile(now = new Date()): Promise<number> {
    const meta = this.connection.collection(META);
    const since: Date = ((await meta.findOneAndUpdate({ _id: 'payment_reconcile_since' as any }, { $setOnInsert: { at: now } }, { upsert: true, returnDocument: 'after' })) as any)?.at ?? now;
    const txns = await this.connection.collection('transactions')
      .find({ status: { $in: ['paid', 'partially_refunded', 'refunded'] }, paid_at: { $gte: since, $lte: new Date(now.getTime() - GRACE_MS) } }, { projection: { id: 1, booking_kind: 1, booking_id: 1, patient_id: 1, amount: 1 } })
      .limit(200).toArray();
    if (!txns.length) return 0;
    const have = new Set((await this.connection.collection(COLLECTION).find({ key: { $in: txns.map((t: any) => paymentCompletedKey(t.id)) } }, { projection: { key: 1 } }).toArray()).map((r: any) => r.key));
    let n = 0;
    for (const t of txns as any[]) {
      const key = paymentCompletedKey(t.id);
      if (have.has(key)) continue;
      const { duplicate } = await this.durable.enqueue('payment.completed', { kind: t.booking_kind, id: t.booking_id, booking_kind: t.booking_kind, booking_id: t.booking_id, patient_id: t.patient_id, amount: t.amount, transaction_id: t.id }, { key });
      if (!duplicate) { n++; this.logger.warn(`reconciled_unannounced_payment txn=${t.id}`); }
    }
    return n;
  }
}
