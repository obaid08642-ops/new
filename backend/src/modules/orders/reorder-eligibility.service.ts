import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { OrderRepository } from './repositories/order.repository';
import { MedicineRepository } from './repositories/medicine.repository';
import {
  classifyRxLine,
  prescriptionCovers,
} from './prescription-validity';

export interface EligibilityLine {
  key: string;
  medicine_id: string | null;
  name: string;
  qty: number;
  requires_prescription: boolean;
  rx_status: 'not_required' | 'valid' | 'expired' | 'missing';
  rx_valid_until: Date | null;
  in_stock: boolean;
  note: string | null;
}

export interface ReorderEligibility {
  order_id: string;
  eligible: boolean;
  blocked_count: number;
  items: EligibilityLine[];
}

interface MedDoc {
  id: string;
  name_ar: string;
  name_en?: string;
  active_ingredient?: string;
  requires_prescription?: boolean;
  aggregate_stock?: number;
  availability_status?: string;
}

interface RxDoc {
  id: string;
  patient_id: string;
  items?: Array<{ medicine_id?: string; active_ingredient?: string }>;
  verified_at?: string | Date | null;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
}

async function leanAll<T>(q: unknown): Promise<T[]> {
  if (
    q !== null &&
    typeof q === 'object' &&
    typeof (q as { lean?: unknown }).lean === 'function'
  ) {
    return (q as { lean: () => Promise<T[]> }).lean();
  }
  return (await q) as T[];
}

/**
 * P22.1 — "Order again" gap-filler (read-only).
 *
 * `POST :id/reorder` already exists; it rebuilds blindly. This service answers
 * what a blind rebuild gets wrong: Rx-only items whose prescription is missing
 * or expired, and out-of-stock items. Covers both legacy `orders` and governed
 * `pharmacy_orders`. Never writes.
 */
@Injectable()
export class ReorderEligibilityService {
  constructor(
    @Inject('OrderRepository') private readonly orders: OrderRepository,
    @Inject('MedicineRepository') private readonly meds: MedicineRepository,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  async forOrder(
    orderId: string,
    patientId: string,
    at: Date = new Date(),
  ): Promise<ReorderEligibility> {
    const oid = String(orderId);
    const pid = String(patientId);

    const legacyQ: unknown = this.orders.findOne({
      id: { $eq: oid },
      patient_id: { $eq: pid },
    });
    const legacy: Record<string, unknown> | null =
      typeof (legacyQ as { lean?: unknown }).lean === 'function'
        ? await (legacyQ as { lean: () => Promise<Record<string, unknown> | null> }).lean()
        : ((await legacyQ) as Record<string, unknown> | null);

    let rawItems: Array<Record<string, unknown>> = [];
    if (legacy) {
      rawItems = Array.isArray(legacy['items'])
        ? (legacy['items'] as Array<Record<string, unknown>>)
        : [];
    } else {
      const governed = await this.conn
        .collection('pharmacy_orders')
        .findOne({ id: { $eq: oid }, patient_account_id: { $eq: pid } } as never);
      if (!governed) throw new NotFoundException('order_not_found');
      const g = governed as unknown as Record<string, unknown>;
      rawItems = Array.isArray(g['items'])
        ? (g['items'] as Array<Record<string, unknown>>)
        : [];
    }

    const norm = rawItems.map((it, idx) => ({
      key: String(it['id'] ?? it['medicine_id'] ?? `line-${idx}`),
      medicineId: String(
        it['medicine_id'] ?? it['matched_sku'] ?? it['sku'] ?? '',
      ),
      name: String(
        it['raw_name'] ?? it['name_ar'] ?? it['name_en'] ?? it['name'] ?? 'unknown',
      ),
      qty: Math.max(1, Number(it['qty'] ?? 1) || 1),
    }));

    const ids = norm.map((n) => n.medicineId).filter(Boolean);
    const names = norm.map((n) => n.name).filter(Boolean);
    const medDocs = await leanAll<MedDoc>(
      this.meds.find(
        {
          $or: [
            { id: { $in: ids } },
            { name_ar: { $in: names } },
            { name_en: { $in: names } },
          ],
        },
        { _id: 0, __v: 0 },
      ),
    );
    const byId = new Map(medDocs.map((m) => [String(m.id), m]));
    const byName = new Map<string, MedDoc>();
    for (const m of medDocs) {
      if (m.name_ar) byName.set(m.name_ar.trim().toLowerCase(), m);
      if (m.name_en) byName.set(String(m.name_en).trim().toLowerCase(), m);
    }

    const needRx = norm.some((n) => {
      const m =
        byId.get(n.medicineId) ?? byName.get(n.name.trim().toLowerCase());
      return m?.requires_prescription === true;
    });
    let rxDocs: RxDoc[] = [];
    if (needRx) {
      const cursor = await this.conn
        .collection('prescriptions')
        .find({ patient_id: { $eq: pid } } as never);
      const all = (await cursor.toArray()) as unknown as RxDoc[];
      rxDocs = Array.isArray(all) ? all : [];
    }

    const items: EligibilityLine[] = norm.map((n) => {
      const med =
        byId.get(n.medicineId) ?? byName.get(n.name.trim().toLowerCase()) ?? null;
      const requiresRx = med?.requires_prescription === true;
      const ingredient = med?.active_ingredient ?? null;
      let rx_status: EligibilityLine['rx_status'] = 'not_required';
      let rx_valid_until: Date | null = null;
      let note: string | null = null;
      if (requiresRx) {
        const covering =
          rxDocs.find((rx) =>
            prescriptionCovers(rx, n.medicineId, ingredient),
          ) ?? null;
        const c = classifyRxLine({ requiresPrescription: true, covering, at });
        rx_status = c.status;
        rx_valid_until = c.validUntil;
        if (c.status === 'missing')
          note = 'requires a prescription covering this item';
        if (c.status === 'expired')
          note = 'prescription expired — renewal required before reorder';
      }
      const stock = Number(med?.aggregate_stock ?? 0);
      const status = String(med?.availability_status ?? '');
      const in_stock =
        med === null
          ? true
          : stock >= n.qty &&
            status !== 'out_of_stock' &&
            status !== 'discontinued';
      if (!in_stock)
        note = [note, 'out of stock — will need pharmacy substitution or split']
          .filter(Boolean)
          .join('; ');
      return {
        key: n.key,
        medicine_id: n.medicineId || null,
        name: n.name,
        qty: n.qty,
        requires_prescription: requiresRx,
        rx_status,
        rx_valid_until,
        in_stock,
        note,
      };
    });

    const blocked = items.filter(
      (i) => i.rx_status === 'expired' || i.rx_status === 'missing' || !i.in_stock,
    );
    return {
      order_id: oid,
      eligible: blocked.length === 0,
      blocked_count: blocked.length,
      items,
    };
  }
}
