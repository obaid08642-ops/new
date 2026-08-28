"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const health_service_1 = require("./health.service");
const health_controller_1 = require("./health.controller");
const orders_module_1 = require("../orders/orders.module");
const health_schema_1 = require("../../schemas/health.schema");
const medicationreminder_repository_1 = require("./repositories/medicationreminder.repository");
const sleepreading_repository_1 = require("./repositories/sleepreading.repository");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
let HealthModule = class HealthModule {
};
exports.HealthModule = HealthModule;
exports.HealthModule = HealthModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'VitalReading', schema: health_schema_1.VitalReadingSchema },
                { name: 'MedicationReminder', schema: health_schema_1.MedicationReminderSchema },
                { name: 'SleepReading', schema: health_schema_1.SleepReadingSchema },
            ]), (0, common_1.forwardRef)(() => orders_module_1.OrdersModule)],
        controllers: [health_controller_1.HealthModuleController],
        providers: [health_service_1.HealthService, idempotency_interceptor_1.IdempotencyInterceptor, { provide: 'MedicationReminderRepository', useClass: medicationreminder_repository_1.MedicationReminderRepository }, { provide: 'SleepReadingRepository', useClass: sleepreading_repository_1.SleepReadingRepository }, { provide: 'VitalReadingRepository', useClass: vitalreading_repository_1.VitalReadingRepository }],
        exports: [health_service_1.HealthService],
    })
], HealthModule);
//# sourceMappingURL=health.module.js.map