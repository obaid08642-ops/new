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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const enums_1 = require("../../common/enums");
let UsersController = class UsersController {
    constructor(users) {
        this.users = users;
    }
    display(id) {
        return this.users.getPatientDisplay(id);
    }
    updateDisplay(id, body) {
        return this.users.updatePatientWebProfile(id, body);
    }
    healthId(id) {
        return this.users.getHealthId(id);
    }
    myProfile(id) {
        return this.users.getPatientProfile(id);
    }
    updateMyProfile(id, body) {
        return this.users.updatePatientProfile(id, body);
    }
    getWishlist(id) {
        return this.users.getWishlist(id);
    }
    toggleWishlist(id, itemId) {
        return this.users.toggleWishlist(id, itemId);
    }
    getNotificationSettings(id) {
        return this.users.getNotificationSettings(id);
    }
    updateNotificationSettings(id, body) {
        return this.users.updateNotificationSettings(id, body);
    }
    getStorageDetails(id) {
        return this.users.getStorageDetails(id);
    }
    getPrivacySettings(id) {
        return this.users.getPrivacySettings(id);
    }
    updatePrivacySettings(id, body) {
        return this.users.updatePrivacySettings(id, body);
    }
    getSecuritySettings(id) {
        return this.users.getSecuritySettings(id);
    }
    updateSecuritySettings(id, body) {
        return this.users.updateSecuritySettings(id, body);
    }
    changePassword(id, body) {
        return this.users.changePassword(id, body);
    }
    getSessions(id) {
        return this.users.getSessions(id);
    }
    revokeSession(id, jti) {
        return this.users.revokeSession(id, jti);
    }
    list(role, search) {
        return this.users.listAll(role, search);
    }
    toggle(id, by) {
        return this.users.toggle(id, by);
    }
    remove(id, by) {
        return this.users.deleteUser(id, by);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me/display'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "display", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateDisplay", null);
__decorate([
    (0, common_1.Get)('me/health-id'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "healthId", null);
__decorate([
    (0, common_1.Get)('me/profile'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "myProfile", null);
__decorate([
    (0, common_1.Patch)('me/profile'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Get)('me/wishlist'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Post)('me/wishlist/:itemId'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "toggleWishlist", null);
__decorate([
    (0, common_1.Get)('me/notification-settings'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getNotificationSettings", null);
__decorate([
    (0, common_1.Patch)('me/notification-settings'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateNotificationSettings", null);
__decorate([
    (0, common_1.Get)('me/storage'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getStorageDetails", null);
__decorate([
    (0, common_1.Get)('me/privacy-settings'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getPrivacySettings", null);
__decorate([
    (0, common_1.Patch)('me/privacy-settings'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updatePrivacySettings", null);
__decorate([
    (0, common_1.Get)('me/security-settings'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getSecuritySettings", null);
__decorate([
    (0, common_1.Patch)('me/security-settings'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateSecuritySettings", null);
__decorate([
    (0, common_1.Post)('me/change-password'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('me/sessions'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Delete)('me/sessions/:jti'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('jti')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.Get)(),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/toggle'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map