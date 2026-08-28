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
exports.RadiologyController = void 0;
const common_1 = require("@nestjs/common");
const radiology_service_1 = require("./radiology.service");
const auth_guard_1 = require("../../common/auth.guard");
let RadiologyController = class RadiologyController {
    constructor(svc) {
        this.svc = svc;
    }
    services(m, bp, q, ho, hv, hr, nr, lp) {
        return this.svc.list({
            modality: m,
            body_part: bp,
            search: q,
            home_only: ho === '1' || hv === 'true' || hv === '1',
            highest_rated: hr === 'true' || hr === '1',
            nearest: nr === 'true' || nr === '1',
            lowest_price: lp === 'true' || lp === '1'
        });
    }
    modalities() { return this.svc.modalities(); }
    one(id) { return this.svc.getById(id); }
    book(body, user) { return this.svc.book(user, body); }
    mine(user) { return this.svc.mineFor(user); }
    oneBooking(id, user) { return this.svc.getBooking(id, user); }
    cancel(id, user) { return this.svc.cancel(id, user); }
    transition(id, body, user) {
        return this.svc.transition(id, body.state, user, body.note);
    }
    publish(id, body, user) {
        return this.svc.publishReport(id, body, user);
    }
    myReports(user) { return this.svc.myReports(user); }
    uploadDoc(id, body, user) {
        return this.svc.addDocument(id, user, body);
    }
    updateIns(id, body, user) {
        return this.svc.updateInsuranceStatus(id, user, body.status, body.reason);
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
    checkin(id, user) {
        return this.svc.checkin(id, user);
    }
    startScan(id, user) {
        return this.svc.startScan(id, user);
    }
    abortScan(id, body, user) {
        return this.svc.abortScan(id, user, body.reason);
    }
    submitForReview(id, body, user) {
        return this.svc.submitReportForReview(id, user, body);
    }
    approveReport(id, user) {
        return this.svc.approveReport(id, user);
    }
    insuranceApproval(id, body, user) {
        return this.svc.processInsuranceApproval(id, user, body);
    }
    reschedule(id, body, user) {
        return this.svc.rescheduleBooking(id, user, body);
    }
    tracking(id, user) {
        return this.svc.getTracking(id, user);
    }
    catalogDeltaRequest(body, user) {
        return this.svc.catalogDeltaRequest(user, body);
    }
    confirmPrep(id, user) {
        return this.svc.confirmPreparation(id, user);
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
};
exports.RadiologyController = RadiologyController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('services'),
    __param(0, (0, common_1.Query)('modality')),
    __param(1, (0, common_1.Query)('body_part')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('home_only')),
    __param(4, (0, common_1.Query)('home_visit')),
    __param(5, (0, common_1.Query)('highest_rated')),
    __param(6, (0, common_1.Query)('nearest')),
    __param(7, (0, common_1.Query)('lowest_price')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "services", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('modalities'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "modalities", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('services/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "one", null);
__decorate([
    (0, common_1.Post)('bookings'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('bookings/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('bookings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "oneBooking", null);
__decorate([
    (0, common_1.Post)('bookings/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/state'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)('bookings/:id/publish-report'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "publish", null);
__decorate([
    (0, common_1.Get)('reports/mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "myReports", null);
__decorate([
    (0, common_1.Post)('bookings/:id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "uploadDoc", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/insurance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "updateIns", null);
__decorate([
    (0, common_1.Get)('provider/inbox'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "providerInbox", null);
__decorate([
    (0, common_1.Post)('bookings/:id/assign-technician'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "assignTech", null);
__decorate([
    (0, common_1.Post)('bookings/:id/upload-report'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "uploadReport", null);
__decorate([
    (0, common_1.Post)('bookings/:id/checkin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "checkin", null);
__decorate([
    (0, common_1.Post)('bookings/:id/start-scan'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "startScan", null);
__decorate([
    (0, common_1.Post)('bookings/:id/abort'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "abortScan", null);
__decorate([
    (0, common_1.Post)('bookings/:id/submit-report-for-review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Post)('bookings/:id/approve-report'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "approveReport", null);
__decorate([
    (0, common_1.Post)('bookings/:id/insurance-approval'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "insuranceApproval", null);
__decorate([
    (0, common_1.Patch)('bookings/:id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Get)('bookings/:id/tracking'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "tracking", null);
__decorate([
    (0, common_1.Post)('catalog/delta-request'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "catalogDeltaRequest", null);
__decorate([
    (0, common_1.Post)('bookings/:id/confirm-preparation'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "confirmPrep", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "adminAll", null);
__decorate([
    (0, common_1.Post)('admin/catalog'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "createCatalog", null);
__decorate([
    (0, common_1.Put)('admin/catalog/:id'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "updateCatalog", null);
__decorate([
    (0, common_1.Delete)('admin/catalog/:id'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "deleteCatalog", null);
__decorate([
    (0, common_1.Patch)('admin/bookings/:id/force-state'),
    (0, common_1.UseGuards)(require('../../common/auth.guard').JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RadiologyController.prototype, "forceState", null);
exports.RadiologyController = RadiologyController = __decorate([
    (0, common_1.Controller)('radiology'),
    __metadata("design:paramtypes", [radiology_service_1.RadiologyOpsService])
], RadiologyController);
//# sourceMappingURL=radiology.controller.js.map