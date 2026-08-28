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
exports.ProviderPharmacyAliasController = exports.PharmacyOpsController = void 0;
const common_1 = require("@nestjs/common");
const pharmacy_ops_service_1 = require("./pharmacy_ops.service");
const common_2 = require("@nestjs/common");
const canonicalPharmacyFlowRequired = () => { throw new common_2.ServiceUnavailableException('canonical_pharmacy_flow_required'); };
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const orders_service_1 = require("../orders/orders.service");
let PharmacyOpsController = class PharmacyOpsController {
    constructor(svc, ordersSvc) {
        this.svc = svc;
        this.ordersSvc = ordersSvc;
    }
    byRxNumber() { return canonicalPharmacyFlowRequired(); }
    eod() { return canonicalPharmacyFlowRequired(); }
    incoming() { return canonicalPharmacyFlowRequired(); }
    preparing() { return canonicalPharmacyFlowRequired(); }
    ready() { return canonicalPharmacyFlowRequired(); }
    completed() { return canonicalPharmacyFlowRequired(); }
    basketReview() { return canonicalPharmacyFlowRequired(); }
    awaitingApproval() { return canonicalPharmacyFlowRequired(); }
    refills() { return canonicalPharmacyFlowRequired(); }
    accept() { return canonicalPharmacyFlowRequired(); }
    reject() { return canonicalPharmacyFlowRequired(); }
    preparingAction() { return canonicalPharmacyFlowRequired(); }
    readyAction() { return canonicalPharmacyFlowRequired(); }
    partial() { return canonicalPharmacyFlowRequired(); }
    inventory() { return canonicalPharmacyFlowRequired(); }
    stock() { return canonicalPharmacyFlowRequired(); }
    addMed() { return canonicalPharmacyFlowRequired(); }
    orderDetail() { return canonicalPharmacyFlowRequired(); }
    itemUnavailable() { return canonicalPharmacyFlowRequired(); }
    itemRestore() { return canonicalPharmacyFlowRequired(); }
    itemQty() { return canonicalPharmacyFlowRequired(); }
    itemSub() { return canonicalPharmacyFlowRequired(); }
    submitBasket() { return canonicalPharmacyFlowRequired(); }
    setInsurance(u, id, b) {
        return canonicalPharmacyFlowRequired();
    }
};
exports.PharmacyOpsController = PharmacyOpsController;
__decorate([
    (0, common_1.Get)('prescriptions/:rxNumber'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "byRxNumber", null);
__decorate([
    (0, common_1.Post)('reports/eod'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "eod", null);
__decorate([
    (0, common_1.Get)('orders/incoming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "incoming", null);
__decorate([
    (0, common_1.Get)('orders/preparing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "preparing", null);
__decorate([
    (0, common_1.Get)('orders/ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "ready", null);
__decorate([
    (0, common_1.Get)('orders/completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "completed", null);
__decorate([
    (0, common_1.Get)('orders/basket-review'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "basketReview", null);
__decorate([
    (0, common_1.Get)('orders/awaiting-approval'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "awaitingApproval", null);
__decorate([
    (0, common_1.Get)('orders/refills'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "refills", null);
__decorate([
    (0, common_1.Post)('orders/:id/accept'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('orders/:id/reject'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('orders/:id/preparing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "preparingAction", null);
__decorate([
    (0, common_1.Post)('orders/:id/ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "readyAction", null);
__decorate([
    (0, common_1.Post)('orders/:id/partial'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "partial", null);
__decorate([
    (0, common_1.Get)('inventory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "inventory", null);
__decorate([
    (0, common_1.Post)('inventory/stock'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "stock", null);
__decorate([
    (0, common_1.Post)('inventory/add'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "addMed", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "orderDetail", null);
__decorate([
    (0, common_1.Post)('orders/:id/items/:idx/unavailable'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "itemUnavailable", null);
__decorate([
    (0, common_1.Post)('orders/:id/items/:idx/restore'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "itemRestore", null);
__decorate([
    (0, common_1.Post)('orders/:id/items/:idx/qty'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "itemQty", null);
__decorate([
    (0, common_1.Post)('orders/:id/items/:idx/substitute'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "itemSub", null);
__decorate([
    (0, common_1.Post)('orders/:id/submit-basket'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "submitBasket", null);
__decorate([
    (0, common_1.Post)('orders/:id/insurance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PharmacyOpsController.prototype, "setInsurance", null);
exports.PharmacyOpsController = PharmacyOpsController = __decorate([
    (0, common_1.Controller)('pharmacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY),
    __metadata("design:paramtypes", [pharmacy_ops_service_1.PharmacyOpsService, orders_service_1.OrdersService])
], PharmacyOpsController);
let ProviderPharmacyAliasController = class ProviderPharmacyAliasController {
    constructor(svc, ordersSvc) {
        this.svc = svc;
        this.ordersSvc = ordersSvc;
    }
    accept() { return canonicalPharmacyFlowRequired(); }
    submitBasket() { return canonicalPharmacyFlowRequired(); }
    insurance(u, id, b) {
        return canonicalPharmacyFlowRequired();
    }
    dispatch() { return canonicalPharmacyFlowRequired(); }
};
exports.ProviderPharmacyAliasController = ProviderPharmacyAliasController;
__decorate([
    (0, common_1.Post)('orders/:id/accept'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyAliasController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('orders/:id/submit-basket'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyAliasController.prototype, "submitBasket", null);
__decorate([
    (0, common_1.Post)('orders/:id/insurance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyAliasController.prototype, "insurance", null);
__decorate([
    (0, common_1.Post)('orders/:id/dispatch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyAliasController.prototype, "dispatch", null);
exports.ProviderPharmacyAliasController = ProviderPharmacyAliasController = __decorate([
    (0, common_1.Controller)('provider/pharmacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_ops_service_1.PharmacyOpsService, orders_service_1.OrdersService])
], ProviderPharmacyAliasController);
//# sourceMappingURL=pharmacy_ops.controller.js.map