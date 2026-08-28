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
exports.MaternityController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const maternity_service_1 = require("./maternity.service");
let MaternityController = class MaternityController {
    constructor(maternityService) {
        this.maternityService = maternityService;
    }
    authenticatedPatientId(req) {
        const userId = req?.user?.id;
        if (typeof userId !== 'string' || userId.trim().length === 0) {
            throw new common_1.UnauthorizedException('authenticated_patient_required');
        }
        return userId;
    }
    getProfile(req) {
        return this.maternityService.getProfile(this.authenticatedPatientId(req));
    }
    getContent() {
        return this.maternityService.getContent();
    }
    updateProfile(req, body) {
        return this.maternityService.updateProfile(this.authenticatedPatientId(req), body);
    }
    logKick(req, body) {
        return this.maternityService.logKick(this.authenticatedPatientId(req), body.count, body.duration_seconds);
    }
    logContraction(req, body) {
        return this.maternityService.logContraction(this.authenticatedPatientId(req), body.interval_seconds, body.duration_seconds);
    }
    toggleCheckup(req, week) {
        return this.maternityService.toggleCheckup(this.authenticatedPatientId(req), week);
    }
    logInfantGrowth(req, body) {
        return this.maternityService.logInfantGrowth(this.authenticatedPatientId(req), body);
    }
};
exports.MaternityController = MaternityController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('content'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "getContent", null);
__decorate([
    (0, common_1.Post)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('kicks'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "logKick", null);
__decorate([
    (0, common_1.Post)('contractions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "logContraction", null);
__decorate([
    (0, common_1.Put)('checkups/:week/toggle'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('week')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "toggleCheckup", null);
__decorate([
    (0, common_1.Post)('infant-growth'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MaternityController.prototype, "logInfantGrowth", null);
exports.MaternityController = MaternityController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('maternity'),
    __metadata("design:paramtypes", [maternity_service_1.MaternityService])
], MaternityController);
//# sourceMappingURL=maternity.controller.js.map