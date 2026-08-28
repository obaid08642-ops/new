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
exports.AdminProcurementController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../../common/auth.guard");
const procurement_service_1 = require("../services/procurement.service");
const admin_create_quotation_dto_1 = require("../dto/admin-create-quotation.dto");
const procurement_status_enum_1 = require("../enums/procurement-status.enum");
let AdminProcurementController = class AdminProcurementController {
    constructor(procurementService) {
        this.procurementService = procurementService;
    }
    async listAll(status) {
        return this.procurementService.adminListRequests(status);
    }
    async summary() {
        return this.procurementService.adminSummary();
    }
    async exportCsv(id, res) {
        const csv = await this.procurementService.adminExportCsv(id);
        res.setHeader('Content-Disposition', `attachment; filename="procurement-${id}.csv"`);
        res.send(csv);
    }
    async getOne(id) {
        return this.procurementService.adminGetRequest(id);
    }
    async startReview(id) {
        return this.procurementService.adminStartReview(id);
    }
    async createQuotation(req, id, dto) {
        const adminId = req.user.sub;
        return this.procurementService.adminCreateQuotation(adminId, id, dto);
    }
    async getQuotation(id) {
        return this.procurementService.adminGetQuotation(id);
    }
    async cancelRequest(id) {
        return this.procurementService.adminCancelRequest(id);
    }
    async completeRequest(id) {
        return this.procurementService.adminCompleteRequest(id);
    }
};
exports.AdminProcurementController = AdminProcurementController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "listAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "startReview", null);
__decorate([
    (0, common_1.Post)(':id/quotation'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, admin_create_quotation_dto_1.AdminCreateQuotationDto]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "createQuotation", null);
__decorate([
    (0, common_1.Get)(':id/quotation'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "getQuotation", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProcurementController.prototype, "completeRequest", null);
exports.AdminProcurementController = AdminProcurementController = __decorate([
    (0, common_1.Controller)('admin/procurement'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)('admin'),
    __metadata("design:paramtypes", [procurement_service_1.ProcurementService])
], AdminProcurementController);
//# sourceMappingURL=admin-procurement.controller.js.map