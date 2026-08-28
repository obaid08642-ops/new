import { Document } from 'mongoose';
export declare class PatientCrmTag extends Document {
    id: string;
    provider_id: string;
    patient_id: string;
    is_vip: boolean;
    is_favorite: boolean;
    is_blocked: boolean;
    blocked_reason?: string;
    custom_tags: string[];
    private_notes: string[];
}
export type PatientCrmTagDocument = PatientCrmTag & Document;
export declare const PatientCrmTagSchema: import("mongoose").Schema<PatientCrmTag, import("mongoose").Model<PatientCrmTag, any, any, any, Document<unknown, any, PatientCrmTag, any, {}> & PatientCrmTag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PatientCrmTag, Document<unknown, {}, import("mongoose").FlatRecord<PatientCrmTag>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PatientCrmTag> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
