"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalProfileModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const medical_profile_controller_1 = require("./medical-profile.controller");
const medical_profile_service_1 = require("./medical-profile.service");
const medical_profile_schema_1 = require("../../schemas/medical-profile.schema");
const medicalprofile_repository_1 = require("./repositories/medicalprofile.repository");
let MedicalProfileModule = class MedicalProfileModule {
};
exports.MedicalProfileModule = MedicalProfileModule;
exports.MedicalProfileModule = MedicalProfileModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'MedicalProfile', schema: medical_profile_schema_1.MedicalProfileSchema },
            ])],
        controllers: [medical_profile_controller_1.MedicalProfileController],
        providers: [medical_profile_service_1.MedicalProfileService, { provide: 'MedicalProfileRepository', useClass: medicalprofile_repository_1.MedicalProfileRepository }],
        exports: [medical_profile_service_1.MedicalProfileService],
    })
], MedicalProfileModule);
//# sourceMappingURL=medical-profile.module.js.map