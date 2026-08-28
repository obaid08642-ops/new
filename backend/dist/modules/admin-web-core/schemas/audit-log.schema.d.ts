import { Document, Types } from 'mongoose';
export type AuditLogDocument = AuditLog & Document;
export declare class AuditLog {
    actorId: Types.ObjectId;
    actorRole: string;
    endpoint: string;
    action: string;
    payloadHash: string;
}
export declare const AuditLogSchema: import("mongoose").Schema<AuditLog, import("mongoose").Model<AuditLog, any, any, any, Document<unknown, any, AuditLog, any, {}> & AuditLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuditLog, Document<unknown, {}, import("mongoose").FlatRecord<AuditLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AuditLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
