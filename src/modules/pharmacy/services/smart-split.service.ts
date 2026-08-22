/**
 * Phase 2A — Smart Split Engine
 * Real allocation optimizer (greedy weighted set-cover).
 * Persists full explainability snapshot on the order's split_decision field.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { ProviderProfile } from '../../provider/schemas';
import { ProviderAvailability, ProviderAvailabilityStatus } from '../../provider/schemas/requests.schema';
import { ProviderScoreSnapshot } from '../../provider/schemas/capabilities.schema';
import { GeoEngineService } from '../../provider/services/geo-engine.service';
import { PharmacyAllocation, PharmacyAllocationState, AllocationItemAction, PharmacyOrder, PharmacyOrderState, OrderItemMatchStatus } from '../schemas/pharmacy.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { ProviderScoreSnapshotRepository } from "./repositories/providerscoresnapshot.repository";

const MAX_SPLITS = 4;
const REVIEW_TIMEOUT_MINUTES = 12;

// Composite weights (sum = 1.0)
const W = { coverage: 0.45, full: 0.20, distance: 0.15, price: 0.10, reliability: 0.10 };

function normalizeName(s: string): string {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class SmartSplitService {
  private logger = new Logger('SmartSplitEngine');
  constructor(
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderAvailabilityRepository') private avails: ProviderAvailabilityRepository,
    @Inject('ProviderScoreSnapshotRepository') private scores: ProviderScoreSnapshotRepository,
    private geo: GeoEngineService,
  ) {}

  /**
   * Run the Smart Split for a given order id. The order must be in READY_FOR_SPLIT state.
   * Idempotent on the order id — if allocations already exist they are first cleared.
   */
  async runForOrder(orderId: string): Promise<PharmacyOrder> {
    const order = await this.orders.findOne({ id: orderId });
    if (!order) throw new Error('order_not_found');
    if (![PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.ALLOCATING, PharmacyOrderState.PARTIALLY_ALLOCATED].includes(order.status)) {
      throw new Error(`order_not_splittable: ${order.status}`);
    }
    if (!order.items || order.items.length === 0) throw new Error('order_empty');

    // Mark in progress
    order.status = PharmacyOrderState.ALLOCATING;
    order.timeline.push({ ts: new Date(), event: 'split_started' });
    await order.save();

    // Clear previous allocations if any (idempotent)
    if (order.allocations?.length > 0) {
      await this.releasePreviousAllocations(order);
      order.allocations = [];
      order.splits_count = 0;
    }

    const patientGeo = order.delivery_address?.geo;
    // 1) Find candidate pharmacies
    const candidates = await this.findCandidatePharmacies();
    // 2) Build coverage matrix
    const matrix = await this.buildCoverageMatrix(candidates, order.items);
    // 3) Score each pharmacy
    const ranked = await this.scoreCandidates(candidates, matrix, order.items, patientGeo);
    // 4) Greedy set-cover
    const { rounds, allocationsPlan, uncovered } = this.greedyCover(ranked, order.items);

    // 5) Materialize allocations (atomic inventory decrement per item)
    const allocations: PharmacyAllocation[] = [];
    for (const plan of allocationsPlan) {
      const allocItems: any[] = [];
      let subtotal = 0;
      for (const pick of plan.items) {
        // Try atomic stock reservation
        const reserved = await this.reserveStock(plan.pharmacy_account_id, pick.inventory_id, pick.qty_to_offer);
        if (!reserved) {
          // Race condition — stock changed; mark item as unavailable in this allocation
          allocItems.push({
            id: uuidv4(), order_item_id: pick.order_item_id, action: AllocationItemAction.UNAVAILABLE,
            sku: pick.sku, name: pick.name, qty_requested: pick.qty_required, qty_offered: 0,
            notes: 'stock_unavailable_at_reservation',
          });
          continue;
        }
        const lineTotal = (pick.unit_price || 0) * pick.qty_to_offer;
        subtotal += lineTotal;
        allocItems.push({
          id: uuidv4(), order_item_id: pick.order_item_id,
          action: AllocationItemAction.AVAILABLE,
          inventory_id: pick.inventory_id, sku: pick.sku, name: pick.name,
          qty_requested: pick.qty_required, qty_offered: pick.qty_to_offer,
          unit_price: pick.unit_price,
          substitute_for_sku: pick.substitute_for_sku,
          notes: pick.notes,
          updated_at: new Date(),
        });
      }
      // Dynamic SLA: small ≤3 items → 18 min, medium 4-7 → 30 min, large >7 → 50 min
      const itemCount = allocItems.filter(i => i.action === AllocationItemAction.AVAILABLE).length;
      const prepMin = itemCount <= 3 ? 18 : itemCount <= 7 ? 30 : 50;
      const reviewExp = new Date(Date.now() + REVIEW_TIMEOUT_MINUTES * 60_000);
      const alloc = await this.allocs.create({
        id: uuidv4(),
        order_id: order.id,
        pharmacy_account_id: plan.pharmacy_account_id,
        status: PharmacyAllocationState.PENDING_REVIEW,
        items: allocItems,
        totals: { subtotal, delivery_fee: 0, total: subtotal, currency: 'SAR' },
        distance_km: plan.distance_km,
        estimated_preparation_minutes: prepMin,
        review_expires_at: reviewExp,
        match_breakdown: plan.breakdown,
        timeline: [{ ts: new Date(), event: 'created_by_split_engine', meta: { round: plan.round } }],
      });
      allocations.push(alloc);
    }

    // 6) Persist explainability + new state
    order.allocations = allocations.map(a => a.id);
    order.splits_count = allocations.length;
    order.split_strategy = allocations.length <= 1 ? 'single' : 'multi';
    order.split_decision = {
      ran_at: new Date(),
      total_candidates_considered: ranked.length,
      candidates_ranked: ranked.map(r => ({
        pharmacy_account_id: r.pharmacy_account_id,
        pharmacy_name: r.pharmacy_name,
        distance_km: r.distance_km,
        coverage_full: r.coverage_full,
        coverage_partial: r.coverage_partial,
        total_score: r.total_score,
        breakdown: r.breakdown,
        included: r.included,
        reason_excluded: r.reason_excluded,
      })),
      rounds,
      final_uncovered_items: uncovered,
      splits_count: allocations.length,
      notes: uncovered.length > 0 ? `${uncovered.length} item(s) could not be covered` : undefined,
    };
    if (uncovered.length === 0 && allocations.length > 0) {
      order.status = PharmacyOrderState.FULLY_ALLOCATED;
    } else if (allocations.length > 0) {
      order.status = PharmacyOrderState.PARTIALLY_ALLOCATED;
    } else {
      order.status = PharmacyOrderState.MANUAL_REVIEW;
    }
    if (allocations.length > MAX_SPLITS) {
      order.status = PharmacyOrderState.MANUAL_REVIEW;
      order.timeline.push({ ts: new Date(), event: 'escalated_max_splits_exceeded', meta: { splits: allocations.length } });
    }
    // Update item match_status
    for (const item of order.items) {
      const isAllocated = allocations.some(a => a.items.some(i => i.order_item_id === item.id && i.action !== AllocationItemAction.UNAVAILABLE));
      item.match_status = isAllocated ? OrderItemMatchStatus.MATCHED : OrderItemMatchStatus.UNRESOLVED;
    }
    order.markModified('items');
    order.markModified('split_decision');
    order.timeline.push({ ts: new Date(), event: 'split_completed', meta: { splits: allocations.length, uncovered: uncovered.length } });
    await order.save();
    this.logger.log(`split done order=${order.id} splits=${allocations.length} uncovered=${uncovered.length}`);
    return order;
  }

  // ============== INTERNAL ==============
  private async findCandidatePharmacies() {
    // Query authoritative ProviderAccount (where status lives) → then join profiles.
    // (ProviderProfile has no `status` field; Mongoose strict-mode strips it silently.)
    const accs = await (this.profiles as any).db.collection('provider_accounts').find({ provider_type: 'pharmacy', status: 'approved' }).project({ id: 1 }).toArray();
    if (!accs.length) return [];
    const ids = accs.map((a: any) => a.id);
    const profs = await this.profiles.find({ account_id: { $in: ids }, provider_type: 'pharmacy' }).lean();
    const avails = await this.avails.find({ provider_account_id: { $in: ids }, status: { $in: [ProviderAvailabilityStatus.ACCEPTING_ORDERS, ProviderAvailabilityStatus.ONLINE] } }).lean();
    const okIds = new Set(avails.map(a => a.provider_account_id));
    return profs.filter(p => okIds.has(p.account_id));
  }

  private async buildCoverageMatrix(pharmacies: any[], items: any[]) {
    if (!pharmacies.length || !items.length) return new Map();
    const ids = pharmacies.map(p => p.account_id);
    const allInv = await this.inv.find({ provider_account_id: { $in: ids }, available: true }).lean();
    const byPharm = new Map<string, any[]>();
    for (const inv of allInv) {
      if (!byPharm.has(inv.provider_account_id)) byPharm.set(inv.provider_account_id, []);
      byPharm.get(inv.provider_account_id)!.push(inv);
    }
    // For each (pharm, item) decide best inventory match
    const m = new Map<string, Map<string, any>>(); // pharm_id -> item_id -> coverage
    for (const p of pharmacies) {
      const invList = byPharm.get(p.account_id) || [];
      const itemMap = new Map();
      for (const item of items) {
        const cov = this.findBestMatch(invList, item);
        itemMap.set(item.id, cov);
      }
      m.set(p.account_id, itemMap);
    }
    return m;
  }

  private findBestMatch(invList: any[], item: any) {
    const wantedSku = (item.matched_sku || '').toString();
    const wantedName = normalizeName(item.name_ar || item.name_en || item.raw_name || '');
    const wantedGeneric = normalizeName(item.generic_name || '');
    let exact: any = null, generic: any = null, substitute: any = null;
    for (const i of invList) {
      if (i.stock <= 0) continue;
      if (wantedSku && i.sku && i.sku === wantedSku) { exact = i; break; }
      const nm = normalizeName(i.name_ar) || normalizeName(i.name_en);
      if (!exact && wantedName && nm && (nm === wantedName || nm.includes(wantedName) || wantedName.includes(nm))) { exact = i; continue; }
      if (!generic && wantedGeneric && i.generic_name && normalizeName(i.generic_name) === wantedGeneric) { generic = i; continue; }
      // Substitute check via substitute_skus pointing at the wanted SKU
      if (!substitute && wantedSku && i.substitute_skus?.includes(wantedSku)) { substitute = i; continue; }
    }
    const picked = exact || generic || substitute;
    if (!picked) return { available: false, partial: false, qty_available: 0 };
    const partial = picked.stock < item.qty;
    return {
      available: true,
      partial,
      qty_available: Math.min(picked.stock, item.qty),
      unit_price: picked.price,
      inventory_id: picked.id,
      sku: picked.sku,
      name: picked.name_ar || picked.name_en,
      substitute: !exact && !generic && !!substitute,
      substitute_for_sku: !exact && !generic && substitute ? wantedSku : undefined,
      match_type: exact ? 'exact' : generic ? 'generic' : 'substitute',
    };
  }

  private async scoreCandidates(pharmacies: any[], matrix: Map<string, Map<string, any>>, items: any[], patientGeo?: { lat: number; lng: number }) {
    const ranked: any[] = [];
    // Compute market avg price per item for price ratio
    const marketAvg = new Map<string, number>();
    for (const item of items) {
      const prices: number[] = [];
      for (const p of pharmacies) {
        const c = matrix.get(p.account_id)?.get(item.id);
        if (c?.available && c.unit_price) prices.push(c.unit_price);
      }
      if (prices.length) marketAvg.set(item.id, prices.reduce((s, x) => s + x, 0) / prices.length);
    }
    // Pre-fetch scores
    const scoreList = await this.scores.find({ provider_account_id: { $in: pharmacies.map(p => p.account_id) } }).lean();
    const scoreMap = new Map(scoreList.map(s => [s.provider_account_id, s.reliability_score || 0]));

    for (const p of pharmacies) {
      const im = matrix.get(p.account_id);
      let full = 0, partial = 0, totalAvail = 0, priceFit = 0, priceN = 0;
      for (const item of items) {
        const c = im?.get(item.id);
        if (!c?.available) continue;
        totalAvail++;
        if (c.partial) partial++; else full++;
        const mAvg = marketAvg.get(item.id);
        if (mAvg && c.unit_price) { priceFit += Math.min(1, mAvg / c.unit_price); priceN++; }
      }
      const coverage = totalAvail / Math.max(1, items.length);
      const fullPct = full / Math.max(1, items.length);
      const distKm = patientGeo && p.geo?.lat ? this.geo.distanceKm({ lat: p.geo.lat, lng: p.geo.lng }, patientGeo) : -1;
      const distScore = distKm < 0 ? 0.5 : Math.max(0, 1 - distKm / 50);
      const priceScore = priceN > 0 ? priceFit / priceN : 0.5;
      const reliability = Number(scoreMap.get(p.account_id) || 0) / 100;
      const total = coverage * W.coverage + fullPct * W.full + distScore * W.distance + priceScore * W.price + reliability * W.reliability;
      const included = totalAvail > 0;
      ranked.push({
        pharmacy_account_id: p.account_id,
        pharmacy_name: p.business_name || p.legal_name,
        distance_km: distKm < 0 ? undefined : Math.round(distKm * 10) / 10,
        coverage_full: full,
        coverage_partial: partial,
        total_score: Math.round(total * 1000) / 1000,
        breakdown: {
          coverage: Math.round(coverage * W.coverage * 1000) / 1000,
          full: Math.round(fullPct * W.full * 1000) / 1000,
          distance: Math.round(distScore * W.distance * 1000) / 1000,
          price: Math.round(priceScore * W.price * 1000) / 1000,
          reliability: Math.round(reliability * W.reliability * 1000) / 1000,
        },
        included,
        reason_excluded: included ? undefined : 'no_inventory_match',
        _cov: im || new Map(),   // attach coverage map for greedyCover access
      });
    }
    ranked.sort((a, b) => b.total_score - a.total_score);
    return ranked;
  }

  private greedyCover(ranked: any[], items: any[]) {
    const remaining = new Set(items.map(i => i.id));
    const itemById = new Map(items.map(i => [i.id, i]));
    const rounds: any[] = [];
    const allocationsPlan: any[] = [];
    const matrix: Map<string, Map<string, any>> = (ranked as any)._matrix || new Map();

    // Helper to fetch coverage from a candidate
    const getCov = (r: any, itemId: string) => r._cov?.get(itemId);

    let round = 0;
    while (remaining.size > 0 && round < MAX_SPLITS) {
      round++;
      // pick best candidate by (#items_in_remaining covered, full > partial, then total_score)
      let best: any = null;
      let bestCovered = 0;
      let bestFull = 0;
      for (const r of ranked) {
        if (allocationsPlan.find(p => p.pharmacy_account_id === r.pharmacy_account_id)) continue;
        if (!r.included) continue;
        let covered = 0, full = 0;
        for (const itemId of remaining) {
          const c = getCov(r, itemId);
          if (c?.available) { covered++; if (!c.partial) full++; }
        }
        if (covered === 0) continue;
        if (covered > bestCovered || (covered === bestCovered && full > bestFull) || (covered === bestCovered && full === bestFull && (!best || r.total_score > best.total_score))) {
          best = r; bestCovered = covered; bestFull = full;
        }
      }
      if (!best) break;
      const before = remaining.size;
      const assigned: string[] = [];
      const planItems: any[] = [];
      for (const itemId of [...remaining]) {
        const c = getCov(best, itemId);
        if (!c?.available) continue;
        const it = itemById.get(itemId);
        if (!it) continue;
        planItems.push({
          order_item_id: itemId,
          inventory_id: c.inventory_id,
          sku: c.sku,
          name: c.name,
          qty_required: it.qty,
          qty_to_offer: c.qty_available,
          unit_price: c.unit_price,
          substitute_for_sku: c.substitute_for_sku,
          notes: c.partial ? `partial_${c.qty_available}_of_${it.qty}` : undefined,
        });
        assigned.push(itemId);
        remaining.delete(itemId);
      }
      allocationsPlan.push({
        pharmacy_account_id: best.pharmacy_account_id,
        round, items: planItems,
        distance_km: best.distance_km,
        breakdown: { ...best.breakdown, total_score: best.total_score },
      });
      rounds.push({
        round, remaining_items_before: before,
        selected_pharmacy_account_id: best.pharmacy_account_id,
        items_assigned: assigned,
        items_remaining_after: remaining.size,
      });
    }
    return { rounds, allocationsPlan, uncovered: [...remaining] };
  }

  // Inject the matrix into each candidate for greedyCover ease of access
  async runWithMatrix(orderId: string) {
    // Wraps runForOrder but ensures matrix is attached to ranked.
    // We need to inject c per candidate. Patch: do it inline.
    return this.runForOrder(orderId);
  }

  private async reserveStock(pharmacy_account_id: string, inventory_id: string, qty: number): Promise<boolean> {
    if (!inventory_id || !qty || qty <= 0) return false;
    const res = await this.inv.findOneAndUpdate(
      { id: inventory_id, provider_account_id: pharmacy_account_id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true },
    );
    return !!res;
  }

  async releaseStockForAllocation(alloc: PharmacyAllocation) {
    for (const it of alloc.items || []) {
      if (it.action !== AllocationItemAction.AVAILABLE) continue;
      if (!it.inventory_id || !it.qty_offered) continue;
      await this.inv.updateOne(
        { id: it.inventory_id, provider_account_id: alloc.pharmacy_account_id },
        { $inc: { stock: it.qty_offered } },
      ).catch(() => null);
    }
  }

  private async releasePreviousAllocations(order: PharmacyOrder) {
    const existing = await this.allocs.find({ order_id: order.id });
    for (const a of existing) {
      if ([PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(a.status)) {
        await this.releaseStockForAllocation(a);
      }
    }
    await this.allocs.deleteMany({ order_id: order.id, status: { $in: [PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.REJECTED, PharmacyAllocationState.EXPIRED] } });
  }
}

// PATCH: attach matrix to candidates for greedyCover access.
// We override scoreCandidates above to put `_cov` on each candidate when calling.
// Achieved via a small post-processing in runForOrder that wires matrix to ranked.
// (Kept here for clarity.)
