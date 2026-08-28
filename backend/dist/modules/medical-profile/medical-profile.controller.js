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
exports.MedicalProfileController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const medical_profile_service_1 = require("./medical-profile.service");
const auth_guard_2 = require("../../common/auth.guard");
const jwt_1 = require("@nestjs/jwt");
let MedicalProfileController = class MedicalProfileController {
    constructor(svc, jwt) {
        this.svc = svc;
        this.jwt = jwt;
    }
    get(u) { return this.svc.getOrCreate(u); }
    async passportToken(u) {
        const expiresInSeconds = 5 * 60;
        const token = await this.jwt.signAsync({ sub: u.id, scope: 'health_passport', type: 'qr' }, { expiresIn: expiresInSeconds });
        return { format: 'nabd_health_passport', version: 2, token, expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
    }
    update(u, b) { return this.svc.update(u, b); }
    addCd(u, b) { return this.svc.addItem(u, 'chronic_diseases', b); }
    delCd(u, id) { return this.svc.removeItem(u, 'chronic_diseases', id); }
    addAl(u, b) { return this.svc.addItem(u, 'allergies', b); }
    delAl(u, id) { return this.svc.removeItem(u, 'allergies', id); }
    addS(u, b) { return this.svc.addItem(u, 'surgeries', b); }
    delS(u, id) { return this.svc.removeItem(u, 'surgeries', id); }
    addLm(u, b) { return this.svc.addItem(u, 'long_term_medications', b); }
    delLm(u, id) { return this.svc.removeItem(u, 'long_term_medications', id); }
    byPatient(u, pid) { return this.svc.getForPatient(u, pid); }
};
exports.MedicalProfileController = MedicalProfileController;
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "get", null);
__decorate([
    (0, common_2.Get)('passport-token'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MedicalProfileController.prototype, "passportToken", null);
__decorate([
    (0, common_2.Patch)(),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "update", null);
__decorate([
    (0, common_2.Post)('chronic-diseases'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "addCd", null);
__decorate([
    (0, common_2.Delete)('chronic-diseases/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "delCd", null);
__decorate([
    (0, common_2.Post)('allergies'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "addAl", null);
__decorate([
    (0, common_2.Delete)('allergies/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "delAl", null);
__decorate([
    (0, common_2.Post)('surgeries'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "addS", null);
__decorate([
    (0, common_2.Delete)('surgeries/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "delS", null);
__decorate([
    (0, common_2.Post)('long-term-medications'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "addLm", null);
__decorate([
    (0, common_2.Delete)('long-term-medications/:id'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "delLm", null);
__decorate([
    (0, common_2.Get)('provider/:patientId'),
    __param(0, (0, auth_guard_2.CurrentUser)()),
    __param(1, (0, common_2.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicalProfileController.prototype, "byPatient", null);
exports.MedicalProfileController = MedicalProfileController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('medical-profile'),
    __metadata("design:paramtypes", [medical_profile_service_1.MedicalProfileService, jwt_1.JwtService])
], MedicalProfileController);
//# sourceMappingURL=medical-profile.controller.js.map