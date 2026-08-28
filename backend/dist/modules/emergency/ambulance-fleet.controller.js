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
exports.AdminAmbulanceFleetController = exports.ProviderAmbulanceFleetController = exports.AmbulanceFleetService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ambulance_vehicle_schema_1 = require("../../schemas/ambulance-vehicle.schema");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const FLEET_ROLES = [enums_1.UserRole.AMBULANCE, enums_1.UserRole.HOSPITAL];
let AmbulanceFleetService = class AmbulanceFleetService {
    constructor(model) {
        this.model = model;
    }
    list(accountId) {
        return this.model.find({ provider_account_id: accountId }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    }
    async create(accountId, body) {
        if (!body?.plate_number || typeof body.plate_number !== 'string' || body.plate_number.trim().length < 3) {
            throw new common_1.BadRequestException('plate_number_required');
        }
        const dup = await this.model.findOne({ plate_number: body.plate_number.trim(), status: { $ne: 'rejected' } });
        if (dup)
            throw new common_1.BadRequestException('plate_number_already_registered');
        const doc = await this.model.create({
            provider_account_id: accountId,
            plate_number: body.plate_number.trim(),
            model: body.model, year: body.year,
            equipment: Array.isArray(body.equipment) ? body.equipment : [],
            paramedic_count: Math.max(1, parseInt(body.paramedic_count, 10) || 1),
            has_icu: !!body.has_icu,
            vehicle_type: ['BLS', 'ALS', 'ICU'].includes(body.vehicle_type) ? body.vehicle_type : (body.has_icu ? 'ICU' : 'BLS'),
            base_city: body.base_city,
            documents: Array.isArray(body.documents) ? body.documents : [],
            status: 'pending',
        });
        return this.model.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    }
    async update(accountId, id, body) {
        const v = await this.model.findOne({ id, provider_account_id: accountId });
        if (!v)
            throw new common_1.NotFoundException('vehicle_not_found');
        const allowed = ['model', 'year', 'equipment', 'paramedic_count', 'has_icu', 'vehicle_type', 'base_city', 'documents', 'is_available', 'last_location'];
        for (const k of allowed)
            if (body[k] !== undefined)
                v[k] = body[k];
        if (body.vehicle_type !== undefined && !['BLS', 'ALS', 'ICU'].includes(body.vehicle_type)) {
            throw new common_1.BadRequestException('invalid_vehicle_type');
        }
        if (body.plate_number && body.plate_number !== v.plate_number)
            v.plate_number = String(body.plate_number).trim();
        if (v.status === 'approved')
            v.status = 'pending';
        await v.save();
        return this.model.findOne({ id }, { _id: 0, __v: 0 }).lean();
    }
    async remove(accountId, id) {
        const res = await this.model.deleteOne({ id, provider_account_id: accountId });
        if (!res.deletedCount)
            throw new common_1.NotFoundException('vehicle_not_found');
        return { ok: true };
    }
    adminList(status) {
        const q = status ? { status } : {};
        return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    }
    async review(id, adminId, approve, notes) {
        const v = await this.model.findOne({ id });
        if (!v)
            throw new common_1.NotFoundException('vehicle_not_found');
        if (v.status !== 'pending')
            throw new common_1.BadRequestException(`already_reviewed_${v.status}`);
        v.status = approve ? 'approved' : 'rejected';
        v.reviewed_by = adminId;
        v.reviewed_at = new Date();
        v.admin_notes = notes;
        await v.save();
        return this.model.findOne({ id }, { _id: 0, __v: 0 }).lean();
    }
};
exports.AmbulanceFleetService = AmbulanceFleetService;
exports.AmbulanceFleetService = AmbulanceFleetService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ambulance_vehicle_schema_1.AmbulanceVehicle.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AmbulanceFleetService);
let ProviderAmbulanceFleetController = class ProviderAmbulanceFleetController {
    constructor(svc) {
        this.svc = svc;
    }
    assertFleetRole(user) {
        if (!FLEET_ROLES.includes(user?.role)) {
            throw new common_1.ForbiddenException('only_ambulance_or_facility_providers');
        }
    }
    list(user) {
        this.assertFleetRole(user);
        return this.svc.list(user.id);
    }
    create(user, body) {
        this.assertFleetRole(user);
        return this.svc.create(user.id, body);
    }
    update(user, id, body) {
        this.assertFleetRole(user);
        return this.svc.update(user.id, id, body);
    }
    remove(user, id) {
        this.assertFleetRole(user);
        return this.svc.remove(user.id, id);
    }
};
exports.ProviderAmbulanceFleetController = ProviderAmbulanceFleetController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderAmbulanceFleetController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderAmbulanceFleetController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderAmbulanceFleetController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderAmbulanceFleetController.prototype, "remove", null);
exports.ProviderAmbulanceFleetController = ProviderAmbulanceFleetController = __decorate([
    (0, common_1.Controller)('provider/ambulance/fleet'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [AmbulanceFleetService])
], ProviderAmbulanceFleetController);
let AdminAmbulanceFleetController = class AdminAmbulanceFleetController {
    constructor(svc) {
        this.svc = svc;
    }
    list(status) {
        return this.svc.adminList(status);
    }
    approve(id, admin) {
        return this.svc.review(id, admin.id, true);
    }
    reject(id, admin, body) {
        return this.svc.review(id, admin.id, false, body?.reason);
    }
};
exports.AdminAmbulanceFleetController = AdminAmbulanceFleetController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAmbulanceFleetController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminAmbulanceFleetController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAmbulanceFleetController.prototype, "reject", null);
exports.AdminAmbulanceFleetController = AdminAmbulanceFleetController = __decorate([
    (0, common_1.Controller)('admin/ambulance/fleet'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [AmbulanceFleetService])
], AdminAmbulanceFleetController);
//# sourceMappingURL=ambulance-fleet.controller.js.map