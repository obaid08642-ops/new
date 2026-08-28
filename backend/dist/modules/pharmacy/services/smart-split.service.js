"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartSplitService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const requests_schema_1 = require("../../provider/schemas/requests.schema");
const geo_engine_service_1 = require("../../provider/services/geo-engine.service");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyallocation_repository_1 = require("./repositories/pharmacyallocation.repository");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
const providerscoresnapshot_repository_1 = require("./repositories/providerscoresnapshot.repository");
const MAX_SPLITS = 4;
const REVIEW_TIMEOUT_MINUTES = 12;
const W = { coverage: 0.45, full: 0.20, distance: 0.15, price: 0.10, reliability: 0.10 };
function normalizeName(s) {
    return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}
let SmartSplitService = class SmartSplitService {
    constructor(orders, allocs, inv, profiles, avails, scores, geo) {
        this.orders = orders;
        this.allocs = allocs;
        this.inv = inv;
        this.profiles = profiles;
        this.avails = avails;
        this.scores = scores;
        this.geo = geo;
        this.logger = new common_1.Logger('SmartSplitEngine');
    }
    async runForOrder(orderId) {
        const order = await this.orders.findOne({ id: orderId });
        if (!order)
            throw new Error('order_not_found');
        if (![pharmacy_schema_1.PharmacyOrderState.READY_FOR_SPLIT, pharmacy_schema_1.PharmacyOrderState.ALLOCATING, pharmacy_schema_1.PharmacyOrderState.PARTIALLY_ALLOCATED].includes(order.status)) {
            throw new Error(`order_not_splittable: ${order.status}`);
        }
        if (!order.items || order.items.length === 0)
            throw new Error('order_empty');
        order.status = pharmacy_schema_1.PharmacyOrderState.ALLOCATING;
        order.timeline.push({ ts: new Date(), event: 'split_started' });
        await order.save();
        if (order.allocations?.length > 0) {
            await this.releasePreviousAllocations(order);
            order.allocations = [];
            order.splits_count = 0;
        }
        const patientGeo = order.delivery_address?.geo;
        const candidates = await this.findCandidatePharmacies();
        const matrix = await this.buildCoverageMatrix(candidates, order.items);
        const ranked = await this.scoreCandidates(candidates, matrix, order.items, patientGeo);
        const { rounds, allocationsPlan, uncovered } = this.greedyCover(ranked, order.items);
        const allocations = [];
        for (const plan of allocationsPlan) {
            const allocItems = [];
            let subtotal = 0;
            for (const pick of plan.items) {
                const reserved = await this.reserveStock(plan.pharmacy_account_id, pick.inventory_id, pick.qty_to_offer);
                if (!reserved) {
                    allocItems.push({
                        id: (0, uuid_1.v4)(), order_item_id: pick.order_item_id, action: pharmacy_schema_1.AllocationItemAction.UNAVAILABLE,
                        sku: pick.sku, name: pick.name, qty_requested: pick.qty_required, qty_offered: 0,
                        notes: 'stock_unavailable_at_reservation',
                    });
                    continue;
                }
                const lineTotal = (pick.unit_price || 0) * pick.qty_to_offer;
                subtotal += lineTotal;
                allocItems.push({
                    id: (0, uuid_1.v4)(), order_item_id: pick.order_item_id,
                    action: pharmacy_schema_1.AllocationItemAction.AVAILABLE,
                    inventory_id: pick.inventory_id, sku: pick.sku, name: pick.name,
                    qty_requested: pick.qty_required, qty_offered: pick.qty_to_offer,
                    unit_price: pick.unit_price,
                    substitute_for_sku: pick.substitute_for_sku,
                    notes: pick.notes,
                    updated_at: new Date(),
                });
            }
            const itemCount = allocItems.filter(i => i.action === pharmacy_schema_1.AllocationItemAction.AVAILABLE).length;
            const prepMin = itemCount <= 3 ? 18 : itemCount <= 7 ? 30 : 50;
            const reviewExp = new Date(Date.now() + REVIEW_TIMEOUT_MINUTES * 60_000);
            const alloc = await this.allocs.create({
                id: (0, uuid_1.v4)(),
                order_id: order.id,
                pharmacy_account_id: plan.pharmacy_account_id,
                status: pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW,
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
            order.status = pharmacy_schema_1.PharmacyOrderState.FULLY_ALLOCATED;
        }
        else if (allocations.length > 0) {
            order.status = pharmacy_schema_1.PharmacyOrderState.PARTIALLY_ALLOCATED;
        }
        else {
            order.status = pharmacy_schema_1.PharmacyOrderState.MANUAL_REVIEW;
        }
        if (allocations.length > MAX_SPLITS) {
            order.status = pharmacy_schema_1.PharmacyOrderState.MANUAL_REVIEW;
            order.timeline.push({ ts: new Date(), event: 'escalated_max_splits_exceeded', meta: { splits: allocations.length } });
        }
        for (const item of order.items) {
            const isAllocated = allocations.some(a => a.items.some(i => i.order_item_id === item.id && i.action !== pharmacy_schema_1.AllocationItemAction.UNAVAILABLE));
            item.match_status = isAllocated ? pharmacy_schema_1.OrderItemMatchStatus.MATCHED : pharmacy_schema_1.OrderItemMatchStatus.UNRESOLVED;
        }
        order.markModified('items');
        order.markModified('split_decision');
        order.timeline.push({ ts: new Date(), event: 'split_completed', meta: { splits: allocations.length, uncovered: uncovered.length } });
        await order.save();
        this.logger.log(`split done order=${order.id} splits=${allocations.length} uncovered=${uncovered.length}`);
        return order;
    }
    async findCandidatePharmacies() {
        const accs = await this.profiles.db.collection('provider_accounts').find({ provider_type: 'pharmacy', status: 'approved' }).project({ id: 1 }).toArray();
        if (!accs.length)
            return [];
        const ids = accs.map((a) => a.id);
        const profs = await this.profiles.find({ account_id: { $in: ids }, provider_type: 'pharmacy' }).lean();
        const avails = await this.avails.find({ provider_account_id: { $in: ids }, status: { $in: [requests_schema_1.ProviderAvailabilityStatus.ACCEPTING_ORDERS, requests_schema_1.ProviderAvailabilityStatus.ONLINE] } }).lean();
        const okIds = new Set(avails.map(a => a.provider_account_id));
        return profs.filter(p => okIds.has(p.account_id));
    }
    async buildCoverageMatrix(pharmacies, items) {
        if (!pharmacies.length || !items.length)
            return new Map();
        const ids = pharmacies.map(p => p.account_id);
        const allInv = await this.inv.find({ provider_account_id: { $in: ids }, available: true }).lean();
        const byPharm = new Map();
        for (const inv of allInv) {
            if (!byPharm.has(inv.provider_account_id))
                byPharm.set(inv.provider_account_id, []);
            byPharm.get(inv.provider_account_id).push(inv);
        }
        const m = new Map();
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
    findBestMatch(invList, item) {
        const wantedSku = (item.matched_sku || '').toString();
        const wantedName = normalizeName(item.name_ar || item.name_en || item.raw_name || '');
        const wantedGeneric = normalizeName(item.generic_name || '');
        let exact = null, generic = null, substitute = null;
        for (const i of invList) {
            if (i.stock <= 0)
                continue;
            if (wantedSku && i.sku && i.sku === wantedSku) {
                exact = i;
                break;
            }
            const nm = normalizeName(i.name_ar) || normalizeName(i.name_en);
            if (!exact && wantedName && nm && (nm === wantedName || nm.includes(wantedName) || wantedName.includes(nm))) {
                exact = i;
                continue;
            }
            if (!generic && wantedGeneric && i.generic_name && normalizeName(i.generic_name) === wantedGeneric) {
                generic = i;
                continue;
            }
            if (!substitute && wantedSku && i.substitute_skus?.includes(wantedSku)) {
                substitute = i;
                continue;
            }
        }
        const picked = exact || generic || substitute;
        if (!picked)
            return { available: false, partial: false, qty_available: 0 };
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
    async scoreCandidates(pharmacies, matrix, items, patientGeo) {
        const ranked = [];
        const marketAvg = new Map();
        for (const item of items) {
            const prices = [];
            for (const p of pharmacies) {
                const c = matrix.get(p.account_id)?.get(item.id);
                if (c?.available && c.unit_price)
                    prices.push(c.unit_price);
            }
            if (prices.length)
                marketAvg.set(item.id, prices.reduce((s, x) => s + x, 0) / prices.length);
        }
        const scoreList = await this.scores.find({ provider_account_id: { $in: pharmacies.map(p => p.account_id) } }).lean();
        const scoreMap = new Map(scoreList.map(s => [s.provider_account_id, s.reliability_score || 0]));
        for (const p of pharmacies) {
            const im = matrix.get(p.account_id);
            let full = 0, partial = 0, totalAvail = 0, priceFit = 0, priceN = 0;
            for (const item of items) {
                const c = im?.get(item.id);
                if (!c?.available)
                    continue;
                totalAvail++;
                if (c.partial)
                    partial++;
                else
                    full++;
                const mAvg = marketAvg.get(item.id);
                if (mAvg && c.unit_price) {
                    priceFit += Math.min(1, mAvg / c.unit_price);
                    priceN++;
                }
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
                _cov: im || new Map(),
            });
        }
        ranked.sort((a, b) => b.total_score - a.total_score);
        return ranked;
    }
    greedyCover(ranked, items) {
        const remaining = new Set(items.map(i => i.id));
        const itemById = new Map(items.map(i => [i.id, i]));
        const rounds = [];
        const allocationsPlan = [];
        const matrix = ranked._matrix || new Map();
        const getCov = (r, itemId) => r._cov?.get(itemId);
        let round = 0;
        while (remaining.size > 0 && round < MAX_SPLITS) {
            round++;
            let best = null;
            let bestCovered = 0;
            let bestFull = 0;
            for (const r of ranked) {
                if (allocationsPlan.find(p => p.pharmacy_account_id === r.pharmacy_account_id))
                    continue;
                if (!r.included)
                    continue;
                let covered = 0, full = 0;
                for (const itemId of remaining) {
                    const c = getCov(r, itemId);
                    if (c?.available) {
                        covered++;
                        if (!c.partial)
                            full++;
                    }
                }
                if (covered === 0)
                    continue;
                if (covered > bestCovered || (covered === bestCovered && full > bestFull) || (covered === bestCovered && full === bestFull && (!best || r.total_score > best.total_score))) {
                    best = r;
                    bestCovered = covered;
                    bestFull = full;
                }
            }
            if (!best)
                break;
            const before = remaining.size;
            const assigned = [];
            const planItems = [];
            for (const itemId of [...remaining]) {
                const c = getCov(best, itemId);
                if (!c?.available)
                    continue;
                const it = itemById.get(itemId);
                if (!it)
                    continue;
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
    async runWithMatrix(orderId) {
        return this.runForOrder(orderId);
    }
    async reserveStock(pharmacy_account_id, inventory_id, qty) {
        if (!inventory_id || !qty || qty <= 0)
            return false;
        const res = await this.inv.findOneAndUpdate({ id: inventory_id, provider_account_id: pharmacy_account_id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: true });
        return !!res;
    }
    async releaseStockForAllocation(alloc) {
        for (const it of alloc.items || []) {
            if (it.action !== pharmacy_schema_1.AllocationItemAction.AVAILABLE)
                continue;
            if (!it.inventory_id || !it.qty_offered)
                continue;
            await this.inv.updateOne({ id: it.inventory_id, provider_account_id: alloc.pharmacy_account_id }, { $inc: { stock: it.qty_offered } }).catch(() => null);
        }
    }
    async releasePreviousAllocations(order) {
        const existing = await this.allocs.find({ order_id: order.id });
        for (const a of existing) {
            if ([pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW, pharmacy_schema_1.PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(a.status)) {
                await this.releaseStockForAllocation(a);
            }
        }
        await this.allocs.deleteMany({ order_id: order.id, status: { $in: [pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW, pharmacy_schema_1.PharmacyAllocationState.REJECTED, pharmacy_schema_1.PharmacyAllocationState.EXPIRED] } });
    }
};
exports.SmartSplitService = SmartSplitService;
exports.SmartSplitService = SmartSplitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(1, (0, common_1.Inject)('PharmacyAllocationRepository')),
    __param(2, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(3, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(4, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __param(5, (0, common_1.Inject)('ProviderScoreSnapshotRepository')),
    __metadata("design:paramtypes", [pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyallocation_repository_1.PharmacyAllocationRepository,
        pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository,
        providerscoresnapshot_repository_1.ProviderScoreSnapshotRepository,
        geo_engine_service_1.GeoEngineService])
], SmartSplitService);
//# sourceMappingURL=smart-split.service.js.map