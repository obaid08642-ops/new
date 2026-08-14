import { Injectable, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { PharmacyInventory, PharmacyInventoryDocument } from '../../schemas/inventory.schema';
import { ProviderType, ProviderStatus } from '../../common/enums';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";

/**
 * Geo-Intelligent Pharmacy Dispatch Engine.
 *  - Starts at 3 km radius, expands progressively (3 → 7 → 10 → 15 km)
 *  - For each candidate pharmacy, checks inventory match against requested items
 *  - Scores candidates: primary=available_count, tiebreaker=distance asc
 *  - Returns BEST pharmacy and (if not 100% match) a SPLIT plan via secondary pharmacy
 */
@Injectable()
export class DispatchService {
  private logger = new Logger('Dispatch');
  // expansion ladder (km)
  readonly RADIUS_LADDER = [3, 7, 10, 15];

  constructor(
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @Inject('PharmacyInventoryRepository') private invModel: PharmacyInventoryRepository,
    private events: EventEmitter2,
  ) {}

  /** Haversine distance in km between two lat/lng points. */
  private haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Find pharmacies (ACTIVE pharmacy providers) within radius km of origin, sorted by distance. */
  async findNearbyPharmacies(origin: { lat: number; lng: number }, radius_km: number) {
    const all = await this.providerModel.find(
      { type: ProviderType.PHARMACY, status: ProviderStatus.ACTIVE, 'location.lat': { $exists: true } },
      { _id: 0, __v: 0 },
    );
    const withDist = all
      .map((p: any) => {
        const loc = p.location || {};
        if (!loc.lat || !loc.lng) return null;
        const d = this.haversine(origin, { lat: loc.lat, lng: loc.lng });
        return { provider: p, distance_km: +d.toFixed(2) };
      })
      .filter((x): x is { provider: any; distance_km: number } => !!x && x.distance_km <= radius_km)
      .sort((a, b) => a.distance_km - b.distance_km);
    return withDist;
  }

  /** Get inventory for a pharmacy & item list. Returns map medicine_id -> stock. */
  async getInventoryFor(pharmacy_user_id: string, medicine_ids: string[]) {
    const inv = await this.invModel.find({ pharmacy_id: pharmacy_user_id, medicine_id: { $in: medicine_ids }, is_available: true });
    const map: Record<string, number> = {};
    inv.forEach((i) => { map[i.medicine_id] = i.stock_qty; });
    return map;
  }

  /**
   * Main entry: pick best pharmacy.
   * Returns:
   *   { selected_pharmacy_id, fulfilled_items, missing_items, candidates, radius_used }
   * Expands radius if no candidate has ANY items.
   */
  async dispatch(origin: { lat: number; lng: number }, items: { medicine_id: string; qty: number }[]) {
    const wantedIds = items.map((i) => i.medicine_id);
    const attempts: any[] = [];
    let selected: { pharmacy_id: string; distance_km: number; available_count: number; total_requested: number; score: number; status: string } | null = null;
    let radiusUsed = 0;
    let candidates: any[] = [];

    for (const radius of this.RADIUS_LADDER) {
      radiusUsed = radius;
      const nearby = await this.findNearbyPharmacies(origin, radius);
      if (nearby.length === 0) {
        attempts.push({ radius_km: radius, candidates: [], at: new Date() });
        continue;
      }
      // Compute inventory match for each
      const scored = await Promise.all(
        nearby.map(async ({ provider, distance_km }) => {
          const inv = await this.getInventoryFor(provider.user_id, wantedIds);
          let availableCount = 0;
          for (const it of items) {
            const stock = inv[it.medicine_id] || 0;
            if (stock >= it.qty) availableCount += 1;
          }
          // Primary score: available_count * 100 - distance_km (so a closer pharm wins ties)
          const score = availableCount * 100 - distance_km;
          return { pharmacy_id: provider.user_id, distance_km, available_count: availableCount, total_requested: items.length, score, status: 'pending' as const, inventory: inv };
        }),
      );
      scored.sort((a, b) => b.score - a.score);
      candidates = scored;
      attempts.push({ radius_km: radius, candidates: scored.map(({ inventory, ...rest }) => rest), at: new Date() });
      // pick if any pharmacy can fulfill at least 1 item
      const best = scored[0];
      if (best && best.available_count > 0) {
        selected = { ...best, status: 'pending' as const };
        delete (selected as any).inventory;
        // assemble fulfilled vs missing using BEST pharmacy's inventory
        const inv = (best as any).inventory as Record<string, number>;
        const fulfilled: any[] = []; const missing: any[] = [];
        for (const it of items) {
          const stock = inv[it.medicine_id] || 0;
          if (stock >= it.qty) fulfilled.push(it);
          else missing.push({ ...it, available: stock });
        }
        return {
          ok: true,
          selected_pharmacy_id: best.pharmacy_id,
          radius_used: radius,
          fulfilled_items: fulfilled,
          missing_items: missing,
          candidates: scored.map(({ inventory, ...rest }) => rest),
          attempts,
          best_candidate: selected,
        };
      }
    }
    // Could not dispatch at all
    return {
      ok: false,
      selected_pharmacy_id: null,
      radius_used: radiusUsed,
      fulfilled_items: [],
      missing_items: items.map((i) => ({ ...i, available: 0 })),
      candidates,
      attempts,
      best_candidate: null,
    };
  }

  /** Find the next best pharmacy for the REMAINING items (used to split orders). */
  async dispatchSplit(origin: { lat: number; lng: number }, items: { medicine_id: string; qty: number }[], excludePharmacyIds: string[]) {
    const wantedIds = items.map((i) => i.medicine_id);
    for (const radius of this.RADIUS_LADDER) {
      const nearby = (await this.findNearbyPharmacies(origin, radius)).filter((n) => !excludePharmacyIds.includes(n.provider.user_id));
      if (nearby.length === 0) continue;
      const scored = await Promise.all(
        nearby.map(async ({ provider, distance_km }) => {
          const inv = await this.getInventoryFor(provider.user_id, wantedIds);
          let availableCount = 0;
          for (const it of items) {
            const stock = inv[it.medicine_id] || 0;
            if (stock >= it.qty) availableCount += 1;
          }
          return { pharmacy_id: provider.user_id, distance_km, available_count: availableCount, score: availableCount * 100 - distance_km, inventory: inv };
        }),
      );
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best && best.available_count > 0) {
        const inv = best.inventory;
        const fulfilled: any[] = []; const missing: any[] = [];
        for (const it of items) {
          const stock = inv[it.medicine_id] || 0;
          if (stock >= it.qty) fulfilled.push(it);
          else missing.push({ ...it, available: stock });
        }
        return { ok: true, selected_pharmacy_id: best.pharmacy_id, radius_used: radius, fulfilled_items: fulfilled, missing_items: missing };
      }
    }
    return { ok: false, selected_pharmacy_id: null, radius_used: 0, fulfilled_items: [], missing_items: items };
  }

  /** Decrement stock after a pharmacy accepts an order. */
  async deductStock(pharmacy_user_id: string, items: { medicine_id: string; qty: number }[]) {
    for (const it of items) {
      await this.invModel.updateOne(
        { pharmacy_id: pharmacy_user_id, medicine_id: it.medicine_id },
        { $inc: { stock_qty: -it.qty }, $set: { last_restocked_at: new Date() } },
      );
    }
  }
}
