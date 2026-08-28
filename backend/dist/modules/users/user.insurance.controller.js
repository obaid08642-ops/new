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
exports.UserInsuranceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../../common/auth.guard");
const openapi_config_1 = require("../../config/openapi.config");
const patient_profile_repository_1 = require("./repositories/patient-profile.repository");
let UserInsuranceController = class UserInsuranceController {
    constructor(patientProfileRepo) {
        this.patientProfileRepo = patientProfileRepo;
    }
    async getInsurance(user) {
        const profile = await this.patientProfileRepo.findOne({ user_id: user.id });
        return { policies: profile?.insurance_policies || [] };
    }
};
exports.UserInsuranceController = UserInsuranceController;
__decorate([
    (0, common_1.Get)('insurance'),
    (0, swagger_1.ApiBearerAuth)(openapi_config_1.NABDAH_ACCESS_TOKEN_SECURITY_SCHEME),
    (0, swagger_1.ApiOperation)({
        summary: 'Get patient insurance policies (legacy compatibility)',
        description: 'Deprecated compatibility route. Use `GET /users/me/insurance` for the canonical editable patient insurance object, or `GET /insurance/active` for the normalized active-policy projection. The authenticated patient can only read their own profile.',
        deprecated: true,
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Legacy insurance-policy collection. An empty collection means no legacy policies were recorded.',
        schema: {
            type: 'object',
            required: ['policies'],
            properties: {
                policies: {
                    type: 'array',
                    description: 'Legacy `insurance_policies` records retained verbatim for client compatibility.',
                    items: { type: 'object', additionalProperties: true },
                },
            },
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing, malformed, or expired bearer token.' }),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserInsuranceController.prototype, "getInsurance", null);
exports.UserInsuranceController = UserInsuranceController = __decorate([
    (0, swagger_1.ApiTags)('Insurance'),
    (0, common_1.Controller)('user'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Inject)('PatientProfileRepository')),
    __metadata("design:paramtypes", [patient_profile_repository_1.PatientProfileRepository])
], UserInsuranceController);
//# sourceMappingURL=user.insurance.controller.js.map