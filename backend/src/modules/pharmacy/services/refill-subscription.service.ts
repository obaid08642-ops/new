import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  prescriptionCovers,
  resolvePrescriptionExpiry,
  DEFAULT_RX_VALIDITY_DAYS,
} from '../../orders/prescription-validity';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { SubscribeRefillDto } from '../dto/refill-subscription.dto';

const DAY_MS = 24 * 3600 * 1000;
const MAX_ITEMS = 20;

export interface RefillSubscriptionDoc {
  id: string;
  patient_id: string;
  items: Array<{ medicine_id: string; qty: number }>;
  cadence_days: number;
  prescription_id?: string;
  prescription_valid_until?: Date;
  next_refill_at: Date;
  reminder_days_before: number;
  reminder_sent_for: string | null;
  delivery_address?: Record<string, unknown>;
  status: 'active' | 'cancelled' | 'expired';
  last_order_id?: string;
  notified_expired: boolean;
  idempotency_key?: string;
}

export function refillDateKey(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * P22.1 — auto-refill subscriptions for chronic medicines.
 *
 * - subscribe: stores the cadence + items; Rx items require a covering,
 *   unexpired prescription (no refill past expiry — enforced here AND on every
 *   processDue run).
 * - processDue: sends one reminder per refill (reminder_days_before) via the
 *   existing notification service (read-only call), then creates the refill
 *   order draft on the date. Idempotent per (subscription, refill date).
 */
@Injectable()
export class RefillSubscriptionService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly pharmacyNotif: PharmacyNotificationService,
  ) {}

  async ensureIndexes(): Promise<void> {
    await this.conn
      .collection('refill_subscriptions')
      .createIndex({ idempotency_key: 1 }, { unique: true, sparse: true } as never)
      .catch(() => null);
    await this.conn
      .collection('pharmacy_orders')
      .createIndex({ refill_idempotency_key: 1 }, { unique: true, sparse: true } as never)
      .catch(() => null);
  }

  async subscribe(
    patientId: string,
    dto: SubscribeRefillDto,
    idempotencyKey?: string,
  ): Promise<RefillSubscriptionDoc> {
    const pid = String(patientId);
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (items.length === 0) throw new BadRequestException('items_required');
    if (items.length > MAX_ITEMS) throw new BadRequestException('too_many_items');
    const cadence = Math.floor(Number(dto.cadence_days));
    if (!(cadence >= 7 && cadence <= 120))
      throw new BadRequestException('invalid_cadence_days');

    if (idempotencyKey) {
      const prior = await this.conn.collection('refill_subscriptions').findOne({
        idempotency_key: { $eq: String(idempotencyKey) },
        patient_id: { $eq: pid },
      } as never);
      if (prior) return this.toDoc(prior);
    }

    const medIds = [...new Set(items.map((i) => String(i.medicine_id)))];
    const cursor = await this.conn
      .collection('medicines')
      .find({ id: { $in: medIds } } as never);
    const meds = (await cursor.toArray()) as unknown as Array<{
      id: string;
      name_ar: string;
      requires_prescription?: boolean;
      active_ingredient?: string;
    }>;
    const byId = new Map(meds.map((m) => [String(m.id), m]));
    for (const it of items) {
      if (!byId.has(String(it.medicine_id)))
        throw new BadRequestException(`unknown_medicine: ${it.medicine_id}`);
    }
    const rxItems = items.filter(
      (it) => byId.get(String(it.medicine_id))?.requires_prescription === true,
    );

    let prescriptionId: string | undefined;
    let validUntil: Date | undefined;
    if (rxItems.length > 0) {
      if (!dto.prescription_id) throw new BadRequestException('prescription_required');
      const rx = await this.conn.collection('prescriptions').findOne({
        id: { $eq: String(dto.prescription_id) },
        patient_id: { $eq: pid },
      } as never);
      if (!rx) throw new NotFoundException('prescription_not_found');
      const rxRec = rx as unknown as {
        items?: Array<{ medicine_id?: string; active_ingredient?: string }>;
        verified_at?: string | Date | null;
        createdAt?: string | Date | null;
        created_at?: string | Date | null;
      };
      for (const it of rxItems) {
        const med = byId.get(String(it.medicine_id));
        if (
          !prescriptionCovers(rxRec, String(it.medicine_id), med?.active_ingredient)
        )
          throw new BadRequestException(
            `prescription_does_not_cover: ${it.medicine_id}`,
          );
      }
      const explicit = dto.prescription_valid_until
        ? new Date(dto.prescription_valid_until)
        : null;
      const derived =
        explicit && !Number.isNaN(explicit.getTime())
          ? explicit
          : resolvePrescriptionExpiry(rxRec, DEFAULT_RX_VALIDITY_DAYS);
      if (!derived) throw new BadRequestException('prescription_expiry_unknown');
      if (derived.getTime() <= Date.now())
        throw new BadRequestException('prescription_expired');
      prescriptionId = String(dto.prescription_id);
      validUntil = derived;
    }

    const now = new Date();
    const first = dto.first_refill_at ? new Date(dto.first_refill_at) : null;
    const next =
      first && !Number.isNaN(first.getTime())
        ? first
        : new Date(now.getTime() + cadence * DAY_MS);
    const doc: RefillSubscriptionDoc = {
      id: uuidv4(),
      patient_id: pid,
      items: items.map((it) => ({
        medicine_id: String(it.medicine_id),
        qty: Math.max(1, Math.floor(Number(it.qty)) || 1),
      })),
      cadence_days: cadence,
      ...(prescriptionId ? { prescription_id: prescriptionId } : {}),
      ...(validUntil ? { prescription_valid_until: validUntil } : {}),
      next_refill_at: next,
      reminder_days_before: Math.min(
        14,
        Math.max(0, Math.floor(Number(dto.reminder_days_before ?? 2)) || 0),
      ),
      reminder_sent_for: null,
      ...(dto.delivery_address ? { delivery_address: dto.delivery_address } : {}),
      status: 'active',
      notified_expired: false,
      ...(idempotencyKey ? { idempotency_key: String(idempotencyKey) } : {}),
    };
    await this.conn.collection('refill_subscriptions').insertOne({
      ...doc,
      createdAt: now,
      updatedAt: now,
    } as never);
    return doc;
  }

  async mySubscriptions(patientId: string): Promise<RefillSubscriptionDoc[]> {
    const cursor = await this.conn
      .collection('refill_subscriptions')
      .find({ patient_id: { $eq: String(patientId) } } as never);
    const all = (await cursor.toArray()) as unknown as Array<Record<string, unknown>>;
    return all.map((d) => this.toDoc(d));
  }

  async cancel(patientId: string, subId: string): Promise<RefillSubscriptionDoc> {
    const res = await this.conn.collection('refill_subscriptions').findOneAndUpdate(
      {
        id: { $eq: String(subId) },
        patient_id: { $eq: String(patientId) },
        status: { $eq: 'active' },
      } as never,
      { $set: { status: 'cancelled', updatedAt: new Date() } } as never,
      { returnDocument: 'after' } as never,
    );
    const doc = (res as unknown as { value?: unknown })?.value;
    if (!doc) throw new NotFoundException('subscription_not_found');
    return this.toDoc(doc);
  }

  /**
   * Cron/admin entry: reminders first, then due refill drafts.
   * Safe to run every few minutes — every side effect is guarded.
   */
  async processDue(now: Date = new Date()): Promise<{
    reminded: number;
    created: number;
    expired: number;
  }> {
    const nowMs = now.getTime();
    let reminded = 0;
    let created = 0;
    let expired = 0;

    const cursor = await this.conn
      .collection('refill_subscriptions')
      .find({ status: { $eq: 'active' } } as never);
    const subs = (await cursor.toArray()) as unknown as Array<
      Record<string, unknown>
    >;

    for (const raw of subs) {
      const sub = this.toDoc(raw);
      const nextMs = new Date(sub.next_refill_at).getTime();

      // 1. Expiry gate — never create a refill past prescription validity.
      if (
        sub.prescription_valid_until &&
        new Date(sub.prescription_valid_until).getTime() <= nowMs
      ) {
        await this.conn.collection('refill_subscriptions').updateOne(
          { id: { $eq: sub.id } } as never,
          {
            $set: {
              status: 'expired',
              updatedAt: now,
              ...(sub.notified_expired ? {} : { notified_expired: true }),
            },
          } as never,
        );
        if (!sub.notified_expired) {
          await this.pharmacyNotif.notifyRefillExpired(sub.patient_id, {
            subscription_id: sub.id,
          });
          expired += 1;
        }
        continue;
      }

      // 2. Reminder before each refill (exactly once per refill date).
      const key = refillDateKey(new Date(sub.next_refill_at));
      const remindAt = nextMs - sub.reminder_days_before * DAY_MS;
      if (
        sub.reminder_sent_for !== key &&
        remindAt <= nowMs &&
        nextMs > nowMs
      ) {
        await this.pharmacyNotif.notifyRefillReminder(sub.patient_id, {
          subscription_id: sub.id,
          next_refill_at: new Date(sub.next_refill_at).toISOString(),
          items_count: sub.items.length,
        });
        await this.conn.collection('refill_subscriptions').updateOne(
          { id: { $eq: sub.id } } as never,
          { $set: { reminder_sent_for: key, updatedAt: now } } as never,
        );
        reminded += 1;
      }

      // 3. Due refill → create the draft order, advance the cadence.
      if (nextMs <= nowMs) {
        const dateKey = refillDateKey(new Date(sub.next_refill_at));
        const orderKey = `refill_${sub.id}_${dateKey}`;
        const existing = await this.conn.collection('pharmacy_orders').findOne({
          refill_idempotency_key: { $eq: orderKey },
        } as never);
        if (!existing) {
          const draft = await this.buildRefillDraft(sub, orderKey);
          await this.conn.collection('pharmacy_orders').insertOne(draft as never);
          await this.pharmacyNotif.notifyRefillOrderCreated(sub.patient_id, {
            subscription_id: sub.id,
            order_id: String(
              (draft as unknown as Record<string, unknown>)['id'],
            ),
          });
        }
        const advanced = new Date(nextMs + sub.cadence_days * DAY_MS);
        const update: Record<string, unknown> = {
          next_refill_at: advanced,
          reminder_sent_for: null,
          updatedAt: now,
        };
        if (!existing) {
          const created2 = await this.conn
            .collection('pharmacy_orders')
            .findOne({ refill_idempotency_key: { $eq: orderKey } } as never);
          update['last_order_id'] = String(
            (created2 as unknown as Record<string, unknown> | null)?.['id'] ?? '',
          );
        }
        await this.conn.collection('refill_subscriptions').updateOne(
          { id: { $eq: sub.id } } as never,
          { $set: update } as never,
        );
        created += 1;
      }
    }
    return { reminded, created, expired };
  }

  private async buildRefillDraft(
    sub: RefillSubscriptionDoc,
    orderKey: string,
  ): Promise<Record<string, unknown>> {
    const cursor = await this.conn
      .collection('medicines')
      .find({ id: { $in: sub.items.map((i) => i.medicine_id) } } as never);
    const meds = (await cursor.toArray()) as unknown as Array<{
      id: string;
      name_ar: string;
      name_en?: string;
    }>;
    const byId = new Map(meds.map((m) => [String(m.id), m]));
    return {
      id: uuidv4(),
      patient_account_id: sub.patient_id,
      status: 'draft',
      items: sub.items.map((it) => ({
        id: uuidv4(),
        raw_name: byId.get(it.medicine_id)?.name_ar ?? it.medicine_id,
        name_ar: byId.get(it.medicine_id)?.name_ar,
        ...(byId.get(it.medicine_id)?.name_en
          ? { name_en: byId.get(it.medicine_id)?.name_en }
          : {}),
        matched_sku: it.medicine_id,
        qty: it.qty,
        match_status: 'matched',
        intake_source: 'refill',
      })),
      delivery_address: sub.delivery_address ?? {},
      ...(sub.prescription_id ? { prescription_id: sub.prescription_id } : {}),
      payment_method: 'cash',
      fulfillment: 'delivery',
      payment_mode: 'cash',
      totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
      timeline: [{ ts: new Date(), event: 'created_from_refill_subscription' }],
      refill_subscription_id: sub.id,
      refill_idempotency_key: orderKey,
    };
  }

  private toDoc(raw: unknown): RefillSubscriptionDoc {
    const r = raw as Record<string, unknown>;
    const asDate = (v: unknown): Date =>
      v instanceof Date ? v : new Date(String(v));
    return {
      id: String(r['id']),
      patient_id: String(r['patient_id']),
      items: (Array.isArray(r['items']) ? r['items'] : []).map((it) => {
        const o = it as Record<string, unknown>;
        return {
          medicine_id: String(o['medicine_id']),
          qty: Number(o['qty']) || 1,
        };
      }),
      cadence_days: Number(r['cadence_days']) || 30,
      ...(r['prescription_id'] ? { prescription_id: String(r['prescription_id']) } : {}),
      ...(r['prescription_valid_until']
        ? { prescription_valid_until: asDate(r['prescription_valid_until']) }
        : {}),
      next_refill_at: asDate(r['next_refill_at']),
      reminder_days_before: Number(r['reminder_days_before'] ?? 2) || 0,
      reminder_sent_for: r['reminder_sent_for']
        ? String(r['reminder_sent_for'])
        : null,
      ...(r['delivery_address']
        ? { delivery_address: r['delivery_address'] as Record<string, unknown> }
        : {}),
      status: (r['status'] as RefillSubscriptionDoc['status']) ?? 'active',
      ...(r['last_order_id'] ? { last_order_id: String(r['last_order_id']) } : {}),
      notified_expired: r['notified_expired'] === true,
      ...(r['idempotency_key'] ? { idempotency_key: String(r['idempotency_key']) } : {}),
    };
  }
}
