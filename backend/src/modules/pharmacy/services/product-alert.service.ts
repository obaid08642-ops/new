import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { SubscribeAlertDto } from '../dto/product-alert.dto';

export type AlertKind = 'restock' | 'price_drop';
export type AlertStatus = 'active' | 'notified' | 'cancelled';

export interface ProductAlertDoc {
  id: string;
  user_id: string;
  medicine_id: string;
  medicine_name: string;
  sku: string | null;
  match_keys: string[];
  kind: AlertKind;
  price_threshold: number | null;
  last_seen_price: number | null;
  status: AlertStatus;
  last_notified_at: Date | null;
}

/**
 * P22.2 — user-facing product alert subscriptions.
 *
 * Provider-side low-stock plumbing already exists (PharmacyInventoryExtService);
 * nothing patient-facing fired. This service closes the loop: subscribe →
 * trigger (restock edge / price drop) → notify ONLY the subscriber.
 *
 * Alert keys are resolved at subscribe time (medicine id + sku + generic name)
 * so firing never needs a catalog read and can be driven by provider restock
 * events that only know the inventory sku.
 */
@Injectable()
export class ProductAlertService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly pharmacyNotif: PharmacyNotificationService,
  ) {}

  async subscribe(
    userId: string,
    dto: SubscribeAlertDto,
    idempotencyKey?: string,
  ): Promise<ProductAlertDoc> {
    const uid = String(userId);
    const mid = String(dto.medicine_id);
    if (dto.kind === 'price_drop' && !(Number(dto.price_threshold) > 0))
      throw new BadRequestException('price_threshold_required');

    const med = await this.conn.collection('medicines').findOne({
      id: { $eq: mid },
    } as never);
    if (!med) throw new NotFoundException('medicine_not_found');
    const m = med as unknown as {
      id: string;
      name_ar: string;
      name_en?: string;
      sku?: number | string;
      generic_name?: string;
      price?: number;
    };

    const existing = await this.conn.collection('product_alerts').findOne({
      user_id: { $eq: uid },
      medicine_id: { $eq: mid },
      kind: { $eq: String(dto.kind) },
      status: { $eq: 'active' },
    } as never);
    if (existing) return this.toDoc(existing);

    const sku = m.sku !== undefined && m.sku !== null ? String(m.sku) : null;
    const matchKeys = [
      mid.toLowerCase(),
      ...(sku ? [sku.toLowerCase()] : []),
      ...((m.generic_name || '').trim().toLowerCase()
        ? [(m.generic_name as string).trim().toLowerCase()]
        : []),
    ];
    const doc: ProductAlertDoc = {
      id: uuidv4(),
      user_id: uid,
      medicine_id: mid,
      medicine_name: m.name_ar || m.name_en || mid,
      sku,
      match_keys: matchKeys,
      kind: dto.kind,
      price_threshold:
        dto.kind === 'price_drop' ? Number(dto.price_threshold) : null,
      last_seen_price: Number(m.price ?? 0) || null,
      status: 'active',
      last_notified_at: null,
    };
    try {
      await this.conn.collection('product_alerts').insertOne({
        ...doc,
        ...(idempotencyKey ? { idempotency_key: String(idempotencyKey) } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
    } catch (e: unknown) {
      if (idempotencyKey) {
        const replay = await this.conn.collection('product_alerts').findOne({
          idempotency_key: { $eq: String(idempotencyKey) },
          user_id: { $eq: uid },
        } as never);
        if (replay) return this.toDoc(replay);
      }
      throw e;
    }
    return doc;
  }

  async list(userId: string): Promise<ProductAlertDoc[]> {
    const cursor = await this.conn
      .collection('product_alerts')
      .find({ user_id: { $eq: String(userId) } } as never);
    const all = (await cursor.toArray()) as unknown as Array<Record<string, unknown>>;
    return all.map((d) => this.toDoc(d));
  }

  async unsubscribe(userId: string, subId: string): Promise<{ ok: boolean }> {
    const res = await this.conn.collection('product_alerts').findOneAndUpdate(
      {
        id: { $eq: String(subId) },
        user_id: { $eq: String(userId) },
        status: { $eq: 'active' },
      } as never,
      { $set: { status: 'cancelled', updatedAt: new Date() } } as never,
      { returnDocument: 'after' } as never,
    );
    if (!(res as unknown as { value?: unknown })?.value)
      throw new NotFoundException('alert_not_found');
    return { ok: true };
  }

  /**
   * Edge-triggered by provider restock (0 → positive). Notifies every active
   * restock subscriber whose keys match, then parks them as `notified` so a
   * repeated restock event never spams.
   */
  async onRestock(signal: {
    sku?: string;
    generic_name?: string;
    medicine_id?: string;
  }): Promise<{ notified: number }> {
    const keys = [signal.sku, signal.generic_name, signal.medicine_id]
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean);
    if (keys.length === 0) return { notified: 0 };
    const cursor = await this.conn.collection('product_alerts').find({
      kind: { $eq: 'restock' },
      status: { $eq: 'active' },
    } as never);
    const all = (await cursor.toArray()) as unknown as Array<Record<string, unknown>>;
    let notified = 0;
    for (const raw of all) {
      const sub = this.toDoc(raw);
      const hit = sub.match_keys.some((k) => keys.includes(k.toLowerCase()));
      if (!hit) continue;
      await this.pharmacyNotif.notifyProductRestock(sub.user_id, {
        medicine_id: sub.medicine_id,
        medicine_name: sub.medicine_name,
      });
      await this.conn.collection('product_alerts').updateOne(
        { id: { $eq: sub.id }, status: { $eq: 'active' } } as never,
        {
          $set: {
            status: 'notified',
            last_notified_at: new Date(),
            updatedAt: new Date(),
          },
        } as never,
      );
      notified += 1;
    }
    return { notified };
  }

  /**
   * Called when a medicine price changes. Fires active price_drop alerts whose
   * threshold is met AND the move is actually downward vs the last seen price.
   */
  async reportPrice(
    medicineId: string,
    newPrice: number,
    oldPrice?: number,
  ): Promise<{ notified: number }> {
    const mid = String(medicineId);
    const price = Number(newPrice);
    if (!(price >= 0)) throw new BadRequestException('invalid_price');
    const cursor = await this.conn.collection('product_alerts').find({
      medicine_id: { $eq: mid },
      kind: { $eq: 'price_drop' },
      status: { $eq: 'active' },
    } as never);
    const all = (await cursor.toArray()) as unknown as Array<Record<string, unknown>>;
    let notified = 0;
    for (const raw of all) {
      const sub = this.toDoc(raw);
      const prev =
        oldPrice !== undefined ? Number(oldPrice) : Number(sub.last_seen_price ?? price);
      const threshold = Number(sub.price_threshold ?? Number.POSITIVE_INFINITY);
      await this.conn.collection('product_alerts').updateOne(
        { id: { $eq: sub.id } } as never,
        { $set: { last_seen_price: price, updatedAt: new Date() } } as never,
      );
      if (price < prev && price <= threshold) {
        await this.pharmacyNotif.notifyPriceDrop(sub.user_id, {
          medicine_id: sub.medicine_id,
          medicine_name: sub.medicine_name,
          old_price: prev,
          new_price: price,
        });
        await this.conn.collection('product_alerts').updateOne(
          { id: { $eq: sub.id }, status: { $eq: 'active' } } as never,
          {
            $set: {
              status: 'notified',
              last_notified_at: new Date(),
              updatedAt: new Date(),
            },
          } as never,
        );
        notified += 1;
      }
    }
    return { notified };
  }

  private toDoc(raw: unknown): ProductAlertDoc {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id']),
      user_id: String(r['user_id']),
      medicine_id: String(r['medicine_id']),
      medicine_name: String(r['medicine_name'] ?? r['medicine_id']),
      sku: r['sku'] !== null && r['sku'] !== undefined ? String(r['sku']) : null,
      match_keys: Array.isArray(r['match_keys'])
        ? (r['match_keys'] as unknown[]).map((k) => String(k))
        : [],
      kind: r['kind'] === 'price_drop' ? 'price_drop' : 'restock',
      price_threshold:
        r['price_threshold'] !== null && r['price_threshold'] !== undefined
          ? Number(r['price_threshold'])
          : null,
      last_seen_price:
        r['last_seen_price'] !== null && r['last_seen_price'] !== undefined
          ? Number(r['last_seen_price'])
          : null,
      status: (r['status'] as AlertStatus) ?? 'active',
      last_notified_at: r['last_notified_at']
        ? new Date(String(r['last_notified_at']))
        : null,
    };
  }
}
