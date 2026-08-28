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
exports.ProvidersController = void 0;
const common_1 = require("@nestjs/common");
const providers_service_1 = require("./providers.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let ProvidersController = class ProvidersController {
    constructor(svc) {
        this.svc = svc;
    }
    apply(body) {
        return this.svc.apply(body);
    }
    list(type, city, company, network, klass) {
        return this.svc.listPublic(type, city, company, network, klass);
    }
    map(type, lat, lng, radius) {
        return this.svc.mapProviders(type, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, radius ? parseFloat(radius) : undefined);
    }
    one(id) {
        return this.svc.getPublicById(id);
    }
    mine(user) {
        return this.svc.myProfile(user);
    }
    adminCreate(body, admin) {
        return this.svc.adminCreate(body, admin);
    }
    adminAll(type, status, search) {
        return this.svc.listAll(type, status, search);
    }
    pending() {
        return this.svc.listPending();
    }
    approve(id, admin) {
        return this.svc.approve(id, admin);
    }
    reject(id, admin, body) {
        return this.svc.reject(id, admin, body?.reason || '');
    }
    suspend(id, admin, body) {
        return this.svc.suspend(id, admin, body?.reason || '');
    }
    seedDemo() {
        return this.svc.seedDemoProviders();
    }
};
exports.ProvidersController = ProvidersController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('apply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "apply", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('insurance_company')),
    __param(3, (0, common_1.Query)('insurance_network')),
    __param(4, (0, common_1.Query)('insurance_class')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "list", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('map'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('lat')),
    __param(2, (0, common_1.Query)('lng')),
    __param(3, (0, common_1.Query)('radius_km')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "map", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "one", null);
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DOCTOR, enums_1.UserRole.PHARMACY, enums_1.UserRole.HOSPITAL, enums_1.UserRole.LAB, enums_1.UserRole.RADIOLOGY, enums_1.UserRole.HOME_CARE),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)('admin/create'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "adminAll", null);
__decorate([
    (0, common_1.Get)('admin/pending'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "pending", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)('admin/seed-demo'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProvidersController.prototype, "seedDemo", null);
exports.ProvidersController = ProvidersController = __decorate([
    (0, common_1.Controller)('providers'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [providers_service_1.ProvidersService])
], ProvidersController);
//# sourceMappingURL=providers.controller.js.map