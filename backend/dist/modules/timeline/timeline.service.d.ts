import { OrderRepository } from "./repositories/order.repository";
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabResultRepository } from "./repositories/labresult.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { AppointmentRepository } from "./repositories/appointment.repository";
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { CustomServiceRequestRepository } from "./repositories/customservicerequest.repository";
import { RadiologyBookingRepository } from "./repositories/radiologybooking.repository";
import { MedicalReportRepository } from "./repositories/medicalreport.repository";
export type UnifiedStatus = 'pending' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'critical';
export interface TimelineEvent {
    kind: 'order' | 'rx' | 'lab' | 'lab_result' | 'home_care' | 'consultation' | 'vital' | 'reminder' | 'custom' | 'radiology' | 'radiology_report' | 'medical_report';
    id: string;
    tracking_id?: string;
    title: string;
    subtitle?: string;
    status_raw: string;
    unified_status: UnifiedStatus;
    at: Date;
    color: string;
    icon: string;
    links: Record<string, string | undefined>;
    meta?: Record<string, any>;
}
export declare class TimelineService {
    private orderM;
    private rxM;
    private labBM;
    private labRM;
    private hcM;
    private apptM;
    private vitalM;
    private remM;
    private customM;
    private radBM;
    private mrM;
    constructor(orderM: OrderRepository, rxM: PrescriptionRepository, labBM: LabBookingRepository, labRM: LabResultRepository, hcM: HomeCareBookingRepository, apptM: AppointmentRepository, vitalM: VitalReadingRepository, remM: MedicationReminderRepository, customM: CustomServiceRequestRepository, radBM: RadiologyBookingRepository, mrM: MedicalReportRepository);
    build(user: any, opts: {
        kinds?: string[];
        limit: number;
        since?: Date;
        until?: Date;
    }): Promise<{
        events: TimelineEvent[];
        total: number;
    }>;
    summary(user: any): Promise<Record<string, number>>;
}
