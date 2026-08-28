"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const users_service_1 = require("./users.service");
const users_controller_1 = require("./users.controller");
const users_addresses_controller_1 = require("./users.addresses.controller");
const users_insurance_controller_1 = require("./users.insurance.controller");
const user_insurance_controller_1 = require("./user.insurance.controller");
const user_schema_1 = require("../../schemas/user.schema");
const patient_profile_schema_1 = require("../../schemas/patient-profile.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const user_repository_1 = require("./repositories/user.repository");
const patient_profile_repository_1 = require("./repositories/patient-profile.repository");
const provider_profile_repository_1 = require("./repositories/provider-profile.repository");
const data_retention_service_1 = require("./data-retention.service");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: patient_profile_schema_1.PatientProfile.name, schema: patient_profile_schema_1.PatientProfileSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
            ]),
        ],
        controllers: [users_controller_1.UsersController, users_addresses_controller_1.UsersAddressesController, users_insurance_controller_1.UsersInsuranceController, user_insurance_controller_1.UserInsuranceController],
        providers: [
            users_service_1.UsersService,
            { provide: 'UserRepository', useClass: user_repository_1.UserRepository },
            { provide: 'PatientProfileRepository', useClass: patient_profile_repository_1.PatientProfileRepository },
            { provide: 'ProviderProfileRepository', useClass: provider_profile_repository_1.ProviderProfileRepository },
            data_retention_service_1.DataRetentionService
        ],
        exports: [users_service_1.UsersService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map