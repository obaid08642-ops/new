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
exports.DispatchService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const enums_1 = require("../../common/enums");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const pharmacyinventory_repository_1 = require("./repositories/pharmacyinventory.repository");
let DispatchService = class DispatchService {
    constructor(providerModel, invModel, events) {
        this.providerModel = providerModel;
        this.invModel = invModel;
        this.events = events;
        this.logger = new common_1.Logger('Dispatch');
        this.RADIUS_LADDER = [3, 7, 10, 15];
    }
    haversine(a, b) {
        const R = 6371;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    async findNearbyPharmacies(origin, radius_km) {
        const all = await this.providerModel.find({ type: enums_1.ProviderType.PHARMACY, status: enums_1.ProviderStatus.ACTIVE, 'location.lat': { $exists: true } }, { _id: 0, __v: 0 });
        const withDist = all
            .map((p) => {
            const loc = p.location || {};
            if (!loc.lat || !loc.lng)
                return null;
            const d = this.haversine(origin, { lat: loc.lat, lng: loc.lng });
            return { provider: p, distance_km: +d.toFixed(2) };
        })
            .filter((x) => !!x && x.distance_km <= radius_km)
            .sort((a, b) => a.distance_km - b.distance_km);
        return withDist;
    }
    async getInventoryFor(pharmacy_user_id, medicine_ids) {
        const inv = await this.invModel.find({ pharmacy_id: pharmacy_user_id, medicine_id: { $in: medicine_ids }, is_available: true });
        const map = {};
        inv.forEach((i) => { map[i.medicine_id] = i.stock_qty; });
        return map;
    }
    async dispatch(origin, items) {
        const wantedIds = items.map((i) => i.medicine_id);
        const attempts = [];
        let selected = null;
        let radiusUsed = 0;
        let candidates = [];
        for (const radius of this.RADIUS_LADDER) {
            radiusUsed = radius;
            const nearby = await this.findNearbyPharmacies(origin, radius);
            if (nearby.length === 0) {
                attempts.push({ radius_km: radius, candidates: [], at: new Date() });
                continue;
            }
            const scored = await Promise.all(nearby.map(async ({ provider, distance_km }) => {
                const inv = await this.getInventoryFor(provider.user_id, wantedIds);
                let availableCount = 0;
                for (const it of items) {
                    const stock = inv[it.medicine_id] || 0;
                    if (stock >= it.qty)
                        availableCount += 1;
                }
                const score = availableCount * 100 - distance_km;
                return { pharmacy_id: provider.user_id, distance_km, available_count: availableCount, total_requested: items.length, score, status: 'pending', inventory: inv };
            }));
            scored.sort((a, b) => b.score - a.score);
            candidates = scored;
            attempts.push({ radius_km: radius, candidates: scored.map(({ inventory, ...rest }) => rest), at: new Date() });
            const best = scored[0];
            if (best && best.available_count > 0) {
                selected = { ...best, status: 'pending' };
                delete selected.inventory;
                const inv = best.inventory;
                const fulfilled = [];
                const missing = [];
                for (const it of items) {
                    const stock = inv[it.medicine_id] || 0;
                    if (stock >= it.qty)
                        fulfilled.push(it);
                    else
                        missing.push({ ...it, available: stock });
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
    async dispatchSplit(origin, items, excludePharmacyIds) {
        const wantedIds = items.map((i) => i.medicine_id);
        for (const radius of this.RADIUS_LADDER) {
            const nearby = (await this.findNearbyPharmacies(origin, radius)).filter((n) => !excludePharmacyIds.includes(n.provider.user_id));
            if (nearby.length === 0)
                continue;
            const scored = await Promise.all(nearby.map(async ({ provider, distance_km }) => {
                const inv = await this.getInventoryFor(provider.user_id, wantedIds);
                let availableCount = 0;
                for (const it of items) {
                    const stock = inv[it.medicine_id] || 0;
                    if (stock >= it.qty)
                        availableCount += 1;
                }
                return { pharmacy_id: provider.user_id, distance_km, available_count: availableCount, score: availableCount * 100 - distance_km, inventory: inv };
            }));
            scored.sort((a, b) => b.score - a.score);
            const best = scored[0];
            if (best && best.available_count > 0) {
                const inv = best.inventory;
                const fulfilled = [];
                const missing = [];
                for (const it of items) {
                    const stock = inv[it.medicine_id] || 0;
                    if (stock >= it.qty)
                        fulfilled.push(it);
                    else
                        missing.push({ ...it, available: stock });
                }
                return { ok: true, selected_pharmacy_id: best.pharmacy_id, radius_used: radius, fulfilled_items: fulfilled, missing_items: missing };
            }
        }
        return { ok: false, selected_pharmacy_id: null, radius_used: 0, fulfilled_items: [], missing_items: items };
    }
    async deductStock(pharmacy_user_id, items) {
        for (const it of items) {
            await this.invModel.updateOne({ pharmacy_id: pharmacy_user_id, medicine_id: it.medicine_id }, { $inc: { stock_qty: -it.qty }, $set: { last_restocked_at: new Date() } });
        }
    }
    async restoreStock(pharmacy_user_id, items) {
        if (!pharmacy_user_id || !Array.isArray(items))
            return;
        for (const it of items) {
            if (!it?.medicine_id || !(it.qty > 0))
                continue;
            await this.invModel.updateOne({ pharmacy_id: pharmacy_user_id, medicine_id: it.medicine_id }, { $inc: { stock_qty: it.qty }, $set: { last_restocked_at: new Date() } });
        }
    }
};
exports.DispatchService = DispatchService;
exports.DispatchService = DispatchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(1, (0, common_1.Inject)('PharmacyInventoryRepository')),
    __metadata("design:paramtypes", [providerprofile_repository_1.ProviderProfileRepository,
        pharmacyinventory_repository_1.PharmacyInventoryRepository,
        event_emitter_1.EventEmitter2])
], DispatchService);
//# sourceMappingURL=dispatch.service.js.map