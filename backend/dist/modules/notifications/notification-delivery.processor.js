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
exports.NotificationDeliveryProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
let NotificationDeliveryProcessor = class NotificationDeliveryProcessor extends bullmq_1.WorkerHost {
    constructor(svc) {
        super();
        this.svc = svc;
        this.logger = new common_1.Logger('NotificationDelivery');
    }
    async process(job) {
        if (job.name !== 'deliver')
            return;
        await this.svc.deliverById(job.data.id);
    }
};
exports.NotificationDeliveryProcessor = NotificationDeliveryProcessor;
exports.NotificationDeliveryProcessor = NotificationDeliveryProcessor = __decorate([
    (0, bullmq_1.Processor)('notifications-delivery'),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationDeliveryProcessor);
//# sourceMappingURL=notification-delivery.processor.js.map