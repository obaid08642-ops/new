import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  RuleMed,
  alternativesByIngredient,
  applyNoRxCrossSell,
  coPurchasePairs,
  interactionWarnings,
  partnersOf,
} from './bundle-rules';

export interface BundleSuggestion {
  medicine_id: string;
  name: string;
  price: number;
  requires_prescription: boolean;
  support: number;
}

export interface BundleResult {
  anchor_id: string;
  suggestions: BundleSuggestion[];
  excluded_rx_ids: string[];
  interaction_warnings: Array<{
    suggested_id: string;
    interacts_with: string;
    detail: string;
  }>;
}

interface MedDoc {
  id: string;
  name_ar: string;
  name_en?: string;
  price?: number;
  active_ingredient?: string;
  requires_prescription?: boolean;
  interactions?: string[];
  availability_status?: string;
}

/**
 * P22.3 — "frequently bought together" from real order history + same-ingredient
 * alternatives, with pharmacist-safe rules enforced (see bundle-rules.ts).
 * Read-only: never writes.
 */
@Injectable()
export class BundlesService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async frequentlyBoughtTogether(
    medicineId: string,
    patientId?: string,
    limit = 5,
  ): Promise<BundleResult> {
    const mid = String(medicineId);
    const anchor = await this.medicine(mid);
    if (!anchor) throw new NotFoundException('medicine_not_found');

    const baskets = await this.orderBaskets();
    const pairs = coPurchasePairs(baskets, 2);
    const partners = partnersOf(pairs, mid, 25);
    if (partners.length === 0) {
      return {
        anchor_id: mid,
        suggestions: [],
        excluded_rx_ids: [],
        interaction_warnings: await this.warningsFor([], patientId),
      };
    }
    const ids = partners.map((p) => (p.a === mid ? p.b : p.a));
    const meds = await this.medicinesByIds(ids);
    const byId = new Map(meds.map((m) => [m.id, m]));
    const supportById = new Map(
      partners.map((p) => [p.a === mid ? p.b : p.a, p.support]),
    );
    const candidates: RuleMed[] = [];
    for (const id of ids) {
      const m = byId.get(id);
      if (!m) continue;
      candidates.push(this.toRule(m));
    }
    const { items, excludedRx } = applyNoRxCrossSell(candidates);
    const top = items.slice(0, Math.max(1, Math.min(10, limit)));
    return {
      anchor_id: mid,
      suggestions: top.map((t) => ({
        medicine_id: t.medicine_id,
        name: byId.get(t.medicine_id)?.name_ar ?? t.medicine_id,
        price: Number(byId.get(t.medicine_id)?.price ?? 0),
        requires_prescription: false,
        support: supportById.get(t.medicine_id) ?? 0,
      })),
      excluded_rx_ids: excludedRx,
      interaction_warnings: await this.warningsFor(top, patientId),
    };
  }

  async alternatives(
    medicineId: string,
    patientId?: string,
  ): Promise<BundleResult> {
    const mid = String(medicineId);
    const anchor = await this.medicine(mid);
    if (!anchor) throw new NotFoundException('medicine_not_found');
    const cursor = await this.conn.collection('medicines').find({
      active_ingredient: { $eq: String(anchor.active_ingredient ?? '') },
    } as never);
    const all = (await cursor.toArray()) as unknown as MedDoc[];
    const same = alternativesByIngredient(
      all
        .filter((m) => (m.availability_status ?? '') !== 'discontinued')
        .map((m) => this.toRule(m)),
      anchor.active_ingredient,
      mid,
    );
    return {
      anchor_id: mid,
      suggestions: same.map((t) => {
        const full = all.find((m) => m.id === t.medicine_id);
        return {
          medicine_id: t.medicine_id,
          name: full?.name_ar ?? t.medicine_id,
          price: Number(full?.price ?? 0),
          requires_prescription: t.requires_prescription,
          support: 0,
        };
      }),
      excluded_rx_ids: [],
      interaction_warnings: await this.warningsFor(same, patientId),
    };
  }

  private async warningsFor(items: RuleMed[], patientId?: string) {
    if (!patientId || items.length === 0) return [];
    const pid = String(patientId);
    const cursor = await this.conn
      .collection('prescriptions')
      .find({ patient_id: { $eq: pid } } as never);
    const rxs = (await cursor.toArray()) as unknown as Array<{
      items?: Array<{ medicine_id?: string; active_ingredient?: string }>;
    }>;
    const ids = new Set<string>();
    const ings = new Set<string>();
    for (const rx of rxs) {
      for (const line of rx.items ?? []) {
        if (line.medicine_id) ids.add(String(line.medicine_id));
        if (line.active_ingredient) ings.add(String(line.active_ingredient));
      }
    }
    const resolved = await this.medicinesByIds([...ids]);
    const patientMeds = resolved.map((m) => this.toRule(m));
    for (const m of resolved) {
      if (m.active_ingredient) ings.add(m.active_ingredient);
    }
    return interactionWarnings(items, [...ings], patientMeds);
  }

  private async orderBaskets(): Promise<string[][]> {
    const baskets: string[][] = [];
    const legacy = await this.conn.collection('orders').find({
      state: { $nin: ['CANCELLED'] },
    } as never);
    for (const o of (await legacy.toArray()) as unknown as Array<{
      items?: Array<{ medicine_id?: string }>;
    }>) {
      const ids = (o.items ?? []).map((i) => String(i.medicine_id || '')).filter(Boolean);
      if (ids.length > 0) baskets.push(ids);
    }
    const governed = await this.conn.collection('pharmacy_orders').find({
      status: { $nin: ['draft', 'cancelled'] },
    } as never);
    for (const o of (await governed.toArray()) as unknown as Array<{
      items?: Array<{ matched_sku?: string; medicine_id?: string }>;
    }>) {
      const ids = (o.items ?? [])
        .map((i) => String(i.medicine_id || i.matched_sku || ''))
        .filter(Boolean);
      if (ids.length > 0) baskets.push(ids);
    }
    return baskets;
  }

  private async medicine(mid: string): Promise<MedDoc | null> {
    const doc = await this.conn.collection('medicines').findOne({
      id: { $eq: mid },
    } as never);
    return (doc as unknown as MedDoc | null) ?? null;
  }

  private async medicinesByIds(ids: string[]): Promise<MedDoc[]> {
    if (ids.length === 0) return [];
    const cursor = await this.conn
      .collection('medicines')
      .find({ id: { $in: ids } } as never);
    return (await cursor.toArray()) as unknown as MedDoc[];
  }

  private toRule(m: MedDoc): RuleMed {
    return {
      medicine_id: String(m.id),
      active_ingredient: m.active_ingredient ?? null,
      requires_prescription: m.requires_prescription === true,
      interactions: Array.isArray(m.interactions) ? m.interactions.map(String) : [],
    };
  }
}
