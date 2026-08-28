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
exports.EmergencyController = void 0;
const common_1 = require("@nestjs/common");
const emergency_service_1 = require("./emergency.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const common_2 = require("@nestjs/common");
let EmergencyController = class EmergencyController {
    constructor(svc) {
        this.svc = svc;
    }
    trigger(body, user) {
        return this.svc.trigger(user, body);
    }
    myActive(user) {
        return this.svc.myActive(user.id);
    }
    cancel(id, user) {
        return this.svc.cancelOwn(id, user.id);
    }
    driverMissions(user) {
        return this.svc.driverMissions(user.id);
    }
    claim(id, body, user) {
        return this.svc.claim(id, user.id, body?.vehicle_id);
    }
    tracking(user) {
        return this.svc.tracking(user.id);
    }
    track(id, body, user) {
        return this.svc.updateUnitLocation(id, user.id, body);
    }
    active() {
        throw new common_2.ServiceUnavailableException('admin emergency monitoring is unavailable pending approved emergency, location and consent contracts');
    }
    one(id) {
        throw new common_2.ServiceUnavailableException('admin emergency record access is unavailable pending approved emergency, location and consent contracts');
    }
    assign(id, body, user) {
        throw new common_2.ServiceUnavailableException('manual emergency assignment is unavailable pending approved dispatch ownership controls');
    }
    autoDispatch(id, user) {
        throw new common_2.ServiceUnavailableException('manual emergency dispatch is unavailable pending approved dispatch ownership controls');
    }
    resolve(id, user, body) {
        throw new common_2.ServiceUnavailableException('manual emergency resolution is unavailable pending approved closure protocol');
    }
};
exports.EmergencyController = EmergencyController;
__decorate([
    (0, common_1.Post)('trigger'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "trigger", null);
__decorate([
    (0, common_1.Get)('my/active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "myActive", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('driver/missions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "driverMissions", null);
__decorate([
    (0, common_1.Post)(':id/claim'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "claim", null);
__decorate([
    (0, common_1.Get)('tracking'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "tracking", null);
__decorate([
    (0, common_1.Post)(':id/track'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "track", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "active", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "one", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/auto-dispatch'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "autoDispatch", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmergencyController.prototype, "resolve", null);
exports.EmergencyController = EmergencyController = __decorate([
    (0, common_1.Controller)('emergency'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [emergency_service_1.EmergencyService])
], EmergencyController);
//# sourceMappingURL=emergency.controller.js.map