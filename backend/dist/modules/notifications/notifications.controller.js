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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const push_module_1 = require("../push/push.module");
let NotificationsController = class NotificationsController {
    constructor(svc, push) {
        this.svc = svc;
        this.push = push;
    }
    list(user) {
        return this.svc.listForUser(user);
    }
    registerToken(user, body) {
        if (!body?.token)
            throw new common_1.BadRequestException('token is required');
        const provider = body.provider
            || (body.token.startsWith('ExponentPushToken') ? 'expo' : (body.platform === 'ios' || body.device === 'ios' ? 'apns' : 'fcm'));
        return this.push.register(user, {
            token: body.token,
            provider,
            platform: body.platform || body.device,
            device_id: body.device_id,
            device_name: body.device_name,
        });
    }
    read(id, user) {
        return this.svc.markRead(id, user);
    }
    readAll(user) {
        return this.svc.markAllRead(user);
    }
    send(body) {
        return this.svc.create(body);
    }
    schedule(body) {
        if (!body?.scheduled_at)
            throw new common_1.BadRequestException('scheduled_at is required');
        return this.svc.create(body);
    }
    deliveryStats() {
        return this.svc.deliveryStats();
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('register-token'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "registerToken", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "read", null);
__decorate([
    (0, common_1.Post)('read-all'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "readAll", null);
__decorate([
    (0, common_1.Post)('admin/send'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('admin/schedule'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "schedule", null);
__decorate([
    (0, common_1.Get)('admin/delivery-stats'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "deliveryStats", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService, push_module_1.PushService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map