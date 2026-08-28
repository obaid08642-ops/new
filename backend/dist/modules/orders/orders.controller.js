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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const enums_1 = require("../../common/enums");
const create_order_dto_1 = require("./dto/create-order.dto");
let OrdersController = class OrdersController {
    constructor(svc) {
        this.svc = svc;
    }
    create(body, user) {
        return this.svc.create(user, body);
    }
    mine(id, type) {
        return this.svc.listMine(id, type);
    }
    reorder(id, user) {
        return this.svc.reorder(id, user);
    }
    reorderPartial(id, user, body) {
        return this.svc.reorderPartial(id, user, body);
    }
    cancel(id, user, body) {
        return this.svc.cancel(id, user, body?.reason || 'patient-cancel');
    }
    approveBasket(id, user) {
        return this.svc.patientApproveBasket(user, id);
    }
    rejectBasket(id, user, body) {
        return this.svc.patientRejectBasket(user, id, body?.reason);
    }
    pharmacyQueue(id, state) {
        return this.svc.listForPharmacy(id, state);
    }
    one(id, user) {
        return this.svc.getById(id, user);
    }
    async getReportPdf(id, user, res) {
        const pdfBuffer = await this.svc.generatePdf(id, user);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=NabdPlus_Report_${id}.pdf`);
        res.send(pdfBuffer);
    }
    getTracking(id, user) {
        return this.svc.getTracking(id, user);
    }
    optInCash(id, itemId, body, user) {
        return this.svc.optInCash(id, itemId, body, user);
    }
    updateInsuranceApproval(id, body, user) {
        return this.svc.updateInsuranceApproval(id, body, user);
    }
    accept(id, user) {
        return this.svc.accept(id, user);
    }
    reject(id, user, body) {
        return this.svc.reject(id, user, body?.reason || 'no-reason');
    }
    preparing(id, user) {
        return this.svc.markPreparing(id, user);
    }
    ready(id, user) {
        return this.svc.markReady(id, user);
    }
    partial(id, user, body) {
        return this.svc.markPartial(id, user, body.unavailable_medicine_ids || []);
    }
    assign(id, user, body) {
        return this.svc.assignDelivery(id, body.driver_id, user);
    }
    deliveryUpdate(id, body) {
        return this.svc.updateDelivery(id, body.state, body.location);
    }
    dispatch(id, user) {
        return this.svc.transition(id, enums_1.OrderState.OUT_FOR_DELIVERY, user);
    }
    delivered(id, user) {
        return this.svc.transition(id, enums_1.OrderState.DELIVERED, user);
    }
    list(state, search) {
        return this.svc.listAll(state, search);
    }
    escalated() {
        return this.svc.listEscalated();
    }
    adminTransition(id, user, body) {
        return this.svc.transition(id, body.to, user, body.reason);
    }
    placeBid(user, b) {
        return this.svc.placeBid(user, b);
    }
    acceptBid(id, user) {
        return this.svc.acceptBid(user, id);
    }
    listBids(id, user) {
        return this.svc.listBids(user, id);
    }
    listPharmacyBids(user) {
        return this.svc.listPharmacyBids(user);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('create'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PATIENT, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)(':id/reorder'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)(':id/reorder-partial'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "reorderPartial", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/approve-basket'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "approveBasket", null);
__decorate([
    (0, common_1.Post)(':id/reject-basket'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "rejectBasket", null);
__decorate([
    (0, common_1.Get)('pharmacy/queue'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "pharmacyQueue", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "one", null);
__decorate([
    (0, common_1.Get)(':id/report.pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getReportPdf", null);
__decorate([
    (0, common_1.Get)(':id/tracking'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getTracking", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/opt-in-cash'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "optInCash", null);
__decorate([
    (0, common_1.Patch)(':id/insurance-approval'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.LAB, enums_1.UserRole.PHARMACY, enums_1.UserRole.HOSPITAL, enums_1.UserRole.RADIOLOGY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateInsuranceApproval", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/preparing'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "preparing", null);
__decorate([
    (0, common_1.Post)(':id/ready'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "ready", null);
__decorate([
    (0, common_1.Post)(':id/partial'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "partial", null);
__decorate([
    (0, common_1.Post)(':id/assign-delivery'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN, enums_1.UserRole.DELIVERY),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/delivery/update'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "deliveryUpdate", null);
__decorate([
    (0, common_1.Post)(':id/dispatch'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Post)(':id/delivered'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.DELIVERY, enums_1.UserRole.ADMIN, enums_1.UserRole.PHARMACY),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "delivered", null);
__decorate([
    (0, common_1.Get)(),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('state')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('admin/escalated'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "escalated", null);
__decorate([
    (0, common_1.Post)(':id/admin/transition'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "adminTransition", null);
__decorate([
    (0, common_1.Post)('bids/place'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "placeBid", null);
__decorate([
    (0, common_1.Post)('bids/:id/accept'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "acceptBid", null);
__decorate([
    (0, common_1.Get)('bids/request/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "listBids", null);
__decorate([
    (0, common_1.Get)('bids/pharmacy/mine'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PHARMACY, enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "listPharmacyBids", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map