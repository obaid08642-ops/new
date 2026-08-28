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
exports.HospitalController = void 0;
const common_1 = require("@nestjs/common");
const hospital_service_1 = require("../services/hospital.service");
const auth_guard_1 = require("../../../common/auth.guard");
let HospitalController = class HospitalController {
    constructor(hospitalService) {
        this.hospitalService = hospitalService;
    }
    async createBranch(user, body) {
        return this.hospitalService.createBranch(user.id, body, user);
    }
    async getBranches(user) {
        return this.hospitalService.getBranches(user.id, user);
    }
    async createDepartment(user, body) {
        return this.hospitalService.createDepartment(user.id, body, user);
    }
    async getDepartments(user) {
        return this.hospitalService.getDepartments(user.id, user);
    }
    async addStaff(user, body) {
        return this.hospitalService.addStaff(user.id, body, user);
    }
    async getStaff(user) {
        return this.hospitalService.getStaff(user.id, user);
    }
    async onboardDoctor(user, body) {
        return this.hospitalService.onboardDoctor(user.id, body.doctor_id, user);
    }
    async getAppointments(user, branchId) {
        return this.hospitalService.getUnifiedAppointments(user.id, branchId, user);
    }
    async updateAppointmentStatus(user, id, body) {
        return this.hospitalService.updateAppointmentStatus(user.id, id, body.status, user);
    }
    async getWallet(user) {
        return this.hospitalService.getAggregatedWallet(user.id, user.role, user);
    }
    async createInvitation(user, body) {
        return this.hospitalService.createInvitation(user.id, body);
    }
    async listFacilityInvitations(user) {
        return this.hospitalService.listFacilityInvitations(user.id);
    }
    async listMyInvitations(user) {
        return this.hospitalService.listMyInvitations(user.id);
    }
    async respondInvitation(user, id, body) {
        return this.hospitalService.respondInvitation(user.id, id, !!body?.accept);
    }
};
exports.HospitalController = HospitalController;
__decorate([
    (0, common_1.Post)('branches'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "createBranch", null);
__decorate([
    (0, common_1.Get)('branches'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "getBranches", null);
__decorate([
    (0, common_1.Post)('departments'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)('departments'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "getDepartments", null);
__decorate([
    (0, common_1.Post)('staff'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "addStaff", null);
__decorate([
    (0, common_1.Get)('staff'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "getStaff", null);
__decorate([
    (0, common_1.Post)('doctors/onboard'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "onboardDoctor", null);
__decorate([
    (0, common_1.Get)('appointments'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "getAppointments", null);
__decorate([
    (0, common_1.Put)('appointments/:id/status'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "updateAppointmentStatus", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "getWallet", null);
__decorate([
    (0, common_1.Post)('invitations'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "createInvitation", null);
__decorate([
    (0, common_1.Get)('invitations'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "listFacilityInvitations", null);
__decorate([
    (0, common_1.Get)('invitations/inbox'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "listMyInvitations", null);
__decorate([
    (0, common_1.Post)('invitations/:id/respond'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], HospitalController.prototype, "respondInvitation", null);
exports.HospitalController = HospitalController = __decorate([
    (0, common_1.Controller)('hospital'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [hospital_service_1.HospitalService])
], HospitalController);
//# sourceMappingURL=hospital.controller.js.map