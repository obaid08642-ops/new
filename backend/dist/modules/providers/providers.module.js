"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvidersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const providers_controller_1 = require("./providers.controller");
const providers_service_1 = require("./providers.service");
const user_schema_1 = require("../../schemas/user.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const user_repository_1 = require("./repositories/user.repository");
const hospital_sub_entity_schema_1 = require("./schemas/hospital-sub-entity.schema");
const hospital_enterprise_controller_1 = require("./controllers/hospital-enterprise.controller");
const provider_branch_schema_1 = require("../../schemas/provider-branch.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
let ProvidersModule = class ProvidersModule {
};
exports.ProvidersModule = ProvidersModule;
exports.ProvidersModule = ProvidersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: hospital_sub_entity_schema_1.HospitalSubEntity.name, schema: hospital_sub_entity_schema_1.HospitalSubEntitySchema },
                { name: provider_branch_schema_1.ProviderBranch.name, schema: provider_branch_schema_1.ProviderBranchSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
            ]),
        ],
        controllers: [providers_controller_1.ProvidersController, hospital_enterprise_controller_1.HospitalEnterpriseController],
        providers: [providers_service_1.ProvidersService, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }],
        exports: [providers_service_1.ProvidersService],
    })
], ProvidersModule);
//# sourceMappingURL=providers.module.js.map