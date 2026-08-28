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
exports.UsersInsuranceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const openapi_config_1 = require("../../config/openapi.config");
const users_service_1 = require("./users.service");
const auth_guard_1 = require("../../common/auth.guard");
const canonicalInsuranceSchema = {
    type: 'object',
    description: 'Canonical editable `PatientProfile.insurance` object. Verification is server-controlled and is reset to `false` on patient update.',
    properties: {
        provider: { type: 'string', example: 'bupa' },
        policy_number: { type: 'string', example: 'POL-123456' },
        network: { type: 'string', example: 'gold' },
        class: { type: 'string', example: 'A' },
        expiry_date: { type: 'string', example: '2027-12-31' },
        member_name: { type: 'string' },
        national_id: { type: 'string', description: 'Sensitive identity data; clients must not log this value.' },
        verified: { type: 'boolean', readOnly: true, example: false },
        pdf_url: { type: 'string', format: 'uri' },
        ocr_extracted: { type: 'boolean' },
        nphies_eligible: { type: 'boolean' },
    },
    additionalProperties: true,
};
let UsersInsuranceController = class UsersInsuranceController {
    constructor(users) {
        this.users = users;
    }
    async getInsurance(id) {
        const profile = await this.users.getPatientProfile(id);
        return profile.insurance || null;
    }
    async updateInsurance(id, body) {
        const profile = await this.users.getPatientProfile(id);
        const updatedInsurance = {
            ...profile.insurance,
            ...body,
            verified: false,
        };
        await this.users.updatePatientProfile(id, { insurance: updatedInsurance });
        return updatedInsurance;
    }
};
exports.UsersInsuranceController = UsersInsuranceController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)(openapi_config_1.NABDAH_ACCESS_TOKEN_SECURITY_SCHEME),
    (0, swagger_1.ApiOperation)({
        summary: 'Get the authenticated patient’s canonical insurance record',
        description: 'Returns the editable `insurance` object, or `null` when none is recorded. This differs from the deprecated `GET /user/insurance` legacy array and from `GET /insurance/active`, which returns the active-policy projection.',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Canonical insurance object, or `null` if the patient has not recorded insurance.',
        schema: { ...canonicalInsuranceSchema, nullable: true },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing, malformed, or expired bearer token.' }),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersInsuranceController.prototype, "getInsurance", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(openapi_config_1.NABDAH_ACCESS_TOKEN_SECURITY_SCHEME),
    (0, swagger_1.ApiOperation)({
        summary: 'Create or update the authenticated patient’s insurance record',
        description: 'Upserts fields into the authenticated patient’s canonical `insurance` object. The backend always sets `verified: false`; only an authorized administrative verification workflow may later verify the record.',
    }),
    (0, swagger_1.ApiBody)({
        description: 'Partial canonical insurance fields. Supplying `verified` does not verify coverage because the server overwrites it with `false`.',
        schema: canonicalInsuranceSchema,
    }),
    (0, swagger_1.ApiCreatedResponse)({
        description: 'Updated canonical insurance object with `verified: false`.',
        schema: canonicalInsuranceSchema,
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Missing, malformed, or expired bearer token.' }),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersInsuranceController.prototype, "updateInsurance", null);
exports.UsersInsuranceController = UsersInsuranceController = __decorate([
    (0, swagger_1.ApiTags)('Insurance'),
    (0, common_1.Controller)('users/me/insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersInsuranceController);
//# sourceMappingURL=users.insurance.controller.js.map