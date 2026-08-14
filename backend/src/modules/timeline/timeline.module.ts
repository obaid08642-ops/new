import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { OrderSchema } from '../../schemas/order.schema';
import { PrescriptionSchema } from '../../schemas/prescription.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { LabResultSchema } from '../../schemas/lab-result.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';
import { VitalReadingSchema, MedicationReminderSchema } from '../../schemas/health.schema';
import { CustomServiceRequestSchema } from '../../schemas/custom-service.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { MedicalReportSchema } from '../../schemas/medical-report.schema';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { CustomServiceRequestRepository } from "./repositories/customservicerequest.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabResultRepository } from "./repositories/labresult.repository";
import { MedicalReportRepository } from "./repositories/medicalreport.repository";
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { OrderRepository } from "./repositories/order.repository";
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { RadiologyBookingRepository } from "./repositories/radiologybooking.repository";
import { VitalReadingRepository } from "./repositories/vitalreading.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Order', schema: OrderSchema },
    { name: 'Prescription', schema: PrescriptionSchema },
    { name: 'LabBooking', schema: LabBookingSchema },
    { name: 'LabResult', schema: LabResultSchema },
    { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
    { name: 'Appointment', schema: AppointmentSchema },
    { name: 'VitalReading', schema: VitalReadingSchema },
    { name: 'MedicationReminder', schema: MedicationReminderSchema },
    { name: 'CustomServiceRequest', schema: CustomServiceRequestSchema },
    { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
    { name: 'MedicalReport', schema: MedicalReportSchema },
  ])],
  controllers: [TimelineController],
  providers: [TimelineService, { provide: 'AppointmentRepository', useClass: AppointmentRepository }, { provide: 'CustomServiceRequestRepository', useClass: CustomServiceRequestRepository }, { provide: 'HomeCareBookingRepository', useClass: HomeCareBookingRepository }, { provide: 'LabBookingRepository', useClass: LabBookingRepository }, { provide: 'LabResultRepository', useClass: LabResultRepository }, { provide: 'MedicalReportRepository', useClass: MedicalReportRepository }, { provide: 'MedicationReminderRepository', useClass: MedicationReminderRepository }, { provide: 'OrderRepository', useClass: OrderRepository }, { provide: 'PrescriptionRepository', useClass: PrescriptionRepository }, { provide: 'RadiologyBookingRepository', useClass: RadiologyBookingRepository }, { provide: 'VitalReadingRepository', useClass: VitalReadingRepository }],
})
export class TimelineModule {}
