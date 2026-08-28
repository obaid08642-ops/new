"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const labs_controller_1 = require("./labs.controller");
const lab_results_controller_1 = require("./lab-results.controller");
const labs_engine_controller_1 = require("./controllers/labs-engine.controller");
const labs_service_1 = require("./labs.service");
const lab_results_service_1 = require("./lab-results.service");
const lab_pdf_service_1 = require("./lab-pdf.service");
const lab_schema_1 = require("../../schemas/lab.schema");
const lab_result_schema_1 = require("../../schemas/lab-result.schema");
const lab_booking_schema_1 = require("./schemas/lab-booking.schema");
const lab_catalog_schema_1 = require("./schemas/lab-catalog.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const labbooking_repository_1 = require("./repositories/labbooking.repository");
const labresult_repository_1 = require("./repositories/labresult.repository");
const labsample_repository_1 = require("./repositories/labsample.repository");
const labservice_repository_1 = require("./repositories/labservice.repository");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
let LabsModule = class LabsModule {
};
exports.LabsModule = LabsModule;
exports.LabsModule = LabsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'LabService', schema: lab_schema_1.LabServiceSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'LabCenterBooking', schema: lab_booking_schema_1.LabBookingSchema },
                { name: 'LabCatalog', schema: lab_catalog_schema_1.LabCatalogSchema },
                { name: 'LabResult', schema: lab_result_schema_1.LabResultSchema },
                { name: 'LabSample', schema: lab_schema_1.LabSampleSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
            ]),
        ],
        controllers: [labs_controller_1.LabsController, lab_results_controller_1.LabResultsController, labs_engine_controller_1.LabsEngineController],
        providers: [labs_service_1.LabsService, lab_results_service_1.LabResultsService, lab_pdf_service_1.LabPdfService, { provide: 'LabBookingRepository', useClass: labbooking_repository_1.LabBookingRepository }, { provide: 'LabResultRepository', useClass: labresult_repository_1.LabResultRepository }, { provide: 'LabSampleRepository', useClass: labsample_repository_1.LabSampleRepository }, { provide: 'LabServiceRepository', useClass: labservice_repository_1.LabServiceRepository }],
        exports: [labs_service_1.LabsService, lab_results_service_1.LabResultsService, lab_pdf_service_1.LabPdfService],
    })
], LabsModule);
//# sourceMappingURL=labs.module.js.map