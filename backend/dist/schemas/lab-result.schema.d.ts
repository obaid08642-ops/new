import { Document } from 'mongoose';
export declare enum LabResultType {
    STRUCTURED = "STRUCTURED",
    PDF = "PDF",
    IMAGE = "IMAGE",
    RADIOLOGY = "RADIOLOGY"
}
export declare class LabResult extends Document {
    id: string;
    tracking_id: string;
    booking_id: string;
    patient_id: string;
    patient_name?: string;
    service_id?: string;
    service_name_ar: string;
    service_name_en?: string;
    type: LabResultType;
    source: 'labs' | 'radiology';
    entries: any[];
    attachments: any[];
    findings?: string;
    impression?: string;
    recommendations?: string;
    reported_at?: Date;
    reported_by_id?: string;
    reported_by_name?: string;
    critical: boolean;
    viewed_by_patient: boolean;
    patient_viewed_at?: Date;
    notes?: string;
}
export declare const LabResultSchema: import("mongoose").Schema<LabResult, import("mongoose").Model<LabResult, any, any, any, Document<unknown, any, LabResult, any, {}> & LabResult & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabResult, Document<unknown, {}, import("mongoose").FlatRecord<LabResult>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabResult> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
