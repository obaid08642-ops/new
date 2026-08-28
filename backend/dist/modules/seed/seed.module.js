"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const seed_service_1 = require("./seed.service");
const user_schema_1 = require("../../schemas/user.schema");
const patient_profile_schema_1 = require("../../schemas/patient-profile.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const inventory_schema_1 = require("../../schemas/inventory.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const system_config_schema_1 = require("../../schemas/system-config.schema");
const facility_repository_1 = require("./repositories/facility.repository");
const labservice_repository_1 = require("./repositories/labservice.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const patientprofile_repository_1 = require("./repositories/patientprofile.repository");
const pharmacyinventory_repository_1 = require("./repositories/pharmacyinventory.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const systemconfig_repository_1 = require("./repositories/systemconfig.repository");
const user_repository_1 = require("./repositories/user.repository");
let SeedModule = class SeedModule {
};
exports.SeedModule = SeedModule;
exports.SeedModule = SeedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: patient_profile_schema_1.PatientProfile.name, schema: patient_profile_schema_1.PatientProfileSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: medicine_schema_1.Medicine.name, schema: medicine_schema_1.MedicineSchema },
                { name: inventory_schema_1.PharmacyInventory.name, schema: inventory_schema_1.PharmacyInventorySchema },
                { name: facility_schema_1.Facility.name, schema: facility_schema_1.FacilitySchema },
                { name: 'LabService', schema: lab_schema_1.LabServiceSchema },
                { name: system_config_schema_1.SystemConfig.name, schema: system_config_schema_1.SystemConfigSchema },
            ]),
        ],
        providers: [seed_service_1.SeedService, { provide: 'FacilityRepository', useClass: facility_repository_1.FacilityRepository }, { provide: 'LabServiceRepository', useClass: labservice_repository_1.LabServiceRepository }, { provide: 'MedicineRepository', useClass: medicine_repository_1.MedicineRepository }, { provide: 'PatientProfileRepository', useClass: patientprofile_repository_1.PatientProfileRepository }, { provide: 'PharmacyInventoryRepository', useClass: pharmacyinventory_repository_1.PharmacyInventoryRepository }, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }, { provide: 'SystemConfigRepository', useClass: systemconfig_repository_1.SystemConfigRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }],
        exports: [seed_service_1.SeedService],
    })
], SeedModule);
//# sourceMappingURL=seed.module.js.map