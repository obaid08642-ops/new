"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const timeline_controller_1 = require("./timeline.controller");
const timeline_service_1 = require("./timeline.service");
const order_schema_1 = require("../../schemas/order.schema");
const prescription_schema_1 = require("../../schemas/prescription.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const lab_result_schema_1 = require("../../schemas/lab-result.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const health_schema_1 = require("../../schemas/health.schema");
const custom_service_schema_1 = require("../../schemas/custom-service.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const medical_report_schema_1 = require("../../schemas/medical-report.schema");
const appointment_repository_1 = require("./repositories/appointment.repository");
const customservicerequest_repository_1 = require("./repositories/customservicerequest.repository");
const homecarebooking_repository_1 = require("./repositories/homecarebooking.repository");
const labbooking_repository_1 = require("./repositories/labbooking.repository");
const labresult_repository_1 = require("./repositories/labresult.repository");
const medicalreport_repository_1 = require("./repositories/medicalreport.repository");
const medicationreminder_repository_1 = require("./repositories/medicationreminder.repository");
const order_repository_1 = require("./repositories/order.repository");
const prescription_repository_1 = require("./repositories/prescription.repository");
const radiologybooking_repository_1 = require("./repositories/radiologybooking.repository");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
let TimelineModule = class TimelineModule {
};
exports.TimelineModule = TimelineModule;
exports.TimelineModule = TimelineModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'Prescription', schema: prescription_schema_1.PrescriptionSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'LabResult', schema: lab_result_schema_1.LabResultSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: 'Appointment', schema: appointment_schema_1.AppointmentSchema },
                { name: 'VitalReading', schema: health_schema_1.VitalReadingSchema },
                { name: 'MedicationReminder', schema: health_schema_1.MedicationReminderSchema },
                { name: 'CustomServiceRequest', schema: custom_service_schema_1.CustomServiceRequestSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'MedicalReport', schema: medical_report_schema_1.MedicalReportSchema },
            ])],
        controllers: [timeline_controller_1.TimelineController],
        providers: [timeline_service_1.TimelineService, { provide: 'AppointmentRepository', useClass: appointment_repository_1.AppointmentRepository }, { provide: 'CustomServiceRequestRepository', useClass: customservicerequest_repository_1.CustomServiceRequestRepository }, { provide: 'HomeCareBookingRepository', useClass: homecarebooking_repository_1.HomeCareBookingRepository }, { provide: 'LabBookingRepository', useClass: labbooking_repository_1.LabBookingRepository }, { provide: 'LabResultRepository', useClass: labresult_repository_1.LabResultRepository }, { provide: 'MedicalReportRepository', useClass: medicalreport_repository_1.MedicalReportRepository }, { provide: 'MedicationReminderRepository', useClass: medicationreminder_repository_1.MedicationReminderRepository }, { provide: 'OrderRepository', useClass: order_repository_1.OrderRepository }, { provide: 'PrescriptionRepository', useClass: prescription_repository_1.PrescriptionRepository }, { provide: 'RadiologyBookingRepository', useClass: radiologybooking_repository_1.RadiologyBookingRepository }, { provide: 'VitalReadingRepository', useClass: vitalreading_repository_1.VitalReadingRepository }],
    })
], TimelineModule);
//# sourceMappingURL=timeline.module.js.map