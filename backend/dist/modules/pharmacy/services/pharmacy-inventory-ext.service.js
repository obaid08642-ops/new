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
exports.PharmacyInventoryExtService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const pharmacylowstockalert_repository_1 = require("./repositories/pharmacylowstockalert.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(u) { if (!u || !(0, enums_1.isProviderRole)(u.role))
    throw new common_1.ForbiddenException('provider_scope_required'); }
let PharmacyInventoryExtService = class PharmacyInventoryExtService {
    constructor(inv, alerts) {
        this.inv = inv;
        this.alerts = alerts;
    }
    async search(user, q, barcode) {
        assertProvider(user);
        const filter = { provider_account_id: user.id };
        if (barcode)
            filter.barcode = barcode;
        if (q && q.length >= 2) {
            filter.$or = [
                { name_ar: { $regex: q, $options: 'i' } },
                { name_en: { $regex: q, $options: 'i' } },
                { sku: { $regex: q, $options: 'i' } },
                { generic_name: { $regex: q, $options: 'i' } },
            ];
        }
        return this.inv.find(filter, { _id: 0, __v: 0 }).sort({ name_ar: 1 }).limit(50).lean();
    }
    async restock(user, id, qty) {
        assertProvider(user);
        if (!qty || qty <= 0)
            throw new common_1.ForbiddenException('positive_qty_required');
        const updated = await this.inv.findOneAndUpdate({ id, provider_account_id: user.id }, { $inc: { stock: qty }, $set: { last_restocked_at: new Date() } }, { new: true });
        if (!updated)
            throw new common_1.NotFoundException('inventory_not_found');
        if (updated.min_stock_alert <= 0 || updated.stock > updated.min_stock_alert) {
            await this.alerts.updateMany({ inventory_item_id: id, status: 'open' }, { $set: { status: 'restocked', resolved_at: new Date() } });
        }
        return updated.toObject();
    }
    async listLowStockAlerts(user) {
        assertProvider(user);
        await this.refreshAlerts(user.id);
        return this.alerts.find({ pharmacy_account_id: user.id, status: { $in: ['open', 'acknowledged'] } }, { _id: 0, __v: 0 }).sort({ raised_at: -1 }).lean();
    }
    async acknowledgeAlert(user, id) {
        assertProvider(user);
        const a = await this.alerts.findOneAndUpdate({ id, pharmacy_account_id: user.id, status: 'open' }, { $set: { status: 'acknowledged' } }, { new: true });
        if (!a)
            throw new common_1.NotFoundException();
        return a.toObject();
    }
    async refreshAlerts(pharmacyId) {
        const at = await this.inv.find({ provider_account_id: pharmacyId, min_stock_alert: { $gt: 0 } }).lean();
        for (const item of at) {
            if (item.stock <= (item.min_stock_alert || 0)) {
                const existing = await this.alerts.findOne({ pharmacy_account_id: pharmacyId, inventory_item_id: item.id, status: { $in: ['open', 'acknowledged'] } });
                if (!existing) {
                    await this.alerts.create({
                        id: (0, uuid_1.v4)(),
                        pharmacy_account_id: pharmacyId,
                        inventory_item_id: item.id,
                        sku: item.sku,
                        name: item.name_ar || item.name_en || item.sku,
                        current_stock: item.stock,
                        threshold: item.min_stock_alert || 0,
                        status: 'open',
                        raised_at: new Date(),
                    });
                }
                else if (existing.current_stock !== item.stock) {
                    existing.current_stock = item.stock;
                    await existing.save();
                }
            }
        }
    }
};
exports.PharmacyInventoryExtService = PharmacyInventoryExtService;
exports.PharmacyInventoryExtService = PharmacyInventoryExtService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(1, (0, common_1.Inject)('PharmacyLowStockAlertRepository')),
    __metadata("design:paramtypes", [pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        pharmacylowstockalert_repository_1.PharmacyLowStockAlertRepository])
], PharmacyInventoryExtService);
//# sourceMappingURL=pharmacy-inventory-ext.service.js.map