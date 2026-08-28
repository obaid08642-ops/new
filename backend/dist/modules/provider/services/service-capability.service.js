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
exports.ServiceCapabilityService = void 0;
const common_1 = require("@nestjs/common");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const labtestcatalogitem_repository_1 = require("./repositories/labtestcatalogitem.repository");
const radiologyservicecatalogitem_repository_1 = require("./repositories/radiologyservicecatalogitem.repository");
const doctorsessiontype_repository_1 = require("./repositories/doctorsessiontype.repository");
const homecareservicecatalogitem_repository_1 = require("./repositories/homecareservicecatalogitem.repository");
const providerdeliveryzone_repository_1 = require("./repositories/providerdeliveryzone.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
let ServiceCapabilityService = class ServiceCapabilityService {
    constructor(pharma, lab, rad, doc, hc, zones) {
        this.pharma = pharma;
        this.lab = lab;
        this.rad = rad;
        this.doc = doc;
        this.hc = hc;
        this.zones = zones;
    }
    async listPharmacy(user) {
        assertProvider(user);
        return this.pharma.find({ provider_account_id: user.id }).sort({ name_ar: 1 }).lean();
    }
    async upsertPharmacy(user, body) {
        assertProvider(user);
        if (!body?.sku || !body?.name_ar)
            throw new common_1.BadRequestException('sku and name_ar are required');
        const filter = { provider_account_id: user.id, sku: body.sku };
        const update = { ...body, provider_account_id: user.id };
        const r = await this.pharma.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
        return r.toObject();
    }
    async deletePharmacy(user, id) {
        assertProvider(user);
        const r = await this.pharma.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async listLab(user) {
        assertProvider(user);
        return this.lab.find({ provider_account_id: user.id }).sort({ name_ar: 1 }).lean();
    }
    async upsertLab(user, body) {
        assertProvider(user);
        if (!body?.code || !body?.name_ar)
            throw new common_1.BadRequestException('code and name_ar are required');
        const r = await this.lab.findOneAndUpdate({ provider_account_id: user.id, code: body.code }, { ...body, provider_account_id: user.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return r.toObject();
    }
    async deleteLab(user, id) {
        assertProvider(user);
        const r = await this.lab.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async listRadiology(user) {
        assertProvider(user);
        return this.rad.find({ provider_account_id: user.id }).sort({ scan_type: 1 }).lean();
    }
    async upsertRadiology(user, body) {
        assertProvider(user);
        if (!body?.scan_type || !body?.body_part)
            throw new common_1.BadRequestException('scan_type and body_part are required');
        const r = await this.rad.findOneAndUpdate({ provider_account_id: user.id, scan_type: body.scan_type, body_part: body.body_part }, { ...body, provider_account_id: user.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return r.toObject();
    }
    async deleteRadiology(user, id) {
        assertProvider(user);
        const r = await this.rad.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async listDoctorSessions(user) {
        assertProvider(user);
        return this.doc.find({ provider_account_id: user.id }).sort({ specialty: 1 }).lean();
    }
    async upsertDoctorSession(user, body) {
        assertProvider(user);
        if (!body?.consultation_type || !body?.specialty)
            throw new common_1.BadRequestException('consultation_type and specialty are required');
        const r = await this.doc.findOneAndUpdate({ provider_account_id: user.id, consultation_type: body.consultation_type, specialty: body.specialty }, { ...body, provider_account_id: user.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return r.toObject();
    }
    async deleteDoctorSession(user, id) {
        assertProvider(user);
        const r = await this.doc.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async listHomeCare(user) {
        assertProvider(user);
        return this.hc.find({ provider_account_id: user.id }).sort({ service_type: 1 }).lean();
    }
    async upsertHomeCare(user, body) {
        assertProvider(user);
        if (!body?.service_type)
            throw new common_1.BadRequestException('service_type is required');
        const r = await this.hc.findOneAndUpdate({ provider_account_id: user.id, service_type: body.service_type }, { ...body, provider_account_id: user.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return r.toObject();
    }
    async deleteHomeCare(user, id) {
        assertProvider(user);
        const r = await this.hc.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async listZones(user) {
        assertProvider(user);
        return this.zones.find({ provider_account_id: user.id }).lean();
    }
    async upsertZone(user, body) {
        assertProvider(user);
        if (!body?.name)
            throw new common_1.BadRequestException('name is required');
        const shape = body.shape || 'circle';
        if (shape === 'circle' && (!body.center || !body.radius_km))
            throw new common_1.BadRequestException('circle zone requires center and radius_km');
        if (shape === 'polygon' && (!Array.isArray(body.polygon) || body.polygon.length < 3))
            throw new common_1.BadRequestException('polygon zone requires at least 3 points');
        if (body.id) {
            const updated = await this.zones.findOneAndUpdate({ id: body.id, provider_account_id: user.id }, { ...body, provider_account_id: user.id }, { new: true });
            if (!updated)
                throw new common_1.NotFoundException();
            return updated.toObject();
        }
        const z = await this.zones.create({ ...body, provider_account_id: user.id });
        return z.toObject();
    }
    async deleteZone(user, id) {
        assertProvider(user);
        const r = await this.zones.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async hasCapabilityFor(provider_account_id, requestType, payload) {
        if (requestType === 'pharmacy') {
            const skus = (payload?.items || []).map((it) => it.sku || it.name).filter(Boolean);
            if (skus.length === 0) {
                const any = await this.pharma.exists({ provider_account_id, available: true });
                return { ok: !!any };
            }
            const items = await this.pharma.find({ provider_account_id, available: true, $or: [{ sku: { $in: skus } }, { name_ar: { $in: skus } }] }).lean();
            const total = items.reduce((s, it) => s + (it.price || 0), 0);
            return { ok: items.length > 0, matched_items: items, price: total };
        }
        if (requestType === 'lab') {
            const codes = (payload?.tests || []).map((t) => t.code || t.name).filter(Boolean);
            if (codes.length === 0)
                return { ok: !!(await this.lab.exists({ provider_account_id, available: true })) };
            const items = await this.lab.find({ provider_account_id, available: true, $or: [{ code: { $in: codes } }, { name_ar: { $in: codes } }] }).lean();
            const home_required = !!payload?.home_collection;
            const eligible = home_required ? items.filter((i) => i.home_collection_supported) : items;
            const total = eligible.reduce((s, it) => s + (it.price || 0), 0);
            return { ok: eligible.length >= codes.length * 0.5, matched_items: eligible, price: total };
        }
        if (requestType === 'radiology') {
            const scan = payload?.scan_type;
            const part = payload?.body_part;
            if (!scan)
                return { ok: !!(await this.rad.exists({ provider_account_id, available: true })) };
            const item = await this.rad.findOne({ provider_account_id, available: true, scan_type: scan, ...(part ? { body_part: part } : {}) }).lean();
            return { ok: !!item, matched_items: item ? [item] : [], price: item?.price || 0 };
        }
        if (requestType === 'doctor') {
            const type = payload?.consultation_type;
            const filter = { provider_account_id, available: true };
            if (type)
                filter.consultation_type = type;
            const item = await this.doc.findOne(filter).lean();
            return { ok: !!item, matched_items: item ? [item] : [], price: item?.price || 0 };
        }
        if (requestType === 'home_care') {
            const stype = payload?.service_type;
            const filter = { provider_account_id, available: true };
            if (stype)
                filter.service_type = stype;
            const item = await this.hc.findOne(filter).lean();
            const hours = payload?.duration_hours || item?.min_hours || 1;
            const price = (item?.hourly_price || 0) * hours;
            return { ok: !!item, matched_items: item ? [item] : [], price };
        }
        return { ok: false };
    }
    async getZonesFor(provider_account_id) {
        return this.zones.find({ provider_account_id, active: true }).lean();
    }
};
exports.ServiceCapabilityService = ServiceCapabilityService;
exports.ServiceCapabilityService = ServiceCapabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(1, (0, common_1.Inject)('LabTestCatalogItemRepository')),
    __param(2, (0, common_1.Inject)('RadiologyServiceCatalogItemRepository')),
    __param(3, (0, common_1.Inject)('DoctorSessionTypeRepository')),
    __param(4, (0, common_1.Inject)('HomeCareServiceCatalogItemRepository')),
    __param(5, (0, common_1.Inject)('ProviderDeliveryZoneRepository')),
    __metadata("design:paramtypes", [pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        labtestcatalogitem_repository_1.LabTestCatalogItemRepository,
        radiologyservicecatalogitem_repository_1.RadiologyServiceCatalogItemRepository,
        doctorsessiontype_repository_1.DoctorSessionTypeRepository,
        homecareservicecatalogitem_repository_1.HomeCareServiceCatalogItemRepository,
        providerdeliveryzone_repository_1.ProviderDeliveryZoneRepository])
], ServiceCapabilityService);
//# sourceMappingURL=service-capability.service.js.map