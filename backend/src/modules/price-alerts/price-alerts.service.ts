import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { NotificationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';

/** 22.2: a price-drop alert fires when the price falls by this share or more since the last recorded price. */
export const PRICE_DROP_THRESHOLD = 0.05;

/**
 * 22.2 price-drop alerts. Every change of a medicine's price is written to `medicine_price_history` (the reference price),
 * and a patient who has the medicine on their wishlist is told when the price falls by 5% or more. Prescription and
 * controlled medicines are left out, both in the history and in the alerts. There is no back-in-stock alert: orders are
 * broadcast to pharmacies and nothing on the server knows the stock.
 *
 * The sweep runs hourly. A history row is written once per medicine and hour (`_id` = medicine + hour), so two instances
 * that sweep the same hour cannot both record the change or both notify.
 */
@Injectable()
export class PriceAlertsService {
  private readonly logger = new Logger('PriceAlerts');
  private running = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSweep() {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep(new Date());
    } catch (err: any) {
      this.logger.error(`price sweep failed: ${err?.message || err}`);
    } finally {
      this.running = false;
    }
  }

  /** Records price changes since the last sweep and notifies wishlist holders of drops. Returns the number of alerts sent. */
  async sweep(now: Date): Promise<number> {
    const bucket = now.toISOString().slice(0, 13);
    const medicines = (await this.conn.collection('medicines')
      .find({ ...publicMedicineFilter(), requires_prescription: { $ne: true }, controlled: { $ne: true } } as any, { projection: { _id: 0, id: 1, price: 1 } })
      .toArray()) as unknown as { id: string; price: number }[];
    const last = await this.lastRecordedPrices();

    let sent = 0;
    for (const med of medicines) {
      const price = Number(med.price);
      if (!med.id || !Number.isFinite(price) || price <= 0) continue;
      const previous = last.get(med.id);
      if (previous === price) continue;
      const inserted = await this.recordPrice(med.id, price, previous ?? null, now, bucket);
      if (!inserted || previous === undefined) continue;
      if ((previous - price) / previous >= PRICE_DROP_THRESHOLD) sent += await this.notifyWishlistHolders(med.id, previous, price);
    }
    return sent;
  }

  /** The latest recorded price per medicine (the reference price for the next change). */
  private async lastRecordedPrices(): Promise<Map<string, number>> {
    const rows = (await this.conn.collection('medicine_price_history').aggregate([
      { $sort: { recorded_at: -1 } },
      { $group: { _id: '$medicine_id', price: { $first: '$price' } } },
    ]).toArray()) as unknown as { _id: string; price: number }[];
    return new Map(rows.map((r) => [String(r._id), Number(r.price)]));
  }

  /** Returns false when another instance already recorded this medicine's change in this hour. */
  private async recordPrice(medicineId: string, price: number, previous: number | null, now: Date, bucket: string): Promise<boolean> {
    try {
      await this.conn.collection('medicine_price_history').insertOne({
        _id: `${medicineId}|${bucket}`,
        medicine_id: medicineId, price, previous_price: previous, recorded_at: now,
      } as any);
      return true;
    } catch (err: any) {
      if (err?.code === 11000) return false;
      throw err;
    }
  }

  private async notifyWishlistHolders(medicineId: string, previous: number, price: number): Promise<number> {
    const holders = (await this.conn.collection('patient_profiles')
      .find({ 'wishlist.id': medicineId } as any, { projection: { _id: 0, user_id: 1 } })
      .toArray()) as unknown as { user_id: string }[];
    let sent = 0;
    for (const holder of holders) {
      if (!holder.user_id) continue;
      try {
        await this.notifications.create({
          user_id: holder.user_id,
          type: NotificationType.PROMO,
          title_key: 'notif.price_drop.title',
          body_key: 'notif.price_drop.body',
          params: { previous, price },
          action: { route: `/pharmacy/product/${medicineId}` },
        });
        sent += 1;
      } catch (err: any) {
        this.logger.warn(`price-drop alert not sent for ${medicineId}: ${err?.message || err}`);
      }
    }
    return sent;
  }
}
