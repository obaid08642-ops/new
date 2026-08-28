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
exports.PrescriptionsController = void 0;
const common_1 = require("@nestjs/common");
const prescriptions_service_1 = require("./prescriptions.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let PrescriptionsController = class PrescriptionsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(body, user) {
        return this.svc.create(user, body);
    }
    upload(body, user) {
        return this.svc.uploadByPatient(user, body);
    }
    manualEntry(body, user) {
        return this.svc.create(user, body);
    }
    send(id, body, user) {
        return this.svc.sendToPharmacy(id, body.pharmacy_id, user);
    }
    transition(id, body, user) {
        return this.svc.transition(id, body.to, user);
    }
    sub(id, body, user) {
        return this.svc.substitute(id, body.item_index, body.new_medicine_id, user);
    }
    manualReviewQueue(user) { return this.svc.manualReviewQueue(user); }
    active(user) { return this.svc.activeForPatient(user); }
    mine(id) {
        return this.svc.listMine(id);
    }
    doctorMine(id) {
        return this.svc.listForDoctor(id);
    }
    pharmacyQueue(id) {
        return this.svc.listForPharmacy(id);
    }
    one(id, user) {
        return this.svc.getByIdForUser(id, user);
    }
};
exports.PrescriptionsController = PrescriptionsController;
__decorate([
    (0, common_1.Post)('create'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('manual-entry'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "manualEntry", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(':id/transition'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)(':id/substitute'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "sub", null);
__decorate([
    (0, common_1.Get)('manual-review/queue'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "manualReviewQueue", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "active", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('doctor/mine'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "doctorMine", null);
__decorate([
    (0, common_1.Get)('pharmacy/queue'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "pharmacyQueue", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "one", null);
exports.PrescriptionsController = PrescriptionsController = __decorate([
    (0, common_1.Controller)('prescriptions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prescriptions_service_1.PrescriptionsService])
], PrescriptionsController);
//# sourceMappingURL=prescriptions.controller.js.map