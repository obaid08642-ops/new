"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyOpsService = void 0;
const common_1 = require("@nestjs/common");
let PharmacyOpsService = class PharmacyOpsService {
    unavailable() {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    incoming(_pharmacy) { return this.unavailable(); }
    preparing(_pharmacy) { return this.unavailable(); }
    ready(_pharmacy) { return this.unavailable(); }
    completed(_pharmacy) { return this.unavailable(); }
    refillOrders(_pharmacy) { return this.unavailable(); }
    basketReview(_pharmacy) { return this.unavailable(); }
    awaitingApproval(_pharmacy) { return this.unavailable(); }
    getInventory(_pharmacy) { return this.unavailable(); }
    updateStock(_pharmacy, _medicineId, _stockQty, _available = true) { return this.unavailable(); }
    addMedicineToInventory(_pharmacy, _body) { return this.unavailable(); }
    orderDetail(_pharmacy, _id) { return this.unavailable(); }
    markItemUnavailable(_pharmacy, _id, _idx) { return this.unavailable(); }
    restoreItem(_pharmacy, _id, _idx) { return this.unavailable(); }
    updateItemQty(_pharmacy, _id, _idx, _qty) { return this.unavailable(); }
    substituteItem(_pharmacy, _id, _idx, _body) { return this.unavailable(); }
    submitBasket(_pharmacy, _id, _note) { return this.unavailable(); }
    patientApproveBasket(_patient, _id) { return this.unavailable(); }
    patientRejectBasket(_patient, _id, _reason) { return this.unavailable(); }
    setInsuranceStatus(_pharmacy, _id, _status, _reason) { return this.unavailable(); }
};
exports.PharmacyOpsService = PharmacyOpsService;
exports.PharmacyOpsService = PharmacyOpsService = __decorate([
    (0, common_1.Injectable)()
], PharmacyOpsService);
//# sourceMappingURL=pharmacy_ops.service.js.map