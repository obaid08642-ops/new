import { Document } from 'mongoose';
export declare class ProfileImageAuditLog extends Document {
    user_id: string;
    provider_id: string;
    processing_date: Date;
    selected_provider: string;
    api_key_index_used: number;
    processing_result: string;
    failure_reason?: string;
}
export type ProfileImageAuditLogDocument = ProfileImageAuditLog & Document;
export declare const ProfileImageAuditLogSchema: import("mongoose").Schema<ProfileImageAuditLog, import("mongoose").Model<ProfileImageAuditLog, any, any, any, Document<unknown, any, ProfileImageAuditLog, any, {}> & ProfileImageAuditLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProfileImageAuditLog, Document<unknown, {}, import("mongoose").FlatRecord<ProfileImageAuditLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProfileImageAuditLog> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
