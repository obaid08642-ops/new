import { Document, Types } from 'mongoose';
export declare class EncounterRecord {
    appointment_id: Types.ObjectId;
    patient_id: Types.ObjectId;
    doctor_id: Types.ObjectId;
    diagnosis_text: string;
    prescribed_medications: any[];
    insurance_claim_snapshot: Record<string, any>;
}
export declare const EncounterRecordSchema: import("mongoose").Schema<EncounterRecord, import("mongoose").Model<EncounterRecord, any, any, any, Document<unknown, any, EncounterRecord, any, {}> & EncounterRecord & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EncounterRecord, Document<unknown, {}, import("mongoose").FlatRecord<EncounterRecord>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EncounterRecord> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
