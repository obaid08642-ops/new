import { Document } from 'mongoose';
import { PrescriptionState } from '../common/enums';
export declare class PrescriptionItem {
    medicine_id?: string;
    medicine_name_ar?: string;
    medicine_name_en?: string;
    active_ingredient?: string;
    dose?: string;
    frequency_hours?: number;
    times_per_day?: number;
    duration_days?: number;
    quantity?: number;
    instructions?: string;
    is_manual_entry: boolean;
    verified: boolean;
    manual_review_status: string;
    manual_reviewed_by?: string;
    manual_reviewed_at?: Date;
    manual_review_note?: string;
    substituted: boolean;
    substituted_to_medicine_id?: string;
}
export declare const PrescriptionItemSchema: import("mongoose").Schema<PrescriptionItem, import("mongoose").Model<PrescriptionItem, any, any, any, Document<unknown, any, PrescriptionItem, any, {}> & PrescriptionItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PrescriptionItem, Document<unknown, {}, import("mongoose").FlatRecord<PrescriptionItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PrescriptionItem> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Prescription {
    id: string;
    patient_id: string;
    doctor_id?: string;
    appointment_id?: string;
    upload_image?: string;
    items: PrescriptionItem[];
    diagnosis?: string;
    notes?: string;
    state: PrescriptionState;
    pharmacy_id?: string;
    order_id?: string;
    has_manual_entries: boolean;
}
export type PrescriptionDocument = Prescription & Document;
export declare const PrescriptionSchema: import("mongoose").Schema<Prescription, import("mongoose").Model<Prescription, any, any, any, Document<unknown, any, Prescription, any, {}> & Prescription & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Prescription, Document<unknown, {}, import("mongoose").FlatRecord<Prescription>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Prescription> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
