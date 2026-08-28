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
exports.RadiologyModule = exports.RadiologySeed = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const radiology_seed_1 = require("./radiology.seed");
const radiology_controller_1 = require("./controllers/radiology.controller");
const radiology_controller_2 = require("./radiology.controller");
const radiology_service_1 = require("./radiology.service");
const radiology_provider_controller_1 = require("./controllers/radiology-provider.controller");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const requests_schema_1 = require("../provider/schemas/requests.schema");
const radiology_booking_schema_1 = require("./schemas/radiology-booking.schema");
const user_schema_1 = require("../../schemas/user.schema");
const lab_result_schema_1 = require("../../schemas/lab-result.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const labresult_repository_1 = require("./repositories/labresult.repository");
const radiologybooking_repository_1 = require("./repositories/radiologybooking.repository");
const radiologyservice_repository_1 = require("./repositories/radiologyservice.repository");
const radiology_notification_listener_1 = require("./listeners/radiology-notification.listener");
const radiology_reminder_cron_1 = require("./cron/radiology-reminder.cron");
const storage_module_1 = require("../storage/storage.module");
let RadiologySeed = class RadiologySeed {
    constructor(svcModel) {
        this.svcModel = svcModel;
        this.logger = new common_1.Logger('RadiologySeed');
    }
    async onModuleInit() {
        const existing = await this.svcModel.countDocuments({ id: { $ne: null } });
        if (existing >= radiology_seed_1.RADIOLOGY_SEED.length)
            return;
        let ok = 0;
        for (const x of radiology_seed_1.RADIOLOGY_SEED) {
            try {
                await this.svcModel.updateOne({ short_code: x.short_code }, { $setOnInsert: { ...x, id: x.id || require('uuid').v4(), active: true } }, { upsert: true });
                ok++;
            }
            catch (e) {
                this.logger.error(`seed_doc_failed (${x?.short_code}): ${e?.message?.slice(0, 120)}`);
            }
        }
        this.logger.log(`Seeded ${ok}/${radiology_seed_1.RADIOLOGY_SEED.length} radiology services`);
    }
};
exports.RadiologySeed = RadiologySeed;
exports.RadiologySeed = RadiologySeed = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('RadiologyService')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RadiologySeed);
let RadiologyModule = class RadiologyModule {
};
exports.RadiologyModule = RadiologyModule;
exports.RadiologyModule = RadiologyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'RadiologyService', schema: radiology_schema_1.RadiologyServiceSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'RadiologyCenterBooking', schema: radiology_booking_schema_1.RadiologyBookingSchema },
                { name: 'RadiologyMachine', schema: radiology_schema_1.RadiologyMachineSchema },
                { name: 'LabResult', schema: lab_result_schema_1.LabResultSchema },
                { name: 'ProviderNotification', schema: requests_schema_1.ProviderNotificationSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'StorageObject', schema: storage_module_1.StorageObjectSchema },
            ]),
        ],
        controllers: [radiology_controller_1.RadiologyController, radiology_provider_controller_1.RadiologyProviderController, radiology_controller_2.RadiologyController],
        providers: [
            radiology_service_1.RadiologyOpsService,
            radiology_notification_listener_1.RadiologyNotificationListener,
            radiology_reminder_cron_1.RadiologyReminderCron,
            RadiologySeed,
            { provide: 'LabResultRepository', useClass: labresult_repository_1.LabResultRepository },
            { provide: 'RadiologyBookingRepository', useClass: radiologybooking_repository_1.RadiologyBookingRepository },
            { provide: 'RadiologyServiceRepository', useClass: radiologyservice_repository_1.RadiologyServiceRepository }
        ],
        exports: [radiology_service_1.RadiologyOpsService],
    })
], RadiologyModule);
//# sourceMappingURL=radiology.module.js.map