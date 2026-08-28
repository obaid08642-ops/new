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
exports.DriversController = void 0;
const common_1 = require("@nestjs/common");
const drivers_service_1 = require("./drivers.service");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
let DriversController = class DriversController {
    constructor(svc) {
        this.svc = svc;
    }
    online(driver, body) {
        return this.svc.goOnline(driver, body?.location);
    }
    offline(driver) {
        return this.svc.goOffline(driver);
    }
    shift(id) {
        return this.svc.getCurrentShift(id);
    }
    location(driver, body) {
        return this.svc.updateLocation(driver, body);
    }
    getDriverLocation(driverId) {
        return this.svc.getDriverLocation(driverId);
    }
    available(driver) {
        return this.svc.availableOrders(driver);
    }
    active(driver) {
        return this.svc.myActive(driver);
    }
    history(driver) {
        return this.svc.myHistory(driver);
    }
    accept(driver, id) {
        return this.svc.acceptOrder(driver, id);
    }
    pickup(driver, id) {
        return this.svc.pickupOrder(driver, id);
    }
    deliver(driver, id, body) {
        return this.svc.deliverOrder(driver, id, body);
    }
    allOnline() {
        return this.svc.allOnline();
    }
    listAvailable() {
        return this.svc.allOnline();
    }
};
exports.DriversController = DriversController;
__decorate([
    (0, common_1.Post)('online'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "online", null);
__decorate([
    (0, common_1.Post)('offline'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "offline", null);
__decorate([
    (0, common_1.Get)('shift'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "shift", null);
__decorate([
    (0, common_1.Post)('location'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "location", null);
__decorate([
    (0, common_1.Get)(':driverId/location'),
    __param(0, (0, common_1.Param)('driverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "getDriverLocation", null);
__decorate([
    (0, common_1.Get)('orders/available'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "available", null);
__decorate([
    (0, common_1.Get)('orders/active'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "active", null);
__decorate([
    (0, common_1.Get)('orders/history'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "history", null);
__decorate([
    (0, common_1.Post)('orders/:id/accept'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('orders/:id/pickup'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "pickup", null);
__decorate([
    (0, common_1.Post)('orders/:id/deliver'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "deliver", null);
__decorate([
    (0, common_1.Get)('admin/online'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "allOnline", null);
__decorate([
    (0, common_1.Get)('available'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "listAvailable", null);
exports.DriversController = DriversController = __decorate([
    (0, common_1.Controller)('drivers'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [drivers_service_1.DriversService])
], DriversController);
//# sourceMappingURL=drivers.controller.js.map