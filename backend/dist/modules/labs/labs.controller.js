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
exports.LabsController = void 0;
const common_1 = require("@nestjs/common");
const labs_service_1 = require("./labs.service");
const auth_guard_1 = require("../../common/auth.guard");
let LabsController = class LabsController {
    constructor(svc) {
        this.svc = svc;
    }
    services(cat, q, ho, hv, hr, nr, lp) {
        return this.svc.list({
            category: cat,
            search: q,
            home_only: ho === '1' || hv === 'true' || hv === '1',
            highest_rated: hr === 'true' || hr === '1',
            nearest: nr === 'true' || nr === '1',
            lowest_price: lp === 'true' || lp === '1'
        });
    }
    packages() { return this.svc.list({ packages_only: true }); }
    categories() { return this.svc.categoryCounts(); }
    one(id) { return this.svc.getById(id); }
    book(body, user) { return this.svc.book(user, body); }
    mine(user) { return this.svc.mineFor(user); }
    oneBooking(id, user) { return this.svc.getBooking(id, user); }
    cancel(id, user) { return this.svc.cancel(id, user); }
    transition(id, body, user) {
        return this.svc.transition(id, body.state, user, body.note);
    }
    uploadDoc(id, body, user) {
        return this.svc.addDocument(id, user, body);
    }
    updateIns(id, body, user) {
        return this.svc.updateInsuranceApproval(id, body, user);
    }
    optInCash(id, serviceId, body, user) {
        return this.svc.optInCash(id, serviceId, body, user);
    }
    providerInbox(st, user) {
        return this.svc.listForProvider(user, st);
    }
    assignTech(id, body, user) {
        return this.svc.assignTechnician(id, user, body || {});
    }
    uploadReport(id, body, user) {
        return this.svc.uploadReport(id, user, body || {});
    }
    reschedule(id, body, user) {
        return this.svc.rescheduleBooking(id, user, body);
    }
    updateGps(id, body, user) {
        return this.svc.updateGps(id, user, body);
    }
    getTracking(id, user) {
        return this.svc.getTracking(id, user);
    }
    declareEmergency(id, body, user) {
        return this.svc.declareEmergency(id, user, body);
    }
    reassign(id, user) {
        return this.svc.reassign(id, user);
    }
    adminAll(q) {
        return this.svc.adminListAll({
            status: q.status,
            insurance_status: q.insurance_status,
            location_type: q.location_type,
            delayed_only: q.delayed_only,
            disputed_only: q.disputed_only,
            limit: q.limit ? parseInt(q.limit, 10) : undefined
        });
    }
    registerSample(u, b) {
        return this.svc.registerSample(u, b);
    }
    updateStage(u, id, b) {
        return this.svc.updateSampleStage(u, id, b.stage, b.notes);
    }
    listSamples(u) {
        return this.svc.listSamples(u);
    }
    createCatalog(u, b) {
        throw new common_1.ServiceUnavailableException('admin service catalog publication is unavailable pending versioned clinical, operations and finance approval workflow');
    }
    updateCatalog(u, id, b) {
        throw new common_1.ServiceUnavailableException('admin service catalog publication is unavailable pending versioned clinical, operations and finance approval workflow');
    }
    deleteCatalog(u, id) {
        throw new common_1.ServiceUnavailableException('admin service catalog retirement is unavailable pending dependency-aware approval and rollback workflow');
    }
    forceState(u, id, b) {
        return this.svc.adminForceState(u, id, b.state, b.note);
    }
    getPackageDetails(id) {
        return this.svc.getById(id);
    }
    compatibleProviders(testIds) {
        const ids = testIds ? testIds.split(',') : [];
        return this.svc.compatibleProviders(ids);
    }
};
exports.LabsController = LabsController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('services'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('home_only')),
    __param(3, (0, common_1.Query)('home_visit')),
    __param(4, (0, common_1.Query)('highest_rated')),
    __param(5, (0, common_1.Query)('nearest')),
    __param(6, (0, common_1.Query)('lowest_price')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "services", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "packages", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "categories", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('services/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('bookings/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('bookings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "oneBooking", null);
__decorate([
    (0, common_1.Post)('bookings/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/state'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)('bookings/:id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "uploadDoc", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/insurance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "updateIns", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/items/:serviceId/opt-in-cash'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('serviceId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "optInCash", null);
__decorate([
    (0, common_1.Get)('provider/inbox'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "providerInbox", null);
__decorate([
    (0, common_1.Post)('bookings/:id/assign-technician'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "assignTech", null);
__decorate([
    (0, common_1.Post)('bookings/:id/upload-report'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "uploadReport", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Post)('bookings/:id/gps'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "updateGps", null);
__decorate([
    (0, common_1.Get)('bookings/:id/tracking'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "getTracking", null);
__decorate([
    (0, common_1.Post)('bookings/:id/emergency'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "declareEmergency", null);
__decorate([
    (0, common_1.Post)('bookings/:id/reassign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "reassign", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "adminAll", null);
__decorate([
    (0, common_1.Post)('samples/register'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "registerSample", null);
__decorate([
    (0, common_1.Patch)('samples/:id/stage'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Get)('samples'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "listSamples", null);
__decorate([
    (0, common_1.Post)('admin/catalog'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "createCatalog", null);
__decorate([
    (0, common_1.Put)('admin/catalog/:id'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "updateCatalog", null);
__decorate([
    (0, common_1.Delete)('admin/catalog/:id'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "deleteCatalog", null);
__decorate([
    (0, common_1.Patch)('admin/bookings/:id/force-state'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "forceState", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('packages/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "getPackageDetails", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('compatible-providers'),
    __param(0, (0, common_1.Query)('testIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabsController.prototype, "compatibleProviders", null);
exports.LabsController = LabsController = __decorate([
    (0, common_1.Controller)('labs'),
    __metadata("design:paramtypes", [labs_service_1.LabsService])
], LabsController);
//# sourceMappingURL=labs.controller.js.map