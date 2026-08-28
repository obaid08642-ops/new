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
exports.HomeCareModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const home_care_controller_1 = require("./home-care.controller");
const home_care_tracking_controller_1 = require("./controllers/home-care-tracking.controller");
const home_care_service_1 = require("./home-care.service");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const home_care_seed_1 = require("./home-care.seed");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const careplan_repository_1 = require("./repositories/careplan.repository");
const homecarebooking_repository_1 = require("./repositories/homecarebooking.repository");
const homecareservice_repository_1 = require("./repositories/homecareservice.repository");
const medicalsupplyrequest_repository_1 = require("./repositories/medicalsupplyrequest.repository");
const nursingvisitreport_repository_1 = require("./repositories/nursingvisitreport.repository");
let HomeCareModule = class HomeCareModule {
    constructor(svcModel) {
        this.svcModel = svcModel;
        this.logger = new common_1.Logger('HomeCareSeed');
    }
    async onModuleInit() {
        const existing = await this.svcModel.countDocuments({ id: { $ne: null } });
        if (existing >= home_care_seed_1.HOME_CARE_SEED.length)
            return;
        let ok = 0;
        for (const x of home_care_seed_1.HOME_CARE_SEED) {
            try {
                const doc = {
                    id: x.id || require('uuid').v4(),
                    name_ar: x.title?.ar,
                    name_en: x.title?.en,
                    description_ar: x.description?.ar,
                    description_en: x.description?.en,
                    category: x.category,
                    price: x.basePrice,
                    duration: 'hour',
                    duration_value: Math.max(1, Math.round((x.estimatedDurationMins || 60) / 60)),
                    icon: x.iconName || 'general',
                    active: true,
                };
                await this.svcModel.updateOne({ name_en: doc.name_en, category: doc.category }, { $setOnInsert: doc }, { upsert: true });
                ok++;
            }
            catch (e) {
                this.logger.error(`seed_doc_failed (${x?.title?.en}): ${e?.message?.slice(0, 120)}`);
            }
        }
        this.logger.log(`Seeded ${ok}/${home_care_seed_1.HOME_CARE_SEED.length} home-care services`);
    }
};
exports.HomeCareModule = HomeCareModule;
exports.HomeCareModule = HomeCareModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'HomeCareService', schema: home_care_schema_1.HomeCareServiceSchema },
                { name: 'NurseProvider', schema: home_care_schema_1.NurseProviderSchema },
                { name: 'HomeCarePackage', schema: home_care_schema_1.HomeCarePackageSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: 'NursingVisitReport', schema: home_care_schema_1.NursingVisitReportSchema },
                { name: 'CarePlan', schema: home_care_schema_1.CarePlanSchema },
                { name: 'MedicalSupplyRequest', schema: home_care_schema_1.MedicalSupplyRequestSchema },
            ]),
        ],
        controllers: [home_care_controller_1.NursingController, home_care_controller_1.HomeCareContractController, home_care_tracking_controller_1.HomeCareTrackingController],
        providers: [home_care_service_1.HomeCareSvc, { provide: 'CarePlanRepository', useClass: careplan_repository_1.CarePlanRepository }, { provide: 'HomeCareBookingRepository', useClass: homecarebooking_repository_1.HomeCareBookingRepository }, { provide: 'HomeCareServiceRepository', useClass: homecareservice_repository_1.HomeCareServiceRepository }, { provide: 'MedicalSupplyRequestRepository', useClass: medicalsupplyrequest_repository_1.MedicalSupplyRequestRepository }, { provide: 'NursingVisitReportRepository', useClass: nursingvisitreport_repository_1.NursingVisitReportRepository }],
        exports: [home_care_service_1.HomeCareSvc],
    }),
    __param(0, (0, mongoose_1.InjectModel)('HomeCareService')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], HomeCareModule);
//# sourceMappingURL=home-care.module.js.map