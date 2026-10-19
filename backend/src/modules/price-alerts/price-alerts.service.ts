import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { NotificationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';

/** 22.2: a price-drop alert fires when the price falls by this many percent or more since the last recorded price. */
export const PRICE_DROP_THRESHOLD_PCT = 5;

/** A sweep that does not finish in this time is abandoned, so one stuck run cannot stop the alerts for good. */
const SWEEP_TIMEOUT_MS = 10 * 60 * 1000;

/** The reference-price collection. Its own name: `medicine_price_history` is the admin price audit. */
export const PRICE_REFERENCE_COLLECTION = 'medicine_price_reference';

interface MedicinePrice { id: string; price: number }
interface PriceRow { medicine_id: string; price: number; previous_price: number | null; recorded_at: Date; _id: string }

/**
 * 22.2 price-drop alerts. Every change of a medicine's price is written to `medicine_price_reference` (the reference
 * price), and a patient who has the medicine on their wishlist is told when the price falls by 5% or more.
 * Prescription, controlled, inactive and discontinued medicines are left out. There is no back-in-stock alert: orders are
 * broadcast to pharmacies and nothing on the server knows the stock.
 *
 * The sweep runs hourly. A reference row is keyed by medicine and clock hour (the nearest hour, so instances that fire at
 * the same cron moment get the same key), so a second instance that sweeps the same hour cannot record the change again
 * or notify again.
 */
@Injectable()
export class PriceAlertsService implements OnModuleInit {
  private readonly logger = new Logger('PriceAlerts');
  private running = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      await this.conn.collection(PRICE_REFERENCE_COLLECTION).createIndex({ medicine_id: 1, recorded_at: -1 });
      await this.conn.collection('patient_profiles').createIndex({ 'wishlist.id': 1 });
    } catch (err: unknown) {
      this.logger.warn(`price alert indexes not created: ${errorMessage(err)}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSweep() {
    if (this.running) {
      this.logger.warn('price sweep skipped: the previous run has not finished');
      return;
    }
    this.running = true;
    const timer = setTimeout(() => {
      this.running = false;
      this.logger.error(`price sweep exceeded ${SWEEP_TIMEOUT_MS} ms and was abandoned`);
    }, SWEEP_TIMEOUT_MS);
    try {
      await this.sweep(new Date());
    } catch (err: unknown) {
      this.logger.error(`price sweep failed: ${errorMessage(err)}`);
    } finally {
      clearTimeout(timer);
      this.running = false;
    }
  }

  /** Records price changes since the last sweep and notifies wishlist holders of drops. Returns the number of alerts sent. */
  async sweep(now: Date): Promise<number> {
    const hour = bucketOf(now);
    const medicines = (await this.conn.collection('medicines')
      .find({
        ...publicMedicineFilter(),
        requires_prescription: { $ne: true },
        controlled: { $ne: true },
        active: { $ne: false },
        availability_status: { $ne: 'discontinued' },
      }, { projection: { _id: 0, id: 1, price: 1 } })
      .toArray()) as unknown as MedicinePrice[];
    const last = await this.lastRecordedPrices();

    let sent = 0;
    for (const med of medicines) {
      const price = Number(med.price);
      if (!med.id || !Number.isFinite(price) || price <= 0) continue;
      const previous = last.get(med.id);
      if (previous === price) continue;
      const recorded = await this.recordPrice(med.id, price, previous ?? null, now, hour);
      if (!recorded || previous === undefined) continue;
      if (isDrop(previous, price)) sent += await this.notifyWishlistHolders(med.id, previous, price);
    }
    return sent;
  }

  /** The latest recorded price per medicine: the reference price for the next change. */
  private async lastRecordedPrices(): Promise<Map<string, number>> {
    const rows = (await this.conn.collection(PRICE_REFERENCE_COLLECTION).aggregate([
      { $sort: { recorded_at: -1 } },
      { $group: { _id: '$medicine_id', price: { $first: '$price' } } },
    ], { allowDiskUse: true }).toArray()) as unknown as { _id: string; price: number }[];
    return new Map(rows.map((r) => [String(r._id), Number(r.price)]));
  }

  /** Returns false when another instance already recorded this medicine's change in this hour. */
  private async recordPrice(medicineId: string, price: number, previous: number | null, now: Date, hour: string): Promise<boolean> {
    const row: PriceRow = { _id: `${medicineId}|${hour}`, medicine_id: medicineId, price, previous_price: previous, recorded_at: now };
    try {
      await this.conn.collection(PRICE_REFERENCE_COLLECTION).insertOne(row as unknown as Record<string, unknown>);
      return true;
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) return false;
      throw err;
    }
  }

  private async notifyWishlistHolders(medicineId: string, previous: number, price: number): Promise<number> {
    const holders = (await this.conn.collection('patient_profiles')
      .find({ 'wishlist.id': medicineId }, { projection: { _id: 0, user_id: 1 } })
      .toArray()) as unknown as { user_id?: string }[];
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
      } catch (err: unknown) {
        this.logger.warn(`price-drop alert not sent for ${medicineId}: ${errorMessage(err)}`);
      }
    }
    return sent;
  }
}

/** The nearest clock hour, as `YYYY-MM-DDTHH`: instances that fire at the same cron moment get the same key. */
export function bucketOf(now: Date): string {
  const hourMs = 60 * 60 * 1000;
  return new Date(Math.round(now.getTime() / hourMs) * hourMs).toISOString().slice(0, 13);
}

/** Compared in whole minor units (piastres), so an exact 5% drop on a two-decimal price is always alerted. */
export function isDrop(previous: number, price: number): boolean {
  const prevMinor = Math.round(previous * 100);
  const nowMinor = Math.round(price * 100);
  return (prevMinor - nowMinor) * 100 >= prevMinor * PRICE_DROP_THRESHOLD_PCT;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
