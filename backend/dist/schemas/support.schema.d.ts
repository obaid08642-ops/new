import { Document } from 'mongoose';
export declare enum SupportStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED"
}
export declare enum SupportCategory {
    GENERAL = "GENERAL",
    ORDER_ISSUE = "ORDER_ISSUE",
    PAYMENT = "PAYMENT",
    TECHNICAL = "TECHNICAL",
    COMPLAINT = "COMPLAINT",
    SUGGESTION = "SUGGESTION"
}
export declare class SupportRequest extends Document {
    id: string;
    tracking_id: string;
    user_id: string;
    user_name?: string;
    user_phone?: string;
    category: SupportCategory;
    subject: string;
    message: string;
    attachments: any[];
    status: SupportStatus;
    source_role: string;
    priority: string;
    thread: any[];
    resolved_at?: Date;
    assigned_to?: string;
}
export declare const SupportRequestSchema: import("mongoose").Schema<SupportRequest, import("mongoose").Model<SupportRequest, any, any, any, Document<unknown, any, SupportRequest, any, {}> & SupportRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SupportRequest, Document<unknown, {}, import("mongoose").FlatRecord<SupportRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SupportRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PatientSettings extends Document {
    user_id: string;
    language: string;
    theme: string;
    calendar: string;
    notifications_enabled: boolean;
    notif_reminders: boolean;
    notif_orders: boolean;
    notif_appointments: boolean;
    notif_lab_results: boolean;
    expo_push_token?: string;
}
export declare const PatientSettingsSchema: import("mongoose").Schema<PatientSettings, import("mongoose").Model<PatientSettings, any, any, any, Document<unknown, any, PatientSettings, any, {}> & PatientSettings & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PatientSettings, Document<unknown, {}, import("mongoose").FlatRecord<PatientSettings>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PatientSettings> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
