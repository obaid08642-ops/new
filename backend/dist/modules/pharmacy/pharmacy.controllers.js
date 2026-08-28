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
exports.PatientShortageController = exports.AdminShortageController = exports.ProviderShortageController = exports.AdminPharmacyChatController = exports.PharmacyChatController = exports.AdminPharmacyInsuranceController = exports.AdminBroadcastController = exports.ProviderBroadcastController = exports.AdminPharmacyController = exports.ProviderInventoryExtController = exports.ProviderPharmacyController = exports.PatientPharmacyController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const pharmacy_order_service_1 = require("./services/pharmacy-order.service");
const pharmacy_allocation_service_1 = require("./services/pharmacy-allocation.service");
const pharmacy_inventory_ext_service_1 = require("./services/pharmacy-inventory-ext.service");
const pharmacy_seed_service_1 = require("./services/pharmacy-seed.service");
const smart_split_service_1 = require("./services/smart-split.service");
const pharmacy_broadcast_service_1 = require("./services/pharmacy-broadcast.service");
const pharmacy_chat_service_1 = require("./services/pharmacy-chat.service");
const pharmacy_shortage_service_1 = require("./services/pharmacy-shortage.service");
const pharmacy_orders_provider_service_1 = require("./services/pharmacy-orders-provider.service");
const pharmacy_offer_service_1 = require("./services/pharmacy-offer.service");
const pharmacy_insurance_decision_service_1 = require("./services/pharmacy-insurance-decision.service");
const pharmacy_expiry_command_service_1 = require("./services/pharmacy-expiry-command.service");
const pharmacy_payment_evidence_service_1 = require("./services/pharmacy-payment-evidence.service");
const enums_2 = require("../../common/enums");
let PatientPharmacyController = class PatientPharmacyController {
    constructor(orders, offers, insurance, payments) {
        this.orders = orders;
        this.offers = offers;
        this.insurance = insurance;
        this.payments = payments;
    }
    create(u, b) { return this.orders.create(u, b); }
    list(u, status) { return this.orders.list(u, status); }
    detail(u, id) { return this.orders.detail(u, id); }
    update(u, id, b) { return this.orders.update(u, id, b); }
    submit(u, id) { return this.orders.submit(u, id); }
    cancel(u, id, b) { return this.orders.cancel(u, id, b?.reason || ''); }
    paymentIntent(u, id, b) { return this.payments.createPaymentIntent(u, id, b?.idempotency_key); }
    cancelRejectedInsurance(u, id, b) { return this.insurance.cancelRejectedByPatient(u, id, b?.idempotency_key); }
    listOffers(u, id) { return this.offers.listForPatient(u, id); }
    selectOffer(u, id, offerId, b) {
        return this.offers.selectByPatient(u, id, offerId, b?.idempotency_key);
    }
};
exports.PatientPharmacyController = PatientPharmacyController;
__decorate([
    (0, common_1.Post)('orders'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)('orders/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('orders/:id/submit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('orders/:id/cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('orders/:id/payment-intent'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "paymentIntent", null);
__decorate([
    (0, common_1.Post)('orders/:id/insurance-rejection/cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "cancelRejectedInsurance", null);
__decorate([
    (0, common_1.Get)('orders/:id/offers'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "listOffers", null);
__decorate([
    (0, common_1.Post)('orders/:id/offers/:offerId/select'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('offerId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], PatientPharmacyController.prototype, "selectOffer", null);
exports.PatientPharmacyController = PatientPharmacyController = __decorate([
    (0, common_1.Controller)('patient/pharmacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PATIENT),
    __metadata("design:paramtypes", [pharmacy_order_service_1.PharmacyOrderService, pharmacy_offer_service_1.PharmacyOfferService, pharmacy_insurance_decision_service_1.PharmacyInsuranceDecisionService, pharmacy_payment_evidence_service_1.PharmacyPaymentEvidenceService])
], PatientPharmacyController);
let ProviderPharmacyController = class ProviderPharmacyController {
    constructor(allocs, inv, providerOrders, insurance) {
        this.allocs = allocs;
        this.inv = inv;
        this.providerOrders = providerOrders;
        this.insurance = insurance;
    }
    list(u, status) {
        if (!(0, enums_2.isProviderRole)(u?.role))
            throw new common_1.ForbiddenException();
        return this.allocs.listForProvider(u, status);
    }
    detail(u, id) {
        if (!(0, enums_2.isProviderRole)(u?.role))
            throw new common_1.ForbiddenException();
        return this.allocs.detail(u, id);
    }
    itemAction(u, id, itemId, b) {
        return this.allocs.itemAction(u, id, itemId, b);
    }
    confirm(u, id) { return this.allocs.confirm(u, id); }
    preparing(u, id) { return this.allocs.preparing(u, id); }
    ready(u, id) { return this.allocs.ready(u, id); }
    out(u, id, b) { return this.allocs.outForDelivery(u, id, b); }
    delivered(u, id) { return this.allocs.delivered(u, id); }
    updateInsurance() { return this.allocs.updateInsurance(); }
    insuranceDecision(u, id, b) { return this.insurance.decide(u, id, b); }
    cancel(u, id, b) { return this.allocs.cancel(u, id, b?.reason || ''); }
    acceptOrder() { throw new common_1.ServiceUnavailableException('legacy_order_acceptance_disabled_use_patient_selected_offer'); }
    submitBasket() { throw new common_1.ServiceUnavailableException('legacy_basket_submission_disabled_use_versioned_offer'); }
    evaluateInsurance() { throw new common_1.ServiceUnavailableException('legacy_insurance_evaluation_disabled_use_governed_insurance_decision'); }
    orderPreparing() { throw new common_1.ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }
    orderReady() { throw new common_1.ServiceUnavailableException('legacy_order_transition_disabled_use_selected_allocation'); }
    orderDispatch() { throw new common_1.ServiceUnavailableException('legacy_order_dispatch_disabled_delivery_proof_required'); }
};
exports.ProviderPharmacyController = ProviderPharmacyController;
__decorate([
    (0, common_1.Get)('allocations'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('allocations/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)('allocations/:id/items/:itemId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('itemId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "itemAction", null);
__decorate([
    (0, common_1.Post)('allocations/:id/confirm'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('allocations/:id/preparing'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "preparing", null);
__decorate([
    (0, common_1.Post)('allocations/:id/ready'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "ready", null);
__decorate([
    (0, common_1.Post)('allocations/:id/out-for-delivery'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "out", null);
__decorate([
    (0, common_1.Post)('allocations/:id/delivered'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "delivered", null);
__decorate([
    (0, common_1.Post)('allocations/:id/insurance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "updateInsurance", null);
__decorate([
    (0, common_1.Post)('orders/:id/insurance-decision'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "insuranceDecision", null);
__decorate([
    (0, common_1.Post)('allocations/:id/cancel'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('orders/:id/accept'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "acceptOrder", null);
__decorate([
    (0, common_1.Post)('orders/:id/submit-basket'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "submitBasket", null);
__decorate([
    (0, common_1.Post)('orders/:id/insurance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "evaluateInsurance", null);
__decorate([
    (0, common_1.Post)('orders/:id/preparing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "orderPreparing", null);
__decorate([
    (0, common_1.Post)('orders/:id/ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "orderReady", null);
__decorate([
    (0, common_1.Post)('orders/:id/dispatch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderPharmacyController.prototype, "orderDispatch", null);
exports.ProviderPharmacyController = ProviderPharmacyController = __decorate([
    (0, common_1.Controller)('provider/pharmacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_allocation_service_1.PharmacyAllocationService,
        pharmacy_inventory_ext_service_1.PharmacyInventoryExtService,
        pharmacy_orders_provider_service_1.PharmacyOrdersProviderService,
        pharmacy_insurance_decision_service_1.PharmacyInsuranceDecisionService])
], ProviderPharmacyController);
let ProviderInventoryExtController = class ProviderInventoryExtController {
    constructor(svc) {
        this.svc = svc;
    }
    search(u, q, bc) { return this.svc.search(u, q, bc); }
    restock(u, id, b) { return this.svc.restock(u, id, Number(b?.qty) || 0); }
    alerts(u) { return this.svc.listLowStockAlerts(u); }
    ack(u, id) { return this.svc.acknowledgeAlert(u, id); }
};
exports.ProviderInventoryExtController = ProviderInventoryExtController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProviderInventoryExtController.prototype, "search", null);
__decorate([
    (0, common_1.Post)(':id/restock'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderInventoryExtController.prototype, "restock", null);
__decorate([
    (0, common_1.Get)('low-stock-alerts'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderInventoryExtController.prototype, "alerts", null);
__decorate([
    (0, common_1.Post)('low-stock-alerts/:id/ack'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderInventoryExtController.prototype, "ack", null);
exports.ProviderInventoryExtController = ProviderInventoryExtController = __decorate([
    (0, common_1.Controller)('provider/inventory'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_inventory_ext_service_1.PharmacyInventoryExtService])
], ProviderInventoryExtController);
let AdminPharmacyController = class AdminPharmacyController {
    constructor(seedSvc, split, allocs, broadcast) {
        this.seedSvc = seedSvc;
        this.split = split;
        this.allocs = allocs;
        this.broadcast = broadcast;
    }
    assertTestSeedAllowed() {
        if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
            throw new common_1.ServiceUnavailableException('test_seed_disabled');
        }
    }
    seed(u) { this.assertTestSeedAllowed(); return this.seedSvc.seed(u); }
    sampleOrder(u, b) { this.assertTestSeedAllowed(); return this.seedSvc.seedSampleOrder(b?.patient_account_id || u.id); }
    async manualSplit(id) {
        try {
            return await this.split.runForOrder(id);
        }
        catch (e) {
            if (String(e?.message || '').includes('order_not_splittable'))
                return this.broadcast.fallbackSplit(id);
            throw e;
        }
    }
    expireStale() { return this.allocs.expireStale(); }
};
exports.AdminPharmacyController = AdminPharmacyController;
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPharmacyController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)('seed/sample-order'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPharmacyController.prototype, "sampleOrder", null);
__decorate([
    (0, common_1.Post)('split/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPharmacyController.prototype, "manualSplit", null);
__decorate([
    (0, common_1.Post)('expire-stale-allocations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPharmacyController.prototype, "expireStale", null);
exports.AdminPharmacyController = AdminPharmacyController = __decorate([
    (0, common_1.Controller)('admin/pharmacy'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [pharmacy_seed_service_1.PharmacySeedService,
        smart_split_service_1.SmartSplitService,
        pharmacy_allocation_service_1.PharmacyAllocationService,
        pharmacy_broadcast_service_1.PharmacyBroadcastService])
], AdminPharmacyController);
let ProviderBroadcastController = class ProviderBroadcastController {
    constructor(bc, offers) {
        this.bc = bc;
        this.offers = offers;
    }
    list(u) { return this.bc.listForPharmacy(u); }
    detail(u, id) { return this.bc.detail(u, id); }
    previewOffer(u, orderId, b) { return this.offers.previewQuote(u, orderId, b); }
    draftOffer(u, orderId, b) { return this.offers.upsertDraft(u, orderId, b); }
    submitOffer(u, orderId, offerId) { return this.offers.submitDraft(u, orderId, offerId); }
    haveAll() { throw new common_1.ServiceUnavailableException('legacy_broadcast_acceptance_disabled_use_offer_draft'); }
    havePartial() { throw new common_1.ServiceUnavailableException('legacy_broadcast_acceptance_disabled_use_offer_draft'); }
    reject(u, oid, b) { return this.bc.respondReject(u, oid, b); }
};
exports.ProviderBroadcastController = ProviderBroadcastController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':orderId/offers/preview'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "previewOffer", null);
__decorate([
    (0, common_1.Post)(':orderId/offers/draft'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "draftOffer", null);
__decorate([
    (0, common_1.Post)(':orderId/offers/:offerId/submit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Param)('offerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "submitOffer", null);
__decorate([
    (0, common_1.Post)(':orderId/i-have-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "haveAll", null);
__decorate([
    (0, common_1.Post)(':orderId/i-have-partial'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "havePartial", null);
__decorate([
    (0, common_1.Post)(':orderId/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProviderBroadcastController.prototype, "reject", null);
exports.ProviderBroadcastController = ProviderBroadcastController = __decorate([
    (0, common_1.Controller)('provider/pharmacy/broadcasts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_broadcast_service_1.PharmacyBroadcastService, pharmacy_offer_service_1.PharmacyOfferService])
], ProviderBroadcastController);
let AdminBroadcastController = class AdminBroadcastController {
    constructor(bc, expiry) {
        this.bc = bc;
        this.expiry = expiry;
    }
    advance() { throw new common_1.ServiceUnavailableException('manual_broadcast_advance_disabled_use_expiry_command'); }
    fallback(id) { return this.bc.fallbackSplit(id); }
    expireDue(offerCursor, broadcastCursor, limit) {
        return this.expiry.expireDuePharmacyOffers(new Date(), { offer_id: offerCursor || undefined, broadcast_id: broadcastCursor || undefined }, limit ? Number(limit) : undefined);
    }
    expireStale() { throw new common_1.ServiceUnavailableException('legacy_expiry_sweep_disabled_use_expire_due_command'); }
};
exports.AdminBroadcastController = AdminBroadcastController;
__decorate([
    (0, common_1.Post)(':orderId/advance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminBroadcastController.prototype, "advance", null);
__decorate([
    (0, common_1.Post)(':orderId/fallback-split'),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminBroadcastController.prototype, "fallback", null);
__decorate([
    (0, common_1.Post)('expire-due'),
    __param(0, (0, common_1.Query)('offer_cursor')),
    __param(1, (0, common_1.Query)('broadcast_cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminBroadcastController.prototype, "expireDue", null);
__decorate([
    (0, common_1.Post)('expire-stale'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminBroadcastController.prototype, "expireStale", null);
exports.AdminBroadcastController = AdminBroadcastController = __decorate([
    (0, common_1.Controller)('admin/pharmacy/broadcasts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [pharmacy_broadcast_service_1.PharmacyBroadcastService, pharmacy_expiry_command_service_1.PharmacyExpiryCommandService])
], AdminBroadcastController);
let AdminPharmacyInsuranceController = class AdminPharmacyInsuranceController {
    decide() { throw new common_1.ServiceUnavailableException('admin_insurance_decision_disabled_selected_pharmacy_required'); }
};
exports.AdminPharmacyInsuranceController = AdminPharmacyInsuranceController;
__decorate([
    (0, common_1.Post)(':orderId/insurance-decision'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPharmacyInsuranceController.prototype, "decide", null);
exports.AdminPharmacyInsuranceController = AdminPharmacyInsuranceController = __decorate([
    (0, common_1.Controller)('admin/pharmacy/orders'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminPharmacyInsuranceController);
let PharmacyChatController = class PharmacyChatController {
    constructor(chat) {
        this.chat = chat;
    }
    list(u, oid) { return this.chat.listThreads(u, oid); }
    msgs(u, id) { return this.chat.listMessages(u, id); }
    post(u, id, b) { return this.chat.postMessage(u, id, b); }
    accept(u, id, mid) { return this.chat.acceptSubstitute(u, id, mid); }
    reject(u, id) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
    remove(u, id) { return this.chat.rejectOrRemove(u, id, 'removed'); }
};
exports.PharmacyChatController = PharmacyChatController;
__decorate([
    (0, common_1.Get)('threads'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('order_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('threads/:id/messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "msgs", null);
__decorate([
    (0, common_1.Post)('threads/:id/messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "post", null);
__decorate([
    (0, common_1.Post)('threads/:id/accept-substitute/:msgId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('msgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('threads/:id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('threads/:id/remove-item'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PharmacyChatController.prototype, "remove", null);
exports.PharmacyChatController = PharmacyChatController = __decorate([
    (0, common_1.Controller)('pharmacy/chat'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_chat_service_1.PharmacyChatService])
], PharmacyChatController);
let AdminPharmacyChatController = class AdminPharmacyChatController {
    constructor(chat) {
        this.chat = chat;
    }
    sweep() { return this.chat.sweepAutoClose(); }
};
exports.AdminPharmacyChatController = AdminPharmacyChatController;
__decorate([
    (0, common_1.Post)('sweep-auto-close'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPharmacyChatController.prototype, "sweep", null);
exports.AdminPharmacyChatController = AdminPharmacyChatController = __decorate([
    (0, common_1.Controller)('admin/pharmacy/chat'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [pharmacy_chat_service_1.PharmacyChatService])
], AdminPharmacyChatController);
let ProviderShortageController = class ProviderShortageController {
    constructor(svc) {
        this.svc = svc;
    }
    report(u, b) { return this.svc.reportByPharmacy(u, b); }
    list(u, st) { return this.svc.list(u, st); }
};
exports.ProviderShortageController = ProviderShortageController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProviderShortageController.prototype, "report", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProviderShortageController.prototype, "list", null);
exports.ProviderShortageController = ProviderShortageController = __decorate([
    (0, common_1.Controller)('provider/pharmacy/shortage-flags'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pharmacy_shortage_service_1.PharmacyShortageService])
], ProviderShortageController);
let AdminShortageController = class AdminShortageController {
    constructor(svc) {
        this.svc = svc;
    }
    create(u, b) { return this.svc.createByAdmin(u, b); }
    list(u, st) { return this.svc.list(u, st); }
    getDashboard(u) { return this.svc.getShortageDashboard(u); }
    markShortage(u, medicineId, b) { return this.svc.adminMarkShortage(u, medicineId, b); }
    approve(u, id) { return this.svc.approve(u, id); }
    reject(u, id, b) { return this.svc.reject(u, id, b?.reason); }
    resolve(u, id) { return this.svc.resolve(u, id); }
};
exports.AdminShortageController = AdminShortageController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Post)(':id/mark'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "markShortage", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminShortageController.prototype, "resolve", null);
exports.AdminShortageController = AdminShortageController = __decorate([
    (0, common_1.Controller)('admin/pharmacy/shortage-flags'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [pharmacy_shortage_service_1.PharmacyShortageService])
], AdminShortageController);
let PatientShortageController = class PatientShortageController {
    constructor(svc) {
        this.svc = svc;
    }
    lookup(sku, gn) { return this.svc.lookupForPatient(sku, gn); }
};
exports.PatientShortageController = PatientShortageController;
__decorate([
    (0, common_1.Get)('lookup'),
    __param(0, (0, common_1.Query)('sku')),
    __param(1, (0, common_1.Query)('generic_name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PatientShortageController.prototype, "lookup", null);
exports.PatientShortageController = PatientShortageController = __decorate([
    (0, common_1.Controller)('patient/pharmacy/shortage-flags'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.PATIENT),
    __metadata("design:paramtypes", [pharmacy_shortage_service_1.PharmacyShortageService])
], PatientShortageController);
//# sourceMappingURL=pharmacy.controllers.js.map