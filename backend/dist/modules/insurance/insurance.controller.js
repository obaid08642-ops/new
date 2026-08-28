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
exports.InsuranceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../../common/auth.guard");
const openapi_config_1 = require("../../config/openapi.config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const insurance_module_1 = require("./insurance.module");
let InsuranceController = class InsuranceController {
    constructor(profileModel, insuranceService) {
        this.profileModel = profileModel;
        this.insuranceService = insuranceService;
    }
    async getActivePolicies(req) {
        const profile = await this.profileModel.findOne({ user_id: req.user.id });
        return { policies: profile?.insurance_details ? [profile.insurance_details] : [] };
    }
    async listCompanies() {
        return this.insuranceService.listCompanies();
    }
};
exports.InsuranceController = InsuranceController;
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiBearerAuth)(openapi_config_1.NABDAH_ACCESS_TOKEN_SECURITY_SCHEME),
    (0, swagger_1.ApiOperation)({
        summary: 'Get the authenticated patient’s active insurance projection',
        description: 'Returns `insurance_details` as a zero-or-one `policies` collection for active-policy consumers. It is not interchangeable with the editable `insurance` object from `GET /users/me/insurance` or the deprecated legacy `insurance_policies` collection.',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Zero or one active `insurance_details` record for the authenticated patient.',
        schema: {
            type: 'object',
            required: ['policies'],
            properties: {
                policies: {
                    type: 'array',
                    maxItems: 1,
                    description: 'Active-policy projection populated from `insurance_details` when present.',
                    items: { type: 'object', additionalProperties: true },
                },
            },
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing, malformed, or expired bearer token.' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Guest accounts cannot access insurance operations.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "getActivePolicies", null);
__decorate([
    (0, common_1.Get)('companies'),
    (0, swagger_1.ApiBearerAuth)(openapi_config_1.NABDAH_ACCESS_TOKEN_SECURITY_SCHEME),
    (0, swagger_1.ApiOperation)({
        summary: 'List active insurance companies and their plan tiers',
        description: 'Single source of truth for active company catalog entries and embedded plan tiers. This route delegates to the central insurance catalogue service; legacy/inactive records remain administratively retrievable and are never deleted.',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Active insurance companies with sorted plan tiers.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name_ar: { type: 'string' },
                    name_en: { type: 'string' },
                    plans: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                code: { type: 'string' },
                                name_ar: { type: 'string' },
                                name_en: { type: 'string' },
                                tier_level: { type: 'number' },
                            },
                            additionalProperties: true,
                        },
                    },
                },
                additionalProperties: true,
            },
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing, malformed, or expired bearer token.' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Guest accounts cannot access insurance operations.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "listCompanies", null);
exports.InsuranceController = InsuranceController = __decorate([
    (0, swagger_1.ApiTags)('Insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.NoGuestsGuard),
    (0, common_1.Controller)('insurance'),
    __param(0, (0, mongoose_1.InjectModel)('PatientProfile')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        insurance_module_1.InsuranceService])
], InsuranceController);
//# sourceMappingURL=insurance.controller.js.map