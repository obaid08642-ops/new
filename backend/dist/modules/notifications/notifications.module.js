"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const bullmq_1 = require("@nestjs/bullmq");
const notifications_controller_1 = require("./notifications.controller");
const notifications_service_1 = require("./notifications.service");
const notification_schema_1 = require("../../schemas/notification.schema");
const notification_repository_1 = require("./repositories/notification.repository");
const notification_delivery_processor_1 = require("./notification-delivery.processor");
const sms_module_1 = require("../sms/sms.module");
const push_module_1 = require("../push/push.module");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: notification_schema_1.Notification.name, schema: notification_schema_1.NotificationSchema }]),
            bullmq_1.BullModule.registerQueue({ name: 'notifications-delivery' }),
            sms_module_1.SmsModule,
            push_module_1.PushModule,
        ],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [
            notifications_service_1.NotificationsService,
            notification_delivery_processor_1.NotificationDeliveryProcessor,
            { provide: 'NotificationRepository', useClass: notification_repository_1.NotificationRepository },
        ],
        exports: [notifications_service_1.NotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map