"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const seo_controller_1 = require("./seo.controller");
const seo_service_1 = require("./seo.service");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const facility_repository_1 = require("./repositories/facility.repository");
const homecareservice_repository_1 = require("./repositories/homecareservice.repository");
const labservice_repository_1 = require("./repositories/labservice.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const article_repository_1 = require("./repositories/article.repository");
const article_schema_1 = require("../../schemas/article.schema");
let SeoModule = class SeoModule {
};
exports.SeoModule = SeoModule;
exports.SeoModule = SeoModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Medicine', schema: medicine_schema_1.MedicineSchema },
                { name: 'LabService', schema: lab_schema_1.LabServiceSchema },
                { name: 'HomeCareService', schema: home_care_schema_1.HomeCareServiceSchema },
                { name: 'Facility', schema: facility_schema_1.FacilitySchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'Article', schema: article_schema_1.ArticleSchema },
            ])],
        controllers: [seo_controller_1.SeoController],
        providers: [seo_service_1.SeoService, { provide: 'FacilityRepository', useClass: facility_repository_1.FacilityRepository },
            { provide: 'ArticleRepository', useClass: article_repository_1.ArticleRepository }, { provide: 'HomeCareServiceRepository', useClass: homecareservice_repository_1.HomeCareServiceRepository }, { provide: 'LabServiceRepository', useClass: labservice_repository_1.LabServiceRepository }, { provide: 'MedicineRepository', useClass: medicine_repository_1.MedicineRepository }, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }],
        exports: [seo_service_1.SeoService],
    })
], SeoModule);
//# sourceMappingURL=seo.module.js.map