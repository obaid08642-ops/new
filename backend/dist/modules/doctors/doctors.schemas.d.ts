import { Document } from 'mongoose';
export declare class Doctor extends Document {
    id: string;
    slug?: string;
    provider_account_id?: string;
    name_ar: string;
    name_en?: string;
    specialty: string;
    specialty_ar?: string;
    gender: string;
    languages: string[];
    photo_url: string;
    biography: string;
    rating: number;
    reviews_count: number;
    consultation_fee: number;
    home_visit_fee: number;
    video_consultation_fee: number;
    home_visit_enabled: boolean;
    video_enabled: boolean;
    voice_enabled: boolean;
    clinic_enabled: boolean;
    insurance_supported: string[];
    clinic_location: {
        lat?: number;
        lng?: number;
        city?: string;
        address?: string;
        name?: string;
    };
    clinic_images: string[];
    facilities_images: string[];
    tags: string[];
    is_accepting: boolean;
    is_online: boolean;
    default_slot_minutes: number;
    weekly_schedule: Record<string, {
        start: string;
        end: string;
        breaks?: {
            start: string;
            end: string;
        }[];
    }[]>;
    blocked_dates: string[];
    max_bookings_per_slot: number;
    is_deleted: boolean;
    status: string;
}
export declare const DoctorSchema: import("mongoose").Schema<Doctor, import("mongoose").Model<Doctor, any, any, any, Document<unknown, any, Doctor, any, {}> & Doctor & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Doctor, Document<unknown, {}, import("mongoose").FlatRecord<Doctor>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Doctor> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export type AppointmentType = 'clinic' | 'home' | 'video' | 'voice';
export type AppointmentState = 'scheduled' | 'confirmed' | 'patient_arrived' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';
export declare class DoctorAppointment extends Document {
    id: string;
    doctor_id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    type: AppointmentType;
    scheduled_at: Date;
    duration_minutes: number;
    state: AppointmentState;
    fee: number;
    payment_method: string;
    insurance_provider?: string;
    insurance_status: string;
    documents: any[];
    reason?: string;
    address?: any;
    state_history: any[];
}
export declare const DoctorAppointmentSchema: import("mongoose").Schema<DoctorAppointment, import("mongoose").Model<DoctorAppointment, any, any, any, Document<unknown, any, DoctorAppointment, any, {}> & DoctorAppointment & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DoctorAppointment, Document<unknown, {}, import("mongoose").FlatRecord<DoctorAppointment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DoctorAppointment> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class DoctorChatMessage extends Document {
    id: string;
    appointment_id: string;
    sender_role: string;
    sender_account_id: string;
    text?: string;
    attachment?: any;
}
export declare const DoctorChatMessageSchema: import("mongoose").Schema<DoctorChatMessage, import("mongoose").Model<DoctorChatMessage, any, any, any, Document<unknown, any, DoctorChatMessage, any, {}> & DoctorChatMessage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DoctorChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<DoctorChatMessage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DoctorChatMessage> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ConsultationNote extends Document {
    id: string;
    appointment_id: string;
    doctor_id: string;
    patient_id: string;
    diagnosis?: string;
    notes?: string;
    follow_up_instructions?: string;
    prescriptions: Array<{
        medicine: string;
        dose: string;
        duration: string;
        instructions?: string;
    }>;
}
export declare const ConsultationNoteSchema: import("mongoose").Schema<ConsultationNote, import("mongoose").Model<ConsultationNote, any, any, any, Document<unknown, any, ConsultationNote, any, {}> & ConsultationNote & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ConsultationNote, Document<unknown, {}, import("mongoose").FlatRecord<ConsultationNote>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ConsultationNote> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class NotificationItem extends Document {
    id: string;
    recipient_account_id: string;
    recipient_role: string;
    type: string;
    title: string;
    body?: string;
    entity_type?: string;
    entity_id?: string;
    deep_link?: string;
    read: boolean;
}
export declare const NotificationItemSchema: import("mongoose").Schema<NotificationItem, import("mongoose").Model<NotificationItem, any, any, any, Document<unknown, any, NotificationItem, any, {}> & NotificationItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NotificationItem, Document<unknown, {}, import("mongoose").FlatRecord<NotificationItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<NotificationItem> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
