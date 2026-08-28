import { Document } from 'mongoose';
export declare class VitalReading extends Document {
    id: string;
    patient_id: string;
    type: string;
    value: string;
    value_secondary?: number;
    unit: string;
    measured_at: Date;
    context?: string;
    notes?: string;
    source: string;
    deleted_at?: Date | null;
}
export declare const VitalReadingSchema: import("mongoose").Schema<VitalReading, import("mongoose").Model<VitalReading, any, any, any, Document<unknown, any, VitalReading, any, {}> & VitalReading & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VitalReading, Document<unknown, {}, import("mongoose").FlatRecord<VitalReading>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<VitalReading> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class MedicationReminder extends Document {
    id: string;
    patient_id: string;
    medicine_name_ar: string;
    medicine_name_en?: string;
    medicine_id?: string;
    order_id?: string;
    prescription_id?: string;
    dose: string;
    dosage_count: number;
    dosage_form: string;
    times: string[];
    time_zone: string;
    frequency: string;
    start_date: Date;
    end_date?: Date;
    duration_days: number;
    instructions_ar?: string;
    source: string;
    active: boolean;
    log: any[];
    chronic: boolean;
    pills_remaining: number;
    refill_date?: Date;
    refill_pending_order_id?: string;
    refill_creation_lock?: string;
    refill_fulfilled_at?: Date;
}
export declare const MedicationReminderSchema: import("mongoose").Schema<MedicationReminder, import("mongoose").Model<MedicationReminder, any, any, any, Document<unknown, any, MedicationReminder, any, {}> & MedicationReminder & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicationReminder, Document<unknown, {}, import("mongoose").FlatRecord<MedicationReminder>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicationReminder> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class SleepReading extends Document {
    id: string;
    patient_id: string;
    sleep_score: number;
    duration_hours: number;
    measured_at: Date;
    source: string;
}
export declare const SleepReadingSchema: import("mongoose").Schema<SleepReading, import("mongoose").Model<SleepReading, any, any, any, Document<unknown, any, SleepReading, any, {}> & SleepReading & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SleepReading, Document<unknown, {}, import("mongoose").FlatRecord<SleepReading>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SleepReading> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
