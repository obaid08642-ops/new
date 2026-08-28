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
exports.BusinessRulesModule = exports.BusinessRulesController = exports.BusinessRulesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
let BusinessRulesService = class BusinessRulesService {
    constructor(providers) {
        this.providers = providers;
        this.surgeConfig = { startHour: 18, endHour: 22, multiplier: 1.1 };
    }
    getSurgeConfig() { return this.surgeConfig; }
    updateSurgeConfig(config) { this.surgeConfig = { ...this.surgeConfig, ...config }; return this.surgeConfig; }
    validateInsurance(ctx, r) {
        if (!ctx.insurance?.provider)
            return;
        if (!ctx.provider)
            return;
        const accepted = (ctx.provider.accepted_insurance || []).map(x => String(x).toLowerCase());
        if (accepted.length === 0) {
            r.errors.push('provider_does_not_accept_any_insurance');
            r.ok = false;
            return;
        }
        if (!accepted.includes(String(ctx.insurance.provider).toLowerCase())) {
            r.errors.push(`provider_does_not_accept_${ctx.insurance.provider}`);
            r.ok = false;
            return;
        }
        if (ctx.service?.key && ctx.insurance.eligible_services && !ctx.insurance.eligible_services.includes(ctx.service.key)) {
            r.warnings.push('service_not_in_insurance_eligible_list');
        }
        r.meta.insurance_validated = true;
    }
    validateEligibility(ctx, r) {
        if (!ctx.service || !ctx.patient)
            return;
        if (typeof ctx.service.min_age === 'number' && typeof ctx.patient.age === 'number' && ctx.patient.age < ctx.service.min_age) {
            r.errors.push(`patient_below_min_age_${ctx.service.min_age}`);
            r.ok = false;
        }
        if (typeof ctx.service.max_age === 'number' && typeof ctx.patient.age === 'number' && ctx.patient.age > ctx.service.max_age) {
            r.errors.push(`patient_above_max_age_${ctx.service.max_age}`);
            r.ok = false;
        }
        if (ctx.service.sex_restriction && ctx.patient.sex && ctx.service.sex_restriction !== ctx.patient.sex) {
            r.errors.push(`service_restricted_to_${ctx.service.sex_restriction}`);
            r.ok = false;
        }
    }
    validateProviderAcceptance(ctx, r) {
        if (!ctx.provider)
            return;
        if (ctx.service?.key && ctx.provider.capabilities && ctx.provider.capabilities.length > 0) {
            const has = ctx.provider.capabilities.map(c => String(c).toLowerCase()).includes(String(ctx.service.key).toLowerCase());
            if (!has) {
                r.warnings.push('provider_capability_not_explicitly_listed');
            }
        }
        const typeMap = {
            pharmacy: ['pharmacy'], lab: ['lab', 'hospital'], radiology: ['radiology', 'hospital'],
            nursing: ['home_care', 'hospital'], consultation: ['doctor', 'clinic', 'hospital'],
        };
        const allowed = typeMap[ctx.kind] || [];
        if (ctx.provider.type && allowed.length && !allowed.includes(ctx.provider.type)) {
            r.errors.push(`provider_type_mismatch:${ctx.provider.type}_for_${ctx.kind}`);
            r.ok = false;
        }
    }
    computePricing(ctx, r) {
        const base = ctx.service?.price ?? 0;
        const taxRate = 0.15;
        const tax = Math.round(base * taxRate * 100) / 100;
        let insuranceDiscount = 0;
        if (ctx.insurance?.provider && r.meta.insurance_validated && r.ok) {
            insuranceDiscount = Math.round(base * 0.8 * 100) / 100;
        }
        let surge = 1;
        if (ctx.scheduled_at) {
            const h = new Date(ctx.scheduled_at).getHours();
            if (h >= this.surgeConfig.startHour && h <= this.surgeConfig.endHour) {
                surge = this.surgeConfig.multiplier;
            }
        }
        const subtotal = Math.max(0, base - insuranceDiscount);
        const finalPrice = Math.round((subtotal + tax) * surge * 100) / 100;
        r.base_price = base;
        r.tax = tax;
        r.insurance_discount = insuranceDiscount;
        r.surge_multiplier = surge;
        r.final_price = finalPrice;
    }
    validatePaymentMethod(ctx, r) {
        if (!ctx.payment_method)
            return;
        const sc = ctx.service_context;
        if (!sc)
            return;
        const allowed = {
            home_visit: ['card', 'insurance'],
            online_consultation: ['card'],
            in_clinic: ['cash', 'card', 'insurance'],
            pharmacy_delivery: ['cash', 'card', 'insurance'],
        };
        const allowedList = allowed[sc] || ['cash', 'card', 'insurance'];
        if (!allowedList.includes(ctx.payment_method)) {
            r.errors.push(`payment_method_${ctx.payment_method}_not_allowed_for_${sc}`);
            r.ok = false;
        }
    }
    async validate(ctx) {
        const r = { ok: true, errors: [], warnings: [], meta: {} };
        if (ctx.provider?.user_id && !ctx.provider.type) {
            const p = await this.providers.findOne({ user_id: ctx.provider.user_id }, { type: 1, accepted_insurance: 1, nursing_services: 1, test_categories: 1, equipment_list: 1, _id: 0 }).lean();
            if (p) {
                ctx.provider.type = p.type;
                ctx.provider.accepted_insurance = p.accepted_insurance || [];
                ctx.provider.capabilities = [
                    ...(p.nursing_services || []).map((n) => n.key),
                    ...(p.test_categories || []),
                    ...(p.equipment_list || []),
                ];
            }
        }
        this.validateProviderAcceptance(ctx, r);
        this.validateInsurance(ctx, r);
        this.validateEligibility(ctx, r);
        this.validatePaymentMethod(ctx, r);
        this.computePricing(ctx, r);
        return r;
    }
};
exports.BusinessRulesService = BusinessRulesService;
exports.BusinessRulesService = BusinessRulesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BusinessRulesService);
let BusinessRulesController = class BusinessRulesController {
    constructor(svc) {
        this.svc = svc;
    }
    getSurge() { return this.svc.getSurgeConfig(); }
    updateSurge(body) { return this.svc.updateSurgeConfig(body); }
    validate(ctx) { return this.svc.validate(ctx); }
};
exports.BusinessRulesController = BusinessRulesController;
__decorate([
    (0, common_1.Get)('config/surge'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BusinessRulesController.prototype, "getSurge", null);
__decorate([
    (0, common_1.Post)('config/surge'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessRulesController.prototype, "updateSurge", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessRulesController.prototype, "validate", null);
exports.BusinessRulesController = BusinessRulesController = __decorate([
    (0, common_1.Controller)('business-rules'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BusinessRulesService])
], BusinessRulesController);
let BusinessRulesModule = class BusinessRulesModule {
};
exports.BusinessRulesModule = BusinessRulesModule;
exports.BusinessRulesModule = BusinessRulesModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema }])],
        controllers: [BusinessRulesController],
        providers: [BusinessRulesService],
        exports: [BusinessRulesService],
    })
], BusinessRulesModule);
//# sourceMappingURL=business-rules.module.js.map