import { Document } from 'mongoose';
import { InsuranceDetails } from './insurance.schema';
export declare const APPT_STATES: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly RESCHEDULED: "RESCHEDULED";
    readonly CHECKED_IN: "CHECKED_IN";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
    readonly NO_SHOW: "NO_SHOW";
};
export type ApptState = typeof APPT_STATES[keyof typeof APPT_STATES];
export declare const APPT_TRANSITIONS: Record<ApptState, ApptState[]>;
export type ServiceType = 'clinic' | 'video' | 'home';
declare class StateLogEntry {
    state: string;
    at: Date;
    by_user_id?: string;
    by_role?: string;
    note?: string;
}
export declare class Appointment {
    id: string;
    patient_id: string;
    doctor_id: string;
    doctor_user_id: string;
    service_type: ServiceType;
    slot_start: Date;
    slot_end: Date;
    duration_minutes: number;
    status: ApptState;
    state_history: StateLogEntry[];
    price: number;
    service_fee: number;
    home_visit_fee: number;
    transportation_fee: number;
    total_price: number;
    payment_status: 'pending' | 'paid' | 'refunded';
    payment_method?: string;
    insurance_provider?: string;
    insurance_member_id?: string;
    insurance_details?: InsuranceDetails;
    patient_notes?: string;
    booked_by_user_id?: string;
    symptoms: string[];
    visit_location?: {
        lat: number;
        lng: number;
        address: string;
    };
    summary?: {
        diagnosis?: string;
        notes?: string;
        recommendations?: string;
        prescription?: {
            name?: string;
            dose?: string;
            duration?: string;
        }[];
        follow_up_recommended?: boolean;
        follow_up_window_days?: number;
        written_at?: Date;
    };
    prescriptions?: string[];
    labRequests?: string[];
    radiologyRequests?: string[];
    sickLeaves?: {
        days: number;
        reason: string;
    }[];
    consultation_id?: string;
    cancellation_reason?: string;
    rescheduled_from_id?: string;
    confirmed_at?: Date;
    completed_at?: Date;
}
export type AppointmentDocument = Appointment & Document;
export declare const AppointmentSchema: import("mongoose").Schema<Appointment, import("mongoose").Model<Appointment, any, any, any, Document<unknown, any, Appointment, any, {}> & Appointment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Appointment, Document<unknown, {}, import("mongoose").FlatRecord<Appointment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Appointment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export {};
