"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("../../common/enums");
let BillingService = class BillingService {
    constructor() {
        this.VAT_RATE = 0.15;
    }
    calculateCommission(baseAmount, providerType, surgeMultiplier = 1.0) {
        let commissionRate = 0;
        switch (providerType) {
            case enums_1.ProviderType.DOCTOR:
            case enums_1.ProviderType.HOSPITAL:
            case enums_1.ProviderType.CLINIC:
                commissionRate = 0.15;
                break;
            case enums_1.ProviderType.HOME_CARE:
            case enums_1.ProviderType.NURSING:
                commissionRate = 0.10;
                break;
            case enums_1.ProviderType.PHARMACY:
                commissionRate = 0.05;
                break;
            case enums_1.ProviderType.LAB:
            case enums_1.ProviderType.RADIOLOGY:
                commissionRate = 0.10;
                break;
            default:
                commissionRate = 0.10;
                break;
        }
        const finalAmount = baseAmount * surgeMultiplier;
        const nabdahCommissionAmount = finalAmount * commissionRate;
        const nabdahVatAmount = nabdahCommissionAmount * this.VAT_RATE;
        const providerBaseAmount = finalAmount - nabdahCommissionAmount - nabdahVatAmount;
        return {
            providerBaseAmount: parseFloat(providerBaseAmount.toFixed(2)),
            nabdahCommissionAmount: parseFloat(nabdahCommissionAmount.toFixed(2)),
            nabdahVatAmount: parseFloat(nabdahVatAmount.toFixed(2)),
            totalPatientBilled: parseFloat(finalAmount.toFixed(2)),
            commissionRate,
            vatRate: this.VAT_RATE,
        };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)()
], BillingService);
//# sourceMappingURL=billing.service.js.map