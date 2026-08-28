import { Document } from 'mongoose';
import { MedicationDoseState, AppointmentMode, AppointmentStatus } from '../common/enums';
export declare class MedicationPlan {
    id: string;
    patient_id: string;
    prescription_id?: string;
    medicine_id?: string;
    medicine_name_ar: string;
    dose: string;
    frequency_hours?: number;
    times_per_day?: number;
    duration_days: number;
    instructions?: string;
    start_date: Date;
    end_date?: Date;
    active: boolean;
}
export type MedicationPlanDocument = MedicationPlan & Document;
export declare const MedicationPlanSchema: import("mongoose").Schema<MedicationPlan, import("mongoose").Model<MedicationPlan, any, any, any, Document<unknown, any, MedicationPlan, any, {}> & MedicationPlan & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicationPlan, Document<unknown, {}, import("mongoose").FlatRecord<MedicationPlan>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicationPlan> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MedicationDose {
    id: string;
    plan_id: string;
    patient_id: string;
    scheduled_at: Date;
    state: MedicationDoseState;
    taken_at?: Date;
    notified_at?: Date;
    notes?: string;
}
export type MedicationDoseDocument = MedicationDose & Document;
export declare const MedicationDoseSchema: import("mongoose").Schema<MedicationDose, import("mongoose").Model<MedicationDose, any, any, any, Document<unknown, any, MedicationDose, any, {}> & MedicationDose & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicationDose, Document<unknown, {}, import("mongoose").FlatRecord<MedicationDose>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicationDose> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Appointment {
    id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    doctor_id: string;
    doctor_name?: string;
    mode: AppointmentMode;
    status: AppointmentStatus;
    date: string;
    time: string;
    price?: number;
    chat_channel?: string;
    video_channel?: string;
    prescription_id?: string;
    notes?: string;
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
export declare class HealthRecord {
    id: string;
    patient_id: string;
    record_type: string;
    data: Record<string, any>;
    recorded_at: Date;
    recorded_by?: string;
    attachments?: string[];
}
export type HealthRecordDocument = HealthRecord & Document;
export declare const HealthRecordSchema: import("mongoose").Schema<HealthRecord, import("mongoose").Model<HealthRecord, any, any, any, Document<unknown, any, HealthRecord, any, {}> & HealthRecord & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HealthRecord, Document<unknown, {}, import("mongoose").FlatRecord<HealthRecord>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HealthRecord> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class AIInteraction {
    id: string;
    user_id?: string;
    kind: string;
    input?: string;
    output?: any;
    model?: string;
    latency_ms?: number;
    flagged: boolean;
}
export type AIInteractionDocument = AIInteraction & Document;
export declare const AIInteractionSchema: import("mongoose").Schema<AIInteraction, import("mongoose").Model<AIInteraction, any, any, any, Document<unknown, any, AIInteraction, any, {}> & AIInteraction & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AIInteraction, Document<unknown, {}, import("mongoose").FlatRecord<AIInteraction>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AIInteraction> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
