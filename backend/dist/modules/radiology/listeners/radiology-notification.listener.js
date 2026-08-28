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
var RadiologyNotificationListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadiologyNotificationListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let RadiologyNotificationListener = RadiologyNotificationListener_1 = class RadiologyNotificationListener {
    constructor(notificationModel) {
        this.notificationModel = notificationModel;
        this.logger = new common_1.Logger(RadiologyNotificationListener_1.name);
    }
    async handleRadiologyDoctorNotifyEvent(payload) {
        this.logger.log(`Received radiology.doctor_notify event for Doctor ${payload.doctorId} regarding Patient ${payload.patientId}`);
        try {
            await this.notificationModel.create({
                user_id: payload.doctorId,
                user_type: 'provider',
                title: 'نتيجة أشعة جاهزة لمريضك',
                title_en: 'Radiology Results Ready for Patient',
                body: `تم إصدار تقرير الأشعة للمريض ${payload.patientName}. يمكنك استعراض التقرير والصور الآن.`,
                body_en: `Radiology report for ${payload.patientName} is ready. You can view the report and DICOM images now.`,
                type: 'RADIOLOGY_RESULT',
                action_url: `/provider/radiology/${payload.reportId}`,
                metadata: {
                    patient_id: payload.patientId,
                    report_id: payload.reportId,
                    pdf_url: payload.pdfUrl,
                    dicom_viewer_url: payload.dicomViewerUrl,
                },
                read: false,
                created_at: new Date(),
            });
            this.logger.log(`Successfully dispatched radiology notification to Doctor ${payload.doctorId}`);
        }
        catch (error) {
            this.logger.error(`Failed to process radiology.doctor_notify for Doctor ${payload.doctorId}: ${error.message}`);
        }
    }
};
exports.RadiologyNotificationListener = RadiologyNotificationListener;
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.doctor_notify'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RadiologyNotificationListener.prototype, "handleRadiologyDoctorNotifyEvent", null);
exports.RadiologyNotificationListener = RadiologyNotificationListener = RadiologyNotificationListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('ProviderNotification')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RadiologyNotificationListener);
//# sourceMappingURL=radiology-notification.listener.js.map