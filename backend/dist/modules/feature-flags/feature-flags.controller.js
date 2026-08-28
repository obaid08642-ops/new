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
exports.FeatureFlagsController = exports.PublicFeatureFlagsController = void 0;
const common_1 = require("@nestjs/common");
const feature_flags_service_1 = require("./feature-flags.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const auth_guard_2 = require("../../common/auth.guard");
let PublicFeatureFlagsController = class PublicFeatureFlagsController {
    constructor(svc) {
        this.svc = svc;
    }
    async all() {
        return this.svc.getAll();
    }
};
exports.PublicFeatureFlagsController = PublicFeatureFlagsController;
__decorate([
    (0, auth_guard_2.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicFeatureFlagsController.prototype, "all", null);
exports.PublicFeatureFlagsController = PublicFeatureFlagsController = __decorate([
    (0, common_1.Controller)('feature-flags'),
    __metadata("design:paramtypes", [feature_flags_service_1.FeatureFlagsService])
], PublicFeatureFlagsController);
let FeatureFlagsController = class FeatureFlagsController {
    constructor(svc) {
        this.svc = svc;
    }
    async getAll() {
        return this.svc.getAll();
    }
    async setFlag(key, enabled) {
        return this.svc.setFlag(key, enabled);
    }
};
exports.FeatureFlagsController = FeatureFlagsController;
__decorate([
    (0, common_1.Get)(),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeatureFlagsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)(':key'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)('enabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], FeatureFlagsController.prototype, "setFlag", null);
exports.FeatureFlagsController = FeatureFlagsController = __decorate([
    (0, common_1.Controller)('admin/feature-flags'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [feature_flags_service_1.FeatureFlagsService])
], FeatureFlagsController);
//# sourceMappingURL=feature-flags.controller.js.map