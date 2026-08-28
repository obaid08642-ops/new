import { ServiceType } from '../../schemas/appointment.schema';
export declare class VisitLocationDto {
    lat: number;
    lng: number;
    address: string;
}
export declare class CreateAppointmentDto {
    doctor_id: string;
    service_type: ServiceType;
    slot_start: string;
    duration_minutes?: number;
    patient_notes?: string;
    symptoms?: string[];
    visit_location?: VisitLocationDto;
    payment_method?: 'cash' | 'card' | 'insurance';
    insurance_provider?: string;
    insurance_member_id?: string;
}
export declare class CancelAppointmentDto {
    reason?: string;
}
export declare class RescheduleAppointmentDto {
    slot_start: string;
}
