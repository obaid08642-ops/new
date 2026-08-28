import { Document } from 'mongoose';
export declare enum CustomServiceStatus {
    PENDING = "PENDING",
    REVIEWED = "REVIEWED",
    APPROVED = "APPROVED",
    ADDED_TO_CATALOG = "ADDED_TO_CATALOG",
    PROVIDED = "PROVIDED",
    REJECTED = "REJECTED"
}
export declare enum CustomServiceKind {
    LAB = "LAB",
    RADIOLOGY = "RADIOLOGY",
    HOME_CARE = "HOME_CARE",
    PHARMACY = "PHARMACY"
}
export declare class CustomServiceRequest extends Document {
    id: string;
    tracking_id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    kind: CustomServiceKind;
    name_ar: string;
    name_en?: string;
    doctor_notes?: string;
    attachments: any[];
    doctor_name?: string;
    prescription_image?: string;
    status: CustomServiceStatus;
    status_history: any[];
    assigned_provider_id?: string;
    assigned_provider_name?: string;
    linked_booking_id?: string;
    linked_order_id?: string;
    admin_notes?: string;
    resolved_at?: Date;
    priority: string;
}
export declare const CustomServiceRequestSchema: import("mongoose").Schema<CustomServiceRequest, import("mongoose").Model<CustomServiceRequest, any, any, any, Document<unknown, any, CustomServiceRequest, any, {}> & CustomServiceRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomServiceRequest, Document<unknown, {}, import("mongoose").FlatRecord<CustomServiceRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CustomServiceRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
